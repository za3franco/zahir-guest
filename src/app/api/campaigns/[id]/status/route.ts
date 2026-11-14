import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { viewersOfProperty } from '@/lib/access'
import { createClient } from '@supabase/supabase-js'
import { sendReportPublishedEmail } from '@/lib/emailNotifications'

const FORWARD_TRANSITIONS: Record<string, string[]> = {
  assigned: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['under_review'],
  under_review: ['finalized'],
  finalized: ['published'],
}

const BACKWARD_TRANSITIONS: Record<string, string[]> = {
  in_progress: ['assigned'],
  submitted: ['in_progress'],
  under_review: ['submitted'],
  finalized: ['under_review'],
  published: ['finalized'],
}

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

  const { status: newStatus } = await request.json()

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('status, tenant_id, name, property_id, auditor_user_id')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return apiError(lang, 'audit_not_found')
  }

  if (campaign.tenant_id !== user.tenant_id) {
    return apiError(lang, 'forbidden')
  }

  // Only admins move campaigns through review and publication; an auditor can only start or
  // submit their own audit. Client / property / department managers can never change a status.
  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'
  const auditorStep = user.role === 'auditor' && campaign.auditor_user_id === user.id &&
    ((campaign.status === 'assigned' && newStatus === 'in_progress') || (campaign.status === 'in_progress' && newStatus === 'submitted'))
  if (!isAdmin && !auditorStep) {
    return apiError(lang, 'forbidden')
  }

  const forwardAllowed = FORWARD_TRANSITIONS[campaign.status] ?? []
  const backwardAllowed = BACKWARD_TRANSITIONS[campaign.status] ?? []
  const isBackward = backwardAllowed.includes(newStatus)

  if (isBackward && user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return apiError(lang, 'status_admin_only')
  }

  if (!forwardAllowed.includes(newStatus) && !backwardAllowed.includes(newStatus)) {
    return apiError(lang, 'status_transition')
  }

  const updateData: Record<string, any> = { status: newStatus }
  if (newStatus === 'published') updateData.published_at = new Date().toISOString()
  if (newStatus === 'submitted') updateData.submitted_at = new Date().toISOString()
  if (isBackward) {
    if (campaign.status === 'published') updateData.published_at = null
    if (['submitted', 'under_review'].includes(campaign.status)) updateData.submitted_at = null
  }

  const { error } = await supabaseAdmin
    .from('campaigns')
    .update(updateData)
    .eq('id', params.id)

  if (error) {
    return serverError(lang, error, 'campaigns/id/status')
  }

  // Publication email to everyone who can see this property (client, property and department managers)
  if (newStatus === 'published') {
    try {
      const [{ data: property }, { data: report }, viewers] = await Promise.all([
        supabaseAdmin.from('properties').select('name, city').eq('id', campaign.property_id).single(),
        supabaseAdmin.from('audit_reports').select('id, report_json').eq('campaign_id', params.id).single(),
        viewersOfProperty(supabaseAdmin, user.tenant_id, campaign.property_id),
      ])

      if (property && report) {
        const overallScore = (report.report_json as any)?.overall_percent ?? null
        for (const v of viewers) {
          await sendReportPublishedEmail({
            tenantId: user.tenant_id,
            pmName: v.name,
            pmEmail: v.email,
            propertyName: property.name,
            propertyCity: property.city ?? null,
            campaignName: campaign.name,
            overallScore,
            reportId: report.id,
            lang: v.default_language === 'en' ? 'en' : 'fr',
          })
        }
      }
    } catch (emailErr) {
      console.error('Publish notification error:', emailErr)
    }
  }

  return NextResponse.json({ ok: true })
}
