import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { libraryLockedResponse } from '@/lib/limits'
import { parseQuestionnaire } from '@/lib/questionnaireImport'

// Creates a questionnaire template owned by the workspace from the text of a CSV file.
// The file is re-validated here: the browser preview is only a convenience.
export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  {
    const locked = await libraryLockedResponse(user.tenant_id, user.default_language === 'en' ? 'en' : 'fr')
    if (locked) return locked
  }
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? '').trim().slice(0, 120)
  const text = String(body?.csv ?? '')
  if (!name) return NextResponse.json({ error: lang === 'en' ? 'Please name the questionnaire.' : 'Donnez un nom au questionnaire.' }, { status: 400 })
  if (text.length > 2_000_000) return NextResponse.json({ error: lang === 'en' ? 'File too large.' : 'Fichier trop volumineux.' }, { status: 400 })

  const parsed = parseQuestionnaire(text)
  if (parsed.errors.length || !parsed.rows.length) {
    return NextResponse.json({ error: lang === 'en' ? 'The file contains errors. Fix them and try again.' : 'Le fichier contient des erreurs. Corrigez-les puis réessayez.' }, { status: 400 })
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: tpl, error: tErr } = await db
    .from('questionnaire_templates')
    .insert({ tenant_id: user.tenant_id, name, tier: 'custom', language: 'bilingual', is_active: true })
    .select('id')
    .single()
  if (tErr || !tpl) return NextResponse.json({ error: tErr?.message ?? 'Error' }, { status: 500 })

  const fail = async (msg: string) => {
    await db.from('questionnaire_templates').delete().eq('id', tpl.id) // cascades to domains/sections/standards
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Domains and sections keep the order in which they first appear in the file.
  const domainOrder: string[] = []
  const sectionOrder = new Map<string, string[]>()
  const domainFr = new Map<string, string>()
  const sectionFr = new Map<string, string>()
  for (const r of parsed.rows) {
    if (!domainOrder.includes(r.domain_en)) { domainOrder.push(r.domain_en); sectionOrder.set(r.domain_en, []); domainFr.set(r.domain_en, r.domain_fr) }
    const secs = sectionOrder.get(r.domain_en)!
    if (!secs.includes(r.section_en)) { secs.push(r.section_en); sectionFr.set(`${r.domain_en}||${r.section_en}`, r.section_fr) }
  }

  const { data: domains, error: dErr } = await db
    .from('template_domains')
    .insert(domainOrder.map((d, i) => ({ template_id: tpl.id, name_en: d, name_fr: domainFr.get(d)!, display_order: i + 1, weight: 1 })))
    .select('id, name_en')
  if (dErr || !domains) return fail(dErr?.message ?? 'Error')
  const domainId = new Map(domains.map(d => [d.name_en, d.id]))

  const sectionRows = domainOrder.flatMap(d =>
    sectionOrder.get(d)!.map((s, i) => ({ domain_id: domainId.get(d)!, name_en: s, name_fr: sectionFr.get(`${d}||${s}`)!, display_order: i + 1, is_optional: false, weight: 1 }))
  )
  const { data: sections, error: sErr } = await db.from('template_sections').insert(sectionRows).select('id, domain_id, name_en')
  if (sErr || !sections) return fail(sErr?.message ?? 'Error')
  const sectionId = new Map(sections.map(s => [`${s.domain_id}||${s.name_en}`, s.id]))

  const counters = new Map<string, number>()
  const standards = parsed.rows.map(r => {
    const sid = sectionId.get(`${domainId.get(r.domain_en)}||${r.section_en}`)!
    const n = (counters.get(sid) ?? 0) + 1
    counters.set(sid, n)
    return {
      section_id: sid, question_en: r.question_en, question_fr: r.question_fr,
      performance_classification: r.classification, display_order: n, is_critical: r.critical,
      guidance_en: r.guidance_en || null, guidance_fr: r.guidance_fr || null,
    }
  })
  const { error: qErr } = await db.from('template_standards').insert(standards)
  if (qErr) return fail(qErr.message)

  return NextResponse.json({ id: tpl.id, questions: standards.length })
}
