// CSV import of a questionnaire. Shared by the browser (preview) and the server (real validation).
//
// One row = one question. Columns (header names are case/accent-insensitive, FR or EN):
//   domain | section | question | classification | critical | guidance
// Bilingual files may add domain_fr, section_fr, question_fr, guidance_fr next to the EN columns.

export const CLASSIFICATIONS = ['SERVICE', 'EFFICIENCY', 'PRODUCT', 'CLEANLINESS', 'EMOTIONAL_INTELLIGENCE', 'SALES_OPPORTUNITY'] as const
export type Classification = (typeof CLASSIFICATIONS)[number]

export const MAX_QUESTIONS = 1000

export interface ParsedRow {
  line: number
  domain_en: string; domain_fr: string
  section_en: string; section_fr: string
  question_en: string; question_fr: string
  classification: Classification
  critical: boolean
  guidance_en: string; guidance_fr: string
}

export interface ImportResult {
  rows: ParsedRow[]
  errors: { line: number; message: string }[]
  domains: number
  sections: number
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const HEADER_ALIASES: Record<string, string[]> = {
  domain: ['domain', 'domaine', 'domain_en', 'domaine_en', 'category', 'categorie'],
  domain_fr: ['domain_fr', 'domaine_fr'],
  section: ['section', 'sous_section', 'subsection', 'section_en', 'sous_domaine'],
  section_fr: ['section_fr', 'sous_section_fr'],
  question: ['question', 'standard', 'critere', 'question_en', 'item'],
  question_fr: ['question_fr', 'standard_fr', 'critere_fr'],
  classification: ['classification', 'type', 'performance', 'performance_classification', 'categorie_de_performance'],
  critical: ['critical', 'critique', 'is_critical', 'eliminatoire'],
  guidance: ['guidance', 'aide', 'consigne', 'guidance_en', 'conseil'],
  guidance_fr: ['guidance_fr', 'aide_fr', 'consigne_fr'],
}

// Accepted spellings for classification (EN/FR) → canonical value
const CLASS_ALIASES: Record<string, Classification> = {
  service: 'SERVICE', efficiency: 'EFFICIENCY', efficacite: 'EFFICIENCY', product: 'PRODUCT', produit: 'PRODUCT',
  cleanliness: 'CLEANLINESS', proprete: 'CLEANLINESS', emotional_intelligence: 'EMOTIONAL_INTELLIGENCE',
  intelligence_emotionnelle: 'EMOTIONAL_INTELLIGENCE', emotional: 'EMOTIONAL_INTELLIGENCE', emotionnel: 'EMOTIONAL_INTELLIGENCE',
  sales_opportunity: 'SALES_OPPORTUNITY', opportunite_de_vente: 'SALES_OPPORTUNITY', vente: 'SALES_OPPORTUNITY', sales: 'SALES_OPPORTUNITY',
}

const YES = new Set(['1', 'true', 'yes', 'y', 'oui', 'o', 'x', 'vrai'])

/** Minimal RFC-4180 CSV reader; auto-detects , ; or tab; strips BOM. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.split(/\r?\n/, 1)[0] ?? ''
  const count = (c: string) => firstLine.split(c).length - 1
  const delim = count(';') > count(',') && count(';') >= count('\t') ? ';' : count('\t') > count(',') ? '\t' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++ } else inQuotes = false
      } else cur += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delim) { row.push(cur); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cur); cur = ''
      rows.push(row); row = []
    } else cur += ch
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  return rows.filter(r => r.some(c => c.trim() !== ''))
}

export function parseQuestionnaire(text: string): ImportResult {
  const table = parseCsv(text)
  const errors: ImportResult['errors'] = []
  if (table.length < 2) return { rows: [], errors: [{ line: 1, message: 'EMPTY' }], domains: 0, sections: 0 }

  const header = table[0].map(norm)
  const col: Record<string, number> = {}
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    // exact FR/EN variants take priority: *_fr keys only match their own aliases
    const idx = header.findIndex(h => aliases.includes(h))
    if (idx >= 0) col[key] = idx
  }
  // "domain" must not collapse onto the _fr column
  for (const k of ['domain', 'section', 'question', 'guidance']) {
    if (col[k] !== undefined && col[k] === col[`${k}_fr`]) delete col[k]
  }
  for (const req of ['domain', 'question', 'classification']) {
    if (col[req] === undefined && !(req === 'domain' && col['domain_fr'] !== undefined) && !(req === 'question' && col['question_fr'] !== undefined)) {
      errors.push({ line: 1, message: `MISSING_COLUMN:${req}` })
    }
  }
  if (errors.length) return { rows: [], errors, domains: 0, sections: 0 }

  const get = (r: string[], k: string) => (col[k] !== undefined ? (r[col[k]] ?? '').trim() : '')
  const rows: ParsedRow[] = []
  for (let i = 1; i < table.length; i++) {
    const r = table[i]
    const line = i + 1
    const q_en = get(r, 'question'), q_fr = get(r, 'question_fr')
    if (!q_en && !q_fr) { errors.push({ line, message: 'NO_QUESTION' }); continue }
    const d_en = get(r, 'domain'), d_fr = get(r, 'domain_fr')
    if (!d_en && !d_fr) { errors.push({ line, message: 'NO_DOMAIN' }); continue }
    const cls = CLASS_ALIASES[norm(get(r, 'classification'))]
    if (!cls) { errors.push({ line, message: `BAD_CLASSIFICATION:${get(r, 'classification')}` }); continue }
    const s_en = get(r, 'section'), s_fr = get(r, 'section_fr')
    rows.push({
      line,
      domain_en: d_en || d_fr, domain_fr: d_fr || d_en,
      section_en: s_en || s_fr || d_en || d_fr, section_fr: s_fr || s_en || d_fr || d_en,
      question_en: q_en || q_fr, question_fr: q_fr || q_en,
      classification: cls,
      critical: YES.has(norm(get(r, 'critical'))),
      guidance_en: get(r, 'guidance') || get(r, 'guidance_fr'),
      guidance_fr: get(r, 'guidance_fr') || get(r, 'guidance'),
    })
  }
  if (rows.length > MAX_QUESTIONS) errors.push({ line: 0, message: `TOO_MANY:${MAX_QUESTIONS}` })

  const domains = new Set(rows.map(r => r.domain_en))
  const sections = new Set(rows.map(r => `${r.domain_en}||${r.section_en}`))
  return { rows, errors, domains: domains.size, sections: sections.size }
}

/** Template file offered for download (semicolon-free, comma CSV with BOM so Excel opens accents correctly). */
export const TEMPLATE_CSV =
  '﻿domain,section,question,classification,critical,guidance,domain_fr,section_fr,question_fr,guidance_fr\n' +
  'Arrival,Reception,"Was the guest greeted within 30 seconds?",SERVICE,no,"Count from the moment the guest reaches the desk","Arrivée","Réception","Le client a-t-il été accueilli en moins de 30 secondes ?","Compter dès que le client arrive au comptoir"\n' +
  'Arrival,Reception,"Was the guest offered a welcome drink?",SALES_OPPORTUNITY,no,,"Arrivée","Réception","Une boisson de bienvenue a-t-elle été proposée ?",\n' +
  'Room,Cleanliness,"Is the bathroom spotless?",CLEANLINESS,yes,"Check mirror, floor and fittings","Chambre","Propreté","La salle de bain est-elle impeccable ?","Vérifier miroir, sol et robinetterie"\n'
