// Portfolio analytics: one compact row per scored audit, computed from the stored report scores.
// Admins see every finalized/published audit of the workspace; viewers only published audits of their properties.
import type { SupabaseClient } from '@supabase/supabase-js'
import { accessiblePropertyIds, isAdminRole } from '@/lib/access'

export interface AuditRow {
  id: string; name: string; date: string
  propertyId: string; propertyName: string; city: string | null
  clientId: string | null
  overall: number | null
  domains: { en: string; fr: string; pct: number | null }[]
  classes: Record<string, number | null>
  criticalBelow: number
  below: { en: string; fr: string; critical: boolean }[]
}

const MAX_BELOW = 400

export async function loadAuditRows(db: SupabaseClient<any, any, any>, user: { id: string; role: string; tenant_id: string }): Promise<AuditRow[]> {
  const admin = isAdminRole(user.role)
  const access = await accessiblePropertyIds(db, user)
  if (access !== 'all' && !access.length) return []

  let q = db
    .from('campaigns')
    .select('id, name, status, published_at, submitted_at, property_id, property:properties(name, city, client_id)')
    .eq('tenant_id', user.tenant_id)
    .in('status', admin ? ['finalized', 'published'] : ['published'])
  if (access !== 'all') q = q.in('property_id', access)
  const { data: campaigns } = await q
  if (!campaigns?.length) return []

  const reports: any[] = []
  const ids = campaigns.map(c => c.id)
  for (let i = 0; i < ids.length; i += 50) {
    const { data } = await db.from('audit_reports').select('campaign_id, report_json').in('campaign_id', ids.slice(i, i + 50))
    reports.push(...(data ?? []))
  }
  const byCampaign = new Map(reports.map(r => [r.campaign_id, r.report_json]))

  const rows: AuditRow[] = []
  for (const c of campaigns as any[]) {
    const s = byCampaign.get(c.id)
    if (!s) continue
    const prop = Array.isArray(c.property) ? c.property[0] : c.property
    const below: AuditRow['below'] = []
    let criticalBelow = 0
    for (const d of s.domains ?? []) for (const sec of d.sections ?? []) for (const st of sec.standards ?? []) {
      if (st.response !== 'below') continue
      if (st.is_critical) criticalBelow++
      if (below.length < MAX_BELOW) below.push({ en: st.question_en, fr: st.question_fr, critical: !!st.is_critical })
    }
    const classes: Record<string, number | null> = {}
    for (const [k, v] of Object.entries(s.classification_breakdown ?? {})) classes[k] = (v as any)?.meet_percent ?? null
    rows.push({
      id: c.id, name: c.name, date: c.published_at ?? c.submitted_at ?? '',
      propertyId: c.property_id, propertyName: prop?.name ?? '', city: prop?.city ?? null, clientId: prop?.client_id ?? null,
      overall: s.overall_percent ?? null,
      domains: (s.domains ?? []).map((d: any) => ({ en: d.name_en, fr: d.name_fr, pct: d.score_percent ?? null })),
      classes, criticalBelow, below,
    })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}
