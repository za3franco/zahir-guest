import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribe } from '@/lib/nurtureEmails'

export const dynamic = 'force-dynamic'

// Unsubscribe from the Discovery follow-up emails (link signed per workspace, no login needed).
//   GET  : confirmation page with a button (link scanners in mailboxes open links: they must not unsubscribe)
//   POST : unsubscribes — from that button, or directly from the mail client ("List-Unsubscribe-Post" one click)
// Service emails (invitations, billing, audit notifications) are not affected.

const TEXT = {
  fr: {
    title: 'Conseils Zahir Guest',
    ask: 'Ne plus recevoir les conseils et rappels de l’offre Découverte pour cet espace ? Les emails de service (invitations, facturation, audits) continueront d’arriver.',
    button: 'Me désinscrire',
    done: 'C’est noté : vous ne recevrez plus ces conseils pour cet espace.',
    invalid: 'Ce lien n’est pas valide ou a expiré.',
  },
  en: {
    title: 'Zahir Guest tips',
    ask: 'Stop receiving Discovery plan tips and reminders for this workspace? Service emails (invitations, billing, audits) will still arrive.',
    button: 'Unsubscribe',
    done: 'Done: you will no longer receive these tips for this workspace.',
    invalid: 'This link is not valid or has expired.',
  },
}

function page(lang: 'en' | 'fr', body: string, status = 200) {
  const t = TEXT[lang]
  const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${t.title}</title></head>
<body style="margin:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;color:#9B9488;">
<div style="max-width:520px;margin:64px auto;padding:40px 32px;background:#162236;border:1px solid #253549;border-radius:12px;">
<p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">ZAHIR GUEST</p>
<h1 style="margin:8px 0 24px;font-size:24px;font-weight:300;color:#F4F1EC;">${t.title}</h1>
${body}
<p style="margin:32px 0 0;font-size:12px;"><a href="https://www.zahirguest.com" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a></p>
</div></body></html>`
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

const para = (s: string) => `<p style="font-size:15px;line-height:1.7;margin:0 0 20px;">${s}</p>`

function params(request: Request) {
  const url = new URL(request.url)
  const tenant = url.searchParams.get('t') ?? ''
  const sig = url.searchParams.get('s') ?? ''
  const lang: 'en' | 'fr' = url.searchParams.get('lang') === 'en' || (request.headers.get('accept-language') ?? '').toLowerCase().startsWith('en') ? 'en' : 'fr'
  const valid = /^[0-9a-f-]{36}$/i.test(tenant) && verifyUnsubscribe(tenant, sig)
  return { tenant, sig, lang, valid }
}

export async function GET(request: Request) {
  const { tenant, sig, lang, valid } = params(request)
  const t = TEXT[lang]
  if (!valid) return page(lang, para(t.invalid), 400)
  const action = `/api/email/unsubscribe?t=${encodeURIComponent(tenant)}&s=${encodeURIComponent(sig)}&lang=${lang}`
  return page(
    lang,
    para(t.ask) +
      `<form method="post" action="${action}"><button type="submit" style="background:#C8A45A;color:#0D1B2A;border:0;border-radius:8px;padding:14px 32px;font-size:14px;font-weight:600;letter-spacing:0.04em;cursor:pointer;">${t.button}</button></form>`
  )
}

export async function POST(request: Request) {
  const { tenant, lang, valid } = params(request)
  const t = TEXT[lang]
  if (!valid) return page(lang, para(t.invalid), 400)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await supabase
    .from('tenants')
    .update({ nurture_unsubscribed_at: new Date().toISOString() })
    .eq('id', tenant)
    .is('nurture_unsubscribed_at', null)
  if (error) console.error('[nurture] unsubscribe failed:', error.message)
  return page(lang, para(t.done))
}
