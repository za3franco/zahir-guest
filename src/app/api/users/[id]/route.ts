import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await requireUser()

  // Prevent self-deletion
  if (params.id === currentUser.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify the user belongs to this tenant
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Remove from users table
  const { error: dbError } = await supabaseAdmin
    .from('users')
    .delete()
    .eq('id', params.id)

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Remove from Supabase auth
  await supabaseAdmin.auth.admin.deleteUser(params.id)

  return NextResponse.redirect(new URL('/dashboard/users', request.url))
}
