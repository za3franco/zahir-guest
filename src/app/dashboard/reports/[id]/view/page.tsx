export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound } from 'next/navigation'

export default async function ReportViewPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: report } = await supabaseAdmin
    .from('audit_reports')
    .select('report_html, campaign_id')
    .eq('id', params.id)
    .single()

  if (!report?.report_html) notFound()

  // Verify tenant access via campaign
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('tenant_id')
    .eq('id', report.campaign_id)
    .single()

  if (!campaign || campaign.tenant_id !== user.tenant_id) notFound()

  // Return the raw HTML report — it has its own full HTML document with print CSS
  return new Response(report.report_html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
