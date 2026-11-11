'use client'

import styles from './SaveStatus.module.css'

// Always-visible autosave indicator for the audit screens.
export default function SaveStatus({ lang, saving, failed, onRetry, inline }: {
  lang: 'en' | 'fr'
  saving: boolean
  failed: number
  onRetry: () => void
  /** Rendered inside a bar (section screen) instead of floating */
  inline?: boolean
}) {
  const en = lang === 'en'
  const pos = inline ? styles.inline : styles.floating
  if (failed > 0) {
    return (
      <div className={`${styles.pill} ${pos} ${styles.error}`} role="alert">
        <span>⚠ {en ? 'Not saved — check your connection' : 'Non enregistré — vérifiez votre connexion'}</span>
        <button type="button" className={styles.retry} onClick={onRetry}>{en ? 'Retry' : 'Réessayer'}</button>
      </div>
    )
  }
  return (
    <div className={`${styles.pill} ${pos} ${saving ? styles.saving : styles.ok}`} role="status" aria-live="polite">
      {saving ? (en ? 'Saving…' : 'Enregistrement…') : (en ? '✓ Saved automatically' : '✓ Enregistré automatiquement')}
    </div>
  )
}
