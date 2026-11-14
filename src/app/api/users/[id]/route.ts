import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { sendRemovedEmail } from '@/lib/accountEmails'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await requireUser()
  const lang = langOf(currentUser)

  // Only workspace admins remove people
  if (currentUser.role !== 'tenant_admin' && currentUser.role !== 'super_admin') {
    return apiError(lang, 'forbidden')
  }

  if (params.id === currentUser.id) {
    return apiError(lang, 'cannot_remove_self')
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id, name, email, default_language, role')
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .single()

  if (!targetUser) {
    return apiError(lang, 'user_not_found')
  }

  // A platform super admin can only be changed by a super admin
  if (targetUser.role === 'super_admin' && currentUser.role !== 'super_admin') {
    return apiError(lang, 'forbidden')
  }

  // Send removal email before deleting
  try {
    await sendRemovedEmail({
      tenantId: currentUser.tenant_id,
      to: { name: targetUser.name, email: targetUser.email },
      lang: targetUser.default_language === 'en' ? 'en' : 'fr',
      removedBy: currentUser,
    })
  } catch (emailErr) {
    console.error('Removal email error:', emailErr)
  }

  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', params.id)

  if (dbError) {
    return serverError(lang, dbError, 'users/id')
  }

  await supabaseAdmin.auth.admin.deleteUser(params.id)

  return NextResponse.redirect(new URL('/dashboard/users', request.url))
}
