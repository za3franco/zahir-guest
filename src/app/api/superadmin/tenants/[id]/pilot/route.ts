import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import { TRIAL_DAYS } from '@/lib/plans'

export const dynamic = 'force-dynamic'

// Super admin: opens a 14-day Professional pilot for a free (or ended) workspace, after a demo.
// When the pilot ends without a subscription, the workspace falls back to the free Découverte plan.
// Body: { days?: number } (1–30, default 14). { end: true } closes a running pilot now.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperAdmin()
  const body = await request.json().catch(() => ({}))
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, subscription_tier, subscription_status, stripe_subscription_id, billing_mode, current_period_end')
    .eq('id', params.id)
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (tenant.subscription_tier === 'za3fran_internal') return NextResponse.json({ error: 'Internal workspace' }, { status: 400 })

  if (body.end === true) {
    if (tenant.subscription_status !== 'trialing' || tenant.stripe_subscription_id) return NextResponse.json({ ok: true })
    await supabase.from('tenants').update({ subscription_tier: 'free', subscription_status: 'active', trial_ends_at: null }).eq('id', tenant.id)
    await logAdminAction(admin.id, 'tenant_pilot_end', tenant.id, {})
    return NextResponse.json({ ok: true })
  }

  // Never overwrite a paying workspace
  const paying =
    (tenant.stripe_subscription_id && ['active', 'past_due'].includes(tenant.subscription_status ?? '')) ||
    tenant.billing_mode === 'direct' ||
    (tenant.billing_mode === 'youcan' && tenant.current_period_end && new Date(tenant.current_period_end).getTime() > Date.now())
  if (paying) return NextResponse.json({ error: 'This workspace already pays for a plan.' }, { status: 400 })

  const days = Math.max(1, Math.min(30, Math.floor(Number(body.days) || TRIAL_DAYS)))
  const trialEndsAt = new Date(Date.now() + days * 86400_000).toISOString()
  const { error } = await supabase
    .from('tenants')
    .update({ subscription_tier: 'professional', subscription_status: 'trialing', trial_ends_at: trialEndsAt })
    .eq('id', tenant.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await logAdminAction(admin.id, 'tenant_pilot_start', tenant.id, { days, previous_tier: tenant.subscription_tier, previous_status: tenant.subscription_status })
  return NextResponse.json({ ok: true, trial_ends_at: trialEndsAt })
}
