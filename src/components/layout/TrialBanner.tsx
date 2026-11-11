'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './TrialBanner.module.css'

interface Props {
  lang: 'en' | 'fr'
  status: string | null
  trialEndsAt: string | null
  hasSubscription: boolean
}

const T = {
  daysLeft: (n: number, l: 'en' | 'fr') =>
    l === 'en' ? `Free trial: ${n} day${n > 1 ? 's' : ''} left` : `Essai gratuit : ${n} jour${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`,
  lastDay: { en: 'Free trial: last day', fr: "Essai gratuit : dernier jour" },
  expired: {
    en: 'Your free trial has ended. Choose a plan to keep using Zahir Guest.',
    fr: "Votre essai gratuit est terminé. Choisissez un forfait pour continuer à utiliser Zahir Guest.",
  },
  pastDue: {
    en: 'Your last payment failed. Please update your payment method in Billing.',
    fr: 'Votre dernier paiement a échoué. Veuillez mettre à jour votre moyen de paiement dans Facturation.',
  },
  choose: { en: 'Choose a plan', fr: 'Choisir un forfait' },
  billing: { en: 'Go to Billing', fr: 'Aller à Facturation' },
}

// Shown to tenant admins only. Handles the trial countdown, the lazy expiry flip and the
// redirect of an expired tenant to the Billing page (the only page they can use).
export default function TrialBanner({ lang, status, trialEndsAt, hasSubscription }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const endsMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null
  const trialOverdue = status === 'trialing' && !hasSubscription && endsMs !== null && endsMs < Date.now()
  const expired = status === 'trial_expired' || trialOverdue
  const onBilling = pathname?.startsWith('/dashboard/billing')

  useEffect(() => {
    if (trialOverdue) {
      fetch('/api/billing/sync-trial', { method: 'POST' }).catch(() => {})
    }
  }, [trialOverdue])

  useEffect(() => {
    if (expired && !onBilling) router.replace('/dashboard/billing')
  }, [expired, onBilling, router])

  if (expired) {
    return (
      <div className={`${styles.banner} ${styles.warn}`} role="alert">
        <span>{T.expired[lang]}</span>
        {!onBilling && <a href="/dashboard/billing" className={styles.cta}>{T.choose[lang]}</a>}
      </div>
    )
  }

  if (status === 'past_due') {
    return (
      <div className={`${styles.banner} ${styles.warn}`} role="alert">
        <span>{T.pastDue[lang]}</span>
        {!onBilling && <a href="/dashboard/billing" className={styles.cta}>{T.billing[lang]}</a>}
      </div>
    )
  }

  if (status === 'trialing' && !hasSubscription && endsMs !== null) {
    const days = Math.max(1, Math.ceil((endsMs - Date.now()) / 86400_000))
    return (
      <div className={styles.banner}>
        <span>{days <= 1 ? T.lastDay[lang] : T.daysLeft(days, lang)}</span>
        {!onBilling && <a href="/dashboard/billing" className={styles.cta}>{T.choose[lang]}</a>}
      </div>
    )
  }

  return null
}
