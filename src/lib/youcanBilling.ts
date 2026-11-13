// MAD billing through YouCan Pay: prepaid periods (quarter or year) and extra properties mid-period.
// Server-side only. Table: billing_payments (see sql/010_zg5_pricing_v2.sql).

import { createClient } from '@supabase/supabase-js'
import { appUrl } from '@/lib/billing'
import { escHtml, sendBillingNotice } from '@/lib/billingEmails'
import { formatMoney } from '@/lib/currency'
import { extraFor, INTERVAL_MONTHS, planName, PRICE_GRID, quote, TIER_RULES, type BillingInterval, type PlanTier } from '@/lib/plans'
import { createToken, getTransaction, paymentFormUrl, transactionMatches } from '@/lib/youcanpay'

export const GRACE_DAYS = 7
const DAY = 86400_000

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function addMonths(from: Date, months: number) {
  const d = new Date(from)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

/** A YouCan workspace whose prepaid period is still running (or within the grace period). */
export function youcanPeriodRunning(tenant: { billing_mode?: string | null; current_period_end?: string | null }) {
  return tenant?.billing_mode === 'youcan' && !!tenant.current_period_end && new Date(tenant.current_period_end).getTime() > Date.now()
}

export type YoucanOrder =
  | { kind: 'plan'; tier: PlanTier; interval: Extract<BillingInterval, 'quarterly' | 'annual'>; properties: number }
  | { kind: 'extra'; count: number }

/** Amount (whole MAD) and period for an order, given the workspace's current state. */
export function priceYoucanOrder(tenant: any, order: YoucanOrder) {
  const now = new Date()
  if (order.kind === 'plan') {
    const q = quote(order.tier, 'MAD', order.interval, order.properties)
    // Renewing the same plan before the end extends it; a new or different plan starts today.
    const sameRunning = youcanPeriodRunning(tenant) && tenant.subscription_tier === order.tier && tenant.subscription_status === 'active'
    const start = sameRunning ? new Date(tenant.current_period_end) : now
    const end = addMonths(start, INTERVAL_MONTHS[order.interval])
    return { amount: q.total, extra: q.extra, periodStart: start, periodEnd: end }
  }
  // Extra properties for the rest of the running period, prorated by day on the monthly price.
  const tier = tenant.subscription_tier as PlanTier
  const unit = PRICE_GRID.MAD[tier]?.extra
  if (!youcanPeriodRunning(tenant) || unit == null) throw new Error('no_running_period')
  const current = Number(tenant.extra_properties) || 0
  const count = Math.max(1, Math.min(order.count, TIER_RULES[tier].maxExtraProperties - current))
  if (count <= 0 || current + count > TIER_RULES[tier].maxExtraProperties) throw new Error('max_reached')
  const days = Math.max(1, Math.ceil((new Date(tenant.current_period_end).getTime() - now.getTime()) / DAY))
  const amount = Math.max(1, Math.round(unit * count * (days / 30.44)))
  return { amount, extra: current + count, periodStart: now, periodEnd: new Date(tenant.current_period_end) }
}

/** Create the payment row and the YouCan token; returns the URL of YouCan's payment page. */
export async function startYoucanCheckout(opts: {
  tenant: any
  user: { id: string; email: string; name?: string | null }
  order: YoucanOrder
  lang: 'en' | 'fr'
  customerIp: string
}) {
  const { tenant, user, order, lang, customerIp } = opts
  const priced = priceYoucanOrder(tenant, order)
  // Live test (same mechanism as za3fran.io): the buyer email YOUCANPAY_TEST_EMAIL pays
  // YOUCANPAY_TEST_AMOUNT_MAD instead of the real price. Set the amount to 0 to switch it off.
  const testEmail = String(process.env.YOUCANPAY_TEST_EMAIL || '').trim().toLowerCase()
  const testAmount = Math.floor(Number(process.env.YOUCANPAY_TEST_AMOUNT_MAD) || 0)
  if (testEmail && testAmount > 0 && user.email.trim().toLowerCase() === testEmail) {
    console.warn('[youcan] test price applied for', user.email, testAmount, 'MAD')
    priced.amount = testAmount
  }
  const supabase = db()
  const { data: row, error } = await supabase
    .from('billing_payments')
    .insert({
      tenant_id: tenant.id,
      user_id: user.id,
      provider: 'youcanpay',
      kind: order.kind,
      tier: order.kind === 'plan' ? order.tier : tenant.subscription_tier,
      billing_interval: order.kind === 'plan' ? order.interval : tenant.billing_interval,
      extra_properties: priced.extra,
      currency: 'MAD',
      amount_minor: priced.amount * 100,
      period_start: priced.periodStart.toISOString(),
      period_end: priced.periodEnd.toISOString(),
      status: 'pending',
    })
    .select('id')
    .single()
  if (error || !row) throw new Error(`payment row insert failed: ${error?.message}`)

  const base = appUrl()
  const token = await createToken({
    orderId: row.id,
    amountMinor: priced.amount * 100,
    currency: 'MAD',
    customerIp,
    successUrl: `${base}/api/billing/youcan/return?pay=${row.id}`,
    errorUrl: `${base}/dashboard/billing?checkout=cancelled`,
    customer: { name: user.name ?? '', email: user.email },
    metadata: { app: 'zahir-guest', tenant_id: tenant.id, kind: order.kind },
  })
  await supabase.from('billing_payments').update({ provider_token: token }).eq('id', row.id)
  return paymentFormUrl(token, lang)
}

/**
 * Verify a YouCan transaction against a payment row and apply it once.
 * Called from the buyer's return URL and from the webhook; whichever comes first wins the atomic claim.
 */
export async function confirmYoucanPayment(paymentId: string, transactionId: string | null, eventTx?: any) {
  const supabase = db()
  const { data: p } = await supabase.from('billing_payments').select('*').eq('id', paymentId).maybeSingle()
  if (!p) return { ok: false, reason: 'unknown_payment' }
  if (p.status === 'paid') return { ok: true, already: true, tenantId: p.tenant_id }

  // Always trust YouCan's API over the event body or the URL.
  const tx = (await getTransaction(transactionId ?? eventTx?.id)) ?? null
  const check = transactionMatches(tx, p)
  if (!check.ok) return { ok: false, reason: check.reason }

  const { data: claimed } = await supabase
    .from('billing_payments')
    .update({ status: 'paid', transaction_id: tx.id ?? transactionId, paid_at: new Date().toISOString() })
    .eq('id', p.id)
    .eq('status', 'pending')
    .select('id')
  if (!claimed?.length) return { ok: true, already: true, tenantId: p.tenant_id }

  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', p.tenant_id).single()
  const suspended = tenant?.subscription_status === 'suspended'
  const fields: Record<string, unknown> =
    p.kind === 'plan'
      ? {
          subscription_tier: p.tier,
          billing_mode: 'youcan',
          billing_currency: 'MAD',
          billing_interval: p.billing_interval,
          extra_properties: p.extra_properties ?? 0,
          current_period_end: p.period_end,
          cancel_at_period_end: false,
          trial_ends_at: null,
          renewal_reminders_sent: [],
          ...(suspended ? {} : { subscription_status: 'active' }),
        }
      : { extra_properties: p.extra_properties }
  const { error } = await supabase.from('tenants').update(fields).eq('id', p.tenant_id)
  if (error) {
    console.error('[youcan] tenant update failed after payment', p.id, error.message)
    return { ok: false, reason: 'tenant_update_failed' }
  }

  // Receipt to the person who paid (failure must not undo the payment).
  try {
    const { data: payer } = await supabase.from('users').select('name, email, default_language').eq('id', p.user_id).maybeSingle()
    if (payer?.email) {
      const lang: 'en' | 'fr' = payer.default_language === 'en' ? 'en' : 'fr'
      const amount = formatMoney(p.amount_minor / 100, 'MAD', lang)
      const until = new Date(p.period_end).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      const plan = escHtml(planName(p.tier, lang) ?? 'Zahir Guest')
      await sendBillingNotice({
        to: { name: payer.name ?? payer.email, email: payer.email },
        lang,
        subject: lang === 'en' ? 'Payment received — Zahir Guest' : 'Paiement reçu — Zahir Guest',
        title: lang === 'en' ? 'Thank you, payment received' : 'Merci, paiement reçu',
        paragraphs: [
          p.kind === 'plan'
            ? lang === 'en'
              ? `We received <strong style="color:#C8A45A;">${amount}</strong> for the <strong style="color:#F4F1EC;">${plan}</strong> plan. Your access runs until <strong style="color:#F4F1EC;">${until}</strong>.`
              : `Nous avons bien reçu <strong style="color:#C8A45A;">${amount}</strong> pour le forfait <strong style="color:#F4F1EC;">${plan}</strong>. Votre accès court jusqu'au <strong style="color:#F4F1EC;">${until}</strong>.`
            : lang === 'en'
              ? `We received <strong style="color:#C8A45A;">${amount}</strong> for additional properties until ${until}.`
              : `Nous avons bien reçu <strong style="color:#C8A45A;">${amount}</strong> pour des établissements supplémentaires jusqu'au ${until}.`,
          lang === 'en'
            ? 'We will remind you by email before the end of the period. Your receipt is also available from YouCan Pay.'
            : "Nous vous enverrons un rappel par email avant la fin de la période. Votre reçu est aussi disponible auprès de YouCan Pay.",
        ],
        cta: { href: `${appUrl()}/dashboard/billing`, label: lang === 'en' ? 'Open Billing →' : 'Ouvrir la facturation →' },
      })
    }
  } catch (err) {
    console.error('[youcan] receipt email failed', err)
  }
  return { ok: true, tenantId: p.tenant_id }
}

/** How many extra properties a running YouCan Professional/Hotel plan can still add. */
export function extraHeadroom(tenant: any) {
  const tier = tenant?.subscription_tier as PlanTier
  if (!TIER_RULES[tier]) return 0
  return Math.max(0, TIER_RULES[tier].maxExtraProperties - (Number(tenant.extra_properties) || 0))
}

export { extraFor }
