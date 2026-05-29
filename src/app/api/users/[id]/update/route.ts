import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await requireUser()

  if (currentUser.role !== 'tenant_admin' && currentUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify target user is in same tenant
  const { data: targetUser } = await supabaseAdmin
    .from('users')
    .select('id, tenant_id')
    .eq('id', params.id)
    .eq('tenant_id', currentUser.tenant_id)
    .single()

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const body = await request.json()
  const updates: Record<string, string> = {}

  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.role && ['auditor', 'property_manager', 'tenant_admin'].includes(body.role)) {
    updates.role = body.role
  }
  if (body.default_language && ['en', 'fr'].includes(body.default_language)) {
    updates.default_language = body.default_language
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
