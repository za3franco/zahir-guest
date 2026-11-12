// Plan catalogue (grid v2, ZG-5 — validated 12 Nov 2026), limits and price lookup.
//
// Unit of price = active property (archived properties do not count).
//   Hotel (internal key 'starter')  : 1 property (+1 optional), 6 users, 6 audits/month, 2 AI summaries/month
//   Professional                    : 5 properties included, +1 per extra property up to 30, unlimited users/audits,
//                                     10 AI summaries/month + 1 per extra property, white-label
//   Enterprise                      : 50+ properties, direct contract only (set up by the super admin)
// Annual = 10 × monthly (two months free). MAD is paid through YouCan Pay as a prepaid quarter or year.
//
// The internal tier key stays 'starter' (database constraint, existing rows); it is shown as "Hôtel" / "Hotel".

import type { Currency } from '@/lib/currency'

export type PlanTier = 'starter' | 'professional' | 'enterprise'
/** monthly / annual on Stripe; quarterly / annual on YouCan Pay (prepaid periods). */
export type BillingInterval = 'monthly' | 'quarterly' | 'annual'
export type LimitedResource = 'properties' | 'users' | 'audits' | 'ai'

export interface PlanLimits {
  properties: number | null // null = unlimited
  users: number | null
  auditsPerMonth: number | null
  aiSummariesPerMonth: number | null
  whiteLabel: boolean
}

interface TierRule {
  includedProperties: number
  maxExtraProperties: number
  users: number | null
  auditsPerMonth: number | null
  aiBase: number | null
  aiPerExtra: number
  whiteLabel: boolean
  selfServe: boolean
}

export const TIER_RULES: Record<PlanTier, TierRule> = {
  starter: { includedProperties: 1, maxExtraProperties: 1, users: 6, auditsPerMonth: 6, aiBase: 2, aiPerExtra: 0, whiteLabel: false, selfServe: true },
  professional: { includedProperties: 5, maxExtraProperties: 25, users: null, auditsPerMonth: null, aiBase: 10, aiPerExtra: 1, whiteLabel: true, selfServe: true },
  enterprise: { includedProperties: 50, maxExtraProperties: 450, users: null, auditsPerMonth: null, aiBase: null, aiPerExtra: 0, whiteLabel: true, selfServe: false },
}

const INTERNAL: PlanLimits = { properties: null, users: null, auditsPerMonth: null, aiSummariesPerMonth: null, whiteLabel: true }
/** 14-day free trial: enough to judge the product, not to run a portfolio for free. */
export const TRIAL_LIMITS: PlanLimits = { properties: 3, users: 10, auditsPerMonth: null, aiSummariesPerMonth: 5, whiteLabel: false }

/** Monthly prices per currency: base (included properties) and price of each extra property. */
export const PRICE_GRID: Record<Currency, Record<PlanTier, { base: number; extra: number | null }>> = {
  EUR: { starter: { base: 79, extra: 49 }, professional: { base: 249, extra: 39 }, enterprise: { base: 1490, extra: null } },
  USD: { starter: { base: 89, extra: 55 }, professional: { base: 279, extra: 45 }, enterprise: { base: 1649, extra: null } },
  MAD: { starter: { base: 790, extra: 490 }, professional: { base: 2490, extra: 390 }, enterprise: { base: 14900, extra: null } },
}

/** Number of months a billing interval covers, and what it is charged (annual = 10 months: two free). */
export const INTERVAL_MONTHS: Record<BillingInterval, number> = { monthly: 1, quarterly: 3, annual: 12 }
export const INTERVAL_CHARGED_MONTHS: Record<BillingInterval, number> = { monthly: 1, quarterly: 3, annual: 10 }

export const PLAN_NAMES: Record<PlanTier, { en: string; fr: string }> = {
  starter: { en: 'Hotel', fr: 'Hôtel' },
  professional: { en: 'Professional', fr: 'Professional' },
  enterprise: { en: 'Enterprise', fr: 'Enterprise' },
}

export function planName(tier: string | null | undefined, lang: 'en' | 'fr' = 'fr'): string | null {
  return isPlanTier(tier) ? PLAN_NAMES[tier][lang] : null
}

export const PLAN_FEATURES: Record<PlanTier, { en: string[]; fr: string[] }> = {
  starter: {
    en: ['1 property (2nd optional)', '6 users', '6 audits / month', '2 AI summaries / month', 'Zahir Guest standards and your own questionnaires'],
    fr: ['1 établissement (2e en option)', '6 utilisateurs', '6 audits / mois', '2 synthèses IA / mois', 'Standards Zahir Guest et vos propres questionnaires'],
  },
  professional: {
    en: ['5 properties included, up to 30', 'Unlimited users and audits', '10 AI summaries / month + 1 per extra property', 'White-label reports and client portal', 'Analytics across properties'],
    fr: ['5 établissements inclus, jusqu’à 30', 'Utilisateurs et audits illimités', '10 synthèses IA / mois + 1 par établissement supplémentaire', 'Rapports en marque blanche et portail client', 'Analyses multi-établissements'],
  },
  enterprise: {
    en: ['50 properties included, more on quote', 'Unlimited AI summaries', 'Custom domain and white-label', 'Dedicated onboarding (one-off set-up fee)', 'Annual contract, local invoicing'],
    fr: ['50 établissements inclus, au-delà sur devis', 'Synthèses IA illimitées', 'Domaine personnalisé et marque blanche', 'Mise en place accompagnée (frais unique)', 'Contrat annuel, facturation locale'],
  },
}

export const ENTERPRISE_SETUP_FEE: Record<Currency, number> = { EUR: 1500, USD: 1650, MAD: 15000 }

export function isPlanTier(v: unknown): v is PlanTier {
  return v === 'starter' || v === 'professional' || v === 'enterprise'
}

export function isBillingInterval(v: unknown): v is BillingInterval {
  return v === 'monthly' || v === 'quarterly' || v === 'annual'
}

/** Clamp a requested total number of properties to what the tier allows; returns the extra count. */
export function extraFor(tier: PlanTier, totalProperties: number | null | undefined): number {
  const r = TIER_RULES[tier]
  const total = Math.floor(Number(totalProperties) || r.includedProperties)
  return Math.max(0, Math.min(r.maxExtraProperties, total - r.includedProperties))
}

export interface Quote {
  tier: PlanTier
  currency: Currency
  interval: BillingInterval
  properties: number
  extra: number
  monthly: number // per month, before the annual discount
  total: number // charged for the whole interval
  perMonth: number // total / months covered
}

/** Price of a plan for a number of properties, in whole currency units. */
export function quote(tier: PlanTier, currency: Currency, interval: BillingInterval, totalProperties?: number | null): Quote {
  const p = PRICE_GRID[currency][tier]
  const extra = p.extra === null ? 0 : extraFor(tier, totalProperties)
  const monthly = p.base + extra * (p.extra ?? 0)
  const total = monthly * INTERVAL_CHARGED_MONTHS[interval]
  return {
    tier, currency, interval,
    properties: TIER_RULES[tier].includedProperties + extra,
    extra,
    monthly,
    total,
    perMonth: Math.round((total / INTERVAL_MONTHS[interval]) * 100) / 100,
  }
}

/** Effective limits for a workspace given its tier, subscription status and paid extra properties. */
export function limitsFor(tier: string | null | undefined, status: string | null | undefined, extraProperties = 0): PlanLimits {
  if (tier === 'za3fran_internal') return INTERNAL
  // 'trialing' is always the in-app 14-day trial (no Stripe trials are configured), whatever plan was picked.
  if (status === 'trialing' || status === 'trial_expired') return TRIAL_LIMITS
  if (!isPlanTier(tier)) return TRIAL_LIMITS
  const r = TIER_RULES[tier]
  const extra = Math.max(0, Math.min(r.maxExtraProperties, Math.floor(extraProperties || 0)))
  return {
    properties: r.includedProperties + extra,
    users: r.users,
    auditsPerMonth: r.auditsPerMonth,
    aiSummariesPerMonth: r.aiBase === null ? null : r.aiBase + extra * r.aiPerExtra,
    whiteLabel: r.whiteLabel,
  }
}

export const TRIAL_DAYS = 14

/** Statuses in which creating new properties/users/campaigns is blocked. */
export const BLOCKED_STATUSES = ['canceled', 'trial_expired', 'unpaid', 'incomplete_expired', 'suspended']

// ── Stripe prices (EUR, with a USD currency option on the same price) ─────────────────
// Found by lookup key, so no extra environment variables are needed. Keys created in Stripe:
//   zg2_hotel_monthly · zg2_hotel_annual · zg2_pro_monthly · zg2_pro_annual
//   zg2_extra_hotel_monthly · zg2_extra_hotel_annual · zg2_extra_pro_monthly · zg2_extra_pro_annual

export type StripeInterval = 'monthly' | 'annual'
const TIER_KEY: Partial<Record<PlanTier, string>> = { starter: 'hotel', professional: 'pro' }

export function lookupKeys(tier: PlanTier, interval: StripeInterval): { base: string; extra: string } | null {
  const k = TIER_KEY[tier]
  if (!k) return null
  return { base: `zg2_${k}_${interval}`, extra: `zg2_extra_${k}_${interval}` }
}

/** Which plan a Stripe price belongs to: grid v2 lookup keys first, then the ZG-3 env prices (legacy). */
export function planFromPrice(price: { id?: string; lookup_key?: string | null } | null | undefined):
  { tier: PlanTier; interval: StripeInterval; kind: 'base' | 'extra' } | null {
  if (!price) return null
  const m = /^zg2_(extra_)?(hotel|pro)_(monthly|annual)$/.exec(price.lookup_key ?? '')
  if (m) return { tier: m[2] === 'hotel' ? 'starter' : 'professional', interval: m[3] as StripeInterval, kind: m[1] ? 'extra' : 'base' }
  const legacy: Record<string, [PlanTier, StripeInterval]> = {
    STRIPE_PRICE_STARTER_MONTHLY: ['starter', 'monthly'], STRIPE_PRICE_STARTER_ANNUAL: ['starter', 'annual'],
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: ['professional', 'monthly'], STRIPE_PRICE_PROFESSIONAL_ANNUAL: ['professional', 'annual'],
    STRIPE_PRICE_ENTERPRISE_MONTHLY: ['enterprise', 'monthly'], STRIPE_PRICE_ENTERPRISE_ANNUAL: ['enterprise', 'annual'],
  }
  for (const [env, [tier, interval]] of Object.entries(legacy)) {
    if (price.id && process.env[env] === price.id) return { tier, interval, kind: 'base' }
  }
  return null
}

/**
 * List-price monthly value of a workspace in its own currency (annual spread over 12 months, prepaid quarter
 * over 3). Used by the super admin console when no contract value is entered.
 */
export function listMonthlyValue(tier: string | null | undefined, interval: string | null | undefined, extraProperties: number, currency: Currency): number {
  if (!isPlanTier(tier)) return 0
  const iv: BillingInterval = isBillingInterval(interval) ? interval : 'monthly'
  const q = quote(tier, currency, iv, TIER_RULES[tier].includedProperties + (extraProperties || 0))
  return q.total / INTERVAL_MONTHS[iv]
}
