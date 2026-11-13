'use client'

import styles from './SyncStatus.module.css'
import { STALE_MS } from '@/lib/offline/store'
import type { SyncView } from '@/lib/offline/auditSync'

type Lang = 'en' | 'fr'
const n = (count: number, lang: Lang, one: { en: string; fr: string }, many: { en: string; fr: string }) =>
  `${count} ${count > 1 ? many[lang] : one[lang]}`
const CHANGE = { en: 'change', fr: 'modification' }
const CHANGES = { en: 'changes', fr: 'modifications' }

// Always-visible synchronisation indicator of the audit screens:
// ✓ synced · syncing · offline (N changes on the phone) · action needed (sign in again / audit closed / reassigned)
export default function SyncStatus({ lang, view, onRetry, inline }: {
  lang: Lang
  view: SyncView
  onRetry: () => void
  /** Rendered inside a bar (section screen) instead of floating */
  inline?: boolean
}) {
  const en = lang === 'en'
  const pos = inline ? styles.inline : styles.floating
  const waiting = view.pending + view.rejected
  const changes = n(waiting, lang, CHANGE, CHANGES)

  if (view.state === 'auth') {
    return (
      <div className={`${styles.pill} ${pos} ${styles.error}`} role="alert">
        <span>⚠ {en ? `Session expired: sign in again to send ${changes}` : `Session expirée : reconnectez-vous pour envoyer ${changes}`}</span>
        <a href="/login" target="_blank" rel="noreferrer" className={styles.retry}>{en ? 'Sign in' : 'Se reconnecter'}</a>
        <button type="button" className={styles.retry} onClick={onRetry}>{en ? 'Retry' : 'Réessayer'}</button>
      </div>
    )
  }
  if (view.state === 'closed' || view.state === 'forbidden') {
    const what = view.state === 'closed'
      ? (en ? 'This audit has been submitted or closed' : 'Cet audit a été soumis ou fermé')
      : (en ? 'This audit is no longer assigned to you' : "Cet audit ne vous est plus attribué")
    return (
      <div className={`${styles.pill} ${pos} ${styles.error}`} role="alert">
        <span>⚠ {what}{waiting ? (en ? `: ${changes} not sent` : ` : ${changes} non envoyée${waiting > 1 ? 's' : ''}`) : ''}</span>
      </div>
    )
  }
  if (view.state === 'offline') {
    return (
      <div className={`${styles.pill} ${pos} ${styles.offline}`} role="status" aria-live="polite">
        <span>
          {en ? 'Offline' : 'Hors ligne'}
          {view.pending
            ? (view.persistent
              ? (en ? ` · ${changes} on the phone` : ` · ${changes} sur le téléphone`)
              : (en ? ` · ${changes} not sent, keep this page open` : ` · ${changes} non envoyée${view.pending > 1 ? 's' : ''}, gardez cette page ouverte`))
            : (en ? ' · everything is saved' : ' · tout est enregistré')}
        </span>
        <button type="button" className={styles.retry} onClick={onRetry}>{en ? 'Retry' : 'Réessayer'}</button>
      </div>
    )
  }
  if (view.state === 'error' && view.pending) {
    return (
      <div className={`${styles.pill} ${pos} ${styles.error}`} role="alert">
        <span>⚠ {en ? `${changes} waiting, retrying automatically` : `${changes} en attente, nouvel essai automatique`}</span>
        <button type="button" className={styles.retry} onClick={onRetry}>{en ? 'Retry' : 'Réessayer'}</button>
      </div>
    )
  }
  if (view.pending || view.sending) {
    return (
      <div className={`${styles.pill} ${pos} ${styles.saving}`} role="status" aria-live="polite">
        {en ? 'Syncing…' : 'Synchronisation…'}
      </div>
    )
  }
  return (
    <div className={`${styles.pill} ${pos} ${styles.ok}`} role="status" aria-live="polite">
      {view.persistent ? (en ? '✓ Synced' : '✓ Synchronisé') : (en ? '✓ Saved automatically' : '✓ Enregistré automatiquement')}
    </div>
  )
}

/** Messages that need the auditor's attention (overview and submit screens). */
export function SyncNotices({ lang, view, onDismissConflicts, onDiscardRejected, now = Date.now() }: {
  lang: Lang
  view: SyncView
  onDismissConflicts: () => void
  onDiscardRejected: () => void
  now?: number
}) {
  const en = lang === 'en'
  const items: React.ReactNode[] = []
  if (view.conflicts > 0) {
    items.push(
      <div key="c" className={`${styles.notice} ${styles.noticeInfo}`} role="status">
        <span>{en
          ? `${n(view.conflicts, lang, { en: 'answer was', fr: '' }, { en: 'answers were', fr: '' })} changed more recently on another device: the most recent version was kept.`
          : `${view.conflicts} réponse${view.conflicts > 1 ? 's avaient' : ' avait'} été modifiée${view.conflicts > 1 ? 's' : ''} plus récemment sur un autre appareil : la version la plus récente a été conservée.`}</span>
        <button type="button" className={styles.retry} onClick={onDismissConflicts}>OK</button>
      </div>,
    )
  }
  if (view.rejected > 0) {
    items.push(
      <div key="r" className={styles.notice} role="alert">
        <span>{en
          ? `${n(view.rejected, lang, CHANGE, CHANGES)} could not be saved (the question no longer exists in the questionnaire).`
          : `${n(view.rejected, lang, CHANGE, CHANGES)} n'${view.rejected > 1 ? 'ont' : 'a'} pas pu être enregistrée${view.rejected > 1 ? 's' : ''} (la question n'existe plus dans le questionnaire).`}</span>
        <button type="button" className={styles.retry} onClick={onDiscardRejected}>{en ? 'Remove' : 'Retirer'}</button>
      </div>,
    )
  }
  if (view.pending > 0 && view.lastSyncAt && now - view.lastSyncAt > STALE_MS) {
    items.push(
      <div key="s" className={styles.notice} role="alert">
        <span>{en
          ? 'Your changes have not been synchronised for more than 3 days. Connect to a network so they reach the server.'
          : "Vos modifications ne sont pas synchronisées depuis plus de 3 jours. Connectez-vous à un réseau pour qu'elles soient envoyées."}</span>
      </div>,
    )
  }
  if (!items.length) return null
  return <div className={styles.notices}>{items}</div>
}
