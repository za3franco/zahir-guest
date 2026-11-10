import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { planFromPriceId, PLAN_DISPLAY } from '@/lib/plans'
import { stripeRequest, subscriptionPeriodEnd, verifyStripeSignature } from '@/lib/stripe'
import { sendWelcomeEmail } from '@/lib/billingEmails'

// Stripe needs the raw body for signature verification, so we read it as text.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

function slugify(input: string): string {
  const base = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return base || 'tenant'
}

function subscriptionFields(sub: any) {
  const priceId = sub?.items?.data?.[0]?.price?.id
  const plan = planFromPriceId(priceId)
  const fields: Record<string, unknown> = {
    subscription_status: sub.status,
    stripe_subscription_id: sub.id,
    current_period_end: subscriptionPeriodEnd(sub),
    cancel_at_period_end: !!sub.cancel_at_period_end,
  }
  if (plan) {
    fields.subscription_tier = plan.tier
    fields.billing_interval = plan.interval
  } else {
    console.error('[stripe webhook] unknown price id, tier left unchanged:', priceId)
  }
  return { fields, plan }
}

async function findTenantId(supabase: ReturnType<typeof admin>, opts: { tenantId?: string | null; customerId?: string | null }) {
  if (opts.tenantId) return opts.tenantId
  if (!opts.customerId) return null
  const { data } = await supabase.from('tenants').select('id').eq('stripe_customer_id', opts.customerId).maybeSingle()
  return data?.id ?? null
}

async function handleCheckoutCompleted(supabase: ReturnType<typeof admin>, session: any) {
  if (session.mode !== 'subscription' || !session.subscription) return

  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
  const sub = await stripeRequest(`/subscriptions/${subId}`)
  const { fields, plan } = subscriptionFields(sub)
  const customerId: string = typeof session.customer === 'string' ? session.customer : session.customer?.id

  // Case 1: an existing tenant upgraded/subscribed from the Billing page.
  const existingTenantId = await findTenantId(supabase, {
    tenantId: session.metadata?.tenant_id ?? sub.metadata?.tenant_id,
    customerId,
  })

  if (existingTenantId) {
    const { error } = await supabase
      .from('tenants')
      .update({ ...fields, stripe_customer_id: customerId, trial_ends_at: null })
      .eq('id', existingTenantId)
    if (error) throw new Error(`tenant update failed: ${error.message}`)
    return
  }

  // Case 2: brand-new customer from the public signup checkout -> create tenant + first admin.
  const meta = session.metadata ?? {}
  const email: string | undefined = (session.customer_details?.email ?? meta.admin_email)?.toLowerCase()
  const companyName: string = meta.company_name || 'Zahir Guest workspace'
  const adminName: string = meta.admin_name || email?.split('@')[0] || 'Admin'
  const lang: 'en' | 'fr' = meta.lang === 'en' ? 'en' : 'fr'

  if (!email) throw new Error('checkout session has no customer email')

  const { data: existingUser } = await supabase.from('users').select('id').ilike('email', email).maybeSingle()
  if (existingUser) {
    // Paid but the email already belongs to a user. Needs a human; do not loop retries.
    console.error('[stripe webhook] MANUAL ACTION: paid signup for existing user email', email, 'customer', customerId)
    return
  }

  // Create tenant (retry slug on the rare collision).
  let tenantId: string | null = null
  for (let attempt = 0; attempt < 3 && !tenantId; attempt++) {
    const slug = `${slugify(companyName)}-${Math.random().toString(36).slice(2, 6)}`
    const { data, error } = await supabase
      .from('tenants')
      .insert({
        name: companyName,
        slug,
        branding_config: { brand_name: companyName },
        stripe_customer_id: customerId,
        trial_ends_at: null,
        ...fields,
        // The column default is 'za3fran_internal' (unlimited, unbilled). A paying customer must
        // never fall back to it, even if the price ID is unknown to this deployment.
        subscription_tier: plan?.tier ?? 'starter',
      })
      .select('id')
      .single()
    if (!error && data) tenantId = data.id
    else if (error && error.code !== '23505') throw new Error(`tenant insert failed: ${error.message}`)
  }
  if (!tenantId) throw new Error('could not allocate tenant slug')

  // Create first admin (auth user + profile row), same pattern as the invite flow.
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID() + crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name: adminName, role: 'tenant_admin', tenant_id: tenantId },
  })
  if (authError || !authData?.user) {
    await supabase.from('tenants').delete().eq('id', tenantId)
    throw new Error(`auth user creation failed: ${authError?.message}`)
  }

  const { error: profileError } = await supabase.from('users').insert({
    id: authData.user.id,
    tenant_id: tenantId,
    email,
    name: adminName,
    role: 'tenant_admin',
    default_language: lang,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    await supabase.from('tenants').delete().eq('id', tenantId)
    throw new Error(`user profile insert failed: ${profileError.message}`)
  }

  // Welcome email with set-password link. A failure here must not fail the webhook.
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/set-password` },
    })
    const link = linkData?.properties?.action_link
    if (link) {
      await sendWelcomeEmail({
        name: adminName,
        email,
        companyName,
        planName: PLAN_DISPLAY.find(p => p.tier === plan?.tier)?.name ?? 'Zahir Guest',
        setPasswordLink: link,
        lang,
      })
    }
  } catch (err) {
    console.error('[stripe webhook] welcome email failed:', err)
  }
}

async function handleSubscriptionChanged(supabase: ReturnType<typeof admin>, sub: any, deleted: boolean) {
  const customerId: string = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
  const tenantId = await findTenantId(supabase, { tenantId: sub.metadata?.tenant_id, customerId })
  if (!tenantId) {
    // Can happen if this event arrives before checkout.session.completed created the tenant.
    console.log('[stripe webhook] no tenant yet for customer', customerId, '- skipping')
    return
  }

  if (deleted) {
    const { error } = await supabase
      .from('tenants')
      .update({ subscription_status: 'canceled', cancel_at_period_end: false, current_period_end: subscriptionPeriodEnd(sub) })
      .eq('id', tenantId)
    if (error) throw new Error(`tenant cancel failed: ${error.message}`)
    return
  }

  const { fields } = subscriptionFields(sub)
  const { error } = await supabase.from('tenants').update(fields).eq('id', tenantId)
  if (error) throw new Error(`tenant sync failed: ${error.message}`)
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const raw = await request.text()
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const supabase = admin()

  // Idempotency: Stripe may deliver the same event more than once.
  const { error: dupError } = await supabase.from('stripe_events').insert({ id: event.id, type: event.type })
  if (dupError) {
    if (dupError.code === '23505') return NextResponse.json({ received: true, duplicate: true })
    console.error('[stripe webhook] stripe_events insert failed:', dupError.message)
    return NextResponse.json({ error: 'Event log unavailable' }, { status: 500 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object)
        break
      case 'customer.subscription.updated':
        await handleSubscriptionChanged(supabase, event.data.object, false)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(supabase, event.data.object, true)
        break
      default:
        // Other events are acknowledged and ignored.
        break
    }
  } catch (err: any) {
    console.error('[stripe webhook] handler error for', event.type, event.id, err?.message ?? err)
    // Release the idempotency lock so Stripe's retry can reprocess this event.
    await supabase.from('stripe_events').delete().eq('id', event.id)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
