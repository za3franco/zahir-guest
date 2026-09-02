import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const user = await requireUser()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()

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
      property_manager_user_id: body.property_manager_user_id ?? null,
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
