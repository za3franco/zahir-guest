import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { PlanNotAvailable, stripeLineItems } from '@/lib/billing'
import { countUsage } from '@/lib/limits'
import { isPlanTier, limitsFor, planFromPrice, TIER_RULES } from '@/lib/plans'
import { stripeRequest, StripeError, subscriptionPeriodEnd } from '@/lib/stripe'

/** True when the customer has a card on file (a 100 %-off test checkout leaves none). */
async function hasSavedCard(sub: any): Promise<boolean> {
  if (sub.default_payment_method) return true
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  if (!customerId) return false
  try {
    const customer: any = await stripeRequest(`/customers/${customerId}`)
    if (customer?.invoice_settings?.default_payment_method) return true
    const methods: any = await stripeRequest(`/customers/${customerId}/payment_methods`, 'GET', { limit: 1 })
    return (methods?.data?.length ?? 0) > 0
  } catch {
    return false
  }
}

const tierRank = (t: string | null | undefined) => (t === 'enterprise' ? 2 : t === 'professional' ? 1 : 0)

// Change a running Stripe subscription: plan (Hotel ↔ Professional), billing interval, number of properties.
// Prorated by Stripe. The webhook also syncs the workspace; we update it right away so limits follow at once.
// Body: { tier, interval: 'monthly' | 'annual', properties }
export async function POST(request: Request) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: msg('Not allowed', 'Non autorisé') }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { tier, interval } = body
  if (!isPlanTier(tier) || !TIER_RULES[tier].selfServe || (interval !== 'monthly' && interval !== 'annual')) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single()
  if (!tenant?.stripe_subscription_id || !['active', 'trialing', 'past_due'].includes(tenant.subscription_status ?? '')) {
    return NextResponse.json({ error: msg('No running subscription to change.', "Aucun abonnement en cours à modifier.") }, { status: 400 })
  }

  try {
    const { items, extra } = await stripeLineItems(tier, interval, body.properties)

    // Refuse going below what is already in use (archive properties first).
    const used = await countUsage(supabase, tenant.id, 'properties')
    const newMax = limitsFor(tier, 'active', extra).properties
    if (newMax !== null && used > newMax) {
      return NextResponse.json({
        error: msg(
          `You have ${used} active properties. Archive some first, or choose at least ${used}.`,
          `Vous avez ${used} établissements actifs. Archivez-en d'abord, ou choisissez-en au moins ${used}.`
        ),
      }, { status: 400 })
    }

    const sub: any = await stripeRequest(`/subscriptions/${tenant.stripe_subscription_id}`)
    // Replace every Zahir Guest item; keep anything else untouched.
    const current = (sub.items?.data ?? []).filter((it: any) => planFromPrice(it.price))
    // A move UP (higher plan, or more properties) is charged at once, prorated, on the saved card, and fails cleanly
    // (nothing changes) if the card is declined. A move DOWN, or no card on file, leaves a prorated credit / amount on
    // the next invoice.
    const currentProps = (TIER_RULES[tenant.subscription_tier as keyof typeof TIER_RULES]?.includedProperties ?? 0) + (tenant.extra_properties ?? 0)
    const newProps = TIER_RULES[tier as keyof typeof TIER_RULES].includedProperties + extra
    const movingUp = tierRank(tier) > tierRank(tenant.subscription_tier) || (tierRank(tier) === tierRank(tenant.subscription_tier) && newProps > currentProps)
    const chargeNow = movingUp && (await hasSavedCard(sub))
    const updated: any = await stripeRequest(`/subscriptions/${sub.id}`, 'POST', {
      items: [
        ...current.map((it: any) => ({ id: it.id, deleted: true })),
        ...items.map(i => ({ price: i.price, quantity: i.quantity })),
      ],
      proration_behavior: chargeNow ? 'always_invoice' : 'create_prorations',
      ...(chargeNow ? { payment_behavior: 'error_if_incomplete' } : {}),
      cancel_at_period_end: false,
      metadata: { tenant_id: tenant.id, tier, interval, extra_properties: String(extra) },
    })

    await supabase.from('tenants').update({
      subscription_tier: tier,
      billing_interval: interval,
      extra_properties: extra,
      cancel_at_period_end: false,
      current_period_end: subscriptionPeriodEnd(updated),
    }).eq('id', tenant.id)

    return NextResponse.json({ ok: true, charged: chargeNow })
  } catch (err) {
    console.error('[billing change]', err)
    if (err instanceof PlanNotAvailable) {
      return NextResponse.json({ error: msg('This plan is not available online yet. Please contact us.', "Ce forfait n'est pas encore disponible en ligne. Merci de nous contacter.") }, { status: 503 })
    }
    return NextResponse.json({ error: err instanceof StripeError ? err.message : msg('Change failed. Please try again.', 'La modification a échoué. Veuillez réessayer.') }, { status: 500 })
  }
}
