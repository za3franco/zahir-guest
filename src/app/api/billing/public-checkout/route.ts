import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { appUrl, PlanNotAvailable, stripeLineItems } from '@/lib/billing'
import { isCurrency } from '@/lib/currency'
import { isPlanTier, TIER_RULES } from '@/lib/plans'
import { stripeRequest, StripeError } from '@/lib/stripe'

// Public (no login): a prospect pays straight away in EUR or USD; the webhook creates their workspace
// and first admin once Stripe confirms. MAD buyers start with the free trial and pay from Billing (YouCan Pay).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const lang: 'en' | 'fr' = body.lang === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)

  const companyName = String(body.company_name ?? '').trim()
  const adminName = String(body.admin_name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const { tier, interval } = body
  const currency = isCurrency(body.currency) && body.currency !== 'MAD' ? body.currency : 'EUR'

  if (companyName.length < 2 || companyName.length > 80 || adminName.length < 2 || adminName.length > 80) {
    return NextResponse.json({ error: msg('Please fill in all fields.', 'Merci de remplir tous les champs.') }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    return NextResponse.json({ error: msg('Invalid email address.', 'Adresse email invalide.') }, { status: 400 })
  }
  if (!isPlanTier(tier) || !TIER_RULES[tier].selfServe || (interval !== 'monthly' && interval !== 'annual')) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // Refuse if the email already belongs to a user, so a paid signup never collides with an account.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: msg('An account already exists for this email. Please sign in.', 'Un compte existe déjà pour cet email. Veuillez vous connecter.') },
      { status: 409 }
    )
  }

  try {
    const { items, extra } = await stripeLineItems(tier, interval, body.properties)
    const meta = { company_name: companyName, admin_name: adminName, admin_email: email, lang, tier, interval, extra_properties: String(extra), currency }
    const session = await stripeRequest('/checkout/sessions', 'POST', {
      mode: 'subscription',
      line_items: items,
      currency: currency.toLowerCase(),
      allow_promotion_codes: true,
      payment_method_collection: 'if_required',
      customer_email: email,
      metadata: meta,
      subscription_data: { metadata: meta },
      locale: lang,
      success_url: `${appUrl()}/login?signup=success`,
      cancel_url: `${appUrl()}/login?signup=cancelled`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[public checkout]', err)
    if (err instanceof PlanNotAvailable) {
      return NextResponse.json({ error: msg('This plan is not available online yet. Please contact us.', "Ce forfait n'est pas encore disponible en ligne. Merci de nous contacter.") }, { status: 503 })
    }
    return NextResponse.json({ error: err instanceof StripeError ? err.message : 'Checkout unavailable' }, { status: 500 })
  }
}
