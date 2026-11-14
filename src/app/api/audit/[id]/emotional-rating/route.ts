import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { canWorkOnAudit, isAuditOpen, sectionInTemplate } from '@/lib/auditAccess'
import { applyRating } from '@/lib/auditSync'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()
  const lang = langOf(user)

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json().catch(() => null)
  const section_id = typeof body?.section_id === 'string' ? body.section_id : ''
  const rating = body?.rating

  if (!section_id || !Number.isInteger(rating) || rating < 1 || rating > 5) {
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

  // Once submitted, ratings are frozen like answers
  if (!isAuditOpen(campaign.status)) {
    return apiError(lang, 'audit_closed')
  }

  // The section must belong to this audit's questionnaire
  if (!(await sectionInTemplate(supabaseAdmin, section_id, campaign.template_id))) {
    return apiError(lang, 'unknown_section')
  }

  if (campaign.status === 'assigned') {
    await supabaseAdmin.from('campaigns').update({ status: 'in_progress' }).eq('id', params.id).eq('status', 'assigned')
  }

  try {
    await applyRating(supabaseAdmin, params.id, user.id, section_id, rating, null)
  } catch (err) {
    return serverError(lang, err, 'audit/id/emotional-rating')
  }

  return NextResponse.json({ ok: true })
}
