// Who may write to an audit (answers, notes, section ratings, photos) and what they may write.
// Shared by the audit APIs so every write path applies the same rules.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@/types'

/** An audit can only be edited before it is submitted. Admins reopen it by moving it back to "in progress". */
export const AUDIT_OPEN_STATUSES = ['assigned', 'in_progress'] as const

export function isAuditOpen(status: string): boolean {
  return (AUDIT_OPEN_STATUSES as readonly string[]).includes(status)
}

export interface AuditCampaignRef {
  tenant_id: string
  auditor_user_id: string | null
}

/** The assigned auditor, or an admin of the same workspace (a super admin may act anywhere). */
export function canWorkOnAudit(user: User, c: AuditCampaignRef): boolean {
  if (user.role === 'super_admin') return true
  if (user.role === 'tenant_admin') return c.tenant_id === user.tenant_id
  if (user.role === 'auditor') return c.tenant_id === user.tenant_id && c.auditor_user_id === user.id
  return false
}

/** True when the standard belongs to the given questionnaire; returns its section id. */
export async function standardSectionInTemplate(
  supabase: SupabaseClient<any, any, any>, standardId: string, templateId: string,
): Promise<string | null> {
  if (!standardId) return null
  const { data: standard } = await supabase.from('template_standards').select('section_id').eq('id', standardId).maybeSingle()
  if (!standard) return null
  return (await sectionInTemplate(supabase, standard.section_id, templateId)) ? standard.section_id : null
}

/** True when the section belongs to the given questionnaire. */
export async function sectionInTemplate(
  supabase: SupabaseClient<any, any, any>, sectionId: string, templateId: string,
): Promise<boolean> {
  if (!sectionId) return false
  const { data: section } = await supabase.from('template_sections').select('domain_id').eq('id', sectionId).maybeSingle()
  if (!section) return false
  const { data: domain } = await supabase.from('template_domains').select('template_id').eq('id', section.domain_id).maybeSingle()
  return !!domain && domain.template_id === templateId
}
