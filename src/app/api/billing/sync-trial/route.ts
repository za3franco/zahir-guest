import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'

// Lazily flips an overdue free trial to 'trial_expired' (no cron needed on the free tier).
export async function POST() {
  const user = await requireUser()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await supabase
    .from('tenants')
    .update({ subscription_status: 'trial_expired' })
    .eq('id', user.tenant_id)
    .eq('subscription_status', 'trialing')
    .is('stripe_subscription_id', null)
    .lt('trial_ends_at', new Date().toISOString())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
