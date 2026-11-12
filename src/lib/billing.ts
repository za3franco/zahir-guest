// Shared billing helpers: which payment provider takes a currency, Stripe line items for a plan,
// and the currency a workspace must pay in. Server-side only.

import { cookies, headers } from 'next/headers'
import { AUTO_CURRENCY_COOKIE, CURRENCY_COOKIE, currencyForCountry, isCurrency, madPaymentsEnabled, type Currency } from '@/lib/currency'
import { extraFor, lookupKeys, TIER_RULES, type PlanTier, type StripeInterval } from '@/lib/plans'
import { pricesByLookupKey } from '@/lib/stripe'

/** MAD is taken by YouCan Pay when switched on (same switch as za3fran.io); otherwise Morocco pays in EUR. */
export const madEnabled = madPaymentsEnabled

export function providerFor(currency: Currency): 'stripe' | 'youcanpay' {
  return currency === 'MAD' ? 'youcanpay' : 'stripe'
}

/** Visitor currency: explicit choice (cookie) first, else the country Vercel detected, else EUR. */
export function visitorCurrency(): Currency {
  const mad = madEnabled()
  for (const name of [CURRENCY_COOKIE, AUTO_CURRENCY_COOKIE]) {
    const v = cookies().get(name)?.value
    if (isCurrency(v) && (v !== 'MAD' || mad)) return v
  }
  return currencyForCountry(headers().get('x-vercel-ip-country'), mad)
}

/**
 * Currency a workspace pays in. Once it has paid (Stripe customer or YouCan payment), the currency is
 * locked: Stripe refuses mixing currencies on one customer, and invoices must stay consistent.
 */
export function workspaceCurrency(
  tenant: { billing_currency?: string | null; stripe_customer_id?: string | null; billing_mode?: string | null } | null,
  requested?: unknown
): Currency {
  const locked = !!tenant?.stripe_customer_id || tenant?.billing_mode === 'youcan'
  if (locked && isCurrency(tenant?.billing_currency)) return tenant!.billing_currency as Currency
  if (isCurrency(requested) && (requested !== 'MAD' || madEnabled())) return requested
  if (isCurrency(tenant?.billing_currency) && (tenant!.billing_currency !== 'MAD' || madEnabled())) return tenant!.billing_currency as Currency
  return visitorCurrency()
}

export class PlanNotAvailable extends Error {}

/** Stripe Checkout / subscription line items for a self-serve plan and a total number of properties. */
export async function stripeLineItems(tier: PlanTier, interval: StripeInterval, totalProperties?: number | null) {
  const keys = lookupKeys(tier, interval)
  if (!keys || !TIER_RULES[tier].selfServe) throw new PlanNotAvailable('not self-serve')
  const prices = await pricesByLookupKey([keys.base, keys.extra])
  const base = prices.get(keys.base)
  if (!base) throw new PlanNotAvailable(`missing Stripe price ${keys.base}`)
  const extra = extraFor(tier, totalProperties)
  const items: { price: string; quantity: number }[] = [{ price: base, quantity: 1 }]
  if (extra > 0) {
    const extraPrice = prices.get(keys.extra)
    if (!extraPrice) throw new PlanNotAvailable(`missing Stripe price ${keys.extra}`)
    items.push({ price: extraPrice, quantity: extra })
  }
  return { items, extra, prices: { base, extra: prices.get(keys.extra) ?? null } }
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
}
