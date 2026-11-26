'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { currencyFromCookieString, formatMoney, rememberCurrency, type Currency } from '@/lib/currency'
import { FREE_FEATURES, FREE_NAME, PLAN_COMPARISON, PLAN_FEATURES, PLAN_NAMES, PRICE_GRID, quote, TIER_RULES, type PlanTier } from '@/lib/plans'
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
  cta: { en: 'Create my workspace', fr: 'Créer mon espace' },
  freeCta: { en: 'Start for free', fr: 'Commencer gratuitement' },
  freeFor: { en: 'To try Zahir Guest on your property, for as long as you like', fr: 'Pour essayer Zahir Guest sur votre établissement, sans limite de durée' },
  freePrice: { en: 'Free', fr: 'Gratuit' },
  talk: { en: 'Talk to us', fr: 'Parlons-en' },
  hotelFor: { en: 'For an independent hotel, riad or boutique hotel', fr: 'Pour un hôtel indépendant, un riad ou un boutique-hôtel' },
  proFor: { en: 'For hotel groups and mystery audit firms, from 3 properties', fr: "Pour les groupes hôteliers et les cabinets d'audit, dès 3 établissements" },
  entFor: { en: 'For chains and national programmes, from 20 properties', fr: 'Pour les chaînes et les programmes nationaux, dès 20 établissements' },
  perProperty: (price: string, lang: Lang) => (lang === 'en' ? `i.e. ${price} per property a month` : `soit ${price} par établissement et par mois`),
  compare: { en: 'Compare the plans', fr: 'Comparer les offres' },
  includes: { en: 'Included:', fr: 'Inclus :' },
  properties: { en: 'Properties', fr: 'Établissements' },
  included: (n: number, lang: Lang) => (lang === 'en' ? `${n} included` : `${n} inclus`),
  extra: (price: string, lang: Lang) => (lang === 'en' ? `+${price} per extra property` : `+${price} par établissement supplémentaire`),
  madNote: {
    en: 'In dirhams: prepaid per quarter or per year, by card through YouCan Pay.',
    fr: 'En dirhams : prépayé au trimestre ou à l’année, par carte via YouCan Pay.',
  },
  trialNote: {
    en: 'Every workspace starts on the free Discovery plan, no card needed; upgrade from Billing when you are ready. Hotel groups and audit firms: 14-day Professional pilot on request, after a demo. Prices excl. VAT.',
    fr: "Chaque espace démarre avec l'offre Découverte gratuite, sans carte ; passez à l'offre supérieure depuis Facturation quand vous voulez. Groupes hôteliers et cabinets d'audit : pilote Professionnel de 14 jours sur demande, après une démo. Prix hors taxes.",
  },
}

export default function LandingPricing({ lang, madEnabled, demoHref }: { lang: Lang; madEnabled: boolean; demoHref: string }) {
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [annual, setAnnual] = useState(false)
  const [counts, setCounts] = useState<Record<PlanTier, number>>({ starter: TIER_RULES.starter.includedProperties, professional: TIER_RULES.professional.includedProperties, enterprise: TIER_RULES.enterprise.includedProperties })

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
    const enterprise = tier === 'enterprise'
    const r = TIER_RULES[tier]
    const n = counts[tier]
    const setN = (v: number) => setCounts(c => ({ ...c, [tier]: Math.max(r.includedProperties, Math.min(r.includedProperties + r.maxExtraProperties, v)) }))
    const q = quote(tier, currency, interval, enterprise ? undefined : n)
    const unitExtra = PRICE_GRID[currency][tier].extra
    const featured = tier === 'professional'
    const [propsLine, ...rest] = PLAN_FEATURES[tier][lang]
    const features = rest[0]?.endsWith(':') ? rest : [t(T.includes), ...rest]
    // Every card has the same 8 children, laid on a shared row grid (CSS subgrid), so name, price, properties,
    // feature list and button line up across the three plans.
    return (
      <div key={tier} className={`${styles.plan} ${featured ? styles.planFeatured : ''}`}>
        <h3 className={styles.planName}>{PLAN_NAMES[tier][lang]}</h3>
        <p className={styles.planFor}>{t(tier === 'starter' ? T.hotelFor : featured ? T.proFor : T.entFor)}</p>
        <p className={styles.price}>
          {money(Math.round(q.perMonth))}
          <small>{t(T.perMonth)}</small>
        </p>
        <p className={styles.priceNote}>
          {annual && !enterprise ? `${money(q.total)} ${t(T.billedYear)}` : '\u00a0'}
        </p>
        <p className={styles.perProp}>{T.perProperty(money(Math.round(q.perMonth / q.properties)), lang)}</p>
        <div className={styles.slot}>
          <p className={styles.slotLine}>{propsLine}</p>
          {!enterprise && (
            <div className={styles.stepper}>
              <span>{t(T.properties)}</span>
              <div className={styles.stepperCtl}>
                <button type="button" aria-label={lang === 'en' ? 'One property less' : 'Un établissement de moins'} disabled={n <= r.includedProperties} onClick={() => setN(n - 1)}>−</button>
                <output aria-live="polite">{n}</output>
                <button type="button" aria-label={lang === 'en' ? 'One property more' : 'Un établissement de plus'} disabled={n >= r.includedProperties + r.maxExtraProperties} onClick={() => setN(n + 1)}>+</button>
              </div>
            </div>
          )}
          {unitExtra !== null && !enterprise && <p className={styles.extraNote}>{T.extra(money(unitExtra), lang)}</p>}
        </div>
        <ul className={styles.features}>
          {features.map(f => <li key={f} className={f.endsWith(':') ? styles.featPlus : undefined}>{f}</li>)}
        </ul>
        <div className={styles.ctaRow}>
          {enterprise ? (
            <a href={demoHref} className={styles.btnGhost}>{t(T.talk)}</a>
          ) : (
            <Link href="/signup" className={featured ? styles.btnPrimary : styles.btnGhost}>{t(T.cta)}</Link>
          )}
        </div>
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
      <div className={styles.freeBand}>
        <div className={styles.freeHead}>
          <h3 className={styles.planName}>{t(FREE_NAME)}</h3>
          <p className={styles.freePrice}>{t(T.freePrice)}</p>
          <p className={styles.planFor}>{t(T.freeFor)}</p>
        </div>
        <ul className={styles.freeList}>
          {FREE_FEATURES[lang].map(f => <li key={f}>{f}</li>)}
        </ul>
        <Link href="/signup" className={styles.btnPrimary}>{t(T.freeCta)}</Link>
      </div>
      <div className={styles.compare}>
        <h3 className={styles.compareTitle}>{t(T.compare)}</h3>
        <div className={styles.compareScroll}>
          <table className={styles.compareTable}>
            <thead>
              <tr>
                <th scope="col"><span className="sr-only">{lang === 'en' ? 'Feature' : 'Fonctionnalité'}</span></th>
                <th scope="col">{t(FREE_NAME)}</th>
                {(['starter', 'professional', 'enterprise'] as PlanTier[]).map(tier => <th key={tier} scope="col">{PLAN_NAMES[tier][lang]}</th>)}
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON.map(row => (
                <tr key={row.en}>
                  <th scope="row">{row[lang]}</th>
                  {row.values.map((v, i) => <td key={i} className={v.en === '—' ? styles.no : undefined}>{v[lang]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className={styles.fine}>
        {t(T.trialNote)}
        {currency === 'MAD' ? ` ${t(T.madNote)}` : ''}
      </p>
    </div>
  )
}
