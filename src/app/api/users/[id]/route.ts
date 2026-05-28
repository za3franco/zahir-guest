import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

async function sendRemovedEmail(name: string, email: string, lang: 'en' | 'fr') {
  const subject = lang === 'en'
    ? 'Your Zahir Guest account has been removed'
    : 'Votre compte Zahir Guest a été supprimé'

  const content = lang === 'en'
    ? `<h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;">Account removed</h1>
       <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Hello ${name},</p>
       <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0;">Your access to Zahir Guest has been removed by your administrator. If you believe this is a mistake, please contact your administrator directly.</p>`
    : `<h1 style="font-size:22px;font-weight:300;color:#F4F1EC;margin:0 0 16px;">Compte supprimé</h1>
       <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0 0 16px;">Bonjour ${name},</p>
       <p style="color:#9B9488;font-size:14px;line-height:1.7;margin:0;">Votre accès à Zahir Guest a été supprimé par votre administrateur. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter votre administrateur directement.</p>`

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;max-width:600px;width:100%;">
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #253549;">
          <span style="font-family:'Cormorant Garamond',serif;font-size:16px;color:#F4F1EC;letter-spacing:0.05em;">Zahir Guest</span>
        </td></tr>
        <tr><td style="padding:32px 40px;">${content}</td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #253549;">
          <p style="margin:0;font-size:11px;color:#9B9488;">Zahir Guest — <a href="https://www.zahirguest.com" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  await fetch('https://api.brevo.com/v3/smtp/email', {
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
      to: [{ name, email }],
      subject,
      htmlContent: html,
    }),
  })
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await requireUser()

  if (params.id === currentUser.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, name, email, default_language')
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Send removal email before deleting
  try {
    await sendRemovedEmail(
      targetUser.name,
      targetUser.email,
      targetUser.default_language === 'en' ? 'en' : 'fr'
    )
  } catch (emailErr) {
    console.error('Removal email error:', emailErr)
  }

  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', params.id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  await supabaseAdmin.auth.admin.deleteUser(params.id)

  return NextResponse.redirect(new URL('/dashboard/users', request.url))
}
