import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { stripeRequest, StripeError } from '@/lib/stripe'

// Opens the Stripe Customer Portal (change plan, update card, invoices, cancel).
export async function POST() {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: lang === 'en' ? 'Not allowed' : 'Non autorisé' }, { status: 403 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', user.tenant_id)
    .single()

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json(
      {
        error:
          lang === 'en'
            ? 'No billing account yet. Choose a plan first.'
            : "Aucun compte de facturation pour l'instant. Choisissez d'abord un forfait.",
      },
      { status: 400 }
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'

  try {
    const session = await stripeRequest('/billing_portal/sessions', 'POST', {
      customer: tenant.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
      locale: lang,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[billing portal]', err)
    const msg = err instanceof StripeError ? err.message : 'Portal unavailable'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
