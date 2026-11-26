'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import styles from './landing.module.css'
import { ZahirMark } from '@/components/icons/ZahirIcons'

interface Props {
  lang: 'en' | 'fr'
  labels: { features: string; how: string; pricing: string; faq: string; login: string; dashboard: string; cta: string; menu: string; hotels: string; firms: string; example: string }
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
    { href: `${base}#hotels`, label: labels.hotels },
    { href: `${base}#firms`, label: labels.firms },
    { href: `${base}#exemple`, label: labels.example },
    { href: `${base}#pricing`, label: labels.pricing },
  ]

  return (
    <header className={styles.nav}>
      <div className={styles.navInner}>
        <Link href={base || '/'} className={styles.logo} aria-label="Zahir Guest">
          <ZahirMark size={30} />
          <span>Zahir <em>Guest</em></span>
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
