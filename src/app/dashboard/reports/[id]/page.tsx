export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import ReportDetail from './_components/ReportDetail'

export default async function ReportDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()

  if (!['property_manager', 'department_manager', 'tenant_admin', 'super_admin'].includes(user.role)) {
    redirect('/dashboard')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: report } = await supabaseAdmin
    .from('audit_reports')
    .select('id, campaign_id, report_json, executive_summary, published_at, generated_at')
    .eq('id', params.id)
    .single()

  if (!report) notFound()

  // Verify access via campaign → property → user
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, tenant_id, property_id, status, published_at, visit_window_start, visit_window_end')
    .eq('id', report.campaign_id)
    .single()

  if (!campaign || campaign.tenant_id !== user.tenant_id) notFound()

  // PM/DM: must be assigned to the property and report must be published
  if (user.role === 'property_manager' || user.role === 'department_manager') {
    if (campaign.status !== 'published') notFound()

    const roleColumn = user.role === 'department_manager'
      ? 'department_manager_user_id'
      : 'property_manager_user_id'

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id, name, city, country, category')
      .eq('id', campaign.property_id)
      .eq(roleColumn, user.id)
      .single()

    if (!property) notFound()

    const lang = user.default_language === 'en' ? 'en' : 'fr'
    return (
      <ReportDetail
        report={report}
        campaign={campaign}
        property={property}
        lang={lang}
        canDownload={user.role === 'property_manager'}
        backHref="/dashboard/reports/list"
      />
    )
  }

  // Admins: fetch property without role filter
  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('id, name, city, country, category')
    .eq('id', campaign.property_id)
    .single()

  const lang = user.default_language === 'en' ? 'en' : 'fr'
  return (
    <ReportDetail
      report={report}
      campaign={campaign}
      property={property}
      lang={lang}
      canDownload={true}
      backHref="/dashboard/campaigns"
    />
  )
}
