import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { standard_id, response, auditor_note } = body

  // Verify campaign access
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, auditor_user_id, tenant_id, status')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (user.role === 'auditor' && campaign.auditor_user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (['published', 'finalized'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign is closed' }, { status: 400 })
  }

  // Update campaign status to in_progress if still assigned
  if (campaign.status === 'assigned') {
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'in_progress' })
      .eq('id', params.id)
  }

  // Upsert response
  const { error } = await supabaseAdmin
    .from('audit_responses')
    .upsert({
      campaign_id: params.id,
      standard_id,
      response: response ?? null,
      auditor_note: auditor_note ?? null,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'campaign_id,standard_id',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
