// Server side of the audit synchronisation (ZG-6 offline mode).
// The phone sends queued changes with the time they were made ON THE PHONE; the database keeps, per standard /
// section, the most recent one (zg_apply_audit_response / zg_apply_audit_rating, migration 014).

import type { SupabaseClient } from '@supabase/supabase-js'

export const SYNC_MAX_OPS = 300
const RESPONSES = ['meet', 'below', 'na']
const MAX_NOTE = 20000

export type SyncOp =
  | { op_id: string; kind: 'response'; standard_id: string; response: 'meet' | 'below' | 'na' | null; note: string | null; client_updated_at: string | null }
  | { op_id: string; kind: 'rating'; section_id: string; rating: number; client_updated_at: string | null }

export type SyncResult =
  | { op_id: string; result: 'applied' }
  // a more recent change (other device) is stored: the phone takes this value
  | { op_id: string; result: 'superseded'; value: { response?: string | null; note?: string | null; rating?: number; client_updated_at: string | null } }
  | { op_id: string; result: 'rejected'; code: 'invalid' | 'unknown_standard' | 'unknown_section' | 'error' }

/** Parses one op from the request body; null when malformed. */
export function parseOp(o: any): SyncOp | null {
  if (!o || typeof o.op_id !== 'string' || o.op_id.length > 64) return null
  const ts = typeof o.client_updated_at === 'string' && !Number.isNaN(Date.parse(o.client_updated_at)) ? o.client_updated_at : null
  if (o.kind === 'response') {
    const response = o.response ?? null
    const note = o.note ?? null
    if (typeof o.standard_id !== 'string' || (response !== null && !RESPONSES.includes(response)) || (note !== null && typeof note !== 'string')) return null
    return { op_id: o.op_id, kind: 'response', standard_id: o.standard_id, response, note: note === null ? null : note.slice(0, MAX_NOTE), client_updated_at: ts }
  }
  if (o.kind === 'rating') {
    if (typeof o.section_id !== 'string' || !Number.isInteger(o.rating) || o.rating < 1 || o.rating > 5) return null
    return { op_id: o.op_id, kind: 'rating', section_id: o.section_id, rating: o.rating, client_updated_at: ts }
  }
  return null
}

/** Ids of the sections and standards of a questionnaire (two queries, run together). */
export async function templateIds(db: SupabaseClient<any, any, any>, templateId: string) {
  const [{ data: sections }, { data: standards }] = await Promise.all([
    db.from('template_sections').select('id, template_domains!inner(template_id)').eq('template_domains.template_id', templateId),
    db.from('template_standards').select('id, template_sections!inner(template_domains!inner(template_id))').eq('template_sections.template_domains.template_id', templateId),
  ])
  return { sections: new Set((sections ?? []).map(s => s.id as string)), standards: new Set((standards ?? []).map(s => s.id as string)) }
}

export async function applyResponse(db: SupabaseClient<any, any, any>, campaignId: string, userId: string,
  standardId: string, response: string | null, note: string | null, clientTs: string | null) {
  const { data, error } = await db.rpc('zg_apply_audit_response', {
    p_campaign: campaignId, p_standard: standardId, p_response: response, p_note: note, p_client_ts: clientTs, p_user: userId,
  })
  if (error) throw new Error(error.message)
  return data as { applied: boolean; response: string | null; note: string | null; client_updated_at: string | null }
}

export async function applyRating(db: SupabaseClient<any, any, any>, campaignId: string, userId: string,
  sectionId: string, rating: number, clientTs: string | null) {
  const { data, error } = await db.rpc('zg_apply_audit_rating', {
    p_campaign: campaignId, p_section: sectionId, p_rating: rating, p_client_ts: clientTs, p_user: userId,
  })
  if (error) throw new Error(error.message)
  return data as { applied: boolean; rating: number; client_updated_at: string | null }
}

/** Applies a batch in order. Ops are independent: one failure never blocks the others. */
export async function applyOps(db: SupabaseClient<any, any, any>, campaignId: string, userId: string, templateId: string, raw: unknown[]): Promise<SyncResult[]> {
  const ids = await templateIds(db, templateId)
  const results: SyncResult[] = []
  for (const r of raw) {
    const op = parseOp(r)
    const opId = typeof (r as any)?.op_id === 'string' ? (r as any).op_id.slice(0, 64) : ''
    if (!op) { results.push({ op_id: opId, result: 'rejected', code: 'invalid' }); continue }
    try {
      if (op.kind === 'response') {
        if (!ids.standards.has(op.standard_id)) { results.push({ op_id: op.op_id, result: 'rejected', code: 'unknown_standard' }); continue }
        const d = await applyResponse(db, campaignId, userId, op.standard_id, op.response, op.note, op.client_updated_at)
        results.push(d.applied ? { op_id: op.op_id, result: 'applied' }
          : { op_id: op.op_id, result: 'superseded', value: { response: d.response, note: d.note, client_updated_at: d.client_updated_at } })
      } else {
        if (!ids.sections.has(op.section_id)) { results.push({ op_id: op.op_id, result: 'rejected', code: 'unknown_section' }); continue }
        const d = await applyRating(db, campaignId, userId, op.section_id, op.rating, op.client_updated_at)
        results.push(d.applied ? { op_id: op.op_id, result: 'applied' }
          : { op_id: op.op_id, result: 'superseded', value: { rating: d.rating, client_updated_at: d.client_updated_at } })
      }
    } catch (err) {
      console.error('[sync] op failed:', (err as Error).message)
      results.push({ op_id: op.op_id, result: 'rejected', code: 'error' })
    }
  }
  return results
}

/** Current server state of an audit, as the phone needs it to catch up with other devices. */
export async function auditState(db: SupabaseClient<any, any, any>, campaignId: string) {
  const [{ data: responses }, { data: ratings }, { data: photos }] = await Promise.all([
    db.from('audit_responses').select('standard_id, response, auditor_note, client_updated_at, updated_at').eq('campaign_id', campaignId),
    db.from('audit_emotional_ratings').select('section_id, rating, client_updated_at, updated_at').eq('campaign_id', campaignId),
    db.from('audit_photos').select('id, standard_id').eq('campaign_id', campaignId).order('uploaded_at'),
  ])
  return {
    responses: (responses ?? []).map(r => ({ standard_id: r.standard_id, response: r.response, note: r.auditor_note ?? '', client_updated_at: r.client_updated_at ?? r.updated_at })),
    ratings: (ratings ?? []).map(r => ({ section_id: r.section_id, rating: r.rating, client_updated_at: r.client_updated_at ?? r.updated_at })),
    photos: (photos ?? []).map(p => ({ id: p.id, standard_id: p.standard_id })),
  }
}
