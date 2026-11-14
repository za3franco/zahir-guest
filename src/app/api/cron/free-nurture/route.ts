import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { markNurture, NURTURE_TENANT_COLUMNS, nurtureEligible, sendNurtureEmail, sentKeys, type NurtureTenant } from '@/lib/nurtureEmails'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DAY = 86400_000
// Each email has a window after sign-up: a workspace that missed it (task down, deployed later) is not
// caught up weeks afterwards with a message that no longer fits.
const STEPS = [
  { key: 'd2' as const, from: 2, until: 10 },
  { key: 'd14' as const, from: 14, until: 30 },
]

// Daily (vercel.json → crons). Follow-up emails for free "Découverte" workspaces, see src/lib/nurtureEmails.ts.
// The "quota reached" email is not sent here but when a campaign is refused (POST /api/campaigns).
// Vercel sends "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const since = new Date(Date.now() - 31 * DAY).toISOString()
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select(NURTURE_TENANT_COLUMNS)
    .gte('created_at', since)
    .is('nurture_unsubscribed_at', null)
  if (error) {
    console.error('[nurture] tenants query failed:', error.message)
    return NextResponse.json({ error: 'query failed' }, { status: 500 })
  }

  const now = Date.now()
  let sent = 0
  let skipped = 0

  for (const row of tenants ?? []) {
    const t = row as NurtureTenant
    if (!nurtureEligible(t)) continue // paid, pilot, internal, direct contract: nothing to send
    const age = (now - new Date(t.created_at).getTime()) / DAY
    const done = sentKeys(t)
    const step = STEPS.find(s => age >= s.from && age < s.until && !done.includes(s.key))
    if (!step) continue

    // J+2 asks to launch the first audit: pointless if one already exists.
    if (step.key === 'd2') {
      const { count } = await supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id)
      if ((count ?? 0) > 0) {
        await markNurture(supabase, t.id, 'd2')
        skipped++
        continue
      }
    }

    // Mark before sending: if the run is interrupted, the worst case is one email missed, never two sent.
    await markNurture(supabase, t.id, step.key)
    if ((await sendNurtureEmail(supabase, t, step.key)) > 0) sent++
  }

  console.log(`[cron free-nurture] done: ${sent} sent, ${skipped} skipped`)
  return NextResponse.json({ ok: true, sent, skipped })
}
