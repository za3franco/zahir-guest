import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { libraryLockedResponse } from '@/lib/limits'
import { loadTemplateTree, type TreeDomain } from '@/lib/questionnaireTree'
import { CLASSIFICATIONS } from '@/lib/questionnaireImport'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const txt = (v: unknown, max = 1000) => String(v ?? '').trim().slice(0, max)

// Saves the whole editor state of a workspace-owned questionnaire. Existing ids are updated in place so audit
// answers stay attached; questions that already have answers cannot be deleted (archive the questionnaire instead).
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  {
    const locked = await libraryLockedResponse(user.tenant_id, user.default_language === 'en' ? 'en' : 'fr')
    if (locked) return locked
  }
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const current = await loadTemplateTree(db, params.id, user.tenant_id)
  if (!current || current.tenant_id !== user.tenant_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  const input: TreeDomain[] = Array.isArray(body?.domains) ? body.domains : []
  const name = txt(body?.name, 120)
  if (!name) return NextResponse.json({ error: lang === 'en' ? 'Please name the questionnaire.' : 'Donnez un nom au questionnaire.' }, { status: 400 })

  const domains: any[] = [], sections: any[] = [], standards: any[] = []
  let bad = false
  input.forEach((d: any, i: number) => {
    if (!UUID.test(d?.id)) { bad = true; return }
    domains.push({ id: d.id, template_id: params.id, name_en: txt(d.name_en, 200) || txt(d.name_fr, 200), name_fr: txt(d.name_fr, 200) || txt(d.name_en, 200), display_order: i + 1, weight: 1 })
    ;(d.sections ?? []).forEach((s: any, j: number) => {
      if (!UUID.test(s?.id)) { bad = true; return }
      sections.push({ id: s.id, domain_id: d.id, name_en: txt(s.name_en, 200) || txt(s.name_fr, 200), name_fr: txt(s.name_fr, 200) || txt(s.name_en, 200), display_order: j + 1, is_optional: false, weight: 1 })
      ;(s.standards ?? []).forEach((q: any, k: number) => {
        if (!UUID.test(q?.id) || !(CLASSIFICATIONS as readonly string[]).includes(q.classification)) { bad = true; return }
        const en = txt(q.question_en), fr = txt(q.question_fr)
        if (!en && !fr) return // blank rows are ignored
        standards.push({
          id: q.id, section_id: s.id, question_en: en || fr, question_fr: fr || en, performance_classification: q.classification,
          display_order: k + 1, is_critical: !!q.critical, guidance_en: txt(q.guidance_en) || null, guidance_fr: txt(q.guidance_fr) || null,
        })
      })
    })
  })
  if (bad || !domains.length) return NextResponse.json({ error: lang === 'en' ? 'Invalid questionnaire.' : 'Questionnaire invalide.' }, { status: 400 })
  if (domains.some(d => !d.name_en) || sections.some(s => !s.name_en)) {
    return NextResponse.json({ error: lang === 'en' ? 'Every domain and section needs a name.' : 'Chaque domaine et section doit avoir un nom.' }, { status: 400 })
  }

  // New ids must not collide with rows that belong to something else
  const known = {
    domains: new Set(current.domains.map(d => d.id)),
    sections: new Set(current.domains.flatMap(d => d.sections.map(s => s.id))),
    standards: new Set(current.domains.flatMap(d => d.sections.flatMap(s => s.standards.map(q => q.id)))),
  }
  const clash = async (table: string, rows: any[], set: Set<string>) => {
    const fresh = rows.filter(r => !set.has(r.id)).map(r => r.id)
    for (let i = 0; i < fresh.length; i += 100) {
      const { data } = await db.from(table).select('id').in('id', fresh.slice(i, i + 100))
      if (data?.length) return true
    }
    return false
  }
  if ((await clash('template_domains', domains, known.domains)) || (await clash('template_sections', sections, known.sections)) || (await clash('template_standards', standards, known.standards))) {
    return NextResponse.json({ error: 'Conflict' }, { status: 409 })
  }

  // A questionnaire used by an audit in progress keeps its structure (auditors may be working offline on it):
  // texts can be corrected, but questions, sections and domains cannot be added, removed or moved.
  const { count: openAudits } = await db.from('campaigns').select('id', { count: 'exact', head: true })
    .eq('template_id', params.id).in('status', ['assigned', 'in_progress'])
  if (openAudits) {
    const shape = (ds: { id: string; sections: { id: string; standards: { id: string }[] }[] }[]) =>
      JSON.stringify(ds.map(d => [d.id, d.sections.map(s => [s.id, s.standards.map(q => q.id).sort()]).sort()]).sort())
    const before = shape(current.domains)
    const after = shape(domains.map(d => ({
      id: d.id,
      sections: sections.filter(s => s.domain_id === d.id).map(s => ({ id: s.id, standards: standards.filter(q => q.section_id === s.id).map(q => ({ id: q.id })) })),
    })))
    if (before !== after) {
      return NextResponse.json({
        code: 'structure_locked',
        error: lang === 'en'
          ? `This questionnaire is used by ${openAudits} audit${openAudits > 1 ? 's' : ''} in progress: you can correct its texts, but not add, remove or move questions until ${openAudits > 1 ? 'they are' : 'it is'} submitted. To change the structure now, create a new questionnaire for the next audits.`
          : `Ce questionnaire est utilisé par ${openAudits} audit${openAudits > 1 ? 's' : ''} en cours : vous pouvez corriger ses textes, mais pas ajouter, retirer ou déplacer des questions avant ${openAudits > 1 ? 'leur' : 'sa'} soumission. Pour changer la structure maintenant, créez un nouveau questionnaire pour les prochains audits.`,
      }, { status: 409 })
    }
  }

  // Removed questions: refuse when they already have answers
  const keptStd = new Set(standards.map(q => q.id))
  const removedStd = Array.from(known.standards).filter(id => !keptStd.has(id))
  for (let i = 0; i < removedStd.length; i += 100) {
    const { count } = await db.from('audit_responses').select('id', { count: 'exact', head: true }).in('standard_id', removedStd.slice(i, i + 100))
    if (count) {
      return NextResponse.json({
        error: lang === 'en'
          ? 'Some questions you removed already have audit answers, so they cannot be deleted. Put them back, or archive this questionnaire and create a new version.'
          : 'Certaines questions supprimées ont déjà des réponses d\'audit et ne peuvent pas être supprimées. Remettez-les, ou archivez ce questionnaire et créez-en une nouvelle version.',
      }, { status: 409 })
    }
  }

  const up = async (table: string, rows: any[]) => {
    for (let i = 0; i < rows.length; i += 300) {
      const { error } = await db.from(table).upsert(rows.slice(i, i + 300), { onConflict: 'id' })
      if (error) throw new Error(error.message)
    }
  }
  try {
    await db.from('questionnaire_templates').update({ name }).eq('id', params.id)
    await up('template_domains', domains)
    await up('template_sections', sections)
    await up('template_standards', standards)
    // Deletions last (children first). Removing a section/domain also removes anything left under it.
    const keptSec = new Set(sections.map(s => s.id)), keptDom = new Set(domains.map(d => d.id))
    const del = async (table: string, ids: string[]) => { for (let i = 0; i < ids.length; i += 100) await db.from(table).delete().in('id', ids.slice(i, i + 100)) }
    await del('template_standards', removedStd)
    await del('template_sections', Array.from(known.sections).filter(id => !keptSec.has(id)))
    await del('template_domains', Array.from(known.domains).filter(id => !keptDom.has(id)))
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, questions: standards.length })
}
