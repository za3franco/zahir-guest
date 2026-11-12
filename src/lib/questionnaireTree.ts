// Reads a whole questionnaire (domains → sections → questions) in one nested structure.
import type { SupabaseClient } from '@supabase/supabase-js'

type Db = SupabaseClient<any, any, any>

export interface TreeStandard { id: string; question_en: string; question_fr: string; classification: string; critical: boolean; guidance_en: string; guidance_fr: string }
export interface TreeSection { id: string; name_en: string; name_fr: string; optional?: boolean; standards: TreeStandard[] }
export interface TreeDomain { id: string; name_en: string; name_fr: string; sections: TreeSection[] }
export interface Tree { id: string; name: string; tenant_id: string | null; is_active: boolean; domains: TreeDomain[] }

/** Returns null when the template does not exist or belongs to another workspace. Platform templates (tenant_id null) are readable by all. */
export async function loadTemplateTree(db: Db, id: string, tenantId: string): Promise<Tree | null> {
  const { data: tpl } = await db.from('questionnaire_templates').select('id, name, tenant_id, is_active').eq('id', id).maybeSingle()
  if (!tpl || (tpl.tenant_id && tpl.tenant_id !== tenantId)) return null
  const { data: domains } = await db.from('template_domains').select('id, name_en, name_fr, display_order').eq('template_id', id).order('display_order')
  const domainIds = (domains ?? []).map(d => d.id)
  const { data: sections } = domainIds.length
    ? await db.from('template_sections').select('id, domain_id, name_en, name_fr, display_order, is_optional').in('domain_id', domainIds).order('display_order')
    : { data: [] as any[] }
  const sectionIds = (sections ?? []).map((s: any) => s.id)
  const standards: any[] = []
  for (let i = 0; i < sectionIds.length; i += 100) {
    const { data } = await db
      .from('template_standards')
      .select('id, section_id, question_en, question_fr, performance_classification, is_critical, guidance_en, guidance_fr, display_order')
      .in('section_id', sectionIds.slice(i, i + 100))
      .order('display_order')
    standards.push(...(data ?? []))
  }
  return {
    id: tpl.id, name: tpl.name, tenant_id: tpl.tenant_id, is_active: tpl.is_active,
    domains: (domains ?? []).map(d => ({
      id: d.id, name_en: d.name_en, name_fr: d.name_fr,
      sections: (sections ?? []).filter((s: any) => s.domain_id === d.id).map((s: any) => ({
        id: s.id, name_en: s.name_en, name_fr: s.name_fr, optional: !!s.is_optional,
        standards: standards.filter(q => q.section_id === s.id).map(q => ({
          id: q.id, question_en: q.question_en, question_fr: q.question_fr, classification: q.performance_classification,
          critical: !!q.is_critical, guidance_en: q.guidance_en ?? '', guidance_fr: q.guidance_fr ?? '',
        })),
      })),
    })),
  }
}
