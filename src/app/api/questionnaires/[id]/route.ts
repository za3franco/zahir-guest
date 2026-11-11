import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'

// Rename / archive (is_active=false) a workspace-owned questionnaire. Platform templates are read-only.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 120)
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await db.from('questionnaire_templates').update(patch).eq('id', params.id).eq('tenant_id', user.tenant_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
