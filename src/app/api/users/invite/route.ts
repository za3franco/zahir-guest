import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const currentUser = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const { name, email, role, default_language } = body

  if (!name || !email || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // 1. Create auth user with a random password (they'll set their own via the email link)
  const tempPassword = crypto.randomUUID() + crypto.randomUUID()

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // skip email confirmation — we handle it
    user_metadata: { name, role, tenant_id: currentUser.tenant_id },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  const userId = authData.user.id

  // 2. Insert into users table
  const { error: dbError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      tenant_id: currentUser.tenant_id,
      email,
      name,
      role,
      default_language: default_language ?? 'fr',
    })

  if (dbError) {
    // Rollback auth user if DB insert fails
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // 3. Generate a password reset link — this is the "set your password" link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl}/dashboard` },
  })

  if (linkError || !linkData) {
    console.error('Link generation error:', linkError)
    return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
  }

  const inviteLink = linkData.properties?.action_link

  // 4. Send branded Brevo email
  const lang = default_language === 'en' ? 'en' : 'fr'

  const roleLabel: Record<string, { en: string; fr: string }> = {
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    property_manager: { en: 'Property Manager', fr: "Directeur d'établissement" },
    tenant_admin: { en: 'Administrator', fr: 'Administrateur' },
  }
  const roleName = roleLabel[role]?.[lang] ?? role

  const subject = lang === 'en'
    ? 'You have been invited to Zahir Guest'
    : 'Vous avez été invité sur Zahir Guest'

  const htmlContent = lang === 'en' ? `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;">
        <tr>
          <td style="padding:40px 48px 32px;border-bottom:1px solid #253549;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9B9488;">ZAHIR GUEST</p>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:300;color:#F4F1EC;line-height:1.3;">You have been invited</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 48px;">
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">Hello ${name},</p>
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">
              <strong style="color:#F4F1EC;">${currentUser.name}</strong> has invited you to join <strong style="color:#F4F1EC;">Zahir Guest</strong> as <strong style="color:#C8A45A;">${roleName}</strong>.
            </p>
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 32px;">
              Click the button below to set your password and access the platform.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#C8A45A;border-radius:8px;">
                  <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;color:#0D1B2A;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">
                    Set my password →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9B9488;font-size:13px;line-height:1.6;margin:0;">
              This link expires in 24 hours. If you did not expect this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #253549;">
            <p style="margin:0;font-size:12px;color:#9B9488;line-height:1.6;">
              Zahir Guest — Mystery Guest Audit Platform<br>
              <a href="https://www.zahirguest.com" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>` : `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0D1B2A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0D1B2A;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#162236;border-radius:12px;overflow:hidden;border:1px solid #253549;">
        <tr>
          <td style="padding:40px 48px 32px;border-bottom:1px solid #253549;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9B9488;">ZAHIR GUEST</p>
            <h1 style="margin:8px 0 0;font-size:28px;font-weight:300;color:#F4F1EC;line-height:1.3;">Vous avez été invité</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 48px;">
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">Bonjour ${name},</p>
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 20px;">
              <strong style="color:#F4F1EC;">${currentUser.name}</strong> vous a invité à rejoindre <strong style="color:#F4F1EC;">Zahir Guest</strong> en tant que <strong style="color:#C8A45A;">${roleName}</strong>.
            </p>
            <p style="color:#9B9488;font-size:15px;line-height:1.7;margin:0 0 32px;">
              Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à la plateforme.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#C8A45A;border-radius:8px;">
                  <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;color:#0D1B2A;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.04em;">
                    Définir mon mot de passe →
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#9B9488;font-size:13px;line-height:1.6;margin:0;">
              Ce lien expire dans 24 heures. Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 48px;border-top:1px solid #253549;">
            <p style="margin:0;font-size:12px;color:#9B9488;line-height:1.6;">
              Zahir Guest — Plateforme d'audit mystère<br>
              <a href="https://www.zahirguest.com" style="color:#C8A45A;text-decoration:none;">zahirguest.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
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
      htmlContent,
    }),
  })

  if (!brevoRes.ok) {
    const brevoError = await brevoRes.json()
    console.error('Brevo error:', brevoError)
  }

  return NextResponse.json({ ok: true })
}
