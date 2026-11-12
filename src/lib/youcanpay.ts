// YouCan Pay — payments in MAD (ported from za3fran.io lib/youcanpay.js, ycp-1.0.0).
//
// YouCan Pay has no automatic recurring billing: each payment is one order. Zahir Guest therefore sells
// MAD plans as PREPAID PERIODS (a quarter or a year). The period end is stored on the workspace;
// reminder emails go out at D-15 / D-7 / D-1 and access is blocked 7 days after the end (grace period).
//
// Flow:
//   1. /api/billing/youcan/checkout saves a `billing_payments` row (status 'pending'),
//   2. POST {base}/api/tokenize with the private key, order_id = that row's id, amount in centimes,
//   3. the buyer pays on YouCan's page: {base}/payment-form/{token}?lang=fr,
//   4. paid → the buyer comes back to /api/billing/youcan/return?pay=<id>&transaction_id=…,
//      and YouCan may also call /api/webhooks/youcanpay (X-YOUCANPAY-SIGNATURE = HMAC-SHA256 of the body),
//   5. either path re-reads the transaction from YouCan's API, checks status, order id, amount and currency,
//      then claims the row atomically ('pending' → 'paid') so the period is applied exactly once.
//
// Env vars (Vercel): YOUCANPAY_PRIVATE_KEY, YOUCANPAY_SANDBOX ('true' while testing),
//                    MAD_PAYMENT_PROVIDER = 'youcanpay' to switch MAD payments on.

import { createHmac, timingSafeEqual } from 'crypto'

const APP_URL = 'https://youcanpay.com/'
export const TX_STATUS_PAID = 1

export function isSandbox() {
  return String(process.env.YOUCANPAY_SANDBOX || '').toLowerCase() === 'true'
}

function apiBase() {
  return APP_URL + (isSandbox() ? 'sandbox/api/' : 'api/')
}

/** First public IP of the caller (YouCan requires the customer's IP). */
export function clientIp(request: Request) {
  const fwd = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim()
  return fwd || '127.0.0.1'
}

export function paymentFormUrl(tokenId: string, lang: string) {
  const l = ['fr', 'en', 'ar'].includes(lang) ? lang : 'fr'
  return `${APP_URL}${isSandbox() ? 'sandbox/' : ''}payment-form/${encodeURIComponent(tokenId)}?lang=${l}`
}

/** Create a payment token. amountMinor = centimes (2 490 MAD → 249000). */
export async function createToken(opts: {
  orderId: string
  amountMinor: number
  currency?: string
  customerIp: string
  successUrl: string
  errorUrl: string
  customer?: Record<string, string>
  metadata?: Record<string, string>
}): Promise<string> {
  const key = process.env.YOUCANPAY_PRIVATE_KEY
  if (!key) throw new Error('YOUCANPAY_PRIVATE_KEY is not set')
  const res = await fetch(apiBase() + 'tokenize', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      pri_key: key,
      order_id: String(opts.orderId),
      amount: String(opts.amountMinor),
      currency: opts.currency ?? 'MAD',
      customer_ip: opts.customerIp,
      success_url: opts.successUrl,
      error_url: opts.errorUrl,
      customer: opts.customer ?? {},
      metadata: opts.metadata ?? {},
    }),
    cache: 'no-store',
  })
  const body: any = await res.json().catch(() => null)
  const id = body?.token?.id
  if (res.status !== 200 || typeof id !== 'string') {
    throw new Error(`YouCan Pay tokenize failed: ${body?.message ?? `status ${res.status}`}`)
  }
  return id
}

/** Read one transaction from YouCan's API (null when unknown). */
export async function getTransaction(transactionId: string | null | undefined): Promise<any | null> {
  const key = process.env.YOUCANPAY_PRIVATE_KEY
  if (!key || !transactionId) return null
  const url = `${apiBase()}transactions/${encodeURIComponent(transactionId)}?pri_key=${encodeURIComponent(key)}`
  const res = await fetch(url, { headers: { accept: 'application/json' }, cache: 'no-store' })
  if (res.status !== 200) return null
  return res.json().catch(() => null)
}

/** Webhook signature: hex HMAC-SHA256 of the raw body with the private key, compared in constant time. */
export function verifySignature(rawBody: string | Buffer, signature: string | null, key = process.env.YOUCANPAY_PRIVATE_KEY) {
  if (!key || !signature || rawBody == null) return false
  const expected = createHmac('sha256', key).update(rawBody).digest('hex')
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(String(signature).trim().toLowerCase(), 'utf8')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** PHP json_encode style (escaped slashes and non-ASCII), the form YouCan's PHP SDK signs. */
export function phpJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/\//g, '\\/')
    .replace(/[\u007f-￿]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
}

/**
 * Does a YouCan transaction pay this payment row? YouCan takes centimes; its examples are ambiguous about
 * what it sends back, so both centimes and whole dirhams are accepted (only our server creates tokens).
 */
export function transactionMatches(tx: any, payment: { id: string; currency: string; amount_minor: number }) {
  if (!tx || !payment) return { ok: false, reason: 'missing' }
  if (Number(tx.status) !== TX_STATUS_PAID) return { ok: false, reason: 'not_paid' }
  if (String(tx.order_id) !== String(payment.id)) return { ok: false, reason: 'order_mismatch' }
  const cur = String(tx.currency || tx.base_currency || '').toUpperCase()
  if (cur && cur !== String(payment.currency).toUpperCase()) return { ok: false, reason: 'currency_mismatch' }
  const amt = Number(tx.amount)
  const minor = Number(payment.amount_minor)
  if (!(amt === minor || amt === minor / 100)) return { ok: false, reason: 'amount_mismatch' }
  return { ok: true as const }
}

export function txFromEvent(event: any) {
  if (!event || typeof event !== 'object') return null
  const p = event.payload || event
  return p.transaction || null
}
