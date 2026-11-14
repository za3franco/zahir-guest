import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { checkPlanLimit } from '@/lib/limits'
import { ASSIGNABLE_ROLES, ROLE_LABELS, isAdminRole } from '@/lib/access'
import { sendInvitationEmail } from '@/lib/accountEmails'

export async function POST(request: Request) {
  const currentUser = await requireUser()
  const lang = langOf(currentUser)

  // Only workspace admins invite people, and never as super admin
  if (!isAdminRole(currentUser.role)) {
    return apiError(lang, 'forbidden')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const inviterLang = currentUser.default_language === 'en' ? 'en' : 'fr'
  const limit = await checkPlanLimit(currentUser.tenant_id, 'users', inviterLang)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message, code: limit.code }, { status: 402 })
  }

  const body = await request.json()
  const { name, role, default_language } = body
  // Stored in lower case, like signup: the "forgot password" route looks accounts up by exact address
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''

  if (!name || !email || !role) {
    return apiError(lang, 'missing_fields')
  }
  if (!(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
    return apiError(lang, 'invalid_role')
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
    // The most common cause: this email already has an account
    if (authError.code === 'email_exists' || authError.code === 'user_already_exists' || /already.*registered/i.test(authError.message)) {
      return apiError(lang, 'email_exists')
    }
    return serverError(lang, authError, 'users/invite')
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
    if (dbError.code === '23505') return apiError(lang, 'email_exists')
    return serverError(lang, dbError, 'users/invite')
  }

  // 3. Generate a password reset link — this is the "set your password" link
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.zahirguest.com'
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'recovery',
  email,
  options: { redirectTo: `${appUrl}/auth/set-password` },
})

  if (linkError || !linkData) {
  console.error('Link generation error:', JSON.stringify(linkError))
  // User was created — still return success, admin can resend manually
  return NextResponse.json({ ok: true, userId, warning: 'User created but email failed' })
}

  const inviteLink = linkData.properties?.action_link
  if (!inviteLink) {
    console.error('Link generation error: no action link returned')
    return NextResponse.json({ ok: true, userId, warning: 'User created but email failed' })
  }

  // 4. Send the invitation by Brevo, in the look of the workspace (name, logo, colour when white label)
  const emailLang: 'en' | 'fr' = default_language === 'en' ? 'en' : 'fr'
  const sent = await sendInvitationEmail({
    tenantId: currentUser.tenant_id,
    to: { name: String(name), email },
    lang: emailLang,
    roleName: ROLE_LABELS[role]?.[emailLang] ?? role,
    inviter: currentUser,
    link: inviteLink,
  })
  if (!sent) console.error('[users/invite] invitation email not sent for user', userId)

  return NextResponse.json({ ok: true, userId })
}
