// "Spreadsheet mode" of the AI conversion. Large standards files (hundreds or thousands of rows) are not rewritten
// by the AI: it only (1) finds which columns hold what, (2) names domains/sections, (3) classifies each standard.
// The rows themselves are copied by code, so nothing is lost or invented and any size works.

import { callTool } from '@/lib/anthropic'
import { CLASSIFICATIONS } from '@/lib/questionnaireImport'
import type { Library } from '@/lib/questionnaireLibrary'
import type { Sheet } from '@/lib/spreadsheet'

export interface ImportItem {
  domain_en: string; domain_fr: string; section_en: string; section_fr: string
  question_en: string; question_fr: string; classification: string; critical: boolean
  guidance_en: string; guidance_fr: string; applies: number[]
}
export interface ImportFilter { col: number; label: string; count: number }

const MAX_ROWS = 3000
const col = { type: ['integer', 'null'] } as const

const MAP_TOOL = {
  name: 'map_columns',
  description: 'Describe where the audit standards are in the spreadsheet.',
  input_schema: {
    type: 'object',
    properties: {
      sheet: { type: 'string', description: 'Name of the sheet that holds the most complete list of standards (prefer one with both French and English and a department/service column).' },
      first_data_row: { type: 'integer', description: 'Index of the first row holding a standard (0-based, row indexes are given as r<N>).' },
      question_fr: { ...col, description: 'Column index of the standard text in French, or null.' },
      question_en: { ...col, description: 'Column index of the standard text in English, or null.' },
      guidance_fr: { ...col, description: 'Column of auditor instructions / how to check, in French, or null.' },
      guidance_en: { ...col, description: 'Column of auditor instructions in English, or null.' },
      domain: { ...col, description: 'Column with a broad department/area, if there are two grouping levels; else null.' },
      section: { ...col, description: 'Column with the service / outlet / theme each standard belongs to, or null.' },
      reference: { ...col, description: 'Column with a standard reference code (e.g. PS.10), or null.' },
      critical: { ...col, description: 'Column telling whether a standard is critical / mandatory / zero tolerance, or null.' },
      critical_values: { type: 'array', items: { type: 'string' }, description: 'Values of that column meaning critical.' },
      applicability: {
        type: ['object', 'null'],
        description: 'If many columns mark (e.g. with X) which hotels/resorts/properties/brands each standard applies to: the row holding their names and the first/last such column. Else null.',
        properties: { name_row: { type: 'integer' }, first_col: { type: 'integer' }, last_col: { type: 'integer' } },
        required: ['name_row', 'first_col', 'last_col'],
      },
    },
    required: ['sheet', 'first_data_row', 'question_fr', 'question_en', 'section'],
  },
}

function preview(s: Sheet): string {
  return s.rows.slice(0, 14).map((r, i) => {
    const cells = r.map((c, j) => (c ? `c${j}=${JSON.stringify(c.slice(0, 90))}` : '')).filter(Boolean)
    return `r${i}: ${cells.slice(0, 40).join(' | ')}${cells.length > 40 ? ` | … (${cells.length - 40} more non-empty cells)` : ''}`
  }).join('\n')
}

export async function convertSpreadsheet(sheets: Sheet[], library: Library, lang: 'en' | 'fr', progress: (p: Record<string, unknown>) => void): Promise<{ items: ImportItem[]; filters: ImportFilter[]; notes: string }> {
  // 1. Column mapping
  progress({ type: 'phase', phase: 'mapping' })
  const map = await callTool<any>({
    system: 'You analyse hotel standards / audit questionnaire spreadsheets and say which columns hold what. Answer only with the tool.',
    content: [{ type: 'text', text: sheets.slice(0, 8).map(s => `### Sheet "${s.name}" (${s.rows.length} rows, ${Math.max(...s.rows.map(r => r.length))} columns)\n${preview(s)}`).join('\n\n') }],
    tool: MAP_TOOL,
    maxTokens: 1500,
  })
  const sheet = sheets.find(s => s.name === map.sheet) ?? sheets[0]
  const at = (r: string[], c: number | null | undefined) => (c == null || c < 0 ? '' : (r[c] ?? '').trim())
  if (map.question_fr == null && map.question_en == null) throw new Error('NO_QUESTION_COLUMN')

  // 2. Rows → items (copied as-is), duplicates removed
  const critVals = new Set((map.critical_values ?? []).map((v: string) => v.trim().toLowerCase()))
  const app = map.applicability && Number.isInteger(map.applicability.first_col) ? map.applicability : null
  const raw: (Omit<ImportItem, 'domain_en' | 'domain_fr' | 'section_en' | 'section_fr' | 'classification'> & { group: string; critFromFile: boolean })[] = []
  const seen = new Set<string>()
  for (const r of sheet.rows.slice(Math.max(0, map.first_data_row ?? 1), MAX_ROWS)) {
    const ref = at(r, map.reference)
    const clean = (s: string) => (ref ? s.replace(new RegExp(`\\s*[-–]?\\s*\\(?${ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)?\\s*$`), '') : s).trim()
    const fr = clean(at(r, map.question_fr)), en = clean(at(r, map.question_en))
    if (!fr && !en) continue
    const group = [at(r, map.domain), at(r, map.section)].filter(Boolean).join(' › ') || '—'
    const key = `${group}|${fr}|${en}`
    if (seen.has(key)) continue
    seen.add(key)
    const applies: number[] = []
    if (app) for (let c = app.first_col; c <= app.last_col; c++) if (at(r, c)) applies.push(c)
    raw.push({
      group, question_fr: fr, question_en: en, guidance_fr: at(r, map.guidance_fr), guidance_en: at(r, map.guidance_en),
      critical: map.critical != null && critVals.has(at(r, map.critical).toLowerCase()), critFromFile: map.critical != null, applies,
    })
  }
  if (!raw.length) throw new Error('NO_ROWS')
  progress({ type: 'phase', phase: 'rows', count: raw.length })

  const filters: ImportFilter[] = []
  if (app) {
    const names = sheet.rows[app.name_row] ?? []
    for (let c = app.first_col; c <= app.last_col; c++) {
      const count = raw.filter(x => x.applies.includes(c)).length
      if (count && names[c]) filters.push({ col: c, label: names[c], count })
    }
  }

  // 3. Groups → domain / section names (reusing the library names when they fit)
  progress({ type: 'phase', phase: 'sections' })
  const groups = Array.from(new Set(raw.map(x => x.group)))
  const libNames = library.map(d => `- ${d.name_en} | ${d.name_fr}: ${d.sections.map(s => `${s.name_en} | ${s.name_fr}`).join('; ')}`).join('\n')
  const named = await callTool<{ groups: { i: number; domain_en: string; domain_fr: string; section_en: string; section_fr: string }[] }>({
    system: `You organise hotel audit standards into domains (departments) and sections. For each group label, give its domain and section in English and French.
Reuse these existing names when they fit (same spelling); otherwise create clear, short names. Keep distinct groups distinct (do not merge two labels into one section unless they are the same thing).
Existing domains and sections:
${libNames}`,
    content: [{ type: 'text', text: groups.map((g, i) => `${i}: ${g}`).join('\n') }],
    tool: {
      name: 'name_groups', description: 'Domain and section names for each group label.',
      input_schema: { type: 'object', properties: { groups: { type: 'array', items: { type: 'object', properties: { i: { type: 'integer' }, domain_en: { type: 'string' }, domain_fr: { type: 'string' }, section_en: { type: 'string' }, section_fr: { type: 'string' } }, required: ['i', 'domain_en', 'domain_fr', 'section_en', 'section_fr'] } } }, required: ['groups'] },
    },
    maxTokens: 8000,
  })
  const groupName = new Map(named.groups.map(g => [groups[g.i], g]))

  // 4. Classification (+ translation of a missing language), in parallel batches
  progress({ type: 'phase', phase: 'classify', done: 0, total: raw.length })
  const BATCH = 120
  const results: { c: string; crit?: boolean; t?: string }[] = new Array(raw.length)
  let done = 0
  const batches: number[][] = []
  for (let i = 0; i < raw.length; i += BATCH) batches.push(Array.from({ length: Math.min(BATCH, raw.length - i) }, (_, k) => i + k))
  const runBatch = async (idx: number[]) => {
    const out = await callTool<{ items: { i: number; c: string; crit?: boolean; t?: string }[] }>({
      system: `Classify each hotel audit standard. c = SERVICE (staff behaviour, courtesy, procedure), EFFICIENCY (speed, timing, accuracy), PRODUCT (facilities, equipment, F&B and product quality, amenities), CLEANLINESS (cleanliness, condition, maintenance), EMOTIONAL_INTELLIGENCE (personalisation, anticipation, warmth, guest name, special occasions), SALES_OPPORTUNITY (upselling, suggestions, promotion).
crit = true only for safety, hygiene/food safety, security or explicit zero-tolerance items; otherwise omit.
Items marked [needs FR] or [needs EN]: put in t a natural translation into that language (hospitality wording). Otherwise omit t.`,
      content: [{ type: 'text', text: idx.map(i => {
        const x = raw[i]
        const need = !x.question_fr ? ' [needs FR]' : !x.question_en ? ' [needs EN]' : ''
        return `${i}${need}: ${(x.question_en || x.question_fr).slice(0, 260)}`
      }).join('\n') }],
      tool: {
        name: 'classify', description: 'Classification of each standard.',
        input_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { i: { type: 'integer' }, c: { type: 'string', enum: [...CLASSIFICATIONS] }, crit: { type: 'boolean' }, t: { type: 'string' } }, required: ['i', 'c'] } } }, required: ['items'] },
      },
      maxTokens: 12000,
    })
    for (const it of out.items ?? []) if (Number.isInteger(it.i) && it.i >= 0 && it.i < raw.length) results[it.i] = it
    done += idx.length
    progress({ type: 'phase', phase: 'classify', done, total: raw.length })
  }
  const POOL = 4
  for (let i = 0; i < batches.length; i += POOL) await Promise.all(batches.slice(i, i + POOL).map(runBatch))

  const items: ImportItem[] = raw.map((x, i) => {
    const g = groupName.get(x.group)
    const r = results[i] ?? { c: 'SERVICE' }
    const fr = x.question_fr || r.t || x.question_en
    const en = x.question_en || r.t || x.question_fr
    return {
      domain_en: g?.domain_en || 'General', domain_fr: g?.domain_fr || 'Général',
      section_en: g?.section_en || x.group, section_fr: g?.section_fr || x.group,
      question_en: en, question_fr: fr,
      classification: (CLASSIFICATIONS as readonly string[]).includes(r.c) ? r.c : 'SERVICE',
      critical: x.critFromFile ? x.critical : !!r.crit,
      guidance_en: x.guidance_en || x.guidance_fr, guidance_fr: x.guidance_fr || x.guidance_en,
      applies: x.applies,
    }
  })

  const notes = lang === 'en'
    ? `${raw.length} standards read from the sheet “${sheet.name}”${filters.length ? `; ${filters.length} properties found, choose one to keep only its standards` : ''}.`
    : `${raw.length} standards lus dans l'onglet « ${sheet.name} »${filters.length ? ` ; ${filters.length} établissements repérés, choisissez-en un pour ne garder que ses standards` : ''}.`
  return { items, filters, notes }
}
