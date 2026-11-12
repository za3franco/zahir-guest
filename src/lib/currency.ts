// Billing currency by visitor location — same rules as za3fran.io (lib/currency.js):
// Morocco → MAD; Europe (EU/EEA + UK, CH, NO, IS, Balkans, Turkey) and North Africa → EUR;
// rest of the world → USD; unknown → EUR. Prices are fixed per currency (no live conversion).
//
// The country comes from Vercel's free `x-vercel-ip-country` header, read by the middleware, which stores
// the detected currency in the `zg_cur_auto` cookie. A manual choice is stored in `zg_cur` and always wins.

export type Currency = 'EUR' | 'USD' | 'MAD'
export const CURRENCIES: Currency[] = ['EUR', 'USD', 'MAD']
/** Manual choice (currency switcher), kept a year. */
export const CURRENCY_COOKIE = 'zg_cur'
/** Detected from the country by the middleware, refreshed daily. */
export const AUTO_CURRENCY_COOKIE = 'zg_cur_auto'

const EUR_COUNTRIES = new Set([
  // EU / EEA
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'LI', 'NO',
  // Rest of Europe
  'GB', 'CH', 'MC', 'SM', 'VA', 'AD', 'AL', 'BA', 'ME', 'MK', 'RS', 'XK', 'MD', 'UA', 'TR',
  // North Africa (except Morocco), as on za3fran.io
  'DZ', 'TN', 'LY', 'EG', 'MR',
])

export function isCurrency(v: unknown): v is Currency {
  return v === 'EUR' || v === 'USD' || v === 'MAD'
}

/**
 * Currency for a two-letter country code.
 * Morocco gets MAD only when MAD payments are switched on (YouCan Pay); until then it pays in EUR.
 */
export function currencyForCountry(country: string | null | undefined, madEnabled = true): Currency {
  const c = String(country ?? '').trim().toUpperCase()
  if (!c) return 'EUR'
  if (c === 'MA') return madEnabled ? 'MAD' : 'EUR'
  if (EUR_COUNTRIES.has(c)) return 'EUR'
  return 'USD'
}

/** Visitor currency from a document.cookie string: manual choice first, then the detected one, else EUR. */
export function currencyFromCookieString(cookie: string | null | undefined): Currency {
  const read = (name: string) => {
    const m = new RegExp(`(?:^|;\\s*)${name}=([A-Z]{3})`).exec(cookie ?? '')
    return m && isCurrency(m[1]) ? m[1] : null
  }
  return read(CURRENCY_COOKIE) ?? read(AUTO_CURRENCY_COOKIE) ?? 'EUR'
}

/** Remember a manual currency choice (client side). */
export function rememberCurrency(c: Currency) {
  document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=31536000; samesite=lax`
}

/** Display a whole amount in a currency: "79 €", "$89", "790 MAD" (FR) / "€79", "$89", "MAD 790" (EN). */
export function formatMoney(amount: number, currency: Currency, lang: 'en' | 'fr'): string {
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const n = amount.toLocaleString(locale, { maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 })
  if (currency === 'MAD') return lang === 'en' ? `MAD ${n}` : `${n} MAD`
  if (currency === 'USD') return `$${n}`
  return lang === 'en' ? `€${n}` : `${n} €`
}

/** Fixed rates used only to add up totals across currencies in the super admin Sales tab. */
export const EUR_PER_UNIT: Record<Currency, number> = { EUR: 1, USD: 0.9, MAD: 0.1 }

/** MAD is paid through YouCan Pay when switched on (same switch as za3fran.io). Server side only. */
export function madPaymentsEnabled(): boolean {
  return String(process.env.MAD_PAYMENT_PROVIDER || '').toLowerCase() === 'youcanpay' && !!process.env.YOUCANPAY_PRIVATE_KEY
}
