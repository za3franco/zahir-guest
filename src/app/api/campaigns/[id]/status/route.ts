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
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

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
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (campaign.tenant_id !== user.tenant_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Only admins move campaigns through review and publication; an auditor can only start or
  // submit their own audit. Client / property / department managers can never change a status.
  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'
  const auditorStep = user.role === 'auditor' && campaign.auditor_user_id === user.id &&
    ((campaign.status === 'assigned' && newStatus === 'in_progress') || (campaign.status === 'in_progress' && newStatus === 'submitted'))
  if (!isAdmin && !auditorStep) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const forwardAllowed = FORWARD_TRANSITIONS[campaign.status] ?? []
  const backwardAllowed = BACKWARD_TRANSITIONS[campaign.status] ?? []
  const isBackward = backwardAllowed.includes(newStatus)

  if (isBackward && user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only admins can reverse campaign status' }, { status: 403 })
  }

  if (!forwardAllowed.includes(newStatus) && !backwardAllowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${campaign.status} to ${newStatus}` },
      { status: 400 }
    )
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
    return NextResponse.json({ error: error.message }, { status: 500 })
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
