// Per-client figures for the Clients pages: properties, people with access, audits vs contract.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClientRow } from '@/lib/clients'

export interface ClientStats {
  properties: number
  users: number
  auditsDone: number
  auditsInProgress: number
  lastPublishedAt: string | null
}

const DONE = ['published', 'finalized']
const ONGOING = ['assigned', 'in_progress', 'submitted', 'under_review']

export async function loadClientStats(
  db: SupabaseClient<any, any, any>,
  tenantId: string,
  clients: ClientRow[]
): Promise<Map<string, ClientStats>> {
  const out = new Map<string, ClientStats>()
  if (!clients.length) return out
  const ids = clients.map(c => c.id)

  const [{ data: props }, { data: access }] = await Promise.all([
    db.from('properties').select('id, client_id').eq('tenant_id', tenantId).in('client_id', ids),
    db.from('user_access').select('user_id, client_id, property_id').eq('tenant_id', tenantId),
  ])
  const propClient = new Map<string, string>()
  for (const p of props ?? []) propClient.set(p.id, p.client_id)

  const propIds = Array.from(propClient.keys())
  const { data: camps } = propIds.length
    ? await db.from('campaigns').select('property_id, status, created_at, published_at').eq('tenant_id', tenantId).in('property_id', propIds)
    : { data: [] as any[] }

  for (const c of clients) {
    const myProps = Array.from(propClient.entries()).filter(([, cid]) => cid === c.id).map(([pid]) => pid)
    const users = new Set<string>()
    for (const a of access ?? []) {
      if (a.client_id === c.id || (a.property_id && myProps.includes(a.property_id))) users.add(a.user_id)
    }
    // Audits counted against the contract: those created within the contract dates when set
    const inPeriod = (iso: string) =>
      (!c.contract_start || iso.slice(0, 10) >= c.contract_start) && (!c.contract_end || iso.slice(0, 10) <= c.contract_end)
    const mine = (camps ?? []).filter((x: any) => myProps.includes(x.property_id) && inPeriod(x.created_at))
    const published = mine.filter((x: any) => x.published_at).map((x: any) => x.published_at as string).sort()
    out.set(c.id, {
      properties: myProps.length,
      users: users.size,
      auditsDone: mine.filter((x: any) => DONE.includes(x.status)).length,
      auditsInProgress: mine.filter((x: any) => ONGOING.includes(x.status)).length,
      lastPublishedAt: published.length ? published[published.length - 1] : null,
    })
  }
  return out
}
