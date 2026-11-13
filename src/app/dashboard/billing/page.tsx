export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { countUsage } from '@/lib/limits'
import { effectivePlan, planName as tierName, TIER_RULES, isPlanTier } from '@/lib/plans'
import { madEnabled, workspaceCurrency } from '@/lib/billing'
import { extraHeadroom, GRACE_DAYS, youcanPeriodRunning } from '@/lib/youcanBilling'
import { BillingPlans, ManageBillingButton, type BillingState } from './BillingActions'
import styles from './billing.module.css'

const T = {
  title: { en: 'Billing', fr: 'Facturation' },
  currentPlan: { en: 'Current plan', fr: 'Forfait actuel' },
  usage: { en: 'Usage', fr: 'Utilisation' },
  plans: { en: 'Plans', fr: 'Forfaits' },
  internal: { en: 'Internal workspace', fr: 'Espace interne' },
  internalNote: { en: 'This workspace is not billed.', fr: "Cet espace n'est pas facturé." },
  noPlan: { en: 'No plan yet', fr: 'Aucun forfait' },
  renews: { en: 'Renews on', fr: 'Renouvellement le' },
  cancelsOn: { en: 'Ends on', fr: 'Se termine le' },
  trialEnds: { en: 'Pilot ends on', fr: 'Le pilote se termine le' },
  auditsQuarter: { en: 'Audits this quarter', fr: 'Audits ce trimestre' },
  freeNote: {
    en: 'Free plan, no time limit. Upgrade below to unlock more properties, the full library (573 standards), your own questionnaires and AI summaries.',
    fr: "Offre gratuite, sans limite de durée. Passez à une offre ci-dessous pour débloquer plus d'établissements, la bibliothèque complète (573 standards), vos propres questionnaires et les synthèses IA.",
  },
  properties: { en: 'Properties', fr: 'Établissements' },
  users: { en: 'Users', fr: 'Utilisateurs' },
  audits: { en: 'Audits this month', fr: 'Audits ce mois-ci' },
  ai: { en: 'AI summaries this month', fr: 'Synthèses IA ce mois-ci' },
  prepaidUntil: { en: 'Prepaid until', fr: 'Prépayé jusqu’au' },
  youcan: { en: 'Paid in dirhams (YouCan Pay)', fr: 'Payé en dirhams (YouCan Pay)' },
  pending: {
    en: 'Your payment is being confirmed. This page updates within a few minutes; if it does not, contact us with the time of payment.',
    fr: "Votre paiement est en cours de confirmation. Cette page se met à jour en quelques minutes ; sinon, contactez-nous en indiquant l'heure du paiement.",
  },
  prepaidEndedTitle: { en: 'Prepaid period ended', fr: 'Période prépayée terminée' },
  prepaidEnded: {
    en: 'Renew below to keep creating properties, users and campaigns. Without renewal, creation pauses on',
    fr: 'Renouvelez ci-dessous pour continuer à créer établissements, utilisateurs et campagnes. Sans renouvellement, la création sera suspendue le',
  },
  unlimited: { en: 'Unlimited', fr: 'Illimité' },
  success: {
    en: 'Thank you! Your subscription is being activated. This page updates within a minute.',
    fr: "Merci ! Votre abonnement est en cours d'activation. Cette page se met à jour en moins d'une minute.",
  },
  cancelled: { en: 'Checkout cancelled. No charge was made.', fr: 'Paiement annulé. Aucun débit effectué.' },
  cancelNoticeTitle: { en: 'Subscription cancelled', fr: 'Abonnement annulé' },
  cancelNotice: {
    en: 'Your subscription will not renew. After the end date, creating properties, users and campaigns will be paused (your data is kept). You can reactivate it at any time before then.',
    fr: "Votre abonnement ne sera pas renouvelé. Après la date de fin, la création d'établissements, d'utilisateurs et de campagnes sera suspendue (vos données sont conservées). Vous pouvez le réactiver à tout moment d'ici là.",
  },
  endedTitle: { en: 'Subscription ended', fr: 'Abonnement terminé' },
  endedNotice: {
    en: 'Creating new items is paused. Your data is kept: choose a plan below to resume.',
    fr: 'La création est suspendue. Vos données sont conservées : choisissez un forfait ci-dessous pour reprendre.',
  },
  reactivate: { en: 'Reactivate my subscription', fr: 'Réactiver mon abonnement' },
  direct: { en: 'Direct contract', fr: 'Contrat direct' },
  directNote: {
    en: 'This workspace is billed directly under your contract with Za3fran Consulting. Contact us to change your plan.',
    fr: 'Cet espace est facturé directement dans le cadre de votre contrat avec Za3fran Consulting. Contactez-nous pour changer de forfait.',
  },
}

const STATUS: Record<string, { en: string; fr: string; badge: string }> = {
  active: { en: 'Active', fr: 'Actif', badge: 'badge-sage' },
  trialing: { en: 'Pilot', fr: 'Pilote', badge: 'badge-gold' },
  past_due: { en: 'Payment overdue', fr: 'Paiement en retard', badge: 'badge-amber' },
  unpaid: { en: 'Unpaid', fr: 'Impayé', badge: 'badge-amber' },
  canceled: { en: 'Ended', fr: 'Terminé', badge: 'badge-red' },
  trial_expired: { en: 'Trial expired', fr: 'Essai expiré', badge: 'badge-amber' },
  incomplete: { en: 'Incomplete', fr: 'Incomplet', badge: 'badge-amber' },
}

export default async function BillingPage({ searchParams }: { searchParams: { checkout?: string } }) {
  // checkout = success | cancelled | pending (YouCan Pay return not yet confirmed)
  const user = await requireUser()
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') redirect('/dashboard')

  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (k: { en: string; fr: string }) => k[lang]
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }) : null

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single()

  const isInternal = tenant?.subscription_tier === 'za3fran_internal'
  const isDirect = !isInternal && tenant?.billing_mode === 'direct'
  const plan = effectivePlan(tenant)
  const limits = plan.limits

  const perQuarter = limits.auditsPerQuarter !== null
  const [properties, users, audits, ai] = await Promise.all([
    countUsage(supabase, user.tenant_id, 'properties'),
    countUsage(supabase, user.tenant_id, 'users'),
    countUsage(supabase, user.tenant_id, 'audits', perQuarter ? 'quarter' : 'month'),
    countUsage(supabase, user.tenant_id, 'ai'),
  ])

  const meters = [
    { label: t(T.properties), used: properties, max: limits.properties },
    { label: t(T.users), used: users, max: limits.users },
    { label: perQuarter ? t(T.auditsQuarter) : t(T.audits), used: audits, max: perQuarter ? limits.auditsPerQuarter : limits.auditsPerMonth },
    { label: t(T.ai), used: ai, max: limits.aiSummariesPerMonth },
  ]

  // An ended pilot or subscription shows as the free plan it fell back to.
  const planName = tierName(plan.kind === 'free' ? 'free' : tenant?.subscription_tier, lang)
  const isYoucan = tenant?.billing_mode === 'youcan'
  const youcanRunning = !!tenant && youcanPeriodRunning(tenant)
  const prepaidEnded = isYoucan && !!tenant?.current_period_end && !youcanRunning
  const graceEnd = tenant?.current_period_end ? new Date(new Date(tenant.current_period_end).getTime() + GRACE_DAYS * 86400_000).toISOString() : null
  const currency = workspaceCurrency(tenant)
  const currencyLocked = !!tenant?.stripe_customer_id || isYoucan
  const tier = isPlanTier(tenant?.subscription_tier) ? tenant!.subscription_tier : null
  const billingState: BillingState = {
    mode: tenant?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(tenant?.subscription_status ?? '')
      ? 'stripe'
      : isYoucan
        ? 'youcan'
        : 'none',
    currentTier: tenant?.subscription_status === 'trialing' ? null : tier,
    currentInterval: tenant?.billing_interval ?? null,
    currentProperties: tier ? TIER_RULES[tier as keyof typeof TIER_RULES].includedProperties + (tenant?.extra_properties ?? 0) : 1,
    propertiesUsed: properties,
    periodEnd: tenant?.current_period_end ?? null,
    youcanRunning,
    extraHeadroom: tenant ? extraHeadroom(tenant) : 0,
  }
  const status = tenant?.cancel_at_period_end && ['active', 'trialing', 'past_due'].includes(tenant?.subscription_status ?? '')
    ? { en: 'Cancelled — ends soon', fr: 'Annulé — fin prochaine', badge: 'badge-red' }
    : STATUS[tenant?.subscription_status ?? '']
  const ended = ['canceled', 'unpaid', 'incomplete_expired'].includes(tenant?.subscription_status ?? '')
  const hasActiveSubscription =
    !!tenant?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(tenant?.subscription_status ?? '')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
      </div>

      {searchParams.checkout === 'success' && <div className={`${styles.notice} ${styles.noticeSuccess}`}>{t(T.success)}</div>}
      {searchParams.checkout === 'cancelled' && <div className={styles.notice}>{t(T.cancelled)}</div>}
      {searchParams.checkout === 'pending' && <div className={styles.notice}>{t(T.pending)}</div>}
      {!isInternal && !isDirect && prepaidEnded && tenant?.subscription_status === 'active' && (
        <div className={`${styles.notice} ${styles.noticeWarn}`} role="alert">
          <strong>{t(T.prepaidEndedTitle)}</strong>
          <p>{t(T.prepaidEnded)} {fmt(graceEnd)}.</p>
        </div>
      )}

      {!isInternal && !isDirect && tenant?.cancel_at_period_end && hasActiveSubscription && (
        <div className={`${styles.notice} ${styles.noticeDanger}`} role="alert">
          <strong>{t(T.cancelNoticeTitle)}{tenant.current_period_end ? ` — ${t(T.cancelsOn).toLowerCase()} ${fmt(tenant.current_period_end)}` : ''}</strong>
          <p>{t(T.cancelNotice)}</p>
          {tenant.stripe_customer_id && <ManageBillingButton lang={lang} label={t(T.reactivate)} primary />}
        </div>
      )}
      {!isInternal && !isDirect && ended && (
        <div className={`${styles.notice} ${styles.noticeDanger}`} role="alert">
          <strong>{t(T.endedTitle)}</strong>
          <p>{t(T.endedNotice)}</p>
        </div>
      )}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t(T.currentPlan)}</h2>
        {isInternal ? (
          <>
            <p className={styles.planBig}>{t(T.internal)}</p>
            <p className={styles.muted}>{t(T.internalNote)}</p>
          </>
        ) : isDirect ? (
          <>
            <div className={styles.planRow}>
              <p className={styles.planBig}>{planName ?? t(T.noPlan)}</p>
              <span className="badge badge-gold">{t(T.direct)}</span>
            </div>
            <p className={styles.muted}>{t(T.directNote)}</p>
          </>
        ) : (
          <>
            <div className={styles.planRow}>
              <p className={styles.planBig}>{planName ?? t(T.noPlan)}</p>
              {status && plan.kind !== 'free' && <span className={`badge ${status.badge}`}>{status[lang]}</span>}
            </div>
            {plan.kind === 'free' && <p className={styles.muted}>{t(T.freeNote)}</p>}
            {tenant?.subscription_status === 'trialing' && tenant?.trial_ends_at && !tenant?.stripe_subscription_id && (
              <p className={styles.muted}>
                {t(T.trialEnds)} {fmt(tenant.trial_ends_at)}
              </p>
            )}
            {tenant?.current_period_end && (
              <p className={styles.muted}>
                {isYoucan ? t(T.prepaidUntil) : tenant.cancel_at_period_end ? t(T.cancelsOn) : t(T.renews)} {fmt(tenant.current_period_end)}
                {isYoucan ? ` · ${t(T.youcan)}` : ''}
              </p>
            )}
            {tenant?.stripe_customer_id && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <ManageBillingButton lang={lang} />
              </div>
            )}
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t(T.usage)}</h2>
        <div className={styles.meters}>
          {meters.map(m => {
            const pct = m.max ? Math.min(100, Math.round((m.used / m.max) * 100)) : 0
            return (
              <div key={m.label} className={styles.meter}>
                <div className={styles.meterTop}>
                  <span>{m.label}</span>
                  <span className={styles.meterValue}>
                    {m.used} / {m.max ?? t(T.unlimited)}
                  </span>
                </div>
                <div className={styles.meterBar}>
                  <div className={`${styles.meterFill} ${pct >= 100 ? styles.meterFull : ''}`} style={{ width: m.max ? `${pct}%` : '8%' }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {!isInternal && !isDirect && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t(T.plans)}</h2>
          <BillingPlans
            lang={lang}
            initialCurrency={currency}
            currencyLocked={currencyLocked}
            madEnabled={madEnabled()}
            state={billingState}
          />
        </section>
      )}
    </div>
  )
}
