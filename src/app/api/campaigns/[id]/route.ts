import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { sendAuditorAssignedEmail } from '@/lib/emailNotifications'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()

  // Get current campaign to detect auditor change
  const { data: currentCampaign } = await supabaseAdmin
    .from('campaigns')
    .select('auditor_user_id, name, property_id, visit_window_start, visit_window_end')
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  const campaignUpdate: Record<string, any> = {}
  if (body.name !== undefined) campaignUpdate.name = body.name
  if (body.property_id !== undefined) campaignUpdate.property_id = body.property_id
  if (body.template_id !== undefined) campaignUpdate.template_id = body.template_id
  if (body.auditor_user_id !== undefined) campaignUpdate.auditor_user_id = body.auditor_user_id
  if (body.visit_window_start !== undefined) campaignUpdate.visit_window_start = body.visit_window_start
  if (body.visit_window_end !== undefined) campaignUpdate.visit_window_end = body.visit_window_end
  if (body.admin_notes !== undefined) campaignUpdate.admin_notes = body.admin_notes

  if (Object.keys(campaignUpdate).length > 0) {
    const { error } = await supabaseAdmin
      .from('campaigns')
      .update(campaignUpdate)
      .eq('id', params.id)
      .eq('tenant_id', user.tenant_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  // Executive summary goes to audit_reports
  if (body.executive_summary !== undefined) {
    const { data: existingReport } = await supabaseAdmin
      .from('audit_reports')
      .select('id')
      .eq('campaign_id', params.id)
      .single()

    if (existingReport) {
      await supabaseAdmin
        .from('audit_reports')
        .update({ executive_summary: body.executive_summary })
        .eq('id', existingReport.id)
    }
  }

  // Send assignment email if auditor changed or newly assigned
  const newAuditorId = body.auditor_user_id
  const oldAuditorId = currentCampaign?.auditor_user_id
  const auditorChanged = newAuditorId && newAuditorId !== oldAuditorId

  if (auditorChanged && currentCampaign) {
    try {
      const campaignName = body.name ?? currentCampaign.name
      const propertyId = body.property_id ?? currentCampaign.property_id
      const visitStart = body.visit_window_start ?? currentCampaign.visit_window_start
      const visitEnd = body.visit_window_end ?? currentCampaign.visit_window_end

      const [{ data: auditor }, { data: property }] = await Promise.all([
        supabaseAdmin.from('users').select('name, email, default_language').eq('id', newAuditorId).single(),
        supabaseAdmin.from('properties').select('name, city').eq('id', propertyId).single(),
      ])

      if (auditor && property) {
        await sendAuditorAssignedEmail({
          auditorName: auditor.name,
          auditorEmail: auditor.email,
          campaignName,
          propertyName: property.name,
          propertyCity: property.city ?? null,
          visitWindowStart: visitStart ?? null,
          visitWindowEnd: visitEnd ?? null,
          assignedByName: user.name,
          lang: auditor.default_language === 'en' ? 'en' : 'fr',
        })
      }
    } catch (emailErr) {
      console.error('Assignment email error:', emailErr)
    }
  }

  return NextResponse.json({ ok: true })
}
