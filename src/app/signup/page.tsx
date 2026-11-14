'use client'

import { langFromCookieString, rememberLang } from '@/lib/lang'
import { useEffect, useState } from 'react'
import { FREE_FEATURES } from '@/lib/plans'
import { currencyFromCookieString, type Currency } from '@/lib/currency'
import styles from './signup.module.css'

type Lang = 'en' | 'fr'

const T = {
  title: { en: 'Start for free', fr: 'Commencez gratuitement' },
  sub: {
    en: 'The Discovery plan is free with no time limit and no credit card. Run your first audit in minutes.',
    fr: "L'offre Découverte est gratuite, sans limite de durée et sans carte bancaire. Lancez votre premier audit en quelques minutes.",
  },
  company: { en: 'Company / hotel group', fr: 'Société / groupe hôtelier' },
  name: { en: 'Your name', fr: 'Votre nom' },
  email: { en: 'Work email', fr: 'Email professionnel' },
  included: { en: 'Included, free', fr: 'Inclus gratuitement' },
  planNote: {
    en: 'Need more properties, the full library or your own questionnaires? Upgrade any time from Billing. Hotel group or audit firm: ask us for a 14-day guided pilot.',
    fr: "Besoin de plus d'établissements, de la bibliothèque complète ou de vos propres questionnaires ? Passez à une offre supérieure à tout moment depuis Facturation. Groupe hôtelier ou cabinet d'audit : demandez-nous un pilote accompagné de 14 jours.",
  },
  submit: { en: 'Create my free workspace', fr: 'Créer mon espace gratuit' },
  sending: { en: 'Creating your workspace…', fr: 'Création de votre espace…' },
  haveAccount: { en: 'Already have an account? Sign in', fr: 'Déjà un compte ? Se connecter' },
  doneTitle: { en: 'Check your inbox', fr: 'Vérifiez votre boîte mail' },
  doneText: {
    en: 'We sent you a link to set your password and open your workspace. If you do not see it within a few minutes, check your spam folder.',
    fr: "Nous vous avons envoyé un lien pour définir votre mot de passe et ouvrir votre espace. Si vous ne le voyez pas d'ici quelques minutes, vérifiez vos courriers indésirables.",
  },
  generic: { en: 'Something went wrong. Please try again.', fr: 'Une erreur est survenue. Veuillez réessayer.' },
}

export default function SignupPage() {
  const [lang, setLang] = useState<Lang>('fr')
  const [companyName, setCompanyName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currency, setCurrency] = useState<Currency>('EUR')
  useEffect(() => {
    setCurrency(currencyFromCookieString(document.cookie))
    // The language already chosen on the site wins; the phone's language only decides a first visit
    const chosen = langFromCookieString(document.cookie)
    if (chosen) setLang(chosen)
    else if (navigator.language?.toLowerCase().startsWith('en')) setLang('en')
  }, [])
  const [website, setWebsite] = useState('') // honeypot
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const t = (k: { en: string; fr: string }) => k[lang]

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, name, email, lang, website, currency }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t(T.generic))
        setLoading(false)
        return
      }
      setDone(true)
    } catch {
      setError(t(T.generic))
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
        <h1 className={styles.wordmark}>Zahir Guest</h1>

        <div className={styles.card}>
          <div className={styles.langRow}>
            {(['fr', 'en'] as Lang[]).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); rememberLang(l) }}
                className={`${styles.langBtn} ${lang === l ? styles.langBtnActive : ''}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {done ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.cardTitle}>{t(T.doneTitle)}</h2>
              <p className={styles.sub}>{t(T.doneText)}</p>
              <a href="/login" className={styles.link}>{t(T.haveAccount)}</a>
            </div>
          ) : (
            <>
              <h2 className={styles.cardTitle}>{t(T.title)}</h2>
              <p className={styles.sub}>{t(T.sub)}</p>

              <form onSubmit={onSubmit} className={styles.form}>
                <div className="form-group">
                  <label htmlFor="company" className="form-label">{t(T.company)}</label>
                  <input id="company" type="text" className="form-input" value={companyName}
                    onChange={e => setCompanyName(e.target.value)} required maxLength={120} autoComplete="organization" />
                </div>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">{t(T.name)}</label>
                  <input id="name" type="text" className="form-input" value={name}
                    onChange={e => setName(e.target.value)} required maxLength={120} autoComplete="name" />
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">{t(T.email)}</label>
                  <input id="email" type="email" className="form-input" value={email}
                    onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>

                <div className={styles.freeBox}>
                  <span className="form-label">{t(T.included)}</span>
                  <ul className={styles.freeList}>
                    {FREE_FEATURES[lang].map(f => <li key={f}>{f}</li>)}
                  </ul>
                  <p className={styles.fine} style={{ marginTop: 'var(--space-2)' }}>{t(T.planNote)}</p>
                </div>

                {/* Honeypot: hidden from people, tempting for bots */}
                <div className={styles.hp} aria-hidden="true">
                  <label>Website<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
                </div>

                {error && <div className={styles.errorBox} role="alert">{error}</div>}

                <p style={{ fontSize: '0.8125rem', opacity: 0.8, textAlign: 'center', margin: '0 0 12px' }}>
                  {t({ fr: 'En créant votre espace, vous acceptez nos ', en: 'By creating your workspace, you accept our ' })}
                  <a href={lang === 'en' ? '/en/terms' : '/terms'} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>{t({ fr: 'conditions', en: 'terms' })}</a>
                  {t({ fr: ' et notre ', en: ' and our ' })}
                  <a href={lang === 'en' ? '/en/privacy' : '/privacy'} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>{t({ fr: 'politique de confidentialité', en: 'privacy policy' })}</a>.
                </p>
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? t(T.sending) : t(T.submit)}
                </button>
              </form>
            </>
          )}
        </div>

        {!done && <a href="/login" className={styles.link}>{t(T.haveAccount)}</a>}
      </main>
    </div>
  )
}
