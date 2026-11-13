import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { canWorkOnAudit, isAuditOpen, standardSectionInTemplate } from '@/lib/auditAccess'
import { applyResponse } from '@/lib/auditSync'

const RESPONSES = ['meet', 'below', 'na']
const MAX_NOTE = 20000 // generous ceiling: protects the database, never reached by a real observation

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => null)
  const standard_id = typeof body?.standard_id === 'string' ? body.standard_id : ''
  const response = body?.response ?? null
  const auditor_note = body?.auditor_note ?? null
  if (!standard_id || (response !== null && !RESPONSES.includes(response)) || (auditor_note !== null && typeof auditor_note !== 'string')) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  // Verify campaign access
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, auditor_user_id, tenant_id, status, template_id')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Only the assigned auditor or admins of the same workspace may touch an audit
  if (!canWorkOnAudit(user, campaign)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Once submitted, answers are frozen (the score is computed at submission); an admin reopens the audit to change them
  if (!isAuditOpen(campaign.status)) {
    return NextResponse.json({ error: 'Audit is closed', code: 'audit_closed' }, { status: 409 })
  }

  // The standard must belong to this audit's questionnaire
  if (!(await standardSectionInTemplate(supabaseAdmin, standard_id, campaign.template_id))) {
    return NextResponse.json({ error: 'Standard does not belong to this audit', code: 'unknown_standard' }, { status: 400 })
  }

  // Update campaign status to in_progress if still assigned
  if (campaign.status === 'assigned') {
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'in_progress' })
      .eq('id', params.id)
      .eq('status', 'assigned')
  }

  // Same rule as the offline sync: the change is stamped now, so it wins over anything older
  try {
    await applyResponse(supabaseAdmin, params.id, user.id, standard_id, response, auditor_note === null ? null : auditor_note.slice(0, MAX_NOTE), null)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
