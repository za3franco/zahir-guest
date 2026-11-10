// Plan catalogue, limits and Stripe price mapping.
// Price IDs come from Vercel environment variables (never hardcoded).

export type PlanTier = 'starter' | 'professional' | 'enterprise'
export type BillingInterval = 'monthly' | 'annual'
export type LimitedResource = 'properties' | 'users' | 'audits'

export interface PlanLimits {
  properties: number | null // null = unlimited
  users: number | null
  auditsPerMonth: number | null
  whiteLabel: boolean
}

export const PLAN_LIMITS: Record<PlanTier | 'za3fran_internal' | 'trial', PlanLimits> = {
  starter: { properties: 3, users: 5, auditsPerMonth: 20, whiteLabel: false },
  professional: { properties: 15, users: 15, auditsPerMonth: null, whiteLabel: true },
  enterprise: { properties: null, users: null, auditsPerMonth: null, whiteLabel: true },
  // Za3fran's own tenant: never limited, never billed.
  za3fran_internal: { properties: null, users: null, auditsPerMonth: null, whiteLabel: true },
  // 14-day free trial (ZG-3 Pass 2): full Professional limits so prospects see the whole product.
  trial: { properties: 15, users: 15, auditsPerMonth: null, whiteLabel: false },
}

export interface PlanDisplay {
  tier: PlanTier
  name: string
  monthlyEur: number
  annualEur: number | null // total billed per year; null = no self-serve annual price
  annualPerMonthEur: number | null
  featuresEn: string[]
  featuresFr: string[]
}

export const PLAN_DISPLAY: PlanDisplay[] = [
  {
    tier: 'starter',
    name: 'Starter',
    monthlyEur: 89,
    annualEur: 948,
    annualPerMonthEur: 79,
    featuresEn: ['3 properties', '5 users', '20 audits / month', 'Standard reports'],
    featuresFr: ['3 établissements', '5 utilisateurs', '20 audits / mois', 'Rapports standards'],
  },
  {
    tier: 'professional',
    name: 'Professional',
    monthlyEur: 249,
    annualEur: 2628,
    annualPerMonthEur: 219,
    featuresEn: ['15 properties', '15 users', 'Unlimited audits', 'White-label reports'],
    featuresFr: ['15 établissements', '15 utilisateurs', 'Audits illimités', 'Rapports en marque blanche'],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    monthlyEur: 599,
    annualEur: null,
    annualPerMonthEur: null,
    featuresEn: ['Unlimited properties & users', 'White-label branding', 'Custom questionnaire templates', 'Dedicated onboarding'],
    featuresFr: ['Établissements et utilisateurs illimités', 'Marque blanche', 'Questionnaires personnalisés', 'Accompagnement dédié'],
  },
]

const PRICE_ENV: Record<PlanTier, Partial<Record<BillingInterval, string>>> = {
  starter: { monthly: 'STRIPE_PRICE_STARTER_MONTHLY', annual: 'STRIPE_PRICE_STARTER_ANNUAL' },
  professional: { monthly: 'STRIPE_PRICE_PROFESSIONAL_MONTHLY', annual: 'STRIPE_PRICE_PROFESSIONAL_ANNUAL' },
  enterprise: { monthly: 'STRIPE_PRICE_ENTERPRISE_MONTHLY' }, // no self-serve annual price
}

export function isPlanTier(v: unknown): v is PlanTier {
  return v === 'starter' || v === 'professional' || v === 'enterprise'
}

export function isBillingInterval(v: unknown): v is BillingInterval {
  return v === 'monthly' || v === 'annual'
}

/** Stripe price ID for a tier/interval, or null if that combination is not sold self-serve. */
export function getPriceId(tier: PlanTier, interval: BillingInterval): string | null {
  const envName = PRICE_ENV[tier][interval]
  if (!envName) return null
  return process.env[envName] || null
}

/** Reverse lookup used by the webhook: which tier/interval does this Stripe price belong to? */
export function planFromPriceId(priceId: string | null | undefined): { tier: PlanTier; interval: BillingInterval } | null {
  if (!priceId) return null
  for (const tier of Object.keys(PRICE_ENV) as PlanTier[]) {
    for (const interval of Object.keys(PRICE_ENV[tier]) as BillingInterval[]) {
      const envName = PRICE_ENV[tier][interval]
      if (envName && process.env[envName] === priceId) return { tier, interval }
    }
  }
  return null
}

/** Effective limits for a tenant given its tier and subscription status. */
export function limitsFor(tier: string | null | undefined, status: string | null | undefined): PlanLimits {
  if (tier === 'za3fran_internal') return PLAN_LIMITS.za3fran_internal
  if (status === 'trialing' && !isPlanTier(tier)) return PLAN_LIMITS.trial
  if (status === 'trialing' && tier === 'trial') return PLAN_LIMITS.trial
  if (isPlanTier(tier)) return PLAN_LIMITS[tier]
  return PLAN_LIMITS.trial
}

/** Statuses in which creating new properties/users/campaigns is blocked. */
export const BLOCKED_STATUSES = ['canceled', 'trial_expired', 'unpaid', 'incomplete_expired', 'suspended']
