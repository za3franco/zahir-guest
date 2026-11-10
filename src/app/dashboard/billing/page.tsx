export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { countUsage } from '@/lib/limits'
import { limitsFor, PLAN_DISPLAY } from '@/lib/plans'
import { BillingPlans, ManageBillingButton } from './BillingActions'
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
  trialEnds: { en: 'Trial ends on', fr: "L'essai se termine le" },
  properties: { en: 'Properties', fr: 'Établissements' },
  users: { en: 'Users', fr: 'Utilisateurs' },
  audits: { en: 'Audits this month', fr: 'Audits ce mois-ci' },
  unlimited: { en: 'Unlimited', fr: 'Illimité' },
  success: {
    en: 'Thank you! Your subscription is being activated. This page updates within a minute.',
    fr: "Merci ! Votre abonnement est en cours d'activation. Cette page se met à jour en moins d'une minute.",
  },
  cancelled: { en: 'Checkout cancelled. No charge was made.', fr: 'Paiement annulé. Aucun débit effectué.' },
}

const STATUS: Record<string, { en: string; fr: string; badge: string }> = {
  active: { en: 'Active', fr: 'Actif', badge: 'badge-sage' },
  trialing: { en: 'Trial', fr: 'Essai', badge: 'badge-gold' },
  past_due: { en: 'Payment overdue', fr: 'Paiement en retard', badge: 'badge-amber' },
  unpaid: { en: 'Unpaid', fr: 'Impayé', badge: 'badge-amber' },
  canceled: { en: 'Canceled', fr: 'Annulé', badge: 'badge-sand' },
  trial_expired: { en: 'Trial expired', fr: 'Essai expiré', badge: 'badge-amber' },
  incomplete: { en: 'Incomplete', fr: 'Incomplet', badge: 'badge-amber' },
}

export default async function BillingPage({ searchParams }: { searchParams: { checkout?: string } }) {
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
  const limits = limitsFor(tenant?.subscription_tier, tenant?.subscription_status)

  const [properties, users, audits] = await Promise.all([
    countUsage(supabase, user.tenant_id, 'properties'),
    countUsage(supabase, user.tenant_id, 'users'),
    countUsage(supabase, user.tenant_id, 'audits'),
  ])

  const meters = [
    { label: t(T.properties), used: properties, max: limits.properties },
    { label: t(T.users), used: users, max: limits.users },
    { label: t(T.audits), used: audits, max: limits.auditsPerMonth },
  ]

  const planName = PLAN_DISPLAY.find(p => p.tier === tenant?.subscription_tier)?.name
  const status = STATUS[tenant?.subscription_status ?? '']
  const hasActiveSubscription =
    !!tenant?.stripe_subscription_id && ['active', 'trialing', 'past_due'].includes(tenant?.subscription_status ?? '')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
      </div>

      {searchParams.checkout === 'success' && <div className={`${styles.notice} ${styles.noticeSuccess}`}>{t(T.success)}</div>}
      {searchParams.checkout === 'cancelled' && <div className={styles.notice}>{t(T.cancelled)}</div>}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{t(T.currentPlan)}</h2>
        {isInternal ? (
          <>
            <p className={styles.planBig}>{t(T.internal)}</p>
            <p className={styles.muted}>{t(T.internalNote)}</p>
          </>
        ) : (
          <>
            <div className={styles.planRow}>
              <p className={styles.planBig}>{planName ?? t(T.noPlan)}</p>
              {status && <span className={`badge ${status.badge}`}>{status[lang]}</span>}
            </div>
            {tenant?.subscription_status === 'trialing' && tenant?.trial_ends_at && !tenant?.stripe_subscription_id && (
              <p className={styles.muted}>
                {t(T.trialEnds)} {fmt(tenant.trial_ends_at)}
              </p>
            )}
            {tenant?.current_period_end && (
              <p className={styles.muted}>
                {tenant.cancel_at_period_end ? t(T.cancelsOn) : t(T.renews)} {fmt(tenant.current_period_end)}
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

      {!isInternal && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>{t(T.plans)}</h2>
          <BillingPlans lang={lang} currentTier={tenant?.subscription_tier ?? null} hasActiveSubscription={hasActiveSubscription} />
        </section>
      )}
    </div>
  )
}
