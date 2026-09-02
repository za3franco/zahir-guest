export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportsList from './_components/ReportsList'

export default async function ReportsListPage() {
  const user = await requireUser()

  if (!['property_manager', 'department_manager'].includes(user.role)) {
    redirect('/dashboard')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const roleColumn = user.role === 'department_manager'
    ? 'department_manager_user_id'
    : 'property_manager_user_id'

  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, name, city')
    .eq('tenant_id', user.tenant_id)
    .eq(roleColumn, user.id)
    .eq('is_archived', false)
    .order('name')

  const propertyIds = (properties ?? []).map((p: any) => p.id)

  const { data: campaigns } = propertyIds.length > 0
    ? await supabaseAdmin
        .from('campaigns')
        .select('id, name, published_at, visit_window_start, visit_window_end, property_id')
        .eq('tenant_id', user.tenant_id)
        .eq('status', 'published')
        .in('property_id', propertyIds)
        .order('published_at', { ascending: false })
    : { data: [] }

  const campaignIds = (campaigns ?? []).map((c: any) => c.id)

  const { data: reports } = campaignIds.length > 0
    ? await supabaseAdmin
        .from('audit_reports')
        .select('id, campaign_id, report_json, published_at')
        .in('campaign_id', campaignIds)
    : { data: [] }

  const reportMap: Record<string, any> = {}
  ;(reports ?? []).forEach((r: any) => { reportMap[r.campaign_id] = r })

  const propertyMap: Record<string, any> = {}
  ;(properties ?? []).forEach((p: any) => { propertyMap[p.id] = p })

  const enriched = (campaigns ?? []).map((c: any) => {
    const report = reportMap[c.id]
    const property = propertyMap[c.property_id]
    return {
      id: c.id,
      name: c.name,
      publishedAt: c.published_at,
      visitEnd: c.visit_window_end,
      propertyName: property?.name ?? '',
      propertyCity: property?.city ?? null,
      reportId: report?.id ?? null,
      overallPercent: (report?.report_json as any)?.overall_percent ?? null,
    }
  })

  return (
    <ReportsList
      reports={enriched}
      lang={lang}
      canDownload={user.role === 'property_manager'}
    />
  )
}
