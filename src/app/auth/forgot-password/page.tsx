'use client'

import { useState } from 'react'
import styles from './forgot-password.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  // The page is bilingual (shown before we know who the person is). The email itself is written in the language
  // of the account; the browser's language is only used for the rare error message below.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const lang = (navigator.language ?? '').toLowerCase().startsWith('en') ? 'en' : 'fr'
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), lang }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        // Invalid address or too many attempts: never says whether an account exists
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Une erreur s\'est produite. / Something went wrong.')
      }
    } catch {
      setError('Pas de connexion. Vérifiez votre réseau. / No connection. Check your network.')
    }
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgGrid} />
        <div className={styles.bgGlow} />
      </div>

      <main className={styles.main}>
        <div className={styles.brand}>
          <div className={styles.logoMark} aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
              <circle cx="20" cy="20" r="7" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.5" fill="none"/>
              <circle cx="20" cy="20" r="13" stroke="#C8A45A" strokeWidth="0.5" strokeOpacity="0.25" fill="none"/>
              <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
              <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
              <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
              <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round"/>
              <line x1="8.69" y1="8.69" x2="13.13" y2="13.13" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round"/>
              <line x1="26.87" y1="26.87" x2="31.31" y2="31.31" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round"/>
              <line x1="31.31" y1="8.69" x2="26.87" y2="13.13" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round"/>
              <line x1="13.13" y1="26.87" x2="8.69" y2="31.31" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.35" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <h1 className={styles.wordmark}>Zahir Guest</h1>
            <p className={styles.tagline}>Reveal what cannot be unseen.</p>
          </div>
        </div>

        <div className={styles.card}>
          {sent ? (
            <>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Email envoyé / Email sent</h2>
                <div className={styles.goldLine} />
              </div>
              <p className={styles.confirmText}>
                Si un compte existe pour cette adresse, un lien de réinitialisation vient d&apos;être envoyé.
                <br /><br />
                If an account exists for this address, a reset link has just been sent. Check your inbox (and spam folder).
              </p>
              <a href="/login" className={`btn btn-secondary ${styles.confirmBack}`}>
                ← Retour à la connexion / Back to login
              </a>
            </>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Mot de passe oublié ? / Forgot password?</h2>
                <div className={styles.goldLine} />
              </div>
              <p className={styles.introText}>
                Entrez votre email pour recevoir un lien de réinitialisation.
                <br />
                Enter your email to receive a reset link.
              </p>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    id="email"
                    type="email"
                    className="form-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className={styles.errorBox} role="alert">
                    <span>{error}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner" style={{ width: 16, height: 16 }} />
                      Envoi…
                    </>
                  ) : (
                    'Envoyer le lien / Send reset link'
                  )}
                </button>

                <a href="/login" className={styles.backLink}>← Retour à la connexion / Back to login</a>
              </form>
            </>
          )}
        </div>

        <p className={styles.footer}>
          Za3fran Consulting &nbsp;·&nbsp; Zahir Guest v1
        </p>
      </main>
    </div>
  )
}
