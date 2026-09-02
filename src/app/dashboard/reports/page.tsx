export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ReportsDashboard from './_components/ReportsDashboard'

export default async function ReportsDashboardPage() {
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
    .select('id, name, city, country, category')
    .eq('tenant_id', user.tenant_id)
    .eq(roleColumn, user.id)
    .eq('is_archived', false)
    .order('name')

  if (!properties || properties.length === 0) {
    return (
      <div style={{ maxWidth: 720, padding: '3rem 0' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, color: 'var(--color-ivory)', marginBottom: '1rem' }}>
          {lang === 'en' ? 'Dashboard' : 'Tableau de bord'}
        </h1>
        <div style={{
          background: 'var(--color-slate-navy)', border: '1px solid var(--color-border-subtle)',
          borderRadius: 10, padding: '3rem', textAlign: 'center',
          color: 'var(--color-sand)', fontSize: '0.9375rem', lineHeight: 1.7,
        }}>
          {lang === 'en'
            ? 'No properties are currently assigned to your account. Contact your administrator.'
            : "Aucun établissement n'est actuellement assigné à votre compte. Contactez votre administrateur."}
        </div>
      </div>
    )
  }

  const propertyIds = properties.map((p: any) => p.id)

  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('id, name, status, published_at, visit_window_start, visit_window_end, property_id')
    .eq('tenant_id', user.tenant_id)
    .eq('status', 'published')
    .in('property_id', propertyIds)
    .order('published_at', { ascending: false })

  const campaignIds = (campaigns ?? []).map((c: any) => c.id)

  const { data: reports } = campaignIds.length > 0
    ? await supabaseAdmin
        .from('audit_reports')
        .select('id, campaign_id, report_json, published_at')
        .in('campaign_id', campaignIds)
    : { data: [] }

  const reportMap: Record<string, any> = {}
  ;(reports ?? []).forEach((r: any) => { reportMap[r.campaign_id] = r })

  const enrichedCampaigns = (campaigns ?? []).map((c: any) => {
    const property = properties.find((p: any) => p.id === c.property_id)
    const report = reportMap[c.id]
    return {
      id: c.id,
      name: c.name,
      publishedAt: c.published_at,
      visitStart: c.visit_window_start,
      visitEnd: c.visit_window_end,
      propertyId: c.property_id,
      propertyName: property?.name ?? '',
      propertyCity: property?.city ?? null,
      propertyCategory: property?.category ?? '',
      reportId: report?.id ?? null,
      overallPercent: (report?.report_json as any)?.overall_percent ?? null,
      domainScores: (report?.report_json as any)?.domains?.map((d: any) => ({
        name_en: d.name_en,
        name_fr: d.name_fr,
        score_percent: d.score_percent,
      })) ?? [],
    }
  })

  return (
    <ReportsDashboard
      properties={properties}
      campaigns={enrichedCampaigns}
      lang={lang}
    />
  )
}
