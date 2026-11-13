// Audit photos: access rules and limits shared by the photo APIs, the review screen and the report.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@/types'
import { canViewProperty, isViewer } from '@/lib/access'
import { canWorkOnAudit, isAuditOpen } from '@/lib/auditAccess'

export const PHOTO_BUCKET = 'audit-photos'
export const MAX_PHOTOS_PER_STANDARD = 4
export const MAX_PHOTOS_PER_CAMPAIGN = 40
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024 // client compresses to ~200 KB; this is the server-side ceiling
export const PHOTO_MIME: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

export interface PhotoCampaign {
  id: string
  tenant_id: string
  status: string
  auditor_user_id: string | null
  template_id: string
  property_id: string
}

export async function loadPhotoCampaign(supabase: SupabaseClient<any, any, any>, campaignId: string): Promise<PhotoCampaign | null> {
  const { data } = await supabase
    .from('campaigns')
    .select('id, tenant_id, status, auditor_user_id, template_id, property_id')
    .eq('id', campaignId)
    .maybeSingle()
  return (data as unknown as PhotoCampaign) ?? null
}

/** Who may VIEW photos of a campaign. Viewers (client / property / department managers) only on published audits they can see. */
export async function canViewPhotos(supabase: SupabaseClient<any, any, any>, user: User, c: PhotoCampaign): Promise<boolean> {
  if (user.role === 'super_admin') return true
  if (user.role === 'tenant_admin') return c.tenant_id === user.tenant_id
  if (user.role === 'auditor') return c.tenant_id === user.tenant_id && c.auditor_user_id === user.id
  if (isViewer(user.role)) {
    return c.tenant_id === user.tenant_id && c.status === 'published' && (await canViewProperty(supabase, user, c.property_id, c.tenant_id))
  }
  return false
}

/** Who may ADD or REMOVE photos: the assigned auditor or the tenant's admins, while the audit is still open (not yet submitted). */
export function canEditPhotos(user: User, c: PhotoCampaign): boolean {
  return isAuditOpen(c.status) && canWorkOnAudit(user, c)
}
