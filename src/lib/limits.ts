// Server-side plan limit enforcement.
// Call before creating a property / inviting a user / creating a campaign.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { BLOCKED_STATUSES, limitsFor, type LimitedResource } from '@/lib/plans'

export interface LimitCheck {
  allowed: boolean
  code?: 'plan_limit' | 'subscription_inactive'
  limit?: number | null
  current?: number
  message?: string
}

const RESOURCE_LABEL: Record<LimitedResource, { en: string; fr: string }> = {
  properties: { en: 'properties', fr: 'établissements' },
  users: { en: 'users', fr: 'utilisateurs' },
  audits: { en: 'audits this month', fr: 'audits ce mois-ci' },
}

export async function checkPlanLimit(
  tenantId: string,
  resource: LimitedResource,
  lang: 'en' | 'fr' = 'fr'
): Promise<LimitCheck> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenant } = await supabase
    .from('tenants')
    .select('subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id')
    .eq('id', tenantId)
    .single()

  // Unknown tenant row: fail open rather than lock a customer out because of a read error.
  if (!tenant) return { allowed: true }

  if (tenant.subscription_tier === 'za3fran_internal') return { allowed: true }

  const trialOverdue =
    tenant.subscription_status === 'trialing' &&
    !tenant.stripe_subscription_id &&
    !!tenant.trial_ends_at &&
    new Date(tenant.trial_ends_at).getTime() < Date.now()

  if (trialOverdue || BLOCKED_STATUSES.includes(tenant.subscription_status ?? '')) {
    return {
      allowed: false,
      code: 'subscription_inactive',
      message:
        lang === 'en'
          ? 'Your subscription is inactive. Please renew it in Billing to continue.'
          : "Votre abonnement n'est pas actif. Veuillez le renouveler dans Facturation pour continuer.",
    }
  }

  const limits = limitsFor(tenant.subscription_tier, tenant.subscription_status)
  const max =
    resource === 'properties' ? limits.properties : resource === 'users' ? limits.users : limits.auditsPerMonth

  if (max === null) return { allowed: true, limit: null }

  const current = await countUsage(supabase, tenantId, resource)

  if (current >= max) {
    const label = RESOURCE_LABEL[resource][lang]
    return {
      allowed: false,
      code: 'plan_limit',
      limit: max,
      current,
      message:
        lang === 'en'
          ? `Your plan allows up to ${max} ${label}. Upgrade your plan in Billing to add more.`
          : `Votre forfait permet jusqu'à ${max} ${label}. Passez à un forfait supérieur dans Facturation pour en ajouter.`,
    }
  }

  return { allowed: true, limit: max, current }
}

export async function countUsage(
  supabase: SupabaseClient<any, any, any>,
  tenantId: string,
  resource: LimitedResource
): Promise<number> {
  if (resource === 'properties') {
    const { count } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
    return count ?? 0
  }

  if (resource === 'users') {
    const { count } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    return count ?? 0
  }

  // audits: campaigns created this calendar month (UTC)
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', monthStart)
  return count ?? 0
}
