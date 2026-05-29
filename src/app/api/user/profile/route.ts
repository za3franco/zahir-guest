import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(request: Request) {
  const user = await requireUser()
  const body = await request.json()

  const { name, default_language } = body

  if (name !== undefined && typeof name !== 'string') {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
  }
  if (default_language !== undefined && !['en', 'fr'].includes(default_language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const updates: Record<string, string> = {}
  if (name?.trim()) updates.name = name.trim()
  if (default_language) updates.default_language = default_language

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
