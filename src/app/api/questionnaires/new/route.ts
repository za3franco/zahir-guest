import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { libraryLockedResponse } from '@/lib/limits'
import { loadTemplateTree, type TreeDomain } from '@/lib/questionnaireTree'
import { CLASSIFICATIONS, MAX_QUESTIONS } from '@/lib/questionnaireImport'

const txt = (v: unknown, max = 1000) => String(v ?? '').trim().slice(0, max)

/** Cleans a questionnaire structure coming from the browser (guided start, AI import). */
function sanitize(input: unknown): TreeDomain[] {
  const out: TreeDomain[] = []
  for (const d of Array.isArray(input) ? input : []) {
    const dn = { en: txt(d?.name_en, 200), fr: txt(d?.name_fr, 200) }
    if (!dn.en && !dn.fr) continue
    const sections = []
    for (const s of Array.isArray(d?.sections) ? d.sections : []) {
      const sn = { en: txt(s?.name_en, 200), fr: txt(s?.name_fr, 200) }
      if (!sn.en && !sn.fr) continue
      const standards = []
      for (const q of Array.isArray(s?.standards) ? s.standards : []) {
        const en = txt(q?.question_en), fr = txt(q?.question_fr)
        if (!en && !fr) continue
        const cls = (CLASSIFICATIONS as readonly string[]).includes(q?.classification) ? q.classification : 'SERVICE'
        standards.push({ id: '', question_en: en || fr, question_fr: fr || en, classification: cls, critical: !!q?.critical, guidance_en: txt(q?.guidance_en) || txt(q?.guidance_fr), guidance_fr: txt(q?.guidance_fr) || txt(q?.guidance_en) })
      }
      sections.push({ id: '', name_en: sn.en || sn.fr, name_fr: sn.fr || sn.en, standards })
    }
    if (sections.length) out.push({ id: '', name_en: dn.en || dn.fr, name_fr: dn.fr || dn.en, sections })
  }
  return out
}

// New questionnaire: blank, a copy of an existing one, or a ready structure (guided start / AI import).
export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  {
    const locked = await libraryLockedResponse(user.tenant_id, user.default_language === 'en' ? 'en' : 'fr')
    if (locked) return locked
  }
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const body = await request.json().catch(() => null)
  const name = txt(body?.name, 120)
  if (!name) return NextResponse.json({ error: lang === 'en' ? 'Please name the questionnaire.' : 'Donnez un nom au questionnaire.' }, { status: 400 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  let domains: TreeDomain[]
  if (body?.from) {
    const source = await loadTemplateTree(db, String(body.from), user.tenant_id)
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    domains = source.domains
  } else if (body?.tree) {
    domains = sanitize(body.tree)
    if (!domains.length) return NextResponse.json({ error: lang === 'en' ? 'The questionnaire is empty.' : 'Le questionnaire est vide.' }, { status: 400 })
  } else {
    domains = [{ id: '', name_en: 'New domain', name_fr: 'Nouveau domaine', sections: [{ id: '', name_en: 'New section', name_fr: 'Nouvelle section', standards: [] }] }]
  }
  const total = domains.reduce((n, d) => n + d.sections.reduce((m, s) => m + s.standards.length, 0), 0)
  if (total > MAX_QUESTIONS) return NextResponse.json({ error: lang === 'en' ? `Too many questions (maximum ${MAX_QUESTIONS}).` : `Trop de questions (maximum ${MAX_QUESTIONS}).` }, { status: 400 })

  const { data: tpl, error } = await db
    .from('questionnaire_templates')
    .insert({ tenant_id: user.tenant_id, name, tier: 'custom', language: 'bilingual', is_active: true })
    .select('id')
    .single()
  if (error || !tpl) return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 })
  const fail = async (msg: string) => {
    await db.from('questionnaire_templates').delete().eq('id', tpl.id) // cascades
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const { data: dRows, error: dErr } = await db
    .from('template_domains')
    .insert(domains.map((d, i) => ({ template_id: tpl.id, name_en: d.name_en, name_fr: d.name_fr, display_order: i + 1, weight: 1 })))
    .select('id, display_order')
  if (dErr || !dRows) return fail(dErr?.message ?? 'Error')
  const dId = new Map(dRows.map(r => [r.display_order, r.id]))

  const secPayload = domains.flatMap((d, i) => d.sections.map((s, j) => ({ domain_id: dId.get(i + 1)!, name_en: s.name_en, name_fr: s.name_fr, display_order: j + 1, is_optional: !!s.optional, weight: 1 })))
  const { data: sRows, error: sErr } = await db.from('template_sections').insert(secPayload).select('id, domain_id, display_order')
  if (sErr || !sRows) return fail(sErr?.message ?? 'Error')
  const sId = new Map(sRows.map(r => [`${r.domain_id}|${r.display_order}`, r.id]))

  const stds = domains.flatMap((d, i) => d.sections.flatMap((s, j) => s.standards.map((q, k) => ({
    section_id: sId.get(`${dId.get(i + 1)}|${j + 1}`)!, question_en: q.question_en, question_fr: q.question_fr,
    performance_classification: q.classification, display_order: k + 1, is_critical: q.critical,
    guidance_en: q.guidance_en || null, guidance_fr: q.guidance_fr || null,
  }))))
  for (let i = 0; i < stds.length; i += 300) {
    const { error: qErr } = await db.from('template_standards').insert(stds.slice(i, i + 300))
    if (qErr) return fail(qErr.message)
  }
  return NextResponse.json({ id: tpl.id, questions: stds.length })
}
