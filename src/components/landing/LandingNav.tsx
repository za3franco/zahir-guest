'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './landing.module.css'

interface Props {
  lang: 'en' | 'fr'
  labels: { features: string; how: string; pricing: string; faq: string; login: string; dashboard: string; cta: string; menu: string }
}

export default function LandingNav({ lang, labels }: Props) {
  const [open, setOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const base = lang === 'en' ? '/en' : ''

  // Show "My workspace" instead of "Sign in" for returning users (client-side, keeps the page static for SEO)
  useEffect(() => {
    try {
      createClient().auth.getSession().then(({ data }) => setSignedIn(!!data.session)).catch(() => {})
    } catch { /* ignore */ }
  }, [])

  const links = [
    { href: `${base}#features`, label: labels.features },
    { href: `${base}#how`, label: labels.how },
    { href: `${base}#pricing`, label: labels.pricing },
    { href: `${base}#faq`, label: labels.faq },
  ]

  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link href={base || '/'} className={styles.logo} aria-label="Zahir Guest">
          <svg width="26" height="26" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <circle cx="20" cy="20" r="3" fill="#C8A45A" />
            <circle cx="20" cy="20" r="7" stroke="#C8A45A" strokeWidth="1" strokeOpacity="0.5" />
            <circle cx="20" cy="20" r="13" stroke="#C8A45A" strokeWidth="0.5" strokeOpacity="0.25" />
            <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
          </svg>
          <span>Zahir Guest</span>
        </Link>

        <nav className={`${styles.navLinks} ${open ? styles.navLinksOpen : ''}`} aria-label="Main">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <Link href={lang === 'en' ? '/' : '/en'} className={styles.langSwitch} hrefLang={lang === 'en' ? 'fr' : 'en'}>
            {lang === 'en' ? 'FR' : 'EN'}
          </Link>
          <Link href={signedIn ? '/dashboard' : '/login'} className={styles.navLogin}>
            {signedIn ? labels.dashboard : labels.login}
          </Link>
          <Link href="/signup" className={styles.navCta}>{labels.cta}</Link>
        </nav>

        <button type="button" className={styles.burger} aria-label={labels.menu} aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}
