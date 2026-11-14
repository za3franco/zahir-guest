'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { authErrorText, failureText, type Lang } from '@/lib/clientErrors'
import styles from './set-password.module.css'

const TEXT = {
  en: {
    tagline: 'Reveal what cannot be unseen.',
    title: 'Set your password',
    loading: 'Loading…',
    password: 'PASSWORD',
    confirm: 'CONFIRM PASSWORD',
    placeholderPassword: 'At least 8 characters',
    placeholderConfirm: 'Repeat your password',
    submit: 'Set password →',
    saving: 'Saving…',
    tooShort: 'The password must be at least 8 characters.',
    mismatch: 'The two passwords do not match.',
    linkInvalid: 'This link has expired or is not valid. Please ask for a new invitation.',
    done: 'Password set!',
    redirecting: 'Redirecting to your dashboard…',
    language: 'Language',
  },
  fr: {
    tagline: 'Ce qui est révélé ne peut plus être ignoré.',
    title: 'Définissez votre mot de passe',
    loading: 'Chargement…',
    password: 'MOT DE PASSE',
    confirm: 'CONFIRMER LE MOT DE PASSE',
    placeholderPassword: '8 caractères minimum',
    placeholderConfirm: 'Répétez votre mot de passe',
    submit: 'Enregistrer le mot de passe →',
    saving: 'Enregistrement…',
    tooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
    mismatch: 'Les deux mots de passe ne correspondent pas.',
    linkInvalid: "Ce lien a expiré ou n'est pas valide. Demandez une nouvelle invitation.",
    done: 'Mot de passe enregistré !',
    redirecting: 'Redirection vers votre tableau de bord…',
    language: 'Langue',
  },
} satisfies Record<Lang, Record<string, string>>

// What went wrong, kept as data (not text) so the message follows the language if the person switches it.
type Problem =
  | { kind: 'link' }
  | { kind: 'short' }
  | { kind: 'mismatch' }
  | { kind: 'auth'; error: { code?: string; message?: string; status?: number } }
  | { kind: 'network'; error: unknown }

export default function SetPasswordForm({ initialLang }: { initialLang: Lang }) {
  const [lang, setLang] = useState<Lang>(initialLang)
  const chosenByHand = useRef(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const t = TEXT[lang]

  useEffect(() => { document.documentElement.lang = lang }, [lang])

  // Once the invitation opens a session, use the language chosen for this person (users.default_language), unless
  // they already picked one here.
  async function adoptProfileLanguage() {
    try {
      const res = await fetch('/api/user/me', { cache: 'no-store' })
      if (!res.ok) return
      const me = await res.json()
      if (!chosenByHand.current && (me.default_language === 'en' || me.default_language === 'fr')) setLang(me.default_language)
    } catch { /* keep the browser's language */ }
  }

  useEffect(() => {
    const supabase = createClient()
    const opened = () => { setReady(true); void adoptProfileLanguage() }

    // Supabase sometimes puts the token in the hash fragment
    const hash = window.location.hash
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (!error) opened()
          else setProblem({ kind: 'link' })
        })
        return
      }
    }
    // Session may already be set via cookies from the callback route
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) opened()
      else setProblem({ kind: 'link' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function problemText(p: Problem): string {
    switch (p.kind) {
      case 'link': return t.linkInvalid
      case 'short': return t.tooShort
      case 'mismatch': return t.mismatch
      case 'auth': return authErrorText(p.error, lang)
      case 'network': return failureText(p.error, lang)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setProblem(null)

    if (password.length < 8) { setProblem({ kind: 'short' }); return }
    if (password !== confirm) { setProblem({ kind: 'mismatch' }); return }

    setLoading(true)
    try {
      const { error } = await createClient().auth.updateUser({ password })
      if (error) {
        setProblem({ kind: 'auth', error })
        setLoading(false)
        return
      }
    } catch (err) {
      setProblem({ kind: 'network', error: err })
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => { window.location.href = '/dashboard' }, 2000)
  }

  const langSwitch = (
    <div className={styles.langSwitch} role="group" aria-label={t.language}>
      {(['fr', 'en'] as const).map(l => (
        <button key={l} type="button" aria-pressed={l === lang}
          className={`${styles.langOpt} ${l === lang ? styles.langOptActive : ''}`}
          onClick={() => { chosenByHand.current = true; setLang(l) }}>{l.toUpperCase()}</button>
      ))}
    </div>
  )

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.title}>{t.done}</h1>
          <p className={styles.subtitle}>{t.redirecting}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <p className={styles.brandName}>Zahir Guest</p>
          <p className={styles.brandTagline}>{t.tagline}</p>
        </div>
        {langSwitch}
        <h1 className={styles.title}>{t.title}</h1>
        {!ready && !problem && (
          <p style={{ color: 'var(--color-sand)', textAlign: 'center', fontSize: '0.875rem' }}>{t.loading}</p>
        )}
        {ready && (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="sp-password">{t.password}</label>
              <input
                id="sp-password"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t.placeholderPassword}
                required
                minLength={8}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="sp-confirm">{t.confirm}</label>
              <input
                id="sp-confirm"
                className={styles.input}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={t.placeholderConfirm}
                required
              />
            </div>
            {problem && <div className={styles.error} role="alert">{problemText(problem)}</div>}
            <button type="submit" className={styles.btn} disabled={loading}>
              {loading ? t.saving : t.submit}
            </button>
          </form>
        )}
        {problem && !ready && (
          <div className={styles.error} role="alert">{problemText(problem)}</div>
        )}
      </div>
    </div>
  )
}
