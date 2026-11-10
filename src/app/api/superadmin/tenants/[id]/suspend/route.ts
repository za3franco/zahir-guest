import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Body: { suspend: boolean }. Suspended tenants are locked out of the whole app.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperAdmin()
  const { suspend } = await request.json().catch(() => ({}))
  if (typeof suspend !== 'boolean') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, subscription_tier, subscription_status, suspended_prev_status, stripe_subscription_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (tenant.subscription_tier === 'za3fran_internal') {
    return NextResponse.json({ error: 'The internal workspace cannot be suspended.' }, { status: 400 })
  }

  if (suspend) {
    if (tenant.subscription_status === 'suspended') return NextResponse.json({ ok: true })
    const { error } = await supabase
      .from('tenants')
      .update({ subscription_status: 'suspended', suspended_prev_status: tenant.subscription_status })
      .eq('id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logAdminAction(admin.id, 'tenant_suspend', tenant.id, { previous: tenant.subscription_status })
  } else {
    if (tenant.subscription_status !== 'suspended') return NextResponse.json({ ok: true })
    const restored = tenant.suspended_prev_status || (tenant.stripe_subscription_id ? 'active' : 'trialing')
    const { error } = await supabase
      .from('tenants')
      .update({ subscription_status: restored, suspended_prev_status: null })
      .eq('id', tenant.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    await logAdminAction(admin.id, 'tenant_reactivate', tenant.id, { restored })
  }
  return NextResponse.json({ ok: true })
}
