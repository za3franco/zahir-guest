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
  ai: { en: 'AI summaries this month', fr: 'synthèses IA ce mois-ci' },
}

const DAY = 86400_000
const GRACE_DAYS = 7

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
    .select('subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id, billing_mode, current_period_end, extra_properties')
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

  // MAD prepaid period (YouCan Pay) over, grace period included: same as an ended subscription.
  const prepaidOver =
    tenant.billing_mode === 'youcan' &&
    !!tenant.current_period_end &&
    new Date(tenant.current_period_end).getTime() + GRACE_DAYS * DAY < Date.now()

  if (trialOverdue || prepaidOver || BLOCKED_STATUSES.includes(tenant.subscription_status ?? '')) {
    return {
      allowed: false,
      code: 'subscription_inactive',
      message:
        lang === 'en'
          ? 'Your subscription is inactive. Please renew it in Billing to continue.'
          : "Votre abonnement n'est pas actif. Veuillez le renouveler dans Facturation pour continuer.",
    }
  }

  const limits = limitsFor(tenant.subscription_tier, tenant.subscription_status, tenant.extra_properties ?? 0)
  const max =
    resource === 'properties'
      ? limits.properties
      : resource === 'users'
        ? limits.users
        : resource === 'audits'
          ? limits.auditsPerMonth
          : limits.aiSummariesPerMonth

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
          ? resource === 'properties'
            ? `Your plan covers ${max} ${label}. Add a property or change plan in Billing.`
            : `Your plan allows up to ${max} ${label}. Change plan in Billing to add more.`
          : resource === 'properties'
            ? `Votre forfait couvre ${max} ${label}. Ajoutez un établissement ou changez de forfait dans Facturation.`
            : `Votre forfait permet jusqu'à ${max} ${label}. Changez de forfait dans Facturation pour en ajouter.`,
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

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()

  if (resource === 'ai') {
    const { count } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', monthStart)
    return count ?? 0
  }

  // audits: campaigns created this calendar month (UTC)
  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', monthStart)
  return count ?? 0
}

/** Record one AI summary for the monthly quota (best effort). */
export async function recordAiUsage(tenantId: string, userId: string, campaignId: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await supabase.from('ai_usage').insert({ tenant_id: tenantId, user_id: userId, campaign_id: campaignId, kind: 'summary' })
  if (error) console.error('[ai usage] insert failed:', error.message)
}
