import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { PlanNotAvailable, stripeLineItems } from '@/lib/billing'
import { countUsage } from '@/lib/limits'
import { isPlanTier, limitsFor, planFromPrice, TIER_RULES } from '@/lib/plans'
import { stripeRequest, StripeError, subscriptionPeriodEnd } from '@/lib/stripe'

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
    const updated: any = await stripeRequest(`/subscriptions/${sub.id}`, 'POST', {
      items: [
        ...current.map((it: any) => ({ id: it.id, deleted: true })),
        ...items.map(i => ({ price: i.price, quantity: i.quantity })),
      ],
      proration_behavior: 'create_prorations',
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[billing change]', err)
    if (err instanceof PlanNotAvailable) {
      return NextResponse.json({ error: msg('This plan is not available online yet. Please contact us.', "Ce forfait n'est pas encore disponible en ligne. Merci de nous contacter.") }, { status: 503 })
    }
    return NextResponse.json({ error: err instanceof StripeError ? err.message : msg('Change failed. Please try again.', 'La modification a échoué. Veuillez réessayer.') }, { status: 500 })
  }
}
