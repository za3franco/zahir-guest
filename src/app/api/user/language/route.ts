import { apiError, serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const user = await requireUser()
  const lang = langOf(user)
  const { language } = await request.json()

  if (!['en', 'fr'].includes(language)) {
    return apiError(lang, 'invalid_language')
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
    return serverError(lang, error, 'user/language')
  }

  return NextResponse.json({ ok: true })
}
