import { NextResponse } from 'next/server'
import { confirmYoucanPayment } from '@/lib/youcanBilling'
import { phpJson, txFromEvent, verifySignature } from '@/lib/youcanpay'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YouCan Pay events (MAD). X-YOUCANPAY-SIGNATURE must be the HMAC-SHA256 of the raw body keyed with the
// private key. 'transaction.paid' → re-read from YouCan's API, checked, applied once (see lib/youcanBilling).
// Webhook URL to set in YouCan Pay: https://www.zahirguest.com/api/webhooks/youcanpay
export async function POST(request: Request) {
  const raw = await request.text()
  let event: any = null
  try { event = JSON.parse(raw) } catch { event = null }

  const sig = request.headers.get('x-youcanpay-signature')
  const signed = verifySignature(raw, sig) || (event && verifySignature(phpJson(event), sig))
  if (!signed) return NextResponse.json({ error: 'invalid signature' }, { status: 403 })
  if (!event) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const name = event.event_name || event.name || ''
  if (name !== 'transaction.paid') return NextResponse.json({ received: true, skipped: true })

  const tx = txFromEvent(event)
  const orderId = String(tx?.order_id ?? '')
  // Orders from za3fran.io share the YouCan account: ignore anything that is not one of our payment ids.
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ received: true, skipped: true })

  try {
    const r = await confirmYoucanPayment(orderId, tx?.id ?? null, tx)
    if (!r.ok && r.reason !== 'unknown_payment') console.warn('[youcan webhook]', orderId, r.reason)
    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[youcan webhook]', err)
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
