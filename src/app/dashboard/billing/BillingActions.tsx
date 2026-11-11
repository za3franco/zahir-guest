'use client'

import { useState } from 'react'
import { PLAN_DISPLAY, type BillingInterval, type PlanTier } from '@/lib/plans'
import styles from './billing.module.css'

type Lang = 'en' | 'fr'

const T = {
  monthly: { en: 'Monthly', fr: 'Mensuel' },
  annual: { en: 'Annual', fr: 'Annuel' },
  save: { en: 'Save ~12%', fr: 'Économisez ~12 %' },
  perMonth: { en: '/ month', fr: '/ mois' },
  billedYearly: { en: 'billed yearly', fr: 'facturé annuellement' },
  choose: { en: 'Choose plan', fr: 'Choisir ce forfait' },
  change: { en: 'Change plan', fr: 'Changer de forfait' },
  current: { en: 'Current plan', fr: 'Forfait actuel' },
  redirecting: { en: 'Redirecting…', fr: 'Redirection…' },
  demo: { en: 'Need a custom plan? Book a demo', fr: 'Besoin sur mesure ? Réserver une démo' },
  manage: { en: 'Manage billing', fr: 'Gérer la facturation' },
  generic: { en: 'Something went wrong. Please try again.', fr: "Une erreur s'est produite. Veuillez réessayer." },
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export function ManageBillingButton({ lang, label, primary }: { lang: Lang; label?: string; primary?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open() {
    setLoading(true)
    setError(null)
    try {
      const { ok, data } = await postJson('/api/billing/portal')
      if (ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error ?? T.generic[lang])
    } catch {
      setError(T.generic[lang])
    }
    setLoading(false)
  }

  return (
    <div>
      <button type="button" className={`btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={open} disabled={loading}>
        {loading ? T.redirecting[lang] : label ?? T.manage[lang]}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

export function BillingPlans({
  lang,
  currentTier,
  hasActiveSubscription,
}: {
  lang: Lang
  currentTier: string | null
  hasActiveSubscription: boolean
}) {
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const [busy, setBusy] = useState<PlanTier | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function choose(tier: PlanTier) {
    setBusy(tier)
    setError(null)
    try {
      // Existing subscribers change plan through the Stripe portal; everyone else goes to Checkout.
      const target = hasActiveSubscription ? '/api/billing/portal' : '/api/billing/checkout'
      const { ok, status, data } = await postJson(target, hasActiveSubscription ? undefined : { tier, interval })
      if (ok && data.url) {
        window.location.href = data.url
        return
      }
      if (status === 409 && data.code === 'use_portal') {
        const portal = await postJson('/api/billing/portal')
        if (portal.ok && portal.data.url) {
          window.location.href = portal.data.url
          return
        }
      }
      setError(data.error ?? T.generic[lang])
    } catch {
      setError(T.generic[lang])
    }
    setBusy(null)
  }

  return (
    <div>
      <div className={styles.toggle} role="group">
        <button
          type="button"
          className={`${styles.toggleBtn} ${interval === 'monthly' ? styles.toggleBtnActive : ''}`}
          onClick={() => setInterval('monthly')}
        >
          {T.monthly[lang]}
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${interval === 'annual' ? styles.toggleBtnActive : ''}`}
          onClick={() => setInterval('annual')}
        >
          {T.annual[lang]} <span className={styles.saveBadge}>{T.save[lang]}</span>
        </button>
      </div>

      <div className={styles.plansGrid}>
        {PLAN_DISPLAY.map(plan => {
          // Only a paid, running subscription makes a plan 'current': a trial or an ended plan can be (re)subscribed
          const isCurrent = hasActiveSubscription && currentTier === plan.tier
          // Enterprise has no self-serve annual price: fall back to monthly for that card.
          const effective: BillingInterval = interval === 'annual' && plan.annualEur ? 'annual' : 'monthly'
          const price = effective === 'annual' ? plan.annualPerMonthEur! : plan.monthlyEur
          const features = lang === 'en' ? plan.featuresEn : plan.featuresFr

          return (
            <div key={plan.tier} className={`${styles.planCard} ${isCurrent ? styles.planCardCurrent : ''}`}>
              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planPrice}>
                €{price}
                <span className={styles.planPer}> {T.perMonth[lang]}</span>
              </p>
              <p className={styles.planNote}>
                {effective === 'annual' ? `€${plan.annualEur} ${T.billedYearly[lang]}` : ' '}
              </p>
              <ul className={styles.features}>
                {features.map(f => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'} btn-sm w-full`}
                disabled={busy !== null || isCurrent}
                onClick={() => choose(plan.tier)}
              >
                {busy === plan.tier
                  ? T.redirecting[lang]
                  : isCurrent
                    ? T.current[lang]
                    : hasActiveSubscription
                      ? T.change[lang]
                      : T.choose[lang]}
              </button>
              {plan.tier === 'enterprise' && (
                <a className={styles.demoLink} href="mailto:hello@za3fran.io?subject=Zahir%20Guest%20Enterprise%20demo">
                  {T.demo[lang]}
                </a>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
