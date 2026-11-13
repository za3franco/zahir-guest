import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { planName } from '@/lib/plans'
import { createTenantWithAdmin } from '@/lib/tenants'
import { isCurrency, madPaymentsEnabled } from '@/lib/currency'
import { sendWelcomeEmail } from '@/lib/billingEmails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const MAX_PER_IP_PER_HOUR = 5

// Public endpoint: creates a free "Découverte" workspace (no card, no time limit) + first admin + welcome email.
// Paid plans are bought afterwards from Billing; Professional pilots are opened by the super admin after a demo.
export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const lang: 'en' | 'fr' = body.lang === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)

  // Honeypot: real users never fill this hidden field. Pretend success so bots learn nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const companyName = String(body.companyName ?? '').trim().slice(0, 120)
  const adminName = String(body.name ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200)
  // Currency shown to the visitor; it can still change until the first payment.
  const currency = isCurrency(body.currency) && (body.currency !== 'MAD' || madPaymentsEnabled()) ? body.currency : 'EUR'

  if (!companyName || !adminName || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: msg('Please fill in all fields with a valid email.', 'Veuillez remplir tous les champs avec un email valide.') },
      { status: 400 }
    )
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // Rate limit per IP (hashed; raw IPs are not stored)
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const ipHash = createHash('sha256').update(ip).digest('hex')
  const since = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await supabase
    .from('signup_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since)
  if ((count ?? 0) >= MAX_PER_IP_PER_HOUR) {
    return NextResponse.json(
      { error: msg('Too many attempts. Please try again later.', 'Trop de tentatives. Veuillez réessayer plus tard.') },
      { status: 429 }
    )
  }
  await supabase.from('signup_attempts').insert({ ip_hash: ipHash })

  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle()
  if (existing) {
    return NextResponse.json(
      {
        error: msg(
          'An account already exists with this email. Please sign in instead.',
          'Un compte existe déjà avec cet email. Veuillez vous connecter.'
        ),
        code: 'email_exists',
      },
      { status: 409 }
    )
  }

  try {
    const created = await createTenantWithAdmin(supabase, {
      companyName,
      adminName,
      email,
      lang,
      tenantFields: {
        subscription_tier: 'free', // explicit: the column default would be the unlimited internal tier
        subscription_status: 'active',
        trial_ends_at: null,
        billing_currency: currency,
      },
    })

    if (created.setPasswordLink) {
      await sendWelcomeEmail({
        name: adminName,
        email,
        companyName,
        planName: planName('free', lang) ?? 'Zahir Guest',
        setPasswordLink: created.setPasswordLink,
        lang,
        freePlan: true,
      })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[signup] failed:', err?.message ?? err)
    return NextResponse.json(
      { error: msg('Something went wrong. Please try again.', "Une erreur est survenue. Veuillez réessayer.") },
      { status: 500 }
    )
  }
}
