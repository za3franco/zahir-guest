import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  if (!report?.report_html) {
    return new NextResponse('Report not found', { status: 404 })
  }

  // Verify tenant access via campaign
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('tenant_id')
    .eq('id', report.campaign_id)
    .single()

  if (!campaign || campaign.tenant_id !== user.tenant_id) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  return new NextResponse(report.report_html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
