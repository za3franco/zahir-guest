import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const user = await requireUser()
  const { language } = await request.json()

  if (!['en', 'fr'].includes(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  // ← paste your Supabase URL and service role key are already in env
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdmin
    .from('users')
    .update({ default_language: language })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
