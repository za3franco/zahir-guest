import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { canWorkOnAudit, isAuditOpen, standardSectionInTemplate } from '@/lib/auditAccess'
import { applyResponse } from '@/lib/auditSync'

const RESPONSES = ['meet', 'below', 'na']
const MAX_NOTE = 20000 // generous ceiling: protects the database, never reached by a real observation

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params
  const user = await requireUser()
  const lang = langOf(user)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => null)
  const standard_id = typeof body?.standard_id === 'string' ? body.standard_id : ''
  const response = body?.response ?? null
  const auditor_note = body?.auditor_note ?? null
  if (!standard_id || (response !== null && !RESPONSES.includes(response)) || (auditor_note !== null && typeof auditor_note !== 'string')) {
    return apiError(lang, 'invalid_request')
  }

  // Verify campaign access
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, auditor_user_id, tenant_id, status, template_id')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return apiError(lang, 'audit_not_found')
  }

  // Only the assigned auditor or admins of the same workspace may touch an audit
  if (!canWorkOnAudit(user, campaign)) {
    return apiError(lang, 'forbidden')
  }

  // Once submitted, answers are frozen (the score is computed at submission); an admin reopens the audit to change them
  if (!isAuditOpen(campaign.status)) {
    return apiError(lang, 'audit_closed')
  }

  // The standard must belong to this audit's questionnaire
  if (!(await standardSectionInTemplate(supabaseAdmin, standard_id, campaign.template_id))) {
    return apiError(lang, 'unknown_standard')
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
    return serverError(lang, err, 'audit/id/response')
  }

  return NextResponse.json({ ok: true })
}
