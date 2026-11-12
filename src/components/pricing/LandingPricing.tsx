'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { currencyFromCookieString, formatMoney, rememberCurrency, type Currency } from '@/lib/currency'
import { PLAN_FEATURES, PLAN_NAMES, PRICE_GRID, quote, TIER_RULES, type PlanTier } from '@/lib/plans'
import CurrencySwitcher from './CurrencySwitcher'
import styles from './pricing.module.css'

type Lang = 'en' | 'fr'

const T = {
  monthly: { en: 'Monthly', fr: 'Mensuel' },
  annual: { en: 'Annual', fr: 'Annuel' },
  twoFree: { en: '2 months free', fr: '2 mois offerts' },
  perMonth: { en: '/month', fr: '/mois' },
  billedYear: { en: 'billed yearly', fr: 'facturés par an' },
  from: { en: 'From', fr: 'À partir de' },
  popular: { en: 'Most popular', fr: 'Le plus choisi' },
  cta: { en: 'Start free trial', fr: "Démarrer l'essai" },
  talk: { en: 'Talk to us', fr: 'Parlons-en' },
  hotelFor: { en: 'For an independent hotel, riad or boutique hotel', fr: 'Pour un hôtel indépendant, un riad ou un boutique-hôtel' },
  proFor: { en: 'For hotel groups and mystery audit firms', fr: "Pour les groupes hôteliers et les cabinets d'audit" },
  entFor: { en: 'For chains and national programmes', fr: 'Pour les chaînes et les programmes nationaux' },
  properties: { en: 'Properties', fr: 'Établissements' },
  included: (n: number, lang: Lang) => (lang === 'en' ? `${n} included` : `${n} inclus`),
  extra: (price: string, lang: Lang) => (lang === 'en' ? `+${price} per extra property` : `+${price} par établissement supplémentaire`),
  madNote: {
    en: 'In dirhams: prepaid per quarter or per year, by card through YouCan Pay.',
    fr: 'En dirhams : prépayé au trimestre ou à l’année, par carte via YouCan Pay.',
  },
  trialNote: {
    en: '14-day free trial on every plan, no card needed. Prices excl. VAT.',
    fr: 'Essai gratuit de 14 jours sur chaque formule, sans carte. Prix hors taxes.',
  },
}

export default function LandingPricing({ lang, madEnabled, demoHref }: { lang: Lang; madEnabled: boolean; demoHref: string }) {
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [annual, setAnnual] = useState(false)
  const [proProps, setProProps] = useState(TIER_RULES.professional.includedProperties)

  useEffect(() => {
    const c = currencyFromCookieString(document.cookie)
    setCurrency(c === 'MAD' && !madEnabled ? 'EUR' : c)
  }, [madEnabled])

  const pick = (c: Currency) => {
    setCurrency(c)
    rememberCurrency(c)
  }
  const t = (k: { en: string; fr: string }) => k[lang]
  const money = (n: number) => formatMoney(n, currency, lang)
  // MAD has no monthly plan (prepaid quarter or year); its "monthly" view shows the quarter's monthly price.
  const interval = annual ? 'annual' : currency === 'MAD' ? 'quarterly' : 'monthly'

  const card = (tier: PlanTier) => {
    const q = quote(tier, currency, interval, tier === 'professional' ? proProps : undefined)
    const unitExtra = PRICE_GRID[currency][tier].extra
    const featured = tier === 'professional'
    const enterprise = tier === 'enterprise'
    return (
      <div key={tier} className={`${styles.plan} ${featured ? styles.planFeatured : ''}`}>
        {featured && <span className={styles.badge}>{t(T.popular)}</span>}
        <h3 className={styles.planName}>{PLAN_NAMES[tier][lang]}</h3>
        <p className={styles.planFor}>{t(tier === 'starter' ? T.hotelFor : featured ? T.proFor : T.entFor)}</p>
        <p className={styles.price}>
          {enterprise && <small>{t(T.from)} </small>}
          {money(Math.round(q.perMonth))}
          <small>{t(T.perMonth)}</small>
        </p>
        <p className={styles.priceNote}>
          {annual && !enterprise ? `${money(q.total)} ${t(T.billedYear)}` : ' '}
        </p>

        {featured && (
          <div className={styles.stepper}>
            <span>{t(T.properties)}</span>
            <div className={styles.stepperCtl}>
              <button type="button" aria-label="−" onClick={() => setProProps(n => Math.max(TIER_RULES.professional.includedProperties, n - 1))}>−</button>
              <output aria-live="polite">{proProps}</output>
              <button type="button" aria-label="+" onClick={() => setProProps(n => Math.min(30, n + 1))}>+</button>
            </div>
          </div>
        )}
        {unitExtra !== null && !enterprise && (
          <p className={styles.extraNote}>
            {TIER_RULES[tier].includedProperties > 1 ? `${T.included(TIER_RULES[tier].includedProperties, lang)} · ` : ''}
            {T.extra(money(unitExtra), lang)}
          </p>
        )}

        <ul className={styles.features}>
          {PLAN_FEATURES[tier][lang].map(f => <li key={f}>{f}</li>)}
        </ul>
        {enterprise ? (
          <a href={demoHref} className={styles.btnGhost}>{t(T.talk)}</a>
        ) : (
          <Link href="/signup" className={featured ? styles.btnPrimary : styles.btnGhost}>{t(T.cta)}</Link>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.toggle} role="group">
          <button type="button" aria-pressed={!annual} className={`${styles.toggleBtn} ${!annual ? styles.toggleActive : ''}`} onClick={() => setAnnual(false)}>
            {currency === 'MAD' ? (lang === 'en' ? 'Quarterly' : 'Trimestriel') : t(T.monthly)}
          </button>
          <button type="button" aria-pressed={annual} className={`${styles.toggleBtn} ${annual ? styles.toggleActive : ''}`} onClick={() => setAnnual(true)}>
            {t(T.annual)} <span className={styles.save}>{t(T.twoFree)}</span>
          </button>
        </div>
        <CurrencySwitcher value={currency} onChange={pick} madEnabled={madEnabled} lang={lang} tone="light" />
      </div>
      <div className={styles.grid}>{(['starter', 'professional', 'enterprise'] as PlanTier[]).map(card)}</div>
      <p className={styles.fine}>
        {t(T.trialNote)}
        {currency === 'MAD' ? ` ${t(T.madNote)}` : ''}
      </p>
    </div>
  )
}
