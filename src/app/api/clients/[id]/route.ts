import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { parseClientBody } from '@/lib/clients'

const ERR = {
  name: { en: 'Client name is required.', fr: 'Le nom du client est requis.' },
  dates: { en: 'The contract end date is before its start date.', fr: 'La date de fin du contrat est antérieure à la date de début.' },
}

// Body: full client form, or { archived: boolean } to archive / restore,
// or { addPropertyIds: string[] } / { removePropertyIds: string[] } to (un)link properties.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: client } = await supabase.from('clients').select('id').eq('id', params.id).eq('tenant_id', user.tenant_id).maybeSingle()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  if (typeof body.archived === 'boolean') {
    const { error } = await supabase.from('clients').update({ is_archived: body.archived }).eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (Array.isArray(body.addPropertyIds) || Array.isArray(body.removePropertyIds)) {
    const add = (body.addPropertyIds ?? []).filter((x: unknown) => typeof x === 'string')
    const remove = (body.removePropertyIds ?? []).filter((x: unknown) => typeof x === 'string')
    if (add.length) {
      const { error } = await supabase.from('properties').update({ client_id: params.id }).eq('tenant_id', user.tenant_id).in('id', add)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (remove.length) {
      const { error } = await supabase.from('properties').update({ client_id: null }).eq('tenant_id', user.tenant_id).eq('client_id', params.id).in('id', remove)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  const parsed = parseClientBody(body)
  if ('error' in parsed) return NextResponse.json({ error: ERR[parsed.error as keyof typeof ERR][lang] }, { status: 400 })
  const { error } = await supabase.from('clients').update(parsed.fields).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
