import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { parseClientBody } from '@/lib/clients'

const ERR = {
  name: { en: 'Client name is required.', fr: 'Le nom du client est requis.' },
  dates: { en: 'The contract end date is before its start date.', fr: 'La date de fin du contrat est antérieure à la date de début.' },
}

export async function POST(request: Request) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  const lang = user.default_language === 'en' ? 'en' : 'fr'

  const parsed = parseClientBody(await request.json().catch(() => null))
  if ('error' in parsed) return NextResponse.json({ error: ERR[parsed.error as keyof typeof ERR][lang] }, { status: 400 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from('clients')
    .insert({ tenant_id: user.tenant_id, ...parsed.fields })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id })
}
