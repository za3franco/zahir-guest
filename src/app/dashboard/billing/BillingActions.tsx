'use client'

import { useState } from 'react'
import { formatMoney, rememberCurrency, type Currency } from '@/lib/currency'
import { PLAN_FEATURES, PLAN_NAMES, PRICE_GRID, quote, TIER_RULES, type BillingInterval, type PlanTier } from '@/lib/plans'
import CurrencySwitcher from '@/components/pricing/CurrencySwitcher'
import styles from './billing.module.css'

type Lang = 'en' | 'fr'

const T = {
  monthly: { en: 'Monthly', fr: 'Mensuel' },
  quarterly: { en: 'Quarterly', fr: 'Trimestriel' },
  annual: { en: 'Annual', fr: 'Annuel' },
  twoFree: { en: '2 months free', fr: '2 mois offerts' },
  perMonth: { en: '/ month', fr: '/ mois' },
  billedYearly: { en: 'billed yearly', fr: 'facturés par an' },
  billedQuarter: { en: 'paid per quarter', fr: 'payés par trimestre' },
  properties: { en: 'Properties', fr: 'Établissements' },
  choose: { en: 'Choose this plan', fr: 'Choisir ce forfait' },
  update: { en: 'Update my subscription', fr: 'Modifier mon abonnement' },
  current: { en: 'Current plan', fr: 'Forfait actuel' },
  renew: { en: 'Renew', fr: 'Renouveler' },
  switchNow: { en: 'Switch to this plan', fr: 'Passer à ce forfait' },
  saving: { en: 'Please wait…', fr: 'Un instant…' },
  confirmTitle: { en: 'Confirm the plan change', fr: 'Confirmer le changement d’offre' },
  confirmBody: {
    en: 'takes effect immediately. The difference is prorated and added to your next invoice.',
    fr: 'prend effet immédiatement. La différence est calculée au prorata et ajoutée à votre prochaine facture.',
  },
  confirmYes: { en: 'Confirm the change', fr: 'Confirmer le changement' },
  confirmNo: { en: 'Cancel', fr: 'Annuler' },
  updated: { en: 'Subscription updated. The change is prorated on your next invoice.', fr: 'Abonnement modifié. La différence est calculée au prorata sur votre prochaine facture.' },
  demo: { en: 'Book a call', fr: 'Prendre rendez-vous' },
  entFor: { en: '50 properties and more, annual contract, local invoicing.', fr: '50 établissements et plus, contrat annuel, facturation locale.' },
  from: { en: 'From', fr: 'À partir de' },
  manage: { en: 'Invoices and payment method', fr: 'Factures et moyen de paiement' },
  redirecting: { en: 'Redirecting…', fr: 'Redirection…' },
  generic: { en: 'Something went wrong. Please try again.', fr: "Une erreur s'est produite. Veuillez réessayer." },
  lockedCurrency: { en: 'Billing currency', fr: 'Devise de facturation' },
  madPay: { en: 'Card payment in dirhams through YouCan Pay. Prepaid: no automatic renewal, we remind you before the end.', fr: 'Paiement par carte en dirhams via YouCan Pay. Prépayé : pas de renouvellement automatique, nous vous prévenons avant la fin.' },
  newPeriod: { en: 'A new period starts today.', fr: 'Une nouvelle période démarre aujourd’hui.' },
  extendsTo: { en: 'Extends your access to', fr: 'Prolonge votre accès jusqu’au' },
  addTitle: { en: 'Add properties to the current period', fr: 'Ajouter des établissements à la période en cours' },
  addNote: { en: 'Charged for the days left in your prepaid period.', fr: 'Facturés pour les jours restants de votre période prépayée.' },
  add: { en: 'Pay and add', fr: 'Payer et ajouter' },
  hotelMax: { en: '2 properties maximum on this plan', fr: '2 établissements maximum sur ce forfait' },
}

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

export function ManageBillingButton({ lang, label, primary }: { lang: Lang; label?: string; primary?: boolean }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function open() {
    setLoading(true)
    setError(null)
    try {
      const { ok, data } = await postJson('/api/billing/portal')
      if (ok && data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error ?? T.generic[lang])
    } catch {
      setError(T.generic[lang])
    }
    setLoading(false)
  }
  return (
    <div>
      <button type="button" className={`btn ${primary ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={open} disabled={loading}>
        {loading ? T.redirecting[lang] : label ?? T.manage[lang]}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className={styles.stepper}>
      <span>{label}</span>
      <div className={styles.stepperCtl}>
        <button type="button" aria-label="−" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label="+" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}

export interface BillingState {
  mode: 'none' | 'stripe' | 'youcan'
  currentTier: string | null
  currentInterval: string | null
  currentProperties: number
  propertiesUsed: number
  periodEnd: string | null
  youcanRunning: boolean
  extraHeadroom: number
}

export function BillingPlans({
  lang,
  initialCurrency,
  currencyLocked,
  madEnabled,
  state,
}: {
  lang: Lang
  initialCurrency: Currency
  currencyLocked: boolean
  madEnabled: boolean
  state: BillingState
}) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency)
  const isMad = currency === 'MAD'
  const defaultInterval: BillingInterval =
    state.currentInterval === 'annual' ? 'annual' : isMad ? 'quarterly' : 'monthly'
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval)
  const iv: BillingInterval = isMad ? (interval === 'monthly' ? 'quarterly' : interval) : interval === 'quarterly' ? 'monthly' : interval
  const startProps = (tier: PlanTier) =>
    state.currentTier === tier
      ? Math.max(TIER_RULES[tier].includedProperties, state.currentProperties)
      : Math.max(TIER_RULES[tier].includedProperties, Math.min(TIER_RULES[tier].includedProperties + TIER_RULES[tier].maxExtraProperties, state.propertiesUsed))
  const [props, setProps] = useState<Record<'starter' | 'professional', number>>({ starter: startProps('starter'), professional: startProps('professional') })
  const [addCount, setAddCount] = useState(1)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmChange, setConfirmChange] = useState<null | { tier: 'starter' | 'professional'; interval: string; properties: number; text: string }>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const t = (k: { en: string; fr: string }) => k[lang]
  const money = (n: number) => formatMoney(n, currency, lang)
  const dateFmt = (d: Date) => d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  function pickCurrency(c: Currency) {
    setCurrency(c)
    rememberCurrency(c)
    setInterval(c === 'MAD' ? (interval === 'annual' ? 'annual' : 'quarterly') : interval === 'annual' ? 'annual' : 'monthly')
  }

  async function go(key: string, url: string, body: unknown) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      const { ok, data } = await postJson(url, body)
      if (ok && data.url) {
        window.location.href = data.url
        return
      }
      if (ok && data.ok) {
        setNotice(t(T.updated))
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setError(data.error ?? t(T.generic))
      }
    } catch {
      setError(t(T.generic))
    }
    setBusy(null)
  }

  const card = (tier: 'starter' | 'professional') => {
    const r = TIER_RULES[tier]
    const n = props[tier]
    const q = quote(tier, currency, iv, n)
    const isCurrentPlan = state.currentTier === tier && state.mode !== 'none'
    // Only a Stripe subscription can be 'unchanged'; a prepaid MAD period can always be renewed.
    const sameAsNow = state.mode === 'stripe' && isCurrentPlan && n === state.currentProperties && (state.currentInterval ?? 'monthly') === iv
    const tooFew = n < state.propertiesUsed

    let label = t(T.choose)
    let action: () => void = () => go(tier, '/api/billing/checkout', { tier, interval: iv, properties: n, currency })
    let hint: string | null = null
    if (state.mode === 'stripe') {
      label = sameAsNow ? t(T.current) : t(T.update)
      action = () => setConfirmChange({
        tier, interval: iv, properties: n,
        text: `${PLAN_NAMES[tier][lang]}, ${n} ${lang === 'en' ? (n > 1 ? 'properties' : 'property') : (n > 1 ? 'établissements' : 'établissement')}, ${money(q.total)} ${iv === 'annual' ? (lang === 'en' ? 'per year' : 'par an') : (lang === 'en' ? 'per month' : 'par mois')}`,
      })
    } else if (state.mode === 'youcan' && state.youcanRunning) {
      if (state.currentTier === tier && state.periodEnd) {
        label = t(T.renew)
        const months = iv === 'annual' ? 12 : 3
        const end = new Date(state.periodEnd)
        end.setMonth(end.getMonth() + months)
        hint = `${t(T.extendsTo)} ${dateFmt(end)}.`
      } else {
        label = t(T.switchNow)
        hint = t(T.newPeriod)
      }
    }

    return (
      <div key={tier} className={`${styles.planCard} ${isCurrentPlan ? styles.planCardCurrent : ''}`}>
        <h3 className={styles.planName}>{PLAN_NAMES[tier][lang]}</h3>
        <p className={styles.planPrice}>
          {money(Math.round(q.perMonth))}
          <span className={styles.planPer}> {t(T.perMonth)}</span>
        </p>
        <p className={styles.planNote}>
          {iv === 'annual' ? `${money(q.total)} ${t(T.billedYearly)}` : iv === 'quarterly' ? `${money(q.total)} ${t(T.billedQuarter)}` : ' '}
        </p>
        <Stepper
          label={t(T.properties)}
          value={n}
          min={r.includedProperties}
          max={r.includedProperties + r.maxExtraProperties}
          onChange={v => setProps(p => ({ ...p, [tier]: v }))}
        />
        <p className={styles.planNote}>
          {tier === 'starter'
            ? `${t(T.hotelMax)} · +${money(PRICE_GRID[currency].starter.extra!)}`
            : `${lang === 'en' ? '5 included' : '5 inclus'} · +${money(PRICE_GRID[currency].professional.extra!)} ${lang === 'en' ? 'each' : 'chacun'}`}
        </p>
        <ul className={styles.features}>
          {PLAN_FEATURES[tier][lang].slice(1).map(f => <li key={f}>{f}</li>)}
        </ul>
        <button
          type="button"
          className={`btn ${sameAsNow ? 'btn-secondary' : 'btn-primary'} btn-sm w-full`}
          disabled={busy !== null || sameAsNow || tooFew}
          onClick={action}
        >
          {busy === tier ? t(T.saving) : label}
        </button>
        {tooFew && (
          <p className={styles.planNote}>
            {lang === 'en' ? `You use ${state.propertiesUsed} properties.` : `Vous utilisez ${state.propertiesUsed} établissements.`}
          </p>
        )}
        {hint && !tooFew && <p className={styles.planNote}>{hint}</p>}
      </div>
    )
  }

  // Extra properties during a running MAD period (prorated by day, same formula as the server).
  const extraUnit = state.currentTier && (state.currentTier === 'starter' || state.currentTier === 'professional') ? PRICE_GRID.MAD[state.currentTier].extra : null
  const daysLeft = state.periodEnd ? Math.max(1, Math.ceil((new Date(state.periodEnd).getTime() - Date.now()) / 86400_000)) : 0
  const addPrice = extraUnit ? Math.max(1, Math.round(extraUnit * addCount * (daysLeft / 30.44))) : 0

  return (
    <div>
      <div className={styles.controls}>
        <div className={styles.toggle} role="group">
          {(isMad ? (['quarterly', 'annual'] as BillingInterval[]) : (['monthly', 'annual'] as BillingInterval[])).map(v => (
            <button key={v} type="button" className={`${styles.toggleBtn} ${iv === v ? styles.toggleBtnActive : ''}`} onClick={() => setInterval(v)}>
              {t(T[v])} {v === 'annual' && <span className={styles.saveBadge}>{t(T.twoFree)}</span>}
            </button>
          ))}
        </div>
        {currencyLocked ? (
          <span className={styles.muted}>{t(T.lockedCurrency)} : {currency}</span>
        ) : (
          <CurrencySwitcher value={currency} onChange={pickCurrency} madEnabled={madEnabled} lang={lang} />
        )}
      </div>
      {isMad && <p className={styles.muted} style={{ marginBottom: 'var(--space-4)' }}>{t(T.madPay)}</p>}

      <div className={styles.plansGrid}>
        {card('starter')}
        {card('professional')}
        <div className={styles.planCard}>
          <h3 className={styles.planName}>{PLAN_NAMES.enterprise[lang]}</h3>
          <p className={styles.planPrice}>
            <span className={styles.planPer}>{t(T.from)} </span>
            {money(PRICE_GRID[currency].enterprise.base)}
            <span className={styles.planPer}> {t(T.perMonth)}</span>
          </p>
          <p className={styles.planNote}>{t(T.entFor)}</p>
          <ul className={styles.features}>
            {PLAN_FEATURES.enterprise[lang].map(f => <li key={f}>{f}</li>)}
          </ul>
          <a className="btn btn-secondary btn-sm w-full" href="mailto:hello@za3fran.io?subject=Zahir%20Guest%20Enterprise">{t(T.demo)}</a>
        </div>
      </div>

      {state.mode === 'youcan' && state.youcanRunning && extraUnit && state.extraHeadroom > 0 && (
        <div className={styles.addBox}>
          <div>
            <h3 className={styles.addTitle}>{t(T.addTitle)}</h3>
            <p className={styles.muted}>{t(T.addNote)}</p>
          </div>
          <Stepper label={t(T.properties)} value={addCount} min={1} max={state.extraHeadroom} onChange={setAddCount} />
          <button type="button" className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => go('extra', '/api/billing/checkout', { kind: 'extra', count: addCount, currency: 'MAD' })}>
            {busy === 'extra' ? t(T.saving) : `${t(T.add)} · ${formatMoney(addPrice, 'MAD', lang)}`}
          </button>
        </div>
      )}

      {confirmChange && (
        <div className={styles.planCard} role="alertdialog" aria-labelledby="confirm-change-title" style={{ marginTop: 16 }}>
          <h3 id="confirm-change-title" className={styles.planName}>{t(T.confirmTitle)}</h3>
          <p className={styles.planNote}>
            <strong>{confirmChange.text}</strong> {t(T.confirmBody)}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" disabled={busy !== null}
              onClick={() => { const c = confirmChange; setConfirmChange(null); void go(c.tier, '/api/billing/change', { tier: c.tier, interval: c.interval, properties: c.properties }) }}>
              {t(T.confirmYes)}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmChange(null)}>{t(T.confirmNo)}</button>
          </div>
        </div>
      )}

      {notice && <p className={styles.success}>{notice}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
