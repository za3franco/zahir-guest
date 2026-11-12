import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { loadLibrary } from '@/lib/questionnaireLibrary'
import { CLASSIFICATIONS, MAX_QUESTIONS } from '@/lib/questionnaireImport'
import { readSpreadsheet, SPREADSHEET_EXT, type Sheet } from '@/lib/spreadsheet'
import { convertSpreadsheet } from '@/lib/tableImport'
import { AI_MODEL } from '@/lib/anthropic'

export const maxDuration = 300
export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024
const MAX_CHARS = 180_000

type Block = Record<string, unknown>

/** Turns the uploaded file (or pasted text) into content blocks Claude can read. */
async function toBlocks(file: File | null, pasted: string): Promise<Block[] | { error: string }> {
  if (!file) {
    const text = pasted.trim()
    return text ? [{ type: 'text', text: text.slice(0, MAX_CHARS) }] : { error: 'EMPTY' }
  }
  if (file.size > MAX_BYTES) return { error: 'TOO_BIG' }
  const name = file.name.toLowerCase()
  const buf = Buffer.from(await file.arrayBuffer())
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } }]
  }
  const img = /\.(png|jpe?g|webp|gif)$/.exec(name)
  if (img) {
    const media = img[1] === 'jpg' || img[1] === 'jpeg' ? 'image/jpeg' : `image/${img[1]}`
    return [{ type: 'image', source: { type: 'base64', media_type: media, data: buf.toString('base64') } }]
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ buffer: buf })
    return value.trim() ? [{ type: 'text', text: value.slice(0, MAX_CHARS) }] : { error: 'EMPTY' }
  }
  if (/\.(txt|md)$/.test(name) || file.type.startsWith('text/')) {
    const text = buf.toString('utf-8')
    return text.trim() ? [{ type: 'text', text: text.slice(0, MAX_CHARS) }] : { error: 'EMPTY' }
  }
  return { error: 'FORMAT' }
}

const TOOL = {
  name: 'save_questionnaire',
  description: 'Save the questionnaire extracted from the document, in the Zahir Guest structure.',
  input_schema: {
    type: 'object',
    properties: {
      domains: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            en: { type: 'string' }, fr: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  en: { type: 'string' }, fr: { type: 'string' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        en: { type: 'string' }, fr: { type: 'string' },
                        c: { type: 'string', enum: [...CLASSIFICATIONS] },
                        crit: { type: 'boolean' },
                        g_en: { type: 'string' }, g_fr: { type: 'string' },
                      },
                      required: ['en', 'fr', 'c'],
                    },
                  },
                },
                required: ['en', 'fr', 'questions'],
              },
            },
          },
          required: ['en', 'fr', 'sections'],
        },
      },
      notes: { type: 'string', description: 'Short note for the user (in their language) about anything skipped or uncertain. Empty if none.' },
    },
    required: ['domains'],
  },
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return Response.json({ error: 'Unauthorized' }, { status: 403 })
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return Response.json({ error: msg('AI is not available right now.', "L'IA n'est pas disponible pour le moment.") }, { status: 503 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')

  // Spreadsheets: column mapping + row copy + classification (any size, nothing rewritten)
  if (file instanceof File && file.size && SPREADSHEET_EXT.test(file.name)) {
    if (file.size > MAX_BYTES) return Response.json({ error: msg('File too large (4 MB maximum).', 'Fichier trop volumineux (4 Mo maximum).') }, { status: 400 })
    let sheets: Sheet[]
    try { sheets = readSpreadsheet(Buffer.from(await file.arrayBuffer())) } catch { sheets = [] }
    if (!sheets.length) return Response.json({ error: msg('This spreadsheet could not be read.', 'Ce tableur est illisible.') }, { status: 400 })
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const library = await loadLibrary(db, user.tenant_id)
    const enc = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'))
        try {
          const out = await convertSpreadsheet(sheets, library, lang, send)
          send({ type: 'done', mode: 'table', ...out })
        } catch (err: any) {
          console.error('[ai-import] spreadsheet failed', err)
          send({ type: 'error', error: err?.message === 'NO_QUESTION_COLUMN' || err?.message === 'NO_ROWS'
            ? msg('No column of standards was found in this spreadsheet.', "Aucune colonne de standards n'a été trouvée dans ce tableur.")
            : msg('The conversion was interrupted. Please try again.', 'La conversion a été interrompue. Veuillez réessayer.') })
        }
        controller.close()
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
  }
  const blocks = await toBlocks(file instanceof File && file.size ? file : null, String(form?.get('text') ?? ''))
  if ('error' in blocks) {
    const e = {
      EMPTY: msg('The document is empty or could not be read.', 'Le document est vide ou illisible.'),
      TOO_BIG: msg('File too large (4 MB maximum). Split it or export it as PDF.', 'Fichier trop volumineux (4 Mo maximum). Découpez-le ou exportez-le en PDF.'),
      FORMAT: msg('Unsupported format. Use PDF, Word (.docx), Excel (.xls, .xlsx), CSV, text or a photo.', 'Format non pris en charge. Utilisez PDF, Word (.docx), Excel (.xls, .xlsx), CSV, texte ou une photo.'),
    }[blocks.error]
    return Response.json({ error: e }, { status: 400 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const library = await loadLibrary(db, user.tenant_id)
  const names = library
    .map(d => `- ${d.name_en} | ${d.name_fr}\n${d.sections.map(s => `    - ${s.name_en} | ${s.name_fr}`).join('\n')}`)
    .join('\n')

  const system = `You convert hotel service standards, SOPs, checklists or audit questionnaires into a mystery-guest audit questionnaire for Zahir Guest.
Structure: domains (departments) → sections (moments or outlets) → questions.
Rules:
- Each question must be one observable, yes/no checkable standard, phrased as a question an incognito auditor answers ("Was the guest greeted within 30 seconds?"). Rewrite statements/procedures into that form; split items that check several things.
- Keep the document's content and order. Do not invent standards that are not in the document. Skip pure policies, internal procedures a guest cannot observe, titles and page furniture.
- Reuse these existing domain and section names whenever they fit (exact spelling, both languages); create new ones only when nothing fits:
${names}
- Fill BOTH languages for every name and question: English (en) and French (fr), translating where needed. Natural hospitality wording.
- c = classification: SERVICE (staff behaviour, courtesy, procedure), EFFICIENCY (speed, timing, accuracy), PRODUCT (facilities, equipment, F&B quality), CLEANLINESS (cleanliness, condition, maintenance), EMOTIONAL_INTELLIGENCE (personalisation, anticipation, warmth, using the guest's name), SALES_OPPORTUNITY (upselling, suggestions, promotions).
- crit = true only when the document marks the item as critical, mandatory, brand standard "must", safety/hygiene, or zero tolerance.
- g_en/g_fr: short guidance for the auditor only if the document gives a precise criterion (timing, quantity, how to check). Otherwise omit.
- At most ${MAX_QUESTIONS} questions. Call the tool save_questionnaire once with the full result. Write "notes" in ${lang === 'en' ? 'English' : 'French'}.`

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: AI_MODEL(),
      max_tokens: 32000,
      stream: true,
      system,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'save_questionnaire' },
      messages: [{ role: 'user', content: [...blocks, { type: 'text', text: 'Convert this document into the Zahir Guest questionnaire.' }] }],
    }),
  })
  if (!upstream.ok || !upstream.body) {
    console.error('[ai-import] anthropic error', upstream.status, (await upstream.text().catch(() => '')).slice(0, 400))
    return Response.json({ error: msg('The AI could not read this document. Try a PDF or a shorter extract.', "L'IA n'a pas pu lire ce document. Essayez un PDF ou un extrait plus court.") }, { status: 502 })
  }

  // Relay progress to the browser as NDJSON lines while Claude writes, then the final structure.
  const enc = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + '\n'))
      const reader = upstream.body!.getReader()
      const dec = new TextDecoder()
      let buffer = '', json = '', stop = '', lastCount = -1
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += dec.decode(value, { stream: true })
          let i
          while ((i = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, i).trim()
            buffer = buffer.slice(i + 1)
            if (!line.startsWith('data:')) continue
            let ev: any
            try { ev = JSON.parse(line.slice(5)) } catch { continue }
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'input_json_delta') {
              json += ev.delta.partial_json
              const n = (json.match(/"c"\s*:/g) ?? []).length
              if (n > lastCount) { lastCount = n; send({ type: 'progress', questions: n }) }
            } else if (ev.type === 'message_delta') stop = ev.delta?.stop_reason ?? stop
            else if (ev.type === 'error') throw new Error(ev.error?.message ?? 'stream error')
          }
        }
        if (stop === 'max_tokens') {
          send({ type: 'error', error: msg('The document is too long to convert in one go. Split it (e.g. one department per file) and import each part.', "Le document est trop long pour être converti en une fois. Découpez-le (par ex. un service par fichier) et importez chaque partie.") })
        } else {
          const out = JSON.parse(json || '{}')
          const tree = (out.domains ?? []).map((d: any) => ({
            name_en: d.en, name_fr: d.fr,
            sections: (d.sections ?? []).map((s: any) => ({
              name_en: s.en, name_fr: s.fr,
              standards: (s.questions ?? []).map((q: any) => ({
                question_en: q.en, question_fr: q.fr, classification: q.c, critical: !!q.crit, guidance_en: q.g_en ?? '', guidance_fr: q.g_fr ?? '',
              })),
            })).filter((s: any) => s.standards.length),
          })).filter((d: any) => d.sections.length)
          if (!tree.length) send({ type: 'error', error: msg('No auditable standard was found in this document.', "Aucun standard auditable n'a été trouvé dans ce document.") })
          else send({ type: 'done', tree, notes: String(out.notes ?? '') })
        }
      } catch (err) {
        console.error('[ai-import] failed', err)
        send({ type: 'error', error: msg('The conversion was interrupted. Please try again.', 'La conversion a été interrompue. Veuillez réessayer.') })
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' } })
}
