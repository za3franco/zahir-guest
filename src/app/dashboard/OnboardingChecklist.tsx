'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from './onboarding.module.css'

interface Props {
  lang: 'en' | 'fr'
  hasProperty: boolean
  hasAuditor: boolean
  hasCampaign: boolean
}

const T = {
  title: { en: 'Get started with Zahir Guest', fr: 'Démarrer avec Zahir Guest' },
  sub: { en: 'Three steps to your first audit.', fr: "Trois étapes jusqu'à votre premier audit." },
  dismiss: { en: 'Dismiss', fr: 'Masquer' },
}

export default function OnboardingChecklist({ lang, hasProperty, hasAuditor, hasCampaign }: Props) {
  const [hidden, setHidden] = useState(false)

  const steps = [
    {
      done: hasProperty,
      href: '/dashboard/properties',
      label: { en: 'Add your first property', fr: 'Ajoutez votre premier établissement' },
    },
    {
      done: hasAuditor,
      href: '/dashboard/users',
      label: { en: 'Invite an auditor', fr: 'Invitez un auditeur' },
    },
    {
      done: hasCampaign,
      href: '/dashboard/campaigns',
      label: { en: 'Create your first campaign', fr: 'Créez votre première campagne' },
    },
  ]
  const doneCount = steps.filter(s => s.done).length

  if (hidden) return null

  async function dismiss() {
    setHidden(true)
    fetch('/api/user/onboarding', { method: 'POST' }).catch(() => {})
  }

  return (
    <section className={styles.card}>
      <div className={styles.top}>
        <div>
          <h2 className={styles.title}>{T.title[lang]}</h2>
          <p className={styles.sub}>
            {T.sub[lang]} {doneCount}/3
          </p>
        </div>
        <button type="button" className={styles.dismiss} onClick={dismiss}>
          {T.dismiss[lang]}
        </button>
      </div>
      <ol className={styles.list}>
        {steps.map((s, i) => (
          <li key={i} className={s.done ? styles.done : ''}>
            <span className={styles.tick} aria-hidden="true">{s.done ? '✓' : i + 1}</span>
            {s.done ? <span>{s.label[lang]}</span> : <Link href={s.href}>{s.label[lang]} →</Link>}
          </li>
        ))}
      </ol>
    </section>
  )
}
