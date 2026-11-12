// Minimal Stripe client using the REST API directly (no npm dependency,
// so nothing to install and no lockfile changes). Server-side only.

import { createHmac, timingSafeEqual } from 'crypto'

const STRIPE_API = 'https://api.stripe.com/v1'

export class StripeError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** Stripe expects form-encoded bodies with bracket notation for nested values. */
export function encodeForm(params: Record<string, unknown>, prefix = ''): string[] {
  const out: string[] = []
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    const name = prefix ? `${prefix}[${key}]` : key
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === 'object') {
          out.push(...encodeForm(item as Record<string, unknown>, `${name}[${i}]`))
        } else {
          out.push(`${encodeURIComponent(`${name}[${i}]`)}=${encodeURIComponent(String(item))}`)
        }
      })
    } else if (typeof value === 'object') {
      out.push(...encodeForm(value as Record<string, unknown>, name))
    } else {
      out.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
    }
  }
  return out
}

export async function stripeRequest<T = any>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  params: Record<string, unknown> = {}
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new StripeError('STRIPE_SECRET_KEY is not configured', 500)

  const body = encodeForm(params).join('&')
  const url = method === 'GET' && body ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: method === 'POST' ? body : undefined,
    cache: 'no-store',
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new StripeError(json?.error?.message ?? `Stripe error ${res.status}`, res.status)
  }
  return json as T
}

/**
 * Verify a webhook payload against the Stripe-Signature header.
 * Header format: t=<timestamp>,v1=<hmac>[,v1=<hmac>...]
 * Returns true only if a v1 signature matches and the timestamp is within tolerance.
 */
export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds = 300
): boolean {
  if (!signatureHeader || !secret) return false

  const parts = signatureHeader.split(',').map(p => p.trim())
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const signatures = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3))
  if (!timestamp || signatures.length === 0) return false

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > toleranceSeconds) return false

  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')

  return signatures.some(sig => {
    try {
      const sigBuf = Buffer.from(sig, 'hex')
      return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf)
    } catch {
      return false
    }
  })
}

/** Active prices for a set of lookup keys (grid v2), as a map lookup_key → price id. */
export async function pricesByLookupKey(keys: string[]): Promise<Map<string, string>> {
  const res: any = await stripeRequest('/prices', 'GET', { lookup_keys: keys, active: true, limit: 20 })
  const out = new Map<string, string>()
  for (const p of res?.data ?? []) if (p.lookup_key) out.set(p.lookup_key, p.id)
  return out
}

/** current_period_end moved onto subscription items in newer Stripe API versions. */
export function subscriptionPeriodEnd(sub: any): string | null {
  const ts = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}
