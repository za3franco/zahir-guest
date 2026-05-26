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

  if (!['assigned', 'in_progress'].includes(campaign.status)) {
    return NextResponse.json({ error: 'Campaign cannot be submitted in its current status' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('campaigns')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
