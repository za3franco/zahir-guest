import { apiError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function POST(request: Request) {
  const user = await requireUser()
  const lang = langOf(user)

  const body = await request.json()
  const message: string = (body.message ?? '').trim()

  if (!message) {
    return apiError(lang, 'message_required')
  }
  if (message.length > 4000) {
    return apiError(lang, 'message_too_long')
  }

  const notifyEmail = process.env.FEEDBACK_NOTIFY_EMAIL ?? 'hello@za3fran.io'

  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F4EE;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FFFDF8;border-radius:2px;overflow:hidden;border:1px solid #D8D2C6;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #D8D2C6;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#5E5A52;">ZAHIR GUEST</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:500;color:#14161B;">New feedback / feature suggestion</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
              <tr><td style="padding:6px 0;">
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#5E5A52;">From</span><br>
                <span style="font-size:14px;color:#14161B;">${user.name} (${user.email}) — ${user.role}</span>
              </td></tr>
            </table>
            <div style="background:rgba(138,90,24,0.06);border:1px solid rgba(138,90,24,0.2);border-radius:2px;padding:20px;">
              <p style="margin:0;font-size:14px;color:#14161B;line-height:1.7;">${escaped}</p>
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME ?? 'Zahir Guest',
          email: process.env.BREVO_SENDER_EMAIL ?? 'hello@zahirguest.com',
        },
        to: [{ name: 'Arnaud', email: notifyEmail }],
        replyTo: { name: user.name, email: user.email },
        subject: `Zahir Guest feedback — ${user.name}`,
        htmlContent,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Brevo feedback send error:', err)
      return apiError(lang, 'send_failed')
    }
  } catch (err) {
    console.error('Brevo feedback network error:', err)
    return apiError(lang, 'send_failed')
  }

  return NextResponse.json({ ok: true })
}
