import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { getPriceId, isBillingInterval, isPlanTier } from '@/lib/plans'
import { stripeRequest, StripeError } from '@/lib/stripe'

// Existing tenant (logged-in tenant admin) subscribes to / switches to a paid plan.
export async function POST(request: Request) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: lang === 'en' ? 'Not allowed' : 'Non autorisé' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const { tier, interval } = body
  if (!isPlanTier(tier) || !isBillingInterval(interval)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = getPriceId(tier, interval)
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          lang === 'en'
            ? 'This plan is not available for self-serve checkout. Please contact us.'
            : "Ce forfait n'est pas disponible en ligne. Merci de nous contacter.",
      },
      { status: 400 }
    )
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id')
    .eq('id', user.tenant_id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  if (tenant.subscription_tier === 'za3fran_internal') {
    return NextResponse.json(
      { error: lang === 'en' ? 'Internal workspace: no billing.' : 'Espace interne : pas de facturation.' },
      { status: 400 }
    )
  }

  // Already has a live subscription: plan changes go through the Stripe portal, never a second subscription.
  if (tenant.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(tenant.subscription_status ?? '')) {
    return NextResponse.json(
      {
        error:
          lang === 'en'
            ? 'You already have an active subscription. Use "Manage billing" to change plan.'
            : 'Vous avez déjà un abonnement actif. Utilisez « Gérer la facturation » pour changer de forfait.',
        code: 'use_portal',
      },
      { status: 409 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'

  try {
    const session = await stripeRequest('/checkout/sessions', 'POST', {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      payment_method_collection: 'if_required',
      client_reference_id: tenant.id,
      metadata: { tenant_id: tenant.id, tier, interval },
      subscription_data: { metadata: { tenant_id: tenant.id, tier, interval } },
      locale: lang,
      ...(tenant.stripe_customer_id ? { customer: tenant.stripe_customer_id } : { customer_email: user.email }),
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing checkout]', err)
    const msg = err instanceof StripeError ? err.message : 'Checkout unavailable'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
