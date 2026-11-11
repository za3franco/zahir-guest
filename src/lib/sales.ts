// Sales figures for the super admin "Sales" tab, computed from Stripe (source of truth for money)
// plus the database (trials, direct contracts). Server-side only.
//
// The Stripe account is shared with Za3fran: only Zahir Guest prices are counted
// (prices whose metadata.app is "zahir-guest", plus the STRIPE_PRICE_* env prices).

import { stripeRequest } from '@/lib/stripe'
import { PLAN_DISPLAY } from '@/lib/plans'

const DAY = 86400_000

export interface SubRow {
  id: string
  tenantId: string | null
  customer: string
  customerName: string
  plan: string
  interval: 'month' | 'year'
  /** Net monthly value in cents (annual / 12), after recurring discounts */
  mrrCents: number
  /** Amount billed each period in cents, after recurring discounts */
  periodCents: number
  currency: string
  status: string
  created: number
  periodEnd: number | null
  cancelAtPeriodEnd: boolean
  cancelAt: number | null
  endedAt: number | null
}

export interface MonthPoint {
  key: string // YYYY-MM
  label: string
  revenueCents: number
  mrrStartCents: number
  newCount: number
  newMrrCents: number
  churnCount: number
  churnMrrCents: number
}

export interface SalesData {
  currency: string
  subs: SubRow[]
  months: MonthPoint[]
  mrrCents: number
  activeCount: number
  revenue30Cents: number
  revenueYtdCents: number
  revenue12Cents: number
  arpaCents: number
  renewals30: SubRow[]
  scheduledCancellations: SubRow[]
  paymentIssues: SubRow[]
  openInvoicesCents: number
  openInvoicesCount: number
  byPlan: { plan: string; count: number; mrrCents: number }[]
  byInterval: { interval: string; count: number; mrrCents: number }[]
  otherCurrencies: string[]
  generatedAt: number
}

async function listAll<T = any>(path: string, params: Record<string, unknown>, maxPages = 20): Promise<T[]> {
  const out: T[] = []
  let startingAfter: string | undefined
  for (let page = 0; page < maxPages; page++) {
    const res: any = await stripeRequest(path, 'GET', { limit: 100, ...params, ...(startingAfter ? { starting_after: startingAfter } : {}) })
    out.push(...(res.data ?? []))
    if (!res.has_more || !res.data?.length) break
    startingAfter = res.data[res.data.length - 1].id
  }
  return out
}

async function zahirPriceIds(): Promise<Set<string>> {
  const ids = new Set<string>()
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('STRIPE_PRICE_') && v) ids.add(v)
  }
  const prices = await listAll<any>('/prices', {})
  for (const p of prices) if (p?.metadata?.app === 'zahir-guest') ids.add(p.id)
  return ids
}

function planLabel(price: any): string {
  const tier = price?.metadata?.tier
  const name = PLAN_DISPLAY.find(p => p.tier === tier)?.name
  return name ?? price?.nickname ?? 'Other'
}

/** Recurring discount on a subscription (percent or amount), applied to the period amount. */
function applyDiscounts(amount: number, discounts: any[], coupons: Map<string, any>): number {
  let net = amount
  for (const d of discounts ?? []) {
    if (!d || typeof d === 'string') continue
    const ref = d.coupon ?? d.source?.coupon
    const coupon = typeof ref === 'string' ? coupons.get(ref) : ref
    if (!coupon) continue
    if (coupon.duration === 'once') continue
    if (coupon.percent_off) net = net * (1 - coupon.percent_off / 100)
    else if (coupon.amount_off) net = Math.max(0, net - coupon.amount_off)
  }
  return Math.round(net)
}

function monthKey(ms: number) {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function loadSales(tenantsByCustomer: Map<string, { id: string; name: string }>): Promise<SalesData> {
  const priceIds = await zahirPriceIds()
  const now = Date.now()

  // ── Subscriptions ─────────────────────────────────────
  const [rawSubs, couponList] = await Promise.all([
    listAll<any>('/subscriptions', { status: 'all', expand: ['data.customer', 'data.discounts'] }),
    listAll<any>('/coupons', {}, 3),
  ])
  const coupons = new Map<string, any>(couponList.map((c: any) => [c.id, c]))

  const subs: SubRow[] = []
  for (const s of rawSubs) {
    const items = (s.items?.data ?? []).filter((it: any) => priceIds.has(it.price?.id))
    if (!items.length) continue
    const price = items[0].price
    const interval: 'month' | 'year' = price?.recurring?.interval === 'year' ? 'year' : 'month'
    const intervalCount = price?.recurring?.interval_count ?? 1
    const gross = items.reduce((sum: number, it: any) => sum + (it.price?.unit_amount ?? 0) * (it.quantity ?? 1), 0)
    const period = applyDiscounts(gross, s.discounts, coupons)
    const months = (interval === 'year' ? 12 : 1) * intervalCount
    const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
    const tenant = tenantsByCustomer.get(customerId)
    subs.push({
      id: s.id,
      tenantId: tenant?.id ?? s.metadata?.tenant_id ?? null,
      customer: customerId,
      customerName: tenant?.name ?? s.customer?.name ?? s.customer?.email ?? customerId,
      plan: planLabel(price),
      interval,
      mrrCents: Math.round(period / months),
      periodCents: period,
      currency: s.currency ?? 'eur',
      status: s.status,
      created: (s.start_date ?? s.created) * 1000,
      periodEnd: (items[0].current_period_end ?? s.current_period_end ?? null) ? (items[0].current_period_end ?? s.current_period_end) * 1000 : null,
      cancelAtPeriodEnd: !!s.cancel_at_period_end,
      cancelAt: s.cancel_at ? s.cancel_at * 1000 : null,
      endedAt: s.ended_at ? s.ended_at * 1000 : null,
    })
  }

  const currency = 'eur'
  const otherCurrencies = Array.from(new Set(subs.map(s => s.currency).filter(c => c !== currency)))
  const eurSubs = subs.filter(s => s.currency === currency)
  const live = eurSubs.filter(s => ['active', 'past_due', 'trialing'].includes(s.status))
  const mrrCents = live.filter(s => s.status !== 'trialing').reduce((n, s) => n + s.mrrCents, 0)
  const paying = live.filter(s => s.status !== 'trialing')

  // ── Paid invoices (12 months) ─────────────────────────
  const since = new Date(now)
  since.setUTCMonth(since.getUTCMonth() - 11, 1)
  since.setUTCHours(0, 0, 0, 0)
  const invoices = await listAll<any>('/invoices', { status: 'paid', created: { gte: Math.floor(since.getTime() / 1000) } })
  const revenueByMonth = new Map<string, number>()
  let revenue30Cents = 0
  let revenueYtdCents = 0
  const yearStart = Date.UTC(new Date(now).getUTCFullYear(), 0, 1)
  for (const inv of invoices) {
    if ((inv.currency ?? 'eur') !== currency) continue
    let net = 0
    for (const line of inv.lines?.data ?? []) {
      const pid = line.pricing?.price_details?.price ?? line.price?.id
      if (!pid || !priceIds.has(typeof pid === 'string' ? pid : pid.id)) continue
      const discount = (line.discount_amounts ?? []).reduce((n: number, d: any) => n + (d.amount ?? 0), 0)
      net += (line.amount ?? 0) - discount
    }
    if (net <= 0) continue
    const paidAt = (inv.status_transitions?.paid_at ?? inv.created) * 1000
    revenueByMonth.set(monthKey(paidAt), (revenueByMonth.get(monthKey(paidAt)) ?? 0) + net)
    if (paidAt >= now - 30 * DAY) revenue30Cents += net
    if (paidAt >= yearStart) revenueYtdCents += net
  }

  // ── Open invoices (unpaid, Zahir lines only) ──────────
  const open = await listAll<any>('/invoices', { status: 'open' }, 5)
  let openInvoicesCents = 0
  let openInvoicesCount = 0
  for (const inv of open) {
    const zahir = (inv.lines?.data ?? []).some((l: any) => priceIds.has(l.pricing?.price_details?.price ?? l.price?.id))
    if (!zahir || (inv.currency ?? 'eur') !== currency) continue
    openInvoicesCount++
    openInvoicesCents += inv.amount_remaining ?? 0
  }

  // ── Month series (12 months, oldest first) ────────────
  const months: MonthPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth() - i, 1))
    const start = d.getTime()
    const end = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)
    const key = monthKey(start)
    // Subscriptions running at the start of the month (current prices: plan changes are not replayed)
    const atStart = eurSubs.filter(s => s.status !== 'trialing' && s.created < start && (!s.endedAt || s.endedAt >= start))
    const created = eurSubs.filter(s => s.created >= start && s.created < end && s.status !== 'incomplete_expired' && s.status !== 'incomplete')
    const ended = eurSubs.filter(s => s.endedAt && s.endedAt >= start && s.endedAt < end)
    months.push({
      key,
      label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      revenueCents: revenueByMonth.get(key) ?? 0,
      mrrStartCents: atStart.reduce((n, s) => n + s.mrrCents, 0),
      newCount: created.length,
      newMrrCents: created.reduce((n, s) => n + s.mrrCents, 0),
      churnCount: ended.length,
      churnMrrCents: ended.reduce((n, s) => n + s.mrrCents, 0),
    })
  }

  const group = <K extends 'plan' | 'interval'>(k: K) => {
    const m = new Map<string, { count: number; mrrCents: number }>()
    for (const s of paying) {
      const key = k === 'interval' ? (s.interval === 'year' ? 'Annual' : 'Monthly') : s.plan
      const g = m.get(key) ?? { count: 0, mrrCents: 0 }
      g.count++
      g.mrrCents += s.mrrCents
      m.set(key, g)
    }
    return Array.from(m.entries()).map(([name, g]) => ({ name, ...g })).sort((a, b) => b.mrrCents - a.mrrCents)
  }

  return {
    currency,
    subs: eurSubs.sort((a, b) => b.created - a.created),
    months,
    mrrCents,
    activeCount: paying.length,
    revenue30Cents,
    revenueYtdCents,
    revenue12Cents: Array.from(revenueByMonth.values()).reduce((a, b) => a + b, 0),
    arpaCents: paying.length ? Math.round(mrrCents / paying.length) : 0,
    renewals30: paying
      .filter(s => !s.cancelAtPeriodEnd && !s.cancelAt && s.periodEnd && s.periodEnd - now <= 30 * DAY)
      .sort((a, b) => (a.periodEnd ?? 0) - (b.periodEnd ?? 0)),
    scheduledCancellations: paying
      .filter(s => s.cancelAtPeriodEnd || s.cancelAt)
      .sort((a, b) => (a.cancelAt ?? a.periodEnd ?? 0) - (b.cancelAt ?? b.periodEnd ?? 0)),
    paymentIssues: eurSubs.filter(s => ['past_due', 'unpaid'].includes(s.status)),
    openInvoicesCents,
    openInvoicesCount,
    byPlan: group('plan').map(g => ({ plan: g.name, count: g.count, mrrCents: g.mrrCents })),
    byInterval: group('interval').map(g => ({ interval: g.name, count: g.count, mrrCents: g.mrrCents })),
    otherCurrencies,
    generatedAt: now,
  }
}
