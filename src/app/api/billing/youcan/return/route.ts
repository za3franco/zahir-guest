import { NextResponse } from 'next/server'
import { appUrl } from '@/lib/billing'
import { confirmYoucanPayment } from '@/lib/youcanBilling'

export const dynamic = 'force-dynamic'

// The buyer comes back from YouCan Pay: /api/billing/youcan/return?pay=<payment id>&transaction_id=…
// The payment is verified against YouCan's API before anything is applied (the URL alone proves nothing).
export async function GET(request: Request) {
  const url = new URL(request.url)
  const pay = url.searchParams.get('pay') ?? ''
  const tx = url.searchParams.get('transaction_id') ?? url.searchParams.get('transaction') ?? null
  const back = `${appUrl()}/dashboard/billing`
  if (!/^[0-9a-f-]{36}$/i.test(pay)) return NextResponse.redirect(`${back}?checkout=cancelled`)
  try {
    const r = await confirmYoucanPayment(pay, tx)
    if (r.ok) return NextResponse.redirect(`${back}?checkout=success`)
    console.warn('[youcan return] not confirmed', pay, r.reason)
    // The webhook may still confirm it a moment later.
    return NextResponse.redirect(`${back}?checkout=pending`)
  } catch (err) {
    console.error('[youcan return]', err)
    return NextResponse.redirect(`${back}?checkout=pending`)
  }
}
