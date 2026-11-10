import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { checkAndRecordUsage } from '@/lib/helpLimits'
import { SUPPORT_EMAIL } from '@/lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

// Sends a support request by email (reply-to = the user). Used by the Help page and by the AI coach escalation.
export async function POST(request: Request) {
  const user = await requireUser()
  const lang: 'en' | 'fr' = user.default_language === 'en' ? 'en' : 'fr'
  const msg = (en: string, fr: string) => (lang === 'en' ? en : fr)

  const body = await request.json().catch(() => ({}))
  const message = String(body.message ?? '').trim().slice(0, 4000)
  const transcript = String(body.transcript ?? '').trim().slice(0, 6000)
  const page = String(body.page ?? '').slice(0, 300)
  if (!message) return NextResponse.json({ error: msg('Please write your message.', 'Veuillez écrire votre message.') }, { status: 400 })

  if (!(await checkAndRecordUsage(user.id, 'support', 5, 3600_000))) {
    return NextResponse.json({ error: msg('Too many requests. Please try again later.', 'Trop de demandes. Veuillez réessayer plus tard.') }, { status: 429 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, subscription_tier, subscription_status')
    .eq('id', user.tenant_id)
    .maybeSingle()

  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222">
<p><strong>Support request — Zahir Guest</strong></p>
<p>From: ${esc(user.name)} &lt;${esc(user.email)}&gt; (${esc(user.role)}, language ${esc(user.default_language)})<br>
Tenant: ${esc(tenant?.name ?? '?')} — ${esc(tenant?.subscription_tier ?? '?')} / ${esc(tenant?.subscription_status ?? '?')}<br>
Page: ${esc(page || '—')}</p>
<p style="background:#f4f1ec;padding:12px;border-radius:6px">${esc(message)}</p>
${transcript ? `<p style="color:#666"><strong>Assistant conversation</strong><br>${esc(transcript)}</p>` : ''}
</div>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY! },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME ?? 'Zahir Guest',
          email: process.env.BREVO_SENDER_EMAIL ?? 'hello@zahirguest.com',
        },
        to: [{ email: SUPPORT_EMAIL }],
        replyTo: { email: user.email, name: user.name },
        subject: `[Zahir Guest support] ${tenant?.name ?? ''} — ${message.slice(0, 60)}`,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      console.error('[support] brevo error', res.status, await res.text().catch(() => ''))
      return NextResponse.json({ error: msg('Could not send your message. Please email us directly.', `Envoi impossible. Écrivez-nous directement : ${SUPPORT_EMAIL}`) }, { status: 502 })
    }
  } catch (err) {
    console.error('[support] network error', err)
    return NextResponse.json({ error: msg('Could not send your message.', "Envoi impossible.") }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
