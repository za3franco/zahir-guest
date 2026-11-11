import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { loadTemplateTree } from '@/lib/questionnaireTree'

// New questionnaire: blank, or a copy of an existing one (e.g. the Zahir Guest standard) to adapt.
export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const body = await request.json().catch(() => null)
  const name = String(body?.name ?? '').trim().slice(0, 120)
  if (!name) return NextResponse.json({ error: lang === 'en' ? 'Please name the questionnaire.' : 'Donnez un nom au questionnaire.' }, { status: 400 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const source = body?.from ? await loadTemplateTree(db, String(body.from), user.tenant_id) : null
  if (body?.from && !source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: tpl, error } = await db
    .from('questionnaire_templates')
    .insert({ tenant_id: user.tenant_id, name, tier: 'custom', language: 'bilingual', is_active: true })
    .select('id')
    .single()
  if (error || !tpl) return NextResponse.json({ error: error?.message ?? 'Error' }, { status: 500 })
  const fail = async (msg: string) => {
    await db.from('questionnaire_templates').delete().eq('id', tpl.id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const domains = source
    ? source.domains
    : [{ id: '', name_en: 'New domain', name_fr: 'Nouveau domaine', sections: [{ id: '', name_en: 'New section', name_fr: 'Nouvelle section', standards: [] }] }]

  const { data: dRows, error: dErr } = await db
    .from('template_domains')
    .insert(domains.map((d, i) => ({ template_id: tpl.id, name_en: d.name_en, name_fr: d.name_fr, display_order: i + 1, weight: 1 })))
    .select('id, display_order')
  if (dErr || !dRows) return fail(dErr?.message ?? 'Error')
  const dId = new Map(dRows.map(r => [r.display_order, r.id]))

  const secPayload = domains.flatMap((d, i) => d.sections.map((s, j) => ({ domain_id: dId.get(i + 1)!, name_en: s.name_en, name_fr: s.name_fr, display_order: j + 1, is_optional: false, weight: 1 })))
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
  return NextResponse.json({ id: tpl.id })
}
