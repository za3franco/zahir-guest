import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const params = await ctx.params
  const user = await requireUser()
  const lang = langOf(user)

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return apiError(lang, 'forbidden')
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
    return apiError(lang, 'audit_not_found')
  }

  // Cannot delete published campaigns
  if (campaign.status === 'published') {
    return apiError(lang, 'campaign_published')
  }

  // Remove the stored photo files first (the rows are deleted just below)
  const { data: photoRows } = await supabaseAdmin.from('audit_photos').select('storage_path').eq('campaign_id', params.id)
  if (photoRows?.length) {
    await supabaseAdmin.storage.from('audit-photos').remove(photoRows.map((p: any) => p.storage_path))
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
    return serverError(lang, error, 'campaigns/id/delete')
  }

  return NextResponse.redirect(new URL('/dashboard/campaigns', request.url))
}
