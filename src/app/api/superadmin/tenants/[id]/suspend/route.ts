import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import { sendAccountStatusEmails } from '@/lib/accountEmails'

export const dynamic = 'force-dynamic'

// Body: { suspend: boolean, notify?: boolean }. Suspended tenants are locked out of the whole app.
// The workspace admins are emailed unless notify === false.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const params = await ctx.params
  const admin = await requireSuperAdmin()
  const lang = langOf(admin)
  const { suspend, notify } = await request.json().catch(() => ({}))
  if (typeof suspend !== 'boolean') return apiError(lang, 'invalid_request')

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, subscription_tier, subscription_status, suspended_prev_status, stripe_subscription_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!tenant) return apiError(lang, 'workspace_not_found')
  if (tenant.subscription_tier === 'za3fran_internal') {
    return apiError(lang, 'internal_workspace')
  }

  if (suspend) {
    if (tenant.subscription_status === 'suspended') return NextResponse.json({ ok: true })
    const { error } = await supabase
      .from('tenants')
      .update({ subscription_status: 'suspended', suspended_prev_status: tenant.subscription_status })
      .eq('id', tenant.id)
    if (error) return serverError(lang, error, 'superadmin/tenants/id/suspend')
    const emailed = notify === false ? 0 : await sendAccountStatusEmails(supabase, tenant.id, 'suspended')
    await logAdminAction(admin.id, 'tenant_suspend', tenant.id, { previous: tenant.subscription_status, emailed })
    return NextResponse.json({ ok: true, emailed })
  } else {
    if (tenant.subscription_status !== 'suspended') return NextResponse.json({ ok: true })
    const restored = tenant.suspended_prev_status || 'active'
    const { error } = await supabase
      .from('tenants')
      .update({ subscription_status: restored, suspended_prev_status: null })
      .eq('id', tenant.id)
    if (error) return serverError(lang, error, 'superadmin/tenants/id/suspend')
    const emailed = notify === false ? 0 : await sendAccountStatusEmails(supabase, tenant.id, 'reactivated')
    await logAdminAction(admin.id, 'tenant_reactivate', tenant.id, { restored, emailed })
    return NextResponse.json({ ok: true, emailed })
  }
  return NextResponse.json({ ok: true })
}
