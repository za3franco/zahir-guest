'use client'

import { type Currency } from '@/lib/currency'
import styles from './pricing.module.css'

const LABEL: Record<Currency, string> = { EUR: '€ EUR', USD: '$ USD', MAD: 'MAD' }

/** Small segmented control to override the currency detected from the visitor's country. */
export default function CurrencySwitcher({
  value,
  onChange,
  madEnabled,
  lang,
  tone = 'dark',
}: {
  value: Currency
  onChange: (c: Currency) => void
  madEnabled: boolean
  lang: 'en' | 'fr'
  tone?: 'dark' | 'light'
}) {
  const options: Currency[] = madEnabled ? ['EUR', 'USD', 'MAD'] : ['EUR', 'USD']
  return (
    <div className={`${styles.switch} ${tone === 'light' ? styles.switchLight : ''}`} role="group" aria-label={lang === 'en' ? 'Currency' : 'Devise'}>
      {options.map(c => (
        <button
          key={c}
          type="button"
          aria-pressed={value === c}
          className={`${styles.switchBtn} ${value === c ? styles.switchBtnActive : ''}`}
          onClick={() => onChange(c)}
        >
          {LABEL[c]}
        </button>
      ))}
    </div>
  )
}
