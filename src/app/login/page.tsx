'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect. / Incorrect email or password.'
          : error.message
      )
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
          </form>
        </div>

        <p className={styles.footer}>
          Za3fran Consulting &nbsp;·&nbsp; Zahir Guest v1
        </p>
      </main>
    </div>
  )
}
