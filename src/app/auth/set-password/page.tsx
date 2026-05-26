'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './set-password.module.css'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Check for hash fragment — Supabase sometimes puts the token here
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')

      if (access_token && refresh_token) {
        const supabase = createClient()
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (!error) setReady(true)
          else setError('Session error: ' + error.message)
        })
        return
      }
    }
    // Session may already be set via cookies from callback route
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else setError('Auth session missing. Please request a new invite.')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>Password set!</h1>
          <p className={styles.subtitle}>Redirecting to dashboard…</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <p className={styles.brandName}>Zahir Guest</p>
          <p className={styles.brandTagline}>Reveal what cannot be unseen.</p>
        </div>
        <h1 className={styles.title}>Set your password / Définir votre mot de passe</h1>
        {!ready && !error && (
          <p style={{ color: 'var(--color-sand)', textAlign: 'center', fontSize: '0.875rem' }}>
            Loading…
          </p>
        )}
        {ready && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>PASSWORD / MOT DE PASSE</label>
              <input
                className={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CONFIRM PASSWORD / CONFIRMER</label>
              <input
                className={styles.input}
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? 'Saving…' : 'Set password / Confirmer →'}
            </button>
          </form>
        )}
        {error && !ready && (
          <div className={styles.error}>{error}</div>
        )}
      </div>
    </div>
  )
}
