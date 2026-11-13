// ZG-6 — follow-up emails for workspaces on the free "Découverte" plan, to move them to the Hotel plan.
//
//   d2     2 days after sign-up   : launch the first audit (skipped, without sending, if one already exists)
//   d14    14 days after sign-up  : what the Hotel plan adds
//   quota  campaign refused because the quarterly audit is used (at most once per quarter)
//
// Rules: never twice (tenants.nurture_emails_sent), only while the workspace is really on the free plan
// (stops as soon as it pays or a pilot is running), never after an unsubscribe (tenants.nurture_unsubscribed_at),
// sent to the workspace admins in their own language (users.default_language). Server-side only.

import { createHmac, timingSafeEqual } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { appUrl } from '@/lib/billing'
import { escHtml, sendBillingNotice } from '@/lib/billingEmails'
import { effectivePlan, FREE_LIMITS, PRICE_GRID, TIER_RULES, type TenantBilling } from '@/lib/plans'

export type NurtureKind = 'd2' | 'd14' | 'quota'

export const NURTURE_TENANT_COLUMNS =
  'id, name, created_at, subscription_tier, subscription_status, trial_ends_at, stripe_subscription_id, billing_mode, current_period_end, extra_properties, nurture_emails_sent, nurture_unsubscribed_at'

export interface NurtureTenant extends TenantBilling {
  id: string
  name: string | null
  created_at: string
  nurture_emails_sent: unknown
  nurture_unsubscribed_at: string | null
}

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export function sentKeys(t: Pick<NurtureTenant, 'nurture_emails_sent'>): string[] {
  return Array.isArray(t.nurture_emails_sent) ? t.nurture_emails_sent.filter((x): x is string => typeof x === 'string') : []
}

/** Free plan for real (not a pilot, not paid, not a direct contract) and not unsubscribed. */
export function nurtureEligible(t: NurtureTenant): boolean {
  if (t.nurture_unsubscribed_at) return false
  if (t.billing_mode === 'direct') return false
  return effectivePlan(t).kind === 'free'
}

/** Key of the current calendar quarter (UTC), e.g. 'quota-2026Q4'. */
export function quotaKey(d = new Date()): string {
  return `quota-${d.getUTCFullYear()}Q${Math.floor(d.getUTCMonth() / 3) + 1}`
}

// ── Unsubscribe link (signed, no login needed) ──────────────────────────────────────────────

function secret(): string | null {
  return process.env.UNSUBSCRIBE_SECRET || process.env.CRON_SECRET || null
}

export function unsubscribeSignature(tenantId: string): string | null {
  const s = secret()
  if (!s) return null
  return createHmac('sha256', s).update(`nurture:${tenantId}`).digest('base64url').slice(0, 32)
}

export function verifyUnsubscribe(tenantId: string, sig: string): boolean {
  const expected = unsubscribeSignature(tenantId)
  if (!expected || typeof sig !== 'string' || sig.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
}

export function unsubscribeUrl(tenantId: string): string | undefined {
  const sig = unsubscribeSignature(tenantId)
  return sig ? `${appUrl()}/api/email/unsubscribe?t=${encodeURIComponent(tenantId)}&s=${sig}` : undefined
}

// ── Content ─────────────────────────────────────────────────────────────────────────────────

const GOLD = (s: string) => `<strong style="color:#F4F1EC;">${s}</strong>`

function nextQuarterStart(lang: 'en' | 'fr', d = new Date()): string {
  const q = Math.floor(d.getUTCMonth() / 3)
  const start = new Date(Date.UTC(d.getUTCFullYear(), (q + 1) * 3, 1))
  return start.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function hotelList(lang: 'en' | 'fr'): string {
  const h = TIER_RULES.starter
  const items =
    lang === 'en'
      ? [
          `${h.auditsPerMonth} audits per month, instead of ${FREE_LIMITS.auditsPerQuarter} per quarter`,
          'the full Zahir Guest library: 573 standards across every department',
          'your own questionnaires, and import of your existing standards',
          `${h.aiBase} AI summaries per month to write the report's executive summary`,
          `${h.users} users instead of ${FREE_LIMITS.users}`,
        ]
      : [
          `${h.auditsPerMonth} audits par mois, au lieu d'${FREE_LIMITS.auditsPerQuarter} par trimestre`,
          'la bibliothèque Zahir Guest complète : 573 standards, tous les services',
          'vos propres questionnaires, et l’import de vos standards existants',
          `${h.aiBase} synthèses IA par mois pour rédiger le résumé du rapport`,
          `${h.users} utilisateurs au lieu de ${FREE_LIMITS.users}`,
        ]
  return items.map(x => `&nbsp;&nbsp;•&nbsp;${x}`).join('<br>')
}

function content(kind: NurtureKind, lang: 'en' | 'fr', company: string) {
  const en = lang === 'en'
  const price = `${PRICE_GRID.EUR.starter.base} €`
  const ws = GOLD(escHtml(company))
  const upgrade = { href: `${appUrl()}/dashboard/billing#plans`, label: en ? 'Upgrade to Hotel →' : 'Passer à Hôtel →' }

  if (kind === 'd2') {
    return {
      subject: en ? 'Run your first Zahir Guest audit' : 'Lancez votre premier audit Zahir Guest',
      title: en ? 'Your first audit, step by step' : 'Votre premier audit, pas à pas',
      paragraphs: en
        ? [
            `Your ${ws} workspace is ready. The Discovery plan includes one audit per quarter with the Essential questionnaire: 63 key standards, from booking to breakfast.`,
            'Create the campaign in a few minutes: choose the property, assign an auditor (yourself or a colleague) and set the visit window. The scored report is ready as soon as the audit is reviewed.',
          ]
        : [
            `Votre espace ${ws} est prêt. L'offre Découverte comprend un audit par trimestre avec le questionnaire Essentiel : 63 standards clés, de la réservation au petit-déjeuner.`,
            "Créez la campagne en quelques minutes : choisissez l'établissement, assignez un auditeur (vous-même ou un collaborateur) et fixez la fenêtre de visite. Le rapport avec score est prêt dès la relecture de l'audit.",
          ],
      cta: { href: `${appUrl()}/dashboard/campaigns/new`, label: en ? 'Create my first audit →' : 'Créer mon premier audit →' },
    }
  }

  if (kind === 'd14') {
    return {
      subject: en ? 'What the Hotel plan adds to Discovery' : "Ce que l'offre Hôtel ajoute à la Découverte",
      title: en ? 'Audit more often, on your own standards' : 'Auditer plus souvent, sur vos propres standards',
      paragraphs: en
        ? [
            `Two weeks with Zahir Guest for ${ws}. Discovery lets you try a real audit; to run a regular programme, the Hotel plan adds:`,
            hotelList('en'),
            `From ${GOLD(price)} per month. Your data and audits stay where they are.`,
          ]
        : [
            `Deux semaines avec Zahir Guest pour ${ws}. La Découverte permet d'essayer un vrai audit ; pour mener un programme régulier, l'offre Hôtel ajoute :`,
            hotelList('fr'),
            `À partir de ${GOLD(price)} par mois. Vos données et vos audits restent en place.`,
          ],
      cta: upgrade,
    }
  }

  return {
    subject: en ? "You've used this quarter's audit" : 'Vous avez utilisé votre audit du trimestre',
    title: en ? 'Ready for the next audit?' : 'Prêt pour le prochain audit ?',
    paragraphs: en
      ? [
          `The Discovery plan includes one audit per quarter for ${ws}; the next one opens on ${GOLD(nextQuarterStart('en'))}.`,
          `To audit now and more often, the Hotel plan includes:<br>${hotelList('en')}`,
          `From ${GOLD(price)} per month, upgrade in a few clicks.`,
        ]
      : [
          `L'offre Découverte comprend un audit par trimestre pour ${ws} ; le prochain sera disponible le ${GOLD(nextQuarterStart('fr'))}.`,
          `Pour auditer dès maintenant, et plus souvent, l'offre Hôtel comprend :<br>${hotelList('fr')}`,
          `À partir de ${GOLD(price)} par mois, en quelques clics.`,
        ],
    cta: upgrade,
  }
}

// ── Sending ─────────────────────────────────────────────────────────────────────────────────

/** Send one follow-up to every admin of the workspace. Returns the number of emails accepted by Brevo. */
export async function sendNurtureEmail(supabase: SupabaseClient<any, any, any>, t: NurtureTenant, kind: NurtureKind): Promise<number> {
  const { data: admins } = await supabase
    .from('users')
    .select('name, email, default_language')
    .eq('tenant_id', t.id)
    .eq('role', 'tenant_admin')
  const unsub = unsubscribeUrl(t.id)
  let sent = 0
  for (const a of admins ?? []) {
    if (!a.email) continue
    const lang: 'en' | 'fr' = a.default_language === 'en' ? 'en' : 'fr'
    const c = content(kind, lang, t.name ?? 'Zahir Guest')
    const ok = await sendBillingNotice({
      to: { name: a.name ?? a.email, email: a.email },
      lang,
      subject: c.subject,
      title: c.title,
      paragraphs: c.paragraphs,
      cta: c.cta,
      unsubscribeUrl: unsub ? `${unsub}&lang=${lang}` : undefined,
    })
    if (ok) sent++
  }
  return sent
}

/** Record a key as done (sent or deliberately skipped). Re-reads the row so concurrent keys are kept. */
export async function markNurture(supabase: SupabaseClient<any, any, any>, tenantId: string, key: string) {
  const { data } = await supabase.from('tenants').select('nurture_emails_sent').eq('id', tenantId).single()
  const keys = data ? sentKeys(data) : []
  if (keys.includes(key)) return
  await supabase.from('tenants').update({ nurture_emails_sent: [...keys, key] }).eq('id', tenantId)
}

/**
 * Campaign refused because the free quarterly audit is used: offer the Hotel plan, once per quarter.
 * Best effort — never throws (the API answer to the user must not depend on it).
 */
export async function onFreeQuotaReached(tenantId: string): Promise<void> {
  try {
    const supabase = db()
    const { data: t } = await supabase.from('tenants').select(NURTURE_TENANT_COLUMNS).eq('id', tenantId).single()
    if (!t || !nurtureEligible(t as NurtureTenant)) return
    const key = quotaKey()
    if (sentKeys(t as NurtureTenant).includes(key)) return
    // Mark first: two quick refused attempts must not send two emails.
    await markNurture(supabase, tenantId, key)
    await sendNurtureEmail(supabase, t as NurtureTenant, 'quota')
  } catch (err) {
    console.error('[nurture] quota email failed:', err)
  }
}
