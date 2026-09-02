'use client'

import { useState } from 'react'
import styles from './FeedbackWidget.module.css'

const T = {
  trigger: { en: 'Suggest a feature', fr: 'Suggérer une fonctionnalité' },
  title: { en: 'Suggest a feature', fr: 'Suggérer une fonctionnalité' },
  subtitle: {
    en: 'Tell us what would make Zahir Guest better for you.',
    fr: 'Dites-nous ce qui améliorerait Zahir Guest pour vous.',
  },
  placeholder: {
    en: 'I would love to see…',
    fr: "J'aimerais beaucoup voir…",
  },
  send: { en: 'Send', fr: 'Envoyer' },
  sending: { en: 'Sending…', fr: 'Envoi…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  success: { en: 'Thank you! Your feedback has been sent.', fr: 'Merci ! Votre message a été envoyé.' },
  error: { en: 'Something went wrong. Please try again.', fr: "Une erreur s'est produite. Veuillez réessayer." },
  close: { en: 'Close', fr: 'Fermer' },
}

export default function FeedbackWidget({ lang }: { lang: 'en' | 'fr' }) {
  const t = (key: { en: string; fr: string }) => key[lang]

  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function close() {
    setOpen(false)
    setMessage('')
    setSuccess(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setError(null)
    setSending(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t(T.error))
      } else {
        setSuccess(true)
        setMessage('')
      }
    } catch {
      setError(t(T.error))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
      >
        <IconFeedback />
        <span>{t(T.trigger)}</span>
      </button>

      {open && (
        <div className={styles.overlay} onClick={close}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={close} aria-label={t(T.close)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            {success ? (
              <div className={styles.successState}>
                <div className={styles.successIcon}>✓</div>
                <p className={styles.successText}>{t(T.success)}</p>
                <button className="btn btn-secondary btn-sm" onClick={close} style={{ marginTop: 'var(--space-4)' }}>
                  {t(T.close)}
                </button>
              </div>
            ) : (
              <>
                <h2 className={styles.title}>{t(T.title)}</h2>
                <p className={styles.subtitle}>{t(T.subtitle)}</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                  <textarea
                    className={styles.textarea}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t(T.placeholder)}
                    rows={5}
                    maxLength={4000}
                    autoFocus
                    required
                  />
                  {error && <div className={styles.errorBox}>{error}</div>}
                  <div className={styles.actions}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={close} disabled={sending}>
                      {t(T.cancel)}
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !message.trim()}>
                      {sending ? t(T.sending) : t(T.send)}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function IconFeedback() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  )
}
