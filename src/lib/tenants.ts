// Shared by the Stripe webhook (paid signup) and /api/signup (free trial):
// creates a tenant, its first tenant_admin (auth user + profile row) and a set-password link.
// Rolls everything back if any step fails, so no half-created workspace is left behind.

import type { SupabaseClient } from '@supabase/supabase-js'

export function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'tenant'
}

export interface CreateTenantOptions {
  companyName: string
  adminName: string
  email: string
  lang: 'en' | 'fr'
  /** Subscription columns for the new tenant row (tier, status, trial_ends_at, stripe ids...). */
  tenantFields: Record<string, unknown>
}

export interface CreatedTenant {
  tenantId: string
  userId: string
  setPasswordLink: string | null
}

export async function createTenantWithAdmin(
  supabase: SupabaseClient<any, any, any>,
  opts: CreateTenantOptions
): Promise<CreatedTenant> {
  const { companyName, adminName, email, lang, tenantFields } = opts

  // 1) Tenant (retry the random slug suffix on the rare collision)
  let tenantId: string | null = null
  for (let attempt = 0; attempt < 3 && !tenantId; attempt++) {
    const slug = `${slugify(companyName)}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await supabase
      .from('tenants')
      .insert({ name: companyName, slug, branding_config: { brand_name: companyName }, ...tenantFields })
      .select('id')
      .single()
    if (!error && data) tenantId = data.id
    else if (error && error.code !== '23505') throw new Error(`tenant insert failed: ${error.message}`)
  }
  if (!tenantId) throw new Error('could not allocate tenant slug')

  // 2) Auth user (random password; they set their own through the emailed link)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name: adminName, role: 'tenant_admin', tenant_id: tenantId },
  })
  if (authError || !authData?.user) {
    await supabase.from('tenants').delete().eq('id', tenantId)
    throw new Error(`auth user creation failed: ${authError?.message}`)
  }

  // 3) Profile row. New workspaces start with the onboarding checklist visible.
  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    tenant_id: tenantId,
    email,
    name: adminName,
    role: 'tenant_admin',
    default_language: lang,
    onboarding_dismissed: false,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('tenants').delete().eq('id', tenantId)
    throw new Error(`user profile insert failed: ${profileError.message}`)
  }

  // 4) Set-password link (best effort: the account exists even if this fails)
  let setPasswordLink: string | null = null
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/set-password` },
    })
    setPasswordLink = linkData?.properties?.action_link ?? null
  } catch (err) {
    console.error('[createTenantWithAdmin] link generation failed:', err)
  }

  return { tenantId, userId: authData.user.id, setPasswordLink }
}
