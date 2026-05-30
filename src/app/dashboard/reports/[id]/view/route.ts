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

  // Verify access based on role
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('tenant_id, property_id, status')
    .eq('id', report.campaign_id)
    .single()

  if (!campaign || campaign.tenant_id !== user.tenant_id) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  // Admins can access any report in their tenant
  if (user.role === 'tenant_admin' || user.role === 'super_admin') {
    return new NextResponse(report.report_html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // Property managers and department managers can only see published reports
  // for properties they are assigned to
  if (user.role === 'property_manager' || user.role === 'department_manager') {
    if (campaign.status !== 'published') {
      return new NextResponse('Report not available', { status: 403 })
    }

    const roleColumn = user.role === 'department_manager'
      ? 'department_manager_user_id'
      : 'property_manager_user_id'

    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('id', campaign.property_id)
      .eq(roleColumn, user.id)
      .single()

    if (!property) {
      return new NextResponse('Unauthorized', { status: 403 })
    }

    return new NextResponse(report.report_html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return new NextResponse('Unauthorized', { status: 403 })
}
