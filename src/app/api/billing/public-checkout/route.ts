import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getPriceId, isBillingInterval, isPlanTier } from '@/lib/plans'
import { stripeRequest, StripeError } from '@/lib/stripe'

// Public (no login): a prospect picks a plan; the webhook creates their workspace
// and first admin once Stripe confirms the checkout. Used by the /signup page (ZG-3 Pass 2).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const lang: 'en' | 'fr' = body.lang === 'en' ? 'en' : 'fr'

  const companyName = String(body.company_name ?? '').trim()
  const adminName = String(body.admin_name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const { tier, interval } = body

  if (companyName.length < 2 || companyName.length > 80 || adminName.length < 2 || adminName.length > 80) {
    return NextResponse.json({ error: lang === 'en' ? 'Please fill in all fields.' : 'Merci de remplir tous les champs.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: lang === 'en' ? 'Invalid email address.' : 'Adresse email invalide.' }, { status: 400 })
  }
  if (!isPlanTier(tier) || !isBillingInterval(interval)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const priceId = getPriceId(tier, interval)
  if (!priceId) {
    return NextResponse.json(
      { error: lang === 'en' ? 'This plan is not available online. Please contact us.' : "Ce forfait n'est pas disponible en ligne. Merci de nous contacter." },
      { status: 400 }
    )
  }

  // Refuse if the email already belongs to a user, so a paid signup never collides with an account.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: lang === 'en' ? 'An account already exists for this email. Please sign in.' : 'Un compte existe déjà pour cet email. Veuillez vous connecter.' },
      { status: 409 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
  const meta = { company_name: companyName, admin_name: adminName, admin_email: email, lang, tier, interval }

  try {
    const session = await stripeRequest('/checkout/sessions', 'POST', {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      payment_method_collection: 'if_required',
      customer_email: email,
      metadata: meta,
      subscription_data: { metadata: meta },
      locale: lang,
      success_url: `${appUrl}/login?signup=success`,
      cancel_url: `${appUrl}/login?signup=cancelled`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[public checkout]', err)
    const msg = err instanceof StripeError ? err.message : 'Checkout unavailable'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
