// Server-side plan limit enforcement.
// Call before creating a property / inviting a user / creating a campaign / generating an AI summary.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { effectivePlan, ESSENTIAL_TEMPLATE_ID, type LimitedResource, type TenantBilling } from '@/lib/plans'

export interface LimitCheck {
  allowed: boolean
  code?: 'plan_limit' | 'subscription_inactive' | 'not_in_plan'
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

/** Singular forms, used when the limit is 1 ("1 property", not "1 properties"). */
const RESOURCE_LABEL_ONE: Record<LimitedResource, { en: string; fr: string }> = {
  properties: { en: 'property', fr: 'établissement' },
  users: { en: 'user', fr: 'utilisateur' },
  audits: { en: 'audit this month', fr: 'audit ce mois-ci' },
  ai: { en: 'AI summary this month', fr: 'synthèse IA ce mois-ci' },
}

const TENANT_BILLING_COLUMNS =
  'subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id, billing_mode, current_period_end, extra_properties'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

/** The workspace's billing row (null when it cannot be read). */
export async function loadTenantBilling(tenantId: string): Promise<TenantBilling | null> {
  const { data } = await db().from('tenants').select(TENANT_BILLING_COLUMNS).eq('id', tenantId).single()
  return data ?? null
}

/** True when the workspace may use the full Zahir Guest library, its own questionnaires, import and export. */
export async function hasFullLibrary(tenantId: string): Promise<boolean> {
  const t = await loadTenantBilling(tenantId)
  return !t || effectivePlan(t).limits.fullLibrary // unreadable row: fail open, as below
}

export async function checkPlanLimit(
  tenantId: string,
  resource: LimitedResource,
  lang: 'en' | 'fr' = 'fr'
): Promise<LimitCheck> {
  const supabase = db()
  const tenant = await loadTenantBilling(tenantId)

  // Unknown tenant row: fail open rather than lock a customer out because of a read error.
  if (!tenant) return { allowed: true }

  const plan = effectivePlan(tenant)
  if (plan.kind === 'internal') return { allowed: true }

  if (plan.kind === 'suspended') {
    return {
      allowed: false,
      code: 'subscription_inactive',
      message:
        lang === 'en'
          ? 'This workspace is suspended. Please contact us.'
          : 'Cet espace est suspendu. Merci de nous contacter.',
    }
  }

  const limits = plan.limits
  const perQuarter = resource === 'audits' && limits.auditsPerQuarter !== null
  const max =
    resource === 'properties'
      ? limits.properties
      : resource === 'users'
        ? limits.users
        : resource === 'audits'
          ? perQuarter ? limits.auditsPerQuarter : limits.auditsPerMonth
          : limits.aiSummariesPerMonth

  if (max === null) return { allowed: true, limit: null }

  // Feature not included at all (e.g. AI summaries on the free plan)
  if (max === 0) {
    return {
      allowed: false,
      code: 'not_in_plan',
      limit: 0,
      current: 0,
      message:
        lang === 'en'
          ? 'Not included in the Discovery plan. Upgrade to the Hotel plan in Billing.'
          : "Non inclus dans l'offre Découverte. Passez à l'offre Hôtel dans Facturation.",
    }
  }

  const current = await countUsage(supabase, tenantId, resource, perQuarter ? 'quarter' : 'month')

  if (current >= max) {
    const label = perQuarter
      ? lang === 'en' ? `audit${max > 1 ? 's' : ''} per quarter` : `audit${max > 1 ? 's' : ''} par trimestre`
      : (max === 1 ? RESOURCE_LABEL_ONE : RESOURCE_LABEL)[resource][lang]
    const free = plan.kind === 'free'
    return {
      allowed: false,
      code: 'plan_limit',
      limit: max,
      current,
      message:
        lang === 'en'
          ? free
            ? `The Discovery plan includes ${max} ${label}. Upgrade to the Hotel plan in Billing to do more.`
            : resource === 'properties'
              ? `Your plan covers ${max} ${label}. Add a property or change plan in Billing.`
              : `Your plan allows up to ${max} ${label}. Change plan in Billing to add more.`
          : free
            ? `L'offre Découverte comprend ${max} ${label}. Passez à l'offre Hôtel dans Facturation pour aller plus loin.`
            : resource === 'properties'
              ? `Votre forfait couvre ${max} ${label}. Ajoutez un établissement ou changez de forfait dans Facturation.`
              : `Votre forfait permet jusqu'à ${max} ${label}. Changez de forfait dans Facturation pour en ajouter.`,
    }
  }

  return { allowed: true, limit: max, current }
}

/** Start of the current calendar month or quarter (UTC), ISO string. */
function periodStart(period: 'month' | 'quarter') {
  const now = new Date()
  const month = period === 'quarter' ? Math.floor(now.getUTCMonth() / 3) * 3 : now.getUTCMonth()
  return new Date(Date.UTC(now.getUTCFullYear(), month, 1)).toISOString()
}

export async function countUsage(
  supabase: SupabaseClient<any, any, any>,
  tenantId: string,
  resource: LimitedResource,
  period: 'month' | 'quarter' = 'month'
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

  const since = periodStart(resource === 'ai' ? 'month' : period)

  if (resource === 'ai') {
    const { count } = await supabase
      .from('ai_usage')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', since)
    return count ?? 0
  }

  // audits: campaigns created this calendar month (or quarter on the free plan), UTC
  const { count } = await supabase
    .from('campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', since)
  return count ?? 0
}

/** Record one AI summary for the monthly quota (best effort). */
export async function recordAiUsage(tenantId: string, userId: string, campaignId: string) {
  const { error } = await db().from('ai_usage').insert({ tenant_id: tenantId, user_id: userId, campaign_id: campaignId, kind: 'summary' })
  if (error) console.error('[ai usage] insert failed:', error.message)
}

/**
 * May this workspace run an audit with this questionnaire? Its own questionnaires, the "Essentiel"
 * platform questionnaire for everyone, other platform questionnaires only with the full library.
 */
export async function canUseTemplate(tenantId: string, templateId: string): Promise<boolean> {
  const { data: tpl } = await db().from('questionnaire_templates').select('id, tenant_id, is_active').eq('id', templateId).maybeSingle()
  if (!tpl) return false
  if (tpl.tenant_id) return tpl.tenant_id === tenantId
  if (tpl.id === ESSENTIAL_TEMPLATE_ID) return true
  return hasFullLibrary(tenantId)
}

/** API guard: 402 response when the workspace has no access to the full library / own questionnaires. */
export async function libraryLockedResponse(tenantId: string, lang: 'en' | 'fr'): Promise<Response | null> {
  if (await hasFullLibrary(tenantId)) return null
  return Response.json(
    {
      error:
        lang === 'en'
          ? 'Your own questionnaires, imports and the full Zahir Guest library are available from the Hotel plan.'
          : "Vos propres questionnaires, l'import et la bibliothèque Zahir Guest complète sont disponibles à partir de l'offre Hôtel.",
      code: 'not_in_plan',
    },
    { status: 402 }
  )
}
