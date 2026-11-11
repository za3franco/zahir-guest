import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { checkPlanLimit } from '@/lib/limits'

export async function POST(request: Request) {
  const user = await requireUser()

  // Only workspace admins manage properties
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const limit = await checkPlanLimit(user.tenant_id, 'properties', lang)
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message, code: limit.code }, { status: 402 })
  }

  const body = await request.json()

  // The client must belong to this workspace
  let clientId: string | null = body.client_id || null
  if (clientId) {
    const { data: c } = await supabaseAdmin.from('clients').select('id').eq('id', clientId).eq('tenant_id', user.tenant_id).maybeSingle()
    if (!c) clientId = null
  }

  const { data, error } = await supabaseAdmin
    .from('properties')
    .insert({
      tenant_id: user.tenant_id,
      name: body.name,
      category: body.category,
      type: body.type,
      city: body.city ?? null,
      country: body.country,
      contact_name: body.contact_name ?? null,
      contact_email: body.contact_email ?? null,
      client_id: clientId,
      region: body.region ?? null,
      phone: body.phone ?? null,
      website: body.website ?? null,
      rooms_count: body.rooms_count ?? null,
      gm_name: body.gm_name ?? null,
      official_star_rating: body.official_star_rating ?? null,
      is_archived: false,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}
