'use client'

import { useState } from 'react'
import styles from './help.module.css'

const T = {
  label: { en: 'Your message', fr: 'Votre message' },
  placeholder: { en: 'Describe your question or problem…', fr: 'Décrivez votre question ou votre problème…' },
  send: { en: 'Send to support', fr: 'Envoyer au support' },
  sending: { en: 'Sending…', fr: 'Envoi…' },
  done: { en: 'Message sent. We will reply by email.', fr: 'Message envoyé. Nous vous répondrons par email.' },
  error: { en: 'Something went wrong. Please try again.', fr: 'Une erreur est survenue. Veuillez réessayer.' },
}

export default function SupportForm({ lang, initialMessage = '', transcript = '', onSent }: {
  lang: 'en' | 'fr'
  initialMessage?: string
  transcript?: string
  onSent?: () => void
}) {
  const [message, setMessage] = useState(initialMessage)
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const t = (k: { en: string; fr: string }) => k[lang]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setState('sending')
    setError(null)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, transcript, page: window.location.pathname }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t(T.error))
        setState('idle')
        return
      }
      setState('done')
      onSent?.()
    } catch {
      setError(t(T.error))
      setState('idle')
    }
  }

  if (state === 'done') return <div className={styles.okBox} role="status">{t(T.done)}</div>

  return (
    <form onSubmit={submit} className={styles.supportForm}>
      <label className={styles.supportLabel} htmlFor="support-msg">{t(T.label)}</label>
      <textarea id="support-msg" value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={4000}
        placeholder={t(T.placeholder)} className={styles.textarea} required />
      {error && <div className={styles.errorText} role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
        {state === 'sending' ? t(T.sending) : t(T.send)}
      </button>
    </form>
  )
}
