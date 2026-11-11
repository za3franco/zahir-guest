import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole, isViewer } from '@/lib/access'

// Replaces what a client / property / department manager can see.
// Body: { clientIds: string[], propertyIds: string[] } (a client = all its properties, including future ones)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const admin = await requireUser()
  if (!isAdminRole(admin.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const clientIds: string[] = Array.isArray(body?.clientIds) ? body.clientIds.filter((x: unknown) => typeof x === 'string') : []
  const propertyIds: string[] = Array.isArray(body?.propertyIds) ? body.propertyIds.filter((x: unknown) => typeof x === 'string') : []

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: target } = await supabase.from('users').select('id, role').eq('id', params.id).eq('tenant_id', admin.tenant_id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!isViewer(target.role)) {
    return NextResponse.json({ error: 'Access only applies to client, property and department managers.' }, { status: 400 })
  }

  // Keep only ids of this workspace
  const [{ data: okClients }, { data: okProps }] = await Promise.all([
    clientIds.length ? supabase.from('clients').select('id').eq('tenant_id', admin.tenant_id).in('id', clientIds) : Promise.resolve({ data: [] as { id: string }[] }),
    propertyIds.length ? supabase.from('properties').select('id').eq('tenant_id', admin.tenant_id).in('id', propertyIds) : Promise.resolve({ data: [] as { id: string }[] }),
  ])

  const rows = [
    ...(okClients ?? []).map(c => ({ tenant_id: admin.tenant_id, user_id: target.id, client_id: c.id })),
    ...(okProps ?? []).map(p => ({ tenant_id: admin.tenant_id, user_id: target.id, property_id: p.id })),
  ]

  const { error: delErr } = await supabase.from('user_access').delete().eq('user_id', target.id).eq('tenant_id', admin.tenant_id)
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  if (rows.length) {
    const { error } = await supabase.from('user_access').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, clients: okClients?.length ?? 0, properties: okProps?.length ?? 0 })
}
