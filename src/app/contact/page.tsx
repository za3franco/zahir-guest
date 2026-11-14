'use client'

import { useEffect, useState } from 'react'
import { ACTIVITIES, ACTIVITY_LABELS } from '@/lib/contactRequest'
import styles from '../signup/signup.module.css'

type Lang = 'en' | 'fr'

const T = {
  title: { en: "Let's talk", fr: 'Parlons-en' },
  sub: {
    en: 'Tell us about your needs. We will come back within one working day with a proposal that fits. For more than 100 properties we will call you.',
    fr: 'Dites-nous votre besoin. Nous revenons vers vous sous un jour ouvré avec une proposition adaptée. Au-delà de 100 établissements, nous vous appelons.',
  },
  company: { en: 'Company / group', fr: 'Société / groupe' },
  name: { en: 'Your name', fr: 'Votre nom' },
  job: { en: 'Your role (optional)', fr: 'Votre fonction (facultatif)' },
  email: { en: 'Work email', fr: 'Email professionnel' },
  phone: { en: 'Phone (optional)', fr: 'Téléphone (facultatif)' },
  country: { en: 'Country (optional)', fr: 'Pays (facultatif)' },
  activity: { en: 'Your activity (optional)', fr: 'Votre activité (facultatif)' },
  choose: { en: 'Choose…', fr: 'Choisir…' },
  properties: { en: 'Number of properties', fr: "Nombre d'établissements" },
  audits: { en: 'Audits expected per month (optional)', fr: 'Audits prévus par mois (facultatif)' },
  message: { en: 'Anything we should know? (optional)', fr: 'Quelque chose à nous dire ? (facultatif)' },
  consent: {
    en: 'I agree that Zahir Guest uses these details to answer my request.',
    fr: 'J’accepte que Zahir Guest utilise ces informations pour répondre à ma demande.',
  },
  submit: { en: 'Send my request', fr: 'Envoyer ma demande' },
  sending: { en: 'Sending…', fr: 'Envoi…' },
  back: { en: '← Back to the site', fr: '← Retour au site' },
  doneTitle: { en: 'Request received', fr: 'Demande reçue' },
  doneText: {
    en: 'Thank you. We will get back to you within one working day. A confirmation was sent to your email.',
    fr: 'Merci. Nous revenons vers vous sous un jour ouvré. Une confirmation vient d’être envoyée à votre adresse.',
  },
  generic: { en: 'Something went wrong. Please try again.', fr: 'Une erreur est survenue. Veuillez réessayer.' },
}

export default function ContactPage() {
  const [lang, setLang] = useState<Lang>('fr')
  const [source, setSource] = useState('')
  const [f, setF] = useState({ company: '', name: '', jobTitle: '', email: '', phone: '', country: '', activity: '', properties: '', audits: '', message: '' })
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const l = q.get('lang')
    if (l === 'en' || l === 'fr') setLang(l)
    else if (navigator.language?.toLowerCase().startsWith('en')) setLang('en')
    setSource(q.get('src') ?? '')
    const n = Number(q.get('n'))
    if (Number.isFinite(n) && n > 0) setF(prev => ({ ...prev, properties: String(Math.min(5000, Math.floor(n))) }))
  }, [])

  const t = (k: { en: string; fr: string }) => k[lang]
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(prev => ({ ...prev, [k]: e.target.value }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, lang, source, website, consent }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t(T.generic))
      } else {
        setDone(true)
      }
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
              <button key={l} type="button" onClick={() => setLang(l)} className={`${styles.langBtn} ${lang === l ? styles.langBtnActive : ''}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {done ? (
            <div className={styles.success}>
              <div className={styles.successIcon}>✓</div>
              <h2 className={styles.cardTitle}>{t(T.doneTitle)}</h2>
              <p className={styles.sub}>{t(T.doneText)}</p>
              <a href={lang === 'en' ? '/en' : '/'} className={styles.link}>{t(T.back)}</a>
            </div>
          ) : (
            <>
              <h2 className={styles.cardTitle}>{t(T.title)}</h2>
              <p className={styles.sub}>{t(T.sub)}</p>
              <form onSubmit={onSubmit} className={styles.form}>
                <div className="form-group">
                  <label htmlFor="company" className="form-label">{t(T.company)}</label>
                  <input id="company" type="text" className="form-input" value={f.company} onChange={set('company')} required maxLength={150} autoComplete="organization" />
                </div>
                <div className="form-group">
                  <label htmlFor="name" className="form-label">{t(T.name)}</label>
                  <input id="name" type="text" className="form-input" value={f.name} onChange={set('name')} required maxLength={120} autoComplete="name" />
                </div>
                <div className="form-group">
                  <label htmlFor="job" className="form-label">{t(T.job)}</label>
                  <input id="job" type="text" className="form-input" value={f.jobTitle} onChange={set('jobTitle')} maxLength={120} autoComplete="organization-title" />
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">{t(T.email)}</label>
                  <input id="email" type="email" className="form-input" value={f.email} onChange={set('email')} required maxLength={200} autoComplete="email" />
                </div>
                <div className="form-group">
                  <label htmlFor="phone" className="form-label">{t(T.phone)}</label>
                  <input id="phone" type="tel" className="form-input" value={f.phone} onChange={set('phone')} maxLength={40} autoComplete="tel" style={{ fontSize: 16 }} />
                </div>
                <div className="form-group">
                  <label htmlFor="country" className="form-label">{t(T.country)}</label>
                  <input id="country" type="text" className="form-input" value={f.country} onChange={set('country')} maxLength={80} autoComplete="country-name" />
                </div>
                <div className="form-group">
                  <label htmlFor="activity" className="form-label">{t(T.activity)}</label>
                  <select id="activity" className="form-input" value={f.activity} onChange={set('activity')} style={{ fontSize: 16 }}>
                    <option value="">{t(T.choose)}</option>
                    {ACTIVITIES.map(a => <option key={a} value={a}>{ACTIVITY_LABELS[a][lang]}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="properties" className="form-label">{t(T.properties)}</label>
                  <input id="properties" type="number" inputMode="numeric" min={1} max={5000} className="form-input" value={f.properties} onChange={set('properties')} required style={{ fontSize: 16 }} />
                </div>
                <div className="form-group">
                  <label htmlFor="audits" className="form-label">{t(T.audits)}</label>
                  <input id="audits" type="number" inputMode="numeric" min={0} max={100000} className="form-input" value={f.audits} onChange={set('audits')} style={{ fontSize: 16 }} />
                </div>
                <div className="form-group">
                  <label htmlFor="message" className="form-label">{t(T.message)}</label>
                  <textarea id="message" className="form-input" rows={4} value={f.message} onChange={set('message')} maxLength={2000} style={{ fontSize: 16 }} />
                </div>

                <div className={styles.hp} aria-hidden="true">
                  <label>Website<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label>
                </div>

                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.8125rem', opacity: 0.9 }}>
                  <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required style={{ marginTop: 3 }} />
                  <span>
                    {t(T.consent)}{' '}
                    <a href={lang === 'en' ? '/en/privacy' : '/privacy'} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'underline' }}>
                      {lang === 'en' ? 'Privacy policy' : 'Politique de confidentialité'}
                    </a>
                  </span>
                </label>

                {error && <div className={styles.errorBox} role="alert">{error}</div>}
                <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                  {loading ? t(T.sending) : t(T.submit)}
                </button>
              </form>
            </>
          )}
        </div>
        {!done && <a href={lang === 'en' ? '/en' : '/'} className={styles.link}>{t(T.back)}</a>}
      </main>
    </div>
  )
}
