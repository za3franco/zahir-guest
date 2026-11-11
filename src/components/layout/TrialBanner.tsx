'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './TrialBanner.module.css'

type Lang = 'en' | 'fr'

interface Props {
  lang: Lang
  status: string | null
  trialEndsAt: string | null
  hasSubscription: boolean
  /** Tenant admins get call-to-action links and the redirect to Billing; other users only see the notice. */
  isAdmin: boolean
  cancelAtPeriodEnd: boolean
  periodEnd: string | null
}

const T = {
  daysLeft: (n: number, l: Lang) =>
    l === 'en' ? `Free trial: ${n} day${n > 1 ? 's' : ''} left` : `Essai gratuit : ${n} jour${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`,
  lastDay: { en: 'Free trial: last day', fr: 'Essai gratuit : dernier jour' },
  expiredAdmin: {
    en: 'Your free trial has ended. Choose a plan to keep using Zahir Guest.',
    fr: 'Votre essai gratuit est terminé. Choisissez un forfait pour continuer à utiliser Zahir Guest.',
  },
  expiredUser: {
    en: "This workspace's free trial has ended. Creating new items is paused until your administrator chooses a plan.",
    fr: "L'essai gratuit de cet espace est terminé. La création est suspendue jusqu'à ce que votre administrateur choisisse un forfait.",
  },
  pastDueAdmin: {
    en: 'Your last payment failed. Please update your payment method to avoid an interruption.',
    fr: 'Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement pour éviter une interruption.',
  },
  pastDueUser: {
    en: "There is a payment issue on this workspace's subscription. Your administrator has been informed in Billing.",
    fr: "Un problème de paiement concerne l'abonnement de cet espace. Votre administrateur en est informé dans Facturation.",
  },
  endedAdmin: {
    en: 'Your subscription has ended. Creating new items is paused: choose a plan to resume.',
    fr: 'Votre abonnement est terminé. La création est suspendue : choisissez un forfait pour reprendre.',
  },
  endedUser: {
    en: "This workspace's subscription has ended. Creating new items is paused until your administrator renews it.",
    fr: "L'abonnement de cet espace est terminé. La création est suspendue jusqu'à ce que votre administrateur le renouvelle.",
  },
  endsOnAdmin: (d: string, l: Lang) =>
    l === 'en'
      ? `Your subscription is cancelled and ends on ${d}. After that date, creating new items will be paused.`
      : `Votre abonnement est annulé et se termine le ${d}. Après cette date, la création sera suspendue.`,
  endsOnUser: (d: string, l: Lang) =>
    l === 'en'
      ? `This workspace's subscription ends on ${d}. Contact your administrator if you need to keep working after that date.`
      : `L'abonnement de cet espace se termine le ${d}. Contactez votre administrateur si vous devez continuer après cette date.`,
  choose: { en: 'Choose a plan', fr: 'Choisir un forfait' },
  billing: { en: 'Go to Billing', fr: 'Aller à Facturation' },
  reactivate: { en: 'Reactivate', fr: 'Réactiver' },
}

const ENDED = ['canceled', 'unpaid', 'incomplete_expired']

// Subscription status banner, shown on every dashboard page to everyone in the workspace.
// Also handles the lazy trial-expiry flip and sends an expired tenant admin to Billing.
export default function TrialBanner({ lang, status, trialEndsAt, hasSubscription, isAdmin, cancelAtPeriodEnd, periodEnd }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const endsMs = trialEndsAt ? new Date(trialEndsAt).getTime() : null
  const trialOverdue = status === 'trialing' && !hasSubscription && endsMs !== null && endsMs < Date.now()
  const expired = status === 'trial_expired' || trialOverdue
  const onBilling = pathname?.startsWith('/dashboard/billing')

  useEffect(() => {
    if (trialOverdue) fetch('/api/billing/sync-trial', { method: 'POST' }).catch(() => {})
  }, [trialOverdue])

  useEffect(() => {
    if (expired && isAdmin && !onBilling) router.replace('/dashboard/billing')
  }, [expired, isAdmin, onBilling, router])

  const cta = (label: { en: string; fr: string }) =>
    isAdmin && !onBilling ? <a href="/dashboard/billing" className={styles.cta}>{label[lang]}</a> : null

  if (expired) {
    return (
      <div className={`${styles.banner} ${styles.warn}`} role="alert">
        <span>{isAdmin ? T.expiredAdmin[lang] : T.expiredUser[lang]}</span>
        {cta(T.choose)}
      </div>
    )
  }

  if (status && ENDED.includes(status)) {
    return (
      <div className={`${styles.banner} ${styles.danger}`} role="alert">
        <span>{isAdmin ? T.endedAdmin[lang] : T.endedUser[lang]}</span>
        {cta(T.choose)}
      </div>
    )
  }

  if (status === 'past_due') {
    return (
      <div className={`${styles.banner} ${styles.warn}`} role="alert">
        <span>{isAdmin ? T.pastDueAdmin[lang] : T.pastDueUser[lang]}</span>
        {cta(T.billing)}
      </div>
    )
  }

  if (cancelAtPeriodEnd && periodEnd && (status === 'active' || status === 'trialing')) {
    const d = new Date(periodEnd).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    return (
      <div className={`${styles.banner} ${styles.warn}`} role="status">
        <span>{isAdmin ? T.endsOnAdmin(d, lang) : T.endsOnUser(d, lang)}</span>
        {cta(T.reactivate)}
      </div>
    )
  }

  // Trial countdown: only useful to the person who can subscribe
  if (isAdmin && status === 'trialing' && !hasSubscription && endsMs !== null) {
    const days = Math.max(1, Math.ceil((endsMs - Date.now()) / 86400_000))
    return (
      <div className={styles.banner}>
        <span>{days <= 1 ? T.lastDay[lang] : T.daysLeft(days, lang)}</span>
        {cta(T.choose)}
      </div>
    )
  }

  return null
}
