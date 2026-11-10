import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { planFromPriceId, PLAN_DISPLAY } from '@/lib/plans'
import { stripeRequest, subscriptionPeriodEnd, verifyStripeSignature } from '@/lib/stripe'
import { sendWelcomeEmail } from '@/lib/billingEmails'
import { createTenantWithAdmin } from '@/lib/tenants'

// Stripe needs the raw body for signature verification, so we read it as text.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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

  // Create tenant + first admin (rolls back on failure). The column default for subscription_tier is
  // 'za3fran_internal' (unlimited, unbilled); a paying customer must never fall back to it.
  const created = await createTenantWithAdmin(supabase, {
    companyName,
    adminName,
    email,
    lang,
    tenantFields: {
      stripe_customer_id: customerId,
      trial_ends_at: null,
      ...fields,
      subscription_tier: plan?.tier ?? 'starter',
    },
  })

  // Welcome email with set-password link. A failure here must not fail the webhook.
  try {
    if (created.setPasswordLink) {
      await sendWelcomeEmail({
        name: adminName,
        email,
        companyName,
        planName: PLAN_DISPLAY.find(p => p.tier === plan?.tier)?.name ?? 'Zahir Guest',
        setPasswordLink: created.setPasswordLink,
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
