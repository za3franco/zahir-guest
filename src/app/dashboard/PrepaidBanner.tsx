import { GRACE_DAYS } from '@/lib/youcanBilling'
import styles from './dashboard.module.css'

const DAY = 86400_000
// Same first threshold as the reminder emails (billing-reminders: 15, 7, 1 days)
const SHOW_WITHIN_DAYS = 15

const T = {
  endsIn: {
    en: (n: number, date: string) => `Your prepaid plan ends in ${n} day${n > 1 ? 's' : ''} (${date}).`,
    fr: (n: number, date: string) => `Votre forfait prépayé se termine dans ${n} jour${n > 1 ? 's' : ''} (${date}).`,
  },
  endsToday: {
    en: (date: string) => `Your prepaid plan ends today (${date}).`,
    fr: (date: string) => `Votre forfait prépayé se termine aujourd’hui (${date}).`,
  },
  renewKeep: {
    en: 'Renew it to keep creating properties, users and campaigns.',
    fr: 'Renouvelez-le pour continuer à créer établissements, utilisateurs et campagnes.',
  },
  ended: {
    en: (date: string) => `Your prepaid period has ended. Creating properties, users and campaigns pauses on ${date}.`,
    fr: (date: string) => `Votre période prépayée est terminée. La création d’établissements, d’utilisateurs et de campagnes sera suspendue le ${date}.`,
  },
  paused: {
    en: 'Creating properties, users and campaigns is paused. Your data is kept: renew to resume.',
    fr: 'La création d’établissements, d’utilisateurs et de campagnes est suspendue. Vos données sont conservées : renouvelez pour reprendre.',
  },
  cta: { en: 'Renew →', fr: 'Renouveler →' },
}

// Reminder at the top of the admin dashboard for a workspace paid in dirhams (YouCan Pay, prepaid period):
// the same warning the Billing page shows, visible without opening it. Shows from 15 days before the end.
export default function PrepaidBanner({ lang, periodEnd }: { lang: 'en' | 'fr'; periodEnd: string }) {
  const end = new Date(periodEnd).getTime()
  if (!Number.isFinite(end)) return null
  const now = Date.now()
  const fmt = (ms: number) => new Date(ms).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const daysLeft = Math.ceil((end - now) / DAY)

  let title: string
  let showRenewHint = false
  if (daysLeft > SHOW_WITHIN_DAYS) return null
  if (daysLeft > 0) {
    title = T.endsIn[lang](daysLeft, fmt(end))
    showRenewHint = true
  } else if (now <= end + GRACE_DAYS * DAY) {
    title = T.ended[lang](fmt(end + GRACE_DAYS * DAY))
  } else {
    title = T.paused[lang]
  }

  return (
    <div className={styles.prepaidBanner} role="alert">
      <p>
        <strong>{title}</strong>
        {showRenewHint && <> {T.renewKeep[lang]}</>}
      </p>
      <a href="/dashboard/billing" className={styles.prepaidBannerCta}>{T.cta[lang]}</a>
    </div>
  )
}
