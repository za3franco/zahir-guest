import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { generateReportHtml } from '@/lib/reportTemplate'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Load report
  const { data: report } = await supabaseAdmin
    .from('audit_reports')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  // Load campaign
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select(`
      *,
      property:properties(id, name, city, country, category),
      auditor:users!campaigns_auditor_user_id_fkey(id, name),
      template:questionnaire_templates(id, name, tier)
    `)
    .eq('id', report.campaign_id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Load tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, branding_config')
    .eq('id', user.tenant_id)
    .single()

  const scores = report.report_json

  if (!scores) {
    return NextResponse.json({ error: 'No scores available. Submit the audit first.' }, { status: 400 })
  }

  // Generate HTML
  const html = generateReportHtml({
    campaign,
    report,
    scores,
    tenantName: tenant?.name ?? 'Za3fran Consulting',
    logoUrl: tenant?.branding_config?.logo_url ?? null,
  })

  // Store HTML in report
  const { error } = await supabaseAdmin
    .from('audit_reports')
    .update({ report_html: html })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
