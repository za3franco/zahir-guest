'use client'

import { useState } from 'react'
import { SA, type Lang } from '@/lib/superadminText'
import styles from './superadmin.module.css'

// FR | EN switch of the super admin screen: the same choice as the one in the dashboard (users.default_language).
export default function SuperAdminLang({ lang }: { lang: Lang }) {
  const [busy, setBusy] = useState(false)

  async function choose(next: Lang) {
    if (next === lang || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/user/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      })
      if (res.ok) { window.location.reload(); return }
    } catch { /* offline: stay as is */ }
    setBusy(false)
  }

  return (
    <div className={styles.langSwitch} role="group" aria-label={SA[lang].language}>
      {(['fr', 'en'] as const).map(l => (
        <button key={l} type="button" disabled={busy} aria-pressed={l === lang} onClick={() => choose(l)}
          className={`${styles.langOpt} ${l === lang ? styles.langOptActive : ''}`}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}
