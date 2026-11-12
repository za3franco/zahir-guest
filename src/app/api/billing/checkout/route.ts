import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { appUrl, madEnabled, PlanNotAvailable, stripeLineItems, workspaceCurrency } from '@/lib/billing'
import { extraFor, isPlanTier, TIER_RULES } from '@/lib/plans'
import { stripeRequest, StripeError } from '@/lib/stripe'
import { clientIp } from '@/lib/youcanpay'
import { startYoucanCheckout, youcanPeriodRunning } from '@/lib/youcanBilling'

// A logged-in tenant admin pays for a plan (or, in MAD, for extra properties during a prepaid period).
//   EUR / USD → Stripe Checkout (subscription). An existing Stripe subscription is changed via /api/billing/change.
//   MAD       → YouCan Pay (prepaid quarter or year).
// Body: { tier, interval, properties, currency } or, in MAD, { kind: 'extra', count }.
export async function POST(request: Request) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: msg('Not allowed', 'Non autorisé') }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  if (tenant.subscription_tier === 'za3fran_internal' || tenant.billing_mode === 'direct') {
    return NextResponse.json({ error: msg('This workspace is not billed online.', "Cet espace n'est pas facturé en ligne.") }, { status: 400 })
  }

  const currency = workspaceCurrency(tenant, body.currency)

  // ── MAD: YouCan Pay ─────────────────────────────────────────────
  if (currency === 'MAD') {
    if (!madEnabled()) {
      return NextResponse.json({ error: msg('Payment in dirhams is not available yet.', "Le paiement en dirhams n'est pas encore disponible.") }, { status: 400 })
    }
    try {
      if (body.kind === 'extra') {
        if (!youcanPeriodRunning(tenant)) {
          return NextResponse.json({ error: msg('No prepaid period is running.', "Aucune période prépayée n'est en cours.") }, { status: 400 })
        }
        const url = await startYoucanCheckout({
          tenant, user, lang, customerIp: clientIp(request),
          order: { kind: 'extra', count: Math.max(1, Math.floor(Number(body.count) || 1)) },
        })
        return NextResponse.json({ url })
      }
      const { tier, interval } = body
      if (!isPlanTier(tier) || !TIER_RULES[tier].selfServe || (interval !== 'quarterly' && interval !== 'annual')) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }
      const properties = TIER_RULES[tier].includedProperties + extraFor(tier, body.properties)
      const url = await startYoucanCheckout({ tenant, user, lang, customerIp: clientIp(request), order: { kind: 'plan', tier, interval, properties } })
      return NextResponse.json({ url })
    } catch (err: any) {
      console.error('[billing checkout youcan]', err?.message ?? err)
      const code = err?.message === 'max_reached' ? msg('Maximum number of properties reached for this plan.', 'Nombre maximum d’établissements atteint pour ce forfait.') : msg('Payment page unavailable. Please try again.', 'Page de paiement indisponible. Veuillez réessayer.')
      return NextResponse.json({ error: code }, { status: 500 })
    }
  }

  // ── EUR / USD: Stripe ──────────────────────────────────────────
  const { tier } = body
  const interval: 'monthly' | 'annual' | null = body.interval === 'monthly' || body.interval === 'annual' ? body.interval : null
  if (!isPlanTier(tier) || !TIER_RULES[tier].selfServe || !interval) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Already subscribed: changes go through /api/billing/change, never a second subscription.
  if (tenant.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(tenant.subscription_status ?? '')) {
    return NextResponse.json({ error: msg('You already have a subscription.', 'Vous avez déjà un abonnement.'), code: 'use_change' }, { status: 409 })
  }
  // A MAD prepaid period still running: do not double-bill.
  if (youcanPeriodRunning(tenant) && tenant.subscription_status === 'active') {
    return NextResponse.json({ error: msg('Your prepaid period is still running.', 'Votre période prépayée est toujours en cours.') }, { status: 409 })
  }

  try {
    const { items, extra } = await stripeLineItems(tier, interval, body.properties)
    const meta = { tenant_id: tenant.id, tier, interval, extra_properties: String(extra), currency }
    const session = await stripeRequest('/checkout/sessions', 'POST', {
      mode: 'subscription',
      line_items: items,
      currency: currency.toLowerCase(),
      allow_promotion_codes: true,
      payment_method_collection: 'if_required',
      client_reference_id: tenant.id,
      metadata: meta,
      subscription_data: { metadata: meta },
      locale: lang,
      ...(tenant.stripe_customer_id ? { customer: tenant.stripe_customer_id } : { customer_email: user.email }),
      success_url: `${appUrl()}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl()}/dashboard/billing?checkout=cancelled`,
    })
    await supabase.from('tenants').update({ billing_currency: currency }).eq('id', tenant.id).is('stripe_customer_id', null)
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing checkout]', err)
    if (err instanceof PlanNotAvailable) {
      return NextResponse.json({ error: msg('This plan is not available online yet. Please contact us.', "Ce forfait n'est pas encore disponible en ligne. Merci de nous contacter.") }, { status: 503 })
    }
    const m = err instanceof StripeError ? err.message : 'Checkout unavailable'
    return NextResponse.json({ error: m }, { status: 500 })
  }
}
