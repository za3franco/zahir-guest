import { apiError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'
import { createTenantWithAdmin } from '@/lib/tenants'
import { sendWelcomeEmail } from '@/lib/billingEmails'
import { isPlanTier, planName, TRIAL_DAYS } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Super admin: create a workspace by hand (direct sale).
// Body: { companyName, adminName, email, lang, plan, mode: 'trial' | 'direct', trialDays?, contractMrrEur?, sendEmail? }
//  - trial:  in-app free trial (same as public signup), the customer subscribes later through Stripe
//  - direct: active immediately, billed outside Stripe under a contract (no Stripe checkout, no automatic expiry)
export async function POST(request: Request) {
  const admin = await requireSuperAdmin()
  const lang = langOf(admin)
  const body = await request.json().catch(() => null)
  if (!body) return apiError(lang, 'invalid_request')

  const companyName = String(body.companyName ?? '').trim().slice(0, 120)
  const adminName = String(body.adminName ?? '').trim().slice(0, 120)
  const email = String(body.email ?? '').trim().toLowerCase().slice(0, 200)
  const wsLang: 'en' | 'fr' = body.lang === 'en' ? 'en' : 'fr' // language of the new workspace (its emails)
  const plan = isPlanTier(body.plan) ? body.plan : null
  // direct = contract; trial = Professional-level pilot of N days (falls back to Découverte); free = Découverte
  const mode = body.mode === 'direct' ? 'direct' : body.mode === 'free' ? 'free' : 'trial'
  const trialDays = Math.min(90, Math.max(1, Number(body.trialDays) || TRIAL_DAYS))
  const contractMrr = body.contractMrrEur === '' || body.contractMrrEur == null ? null : Number(body.contractMrrEur)

  if (!companyName || !adminName || !EMAIL_RE.test(email) || !plan) {
    return apiError(lang, 'tenant_fields_required')
  }
  if (contractMrr !== null && (!Number.isFinite(contractMrr) || contractMrr < 0)) {
    return apiError(lang, 'contract_value')
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: existing } = await supabase.from('users').select('id').ilike('email', email).maybeSingle()
  if (existing) return apiError(lang, 'email_exists')

  const tenantFields: Record<string, unknown> =
    mode === 'free'
      ? { subscription_tier: 'free', subscription_status: 'active', billing_mode: 'stripe' }
      : mode === 'direct'
      ? { subscription_tier: plan, subscription_status: 'active', billing_mode: 'direct', contract_mrr_eur: contractMrr }
      : {
          subscription_tier: plan,
          subscription_status: 'trialing',
          billing_mode: 'stripe',
          trial_ends_at: new Date(Date.now() + trialDays * 86400_000).toISOString(),
        }

  try {
    const created = await createTenantWithAdmin(supabase, { companyName, adminName, email, lang: wsLang, tenantFields })

    let emailed = false
    if (body.sendEmail !== false && created.setPasswordLink) {
      emailed = await sendWelcomeEmail({
        name: adminName,
        email,
        companyName,
        planName: planName(mode === 'free' ? 'free' : plan, wsLang) ?? 'Zahir Guest',
        setPasswordLink: created.setPasswordLink,
        lang: wsLang,
        trialDays: mode === 'trial' ? trialDays : undefined,
        freePlan: mode === 'free',
      })
    }

    await logAdminAction(admin.id, 'tenant_create', created.tenantId, { mode, plan, email, emailed })
    return NextResponse.json({ ok: true, tenantId: created.tenantId, emailed, setPasswordLink: emailed ? null : created.setPasswordLink })
  } catch (err: any) {
    console.error('[superadmin/tenants] create failed:', err?.message ?? err)
    return apiError(lang, 'tenant_create_failed')
  }
}
