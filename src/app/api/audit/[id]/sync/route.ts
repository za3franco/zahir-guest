import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { canWorkOnAudit, isAuditOpen } from '@/lib/auditAccess'
import { SYNC_MAX_OPS, applyOps, auditState } from '@/lib/auditSync'

export const dynamic = 'force-dynamic'

const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function loadCampaign(supabase: ReturnType<typeof db>, id: string) {
  const { data } = await supabase
    .from('campaigns')
    .select('id, tenant_id, auditor_user_id, status, template_id')
    .eq('id', id)
    .maybeSingle()
  return data
}

// Current state of the audit on the server (answers, ratings, photos, status) so a phone can catch up.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const supabase = db()
  const campaign = await loadCampaign(supabase, params.id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found', code: 'not_found' }, { status: 404 })
  if (!canWorkOnAudit(user, campaign)) return NextResponse.json({ error: 'Unauthorized', code: 'forbidden' }, { status: 403 })
  const state = await auditState(supabase, campaign.id)
  return NextResponse.json(
    { status: campaign.status, open: isAuditOpen(campaign.status), server_time: new Date().toISOString(), ...state },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

// Queued changes from a phone: { ops: [{ op_id, kind: 'response' | 'rating', ..., client_updated_at }] }.
// Each op is applied only if it is the most recent change for its standard / section.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  const body = await request.json().catch(() => null)
  const ops: unknown[] = Array.isArray(body?.ops) ? body.ops : []
  if (!ops.length || ops.length > SYNC_MAX_OPS) return NextResponse.json({ error: 'Invalid data', code: 'invalid' }, { status: 400 })

  const supabase = db()
  const campaign = await loadCampaign(supabase, params.id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found', code: 'not_found' }, { status: 404 })
  if (!canWorkOnAudit(user, campaign)) return NextResponse.json({ error: 'Unauthorized', code: 'forbidden' }, { status: 403 })
  if (!isAuditOpen(campaign.status)) {
    return NextResponse.json({ error: 'Audit is closed', code: 'audit_closed', status: campaign.status }, { status: 409 })
  }

  const results = await applyOps(supabase, campaign.id, user.id, campaign.template_id, ops)

  // The audit starts when the first data comes in
  if (campaign.status === 'assigned' && results.some(r => r.result === 'applied')) {
    await supabase.from('campaigns').update({ status: 'in_progress' }).eq('id', campaign.id).eq('status', 'assigned')
  }

  return NextResponse.json({ ok: true, results, server_time: new Date().toISOString() })
}
