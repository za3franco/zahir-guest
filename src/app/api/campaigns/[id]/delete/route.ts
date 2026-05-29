import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

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

  // Verify ownership and status
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, status, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Cannot delete published campaigns
  if (campaign.status === 'published') {
    return NextResponse.json(
      { error: 'Cannot delete a published campaign. Unpublish it first.' },
      { status: 400 }
    )
  }

  // Delete associated data first (photos, responses, ratings, reports)
  await Promise.all([
    supabaseAdmin.from('audit_photos').delete().eq('campaign_id', params.id),
    supabaseAdmin.from('audit_responses').delete().eq('campaign_id', params.id),
    supabaseAdmin.from('audit_emotional_ratings').delete().eq('campaign_id', params.id),
    supabaseAdmin.from('audit_reports').delete().eq('campaign_id', params.id),
  ])

  const { error } = await supabaseAdmin
    .from('campaigns')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL('/dashboard/campaigns', request.url))
}
