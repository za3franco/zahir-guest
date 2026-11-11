import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import { stripeRequest } from '@/lib/stripe'
import { PHOTO_BUCKET } from '@/lib/photos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Recursively lists every file under a storage prefix (folders have no id in Supabase listings).
async function listAll(supabase: any, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = []
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`
    if (item.id) out.push(path)
    else out.push(...(await listAll(supabase, bucket, path)))
  }
  return out
}

async function removeAll(supabase: any, bucket: string, prefix: string) {
  const files = await listAll(supabase, bucket, prefix)
  for (let i = 0; i < files.length; i += 100) {
    await supabase.storage.from(bucket).remove(files.slice(i, i + 100))
  }
  return files.length
}

// Super admin: permanently delete a workspace and everything in it.
// Body: { confirm: <exact tenant name> }. Running Stripe subscriptions are cancelled immediately (no refund).
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireSuperAdmin()
  const { confirm } = await request.json().catch(() => ({}))

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, subscription_tier, subscription_status, stripe_subscription_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  if (tenant.subscription_tier === 'za3fran_internal' || tenant.id === admin.tenant_id) {
    return NextResponse.json({ error: 'The internal workspace cannot be deleted.' }, { status: 400 })
  }
  if (typeof confirm !== 'string' || confirm.trim() !== tenant.name) {
    return NextResponse.json({ error: 'Type the exact workspace name to confirm.' }, { status: 400 })
  }

  // 1) Stop billing first: if this fails, nothing is deleted
  if (tenant.stripe_subscription_id && ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(tenant.subscription_status ?? '')) {
    try {
      await stripeRequest(`/subscriptions/${tenant.stripe_subscription_id}/cancel`, 'POST')
    } catch (err: any) {
      // Already cancelled on Stripe's side is fine; anything else stops the deletion
      if (!/No such subscription|canceled/i.test(err?.message ?? '')) {
        return NextResponse.json({ error: `Stripe cancellation failed: ${err?.message}. Nothing was deleted.` }, { status: 502 })
      }
    }
  }

  // 2) Files (photos and logos live under the tenant id prefix)
  const photos = await removeAll(supabase, PHOTO_BUCKET, tenant.id).catch(() => 0)
  const logos = await removeAll(supabase, 'tenant-logos', tenant.id).catch(() => 0)

  // 3) Rows, children first (some foreign keys are RESTRICT)
  const { data: users } = await supabase.from('users').select('id').eq('tenant_id', tenant.id)
  const userIds = (users ?? []).map((u: any) => u.id)
  const steps: [string, () => PromiseLike<{ error: any }>][] = [
    ['campaigns', () => supabase.from('campaigns').delete().eq('tenant_id', tenant.id)],
    ['properties', () => supabase.from('properties').delete().eq('tenant_id', tenant.id)],
    ['templates', () => supabase.from('questionnaire_templates').delete().eq('tenant_id', tenant.id)],
    ['help_usage', () => (userIds.length ? supabase.from('help_usage').delete().in('user_id', userIds) : Promise.resolve({ error: null }))],
    ['users', () => supabase.from('users').delete().eq('tenant_id', tenant.id)],
    ['tenant', () => supabase.from('tenants').delete().eq('id', tenant.id)],
  ]
  for (const [label, run] of steps) {
    const { error } = await run()
    if (error) {
      console.error(`[superadmin/delete] ${label} failed:`, error.message)
      return NextResponse.json({ error: `Deletion stopped at step "${label}": ${error.message}` }, { status: 500 })
    }
  }

  // 4) Sign-in accounts (after the profile rows, so a failure here leaves no usable workspace)
  let authDeleted = 0
  for (const id of userIds) {
    const { error } = await supabase.auth.admin.deleteUser(id)
    if (!error) authDeleted++
    else console.error('[superadmin/delete] auth user', id, error.message)
  }

  await logAdminAction(admin.id, 'tenant_delete', null, { tenant_id: tenant.id, name: tenant.name, users: userIds.length, authDeleted, photos, logos })
  return NextResponse.json({ ok: true, users: userIds.length, photos })
}
