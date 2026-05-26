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
  const { section_id, rating } = body

  if (!section_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  // Verify campaign access
  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select('id, auditor_user_id')
    .eq('id', params.id)
    .single()

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  if (user.role === 'auditor' && campaign.auditor_user_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('audit_emotional_ratings')
    .upsert({
      campaign_id: params.id,
      section_id,
      rating,
    }, {
      onConflict: 'campaign_id,section_id',
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
