'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'
import { authErrorText } from '@/lib/clientErrors'
import { ZahirMark } from '@/components/icons/ZahirIcons'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // ?signup=success|cancelled comes back from the public Stripe checkout
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('signup')
    if (v === 'success')
      setNotice('Paiement reçu ! Vérifiez votre boîte mail pour définir votre mot de passe. / Payment received! Check your inbox to set your password.')
    else if (v === 'cancelled') setNotice('Paiement annulé. Aucun débit effectué. / Checkout cancelled. No charge was made.')
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      // This page is shown before the language is known: both languages, as for the notices above
      setError(`${authErrorText(error, 'fr')} / ${authErrorText(error, 'en')}`)
      setLoading(false)
      return
    }

    // Hard redirect ensures the session cookie is fully committed
    // before the next page attempts to read it server-side
    window.location.href = '/dashboard'
  }

  return (
    <div className={styles.page}>
      {/* Background texture */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgGrid} />
        <div className={styles.bgGlow} />
      </div>

      <main className={styles.main}>
        {/* Logo / wordmark */}
        <div className={styles.brand}>
          <div className={styles.logoMark} aria-hidden="true">
            <ZahirMark size={40} />
          </div>
          <div>
            <h1 className={styles.wordmark}>Zahir Guest</h1>
            <p className={styles.tagline}>Reveal what cannot be unseen.</p>
          </div>
        </div>

        {/* Login card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Connexion / Sign in</h2>
            <div className={styles.goldLine} />
          </div>

          <form onSubmit={handleLogin} className={styles.form}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
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

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Mot de passe / Password
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {notice && (
              <div className={styles.noticeBox} role="status">
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div className={styles.errorBox} role="alert">
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Connexion…
                </>
              ) : (
                'Se connecter / Sign in'
              )}
            </button>

            <a href="/auth/forgot-password" className={styles.forgotLink}>
              Mot de passe oublié ? / Forgot password?
            </a>

            <a href="/signup" className={styles.signupLink}>
              Pas encore de compte ? Commencez gratuitement / No account yet? Start for free
            </a>
          </form>
        </div>

        <p className={styles.footer}>
          Za3fran Consulting &nbsp;·&nbsp; Zahir Guest v1 &nbsp;·&nbsp; <a href="/terms">CGU / Terms</a> &nbsp;·&nbsp; <a href="/privacy">Confidentialité / Privacy</a>
        </p>
      </main>
    </div>
  )
}
