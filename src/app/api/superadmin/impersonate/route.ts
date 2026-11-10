import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { IMPERSONATE_COOKIE, requireSuperAdmin } from '@/lib/auth'
import { logAdminAction } from '@/lib/audit'

export const dynamic = 'force-dynamic'

// Start "view as tenant" (session cookie, 4 hours)
export async function POST(request: Request) {
  const admin = await requireSuperAdmin()
  const { tenantId } = await request.json().catch(() => ({}))
  if (typeof tenantId !== 'string' || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenant } = await supabase.from('tenants').select('id, name').eq('id', tenantId).maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  cookies().set(IMPERSONATE_COOKIE, tenantId, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 4 * 3600,
  })
  await logAdminAction(admin.id, 'impersonate_start', tenantId, { tenant: tenant.name })
  return NextResponse.json({ ok: true })
}

// Stop "view as"
export async function DELETE() {
  const admin = await requireSuperAdmin()
  const current = cookies().get(IMPERSONATE_COOKIE)?.value
  cookies().set(IMPERSONATE_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 })
  await logAdminAction(admin.id, 'impersonate_stop', current ?? null)
  return NextResponse.json({ ok: true })
}
