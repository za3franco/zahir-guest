// Who can see which properties. The ONE place that answers this question for the whole app:
// reports, review pages, campaign lists, photos and publication emails all go through here.
//
//  - super_admin / tenant_admin: every property of their workspace
//  - client_admin, property_manager, department_manager ("viewers"): only the properties granted
//    in user_access, either directly (property_id) or through a client (client_id = all of that
//    client's properties, including ones added later). Viewers only ever see PUBLISHED reports.
//  - auditor: no property-level access (they work through the campaigns assigned to them)

import type { SupabaseClient } from '@supabase/supabase-js'

type Db = SupabaseClient<any, any, any>

export const VIEWER_ROLES = ['client_admin', 'property_manager', 'department_manager'] as const
export type ViewerRole = (typeof VIEWER_ROLES)[number]

export function isViewer(role: string | null | undefined): boolean {
  return !!role && (VIEWER_ROLES as readonly string[]).includes(role)
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'tenant_admin' || role === 'super_admin'
}

/** Roles a workspace admin may give to a user (never super_admin). */
export const ASSIGNABLE_ROLES = ['tenant_admin', 'auditor', 'client_admin', 'property_manager', 'department_manager'] as const

export const ROLE_LABELS: Record<string, { en: string; fr: string }> = {
  super_admin: { en: 'Super Admin', fr: 'Super Admin' },
  tenant_admin: { en: 'Admin', fr: 'Administrateur' },
  auditor: { en: 'Auditor', fr: 'Auditeur' },
  client_admin: { en: 'Client manager', fr: 'Responsable client' },
  property_manager: { en: 'Property manager', fr: "Directeur d'établissement" },
  department_manager: { en: 'Department manager', fr: 'Chef de département' },
}

/**
 * Property ids a user may see, within their workspace.
 * Returns 'all' for admins (callers then simply scope by tenant_id).
 */
export async function accessiblePropertyIds(
  db: Db,
  user: { id: string; role: string; tenant_id: string }
): Promise<string[] | 'all'> {
  if (isAdminRole(user.role)) return 'all'
  if (!isViewer(user.role)) return []

  const { data: rows } = await db
    .from('user_access')
    .select('client_id, property_id')
    .eq('user_id', user.id)
    .eq('tenant_id', user.tenant_id)

  const ids = new Set<string>()
  const clientIds: string[] = []
  for (const r of rows ?? []) {
    if (r.property_id) ids.add(r.property_id)
    if (r.client_id) clientIds.push(r.client_id)
  }
  if (clientIds.length) {
    const { data: props } = await db
      .from('properties')
      .select('id')
      .eq('tenant_id', user.tenant_id)
      .in('client_id', clientIds)
    for (const p of props ?? []) ids.add(p.id)
  }
  return Array.from(ids)
}

/** True when the user may see this property (and its published reports). */
export async function canViewProperty(
  db: Db,
  user: { id: string; role: string; tenant_id: string },
  propertyId: string | null | undefined,
  propertyTenantId?: string | null
): Promise<boolean> {
  if (!propertyId) return false
  if (user.role === 'super_admin') return true
  if (propertyTenantId && propertyTenantId !== user.tenant_id) return false
  const ids = await accessiblePropertyIds(db, user)
  if (ids === 'all') return propertyTenantId ? propertyTenantId === user.tenant_id : true
  return ids.includes(propertyId)
}

/** Viewers (client admins, property and department managers) who can see a given property. */
export async function viewersOfProperty(
  db: Db,
  tenantId: string,
  propertyId: string
): Promise<{ id: string; name: string; email: string; default_language: string | null; role: string }[]> {
  const { data: prop } = await db.from('properties').select('client_id').eq('id', propertyId).maybeSingle()
  const filters = [`property_id.eq.${propertyId}`]
  if (prop?.client_id) filters.push(`client_id.eq.${prop.client_id}`)
  const { data: rows } = await db
    .from('user_access')
    .select('user_id')
    .eq('tenant_id', tenantId)
    .or(filters.join(','))
  const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)))
  if (!userIds.length) return []
  const { data: users } = await db
    .from('users')
    .select('id, name, email, default_language, role')
    .eq('tenant_id', tenantId)
    .in('id', userIds)
  return (users ?? []).filter((u: any) => isViewer(u.role))
}
