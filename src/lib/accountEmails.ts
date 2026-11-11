// Emails about the workspace itself (suspension / reactivation by the platform team).
// Sent to every tenant admin of the workspace, each in their own language.

import type { SupabaseClient } from '@supabase/supabase-js'
import { SUPPORT_EMAIL, SITE_URL } from '@/lib/site'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function layout(title: string, paragraphs: string[], cta?: { href: string; label: string }, lang: 'en' | 'fr' = 'fr') {
  const body = paragraphs
    .map(p => `<p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">${p}</p>`)
    .join('')
  const button = cta
    ? `<table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="background:#C8A45A;border-radius:8px;">
        <a href="${cta.href}" style="display:inline-block;padding:14px 32px;color:#0D1B2A;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">${cta.label}</a>
      </td></tr></table>`
    : ''
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;max-width:600px;width:100%;">
      <tr><td style="padding:40px 48px 32px;border-bottom:1px solid #253549;">
        <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9B9488;">ZAHIR GUEST</p>
        <h1 style="margin:8px 0 0;font-size:26px;font-weight:300;color:#F4F1EC;line-height:1.3;">${title}</h1>
      </td></tr>
      <tr><td style="padding:32px 48px;">${body}${button}</td></tr>
      <tr><td style="padding:24px 48px;border-top:1px solid #253549;">
        <p style="margin:0;font-size:12px;color:#9B9488;line-height:1.6;">
          Zahir Guest — ${lang === 'en' ? 'Mystery Guest Audit Platform' : "Plateforme d'audit mystère"}<br>
          <a href="${SITE_URL}" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a>
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`
}

async function send(to: { name: string; email: string }, subject: string, htmlContent: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY! },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME ?? 'Zahir Guest',
          email: process.env.BREVO_SENDER_EMAIL ?? 'hello@zahirguest.com',
        },
        replyTo: { email: SUPPORT_EMAIL },
        to: [to],
        subject,
        htmlContent,
      }),
    })
    if (!res.ok) console.error('[accountEmails] send failed:', res.status, await res.text().catch(() => ''))
    return res.ok
  } catch (err) {
    console.error('[accountEmails] network error:', err)
    return false
  }
}

/** Notifies every admin of the workspace that it was suspended or reactivated. Returns the number of emails sent. */
export async function sendAccountStatusEmails(
  supabase: SupabaseClient<any, any, any>,
  tenantId: string,
  kind: 'suspended' | 'reactivated'
): Promise<number> {
  const [{ data: tenant }, { data: admins }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', tenantId).maybeSingle(),
    supabase.from('users').select('name, email, default_language').eq('tenant_id', tenantId).eq('role', 'tenant_admin'),
  ])
  const company = esc(tenant?.name ?? 'Zahir Guest')
  let sent = 0

  for (const a of admins ?? []) {
    if (!a.email) continue
    const en = a.default_language === 'en'
    const lang: 'en' | 'fr' = en ? 'en' : 'fr'
    const hello = en ? `Hello ${esc(a.name ?? '')},` : `Bonjour ${esc(a.name ?? '')},`
    const contact = `<a href="mailto:${SUPPORT_EMAIL}" style="color:#C8A45A;">${SUPPORT_EMAIL}</a>`

    const subject =
      kind === 'suspended'
        ? en ? `Your ${tenant?.name ?? 'Zahir Guest'} workspace has been suspended` : `Votre espace ${tenant?.name ?? 'Zahir Guest'} a été suspendu`
        : en ? `Your ${tenant?.name ?? 'Zahir Guest'} workspace is active again` : `Votre espace ${tenant?.name ?? 'Zahir Guest'} est de nouveau actif`

    const html =
      kind === 'suspended'
        ? layout(
            en ? 'Workspace suspended' : 'Espace suspendu',
            [
              hello,
              en
                ? `Access to the <strong style="color:#F4F1EC;">${company}</strong> workspace on Zahir Guest has been suspended by our team. Your users can no longer sign in to it for now. Your data is kept and nothing has been deleted.`
                : `L'accès à l'espace <strong style="color:#F4F1EC;">${company}</strong> sur Zahir Guest a été suspendu par notre équipe. Vos utilisateurs ne peuvent plus s'y connecter pour le moment. Vos données sont conservées et rien n'a été supprimé.`,
              en
                ? `If you think this is a mistake or would like to restore access, reply to this email or write to ${contact}.`
                : `Si vous pensez qu'il s'agit d'une erreur ou souhaitez rétablir l'accès, répondez à cet email ou écrivez à ${contact}.`,
            ],
            undefined,
            lang
          )
        : layout(
            en ? 'Workspace reactivated' : 'Espace réactivé',
            [
              hello,
              en
                ? `Good news: access to the <strong style="color:#F4F1EC;">${company}</strong> workspace has been restored. You and your users can sign in again as usual.`
                : `Bonne nouvelle : l'accès à l'espace <strong style="color:#F4F1EC;">${company}</strong> est rétabli. Vous et vos utilisateurs pouvez de nouveau vous connecter normalement.`,
            ],
            { href: `${SITE_URL}/login`, label: en ? 'Sign in →' : 'Se connecter →' },
            lang
          )

    if (await send({ name: a.name ?? a.email, email: a.email }, subject, html)) sent++
  }
  return sent
}
