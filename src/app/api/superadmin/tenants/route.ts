import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import { createTenantWithAdmin } from '@/lib/tenants'
import { sendWelcomeEmail } from '@/lib/billingEmails'
import { isPlanTier, PLAN_DISPLAY, TRIAL_DAYS } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Super admin: create a workspace by hand (direct sale).
// Body: { companyName, adminName, email, lang, plan, mode: 'trial' | 'direct', trialDays?, contractMrrEur?, sendEmail? }
//  - trial:  in-app free trial (same as public signup), the customer subscribes later through Stripe
//  - direct: active immediately, billed outside Stripe under a contract (no Stripe checkout, no automatic expiry)
export async function POST(request: Request) {
  const admin = await requireSuperAdmin()
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const companyName = String(body.companyName ?? '').trim().slice(0, 120)
  const adminName = String(body.adminName ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200)
  const lang: 'en' | 'fr' = body.lang === 'en' ? 'en' : 'fr'
  const plan = isPlanTier(body.plan) ? body.plan : null
  const mode = body.mode === 'direct' ? 'direct' : 'trial'
  const trialDays = Math.min(90, Math.max(1, Number(body.trialDays) || TRIAL_DAYS))
  const contractMrr = body.contractMrrEur === '' || body.contractMrrEur == null ? null : Number(body.contractMrrEur)

  if (!companyName || !adminName || !EMAIL_RE.test(email) || !plan) {
    return NextResponse.json({ error: 'Company, admin name, a valid email and a plan are required.' }, { status: 400 })
  }
  if (contractMrr !== null && (!Number.isFinite(contractMrr) || contractMrr < 0)) {
    return NextResponse.json({ error: 'Contract value must be a positive number.' }, { status: 400 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle()
  if (existing) return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 })

  const tenantFields: Record<string, unknown> =
    mode === 'direct'
      ? { subscription_tier: plan, subscription_status: 'active', billing_mode: 'direct', contract_mrr_eur: contractMrr }
      : {
          subscription_tier: plan,
          subscription_status: 'trialing',
          billing_mode: 'stripe',
          trial_ends_at: new Date(Date.now() + trialDays * 86400_000).toISOString(),
        }

  try {
    const created = await createTenantWithAdmin(supabase, { companyName, adminName, email, lang, tenantFields })

    let emailed = false
    if (body.sendEmail !== false && created.setPasswordLink) {
      emailed = await sendWelcomeEmail({
        name: adminName,
        email,
        companyName,
        planName: PLAN_DISPLAY.find(p => p.tier === plan)?.name ?? 'Zahir Guest',
        setPasswordLink: created.setPasswordLink,
        lang,
        trialDays: mode === 'trial' ? trialDays : undefined,
      })
    }

    await logAdminAction(admin.id, 'tenant_create', created.tenantId, { mode, plan, email, emailed })
    return NextResponse.json({ ok: true, tenantId: created.tenantId, emailed, setPasswordLink: emailed ? null : created.setPasswordLink })
  } catch (err: any) {
    console.error('[superadmin/tenants] create failed:', err?.message ?? err)
    return NextResponse.json({ error: 'Could not create the workspace. Nothing was saved.' }, { status: 500 })
  }
}
