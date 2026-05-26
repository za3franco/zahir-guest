import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const VALID_TRANSITIONS: Record<string, string[]> = {
  assigned: ['in_progress'],
  in_progress: ['submitted'],
  submitted: ['under_review'],
  under_review: ['finalized'],
  finalized: ['published'],
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { status: newStatus } = await request.json()

  // Get current campaign status
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('status')
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  const allowedNext = VALID_TRANSITIONS[campaign.status] ?? []
  if (!allowedNext.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${campaign.status} to ${newStatus}` },
      { status: 400 }
    )
  }

  const updateData: Record<string, any> = { status: newStatus }
  if (newStatus === 'published') updateData.published_at = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('campaigns')
    .update(updateData)
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
