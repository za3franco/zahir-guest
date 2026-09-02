import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'

export async function POST(request: Request) {
  const user = await requireUser()

  const body = await request.json()
  const message: string = (body.message ?? '').trim()

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: 'Message is too long' }, { status: 400 })
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
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;">
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #253549;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9B9488;">ZAHIR GUEST</p>
            <h1 style="margin:8px 0 0;font-size:22px;font-weight:300;color:#F4F1EC;">New feedback / feature suggestion</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:20px;">
              <tr><td style="padding:6px 0;">
                <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9B9488;">From</span><br>
                <span style="font-size:14px;color:#F4F1EC;">${user.name} (${user.email}) — ${user.role}</span>
              </td></tr>
            </table>
            <div style="background:rgba(200,164,90,0.06);border:1px solid rgba(200,164,90,0.2);border-radius:8px;padding:20px;">
              <p style="margin:0;font-size:14px;color:#F4F1EC;line-height:1.7;">${escaped}</p>
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
      return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 })
    }
  } catch (err) {
    console.error('Brevo feedback network error:', err)
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
