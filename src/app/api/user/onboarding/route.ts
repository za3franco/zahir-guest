import { serverError, langOf } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'

// Dismisses the onboarding checklist for the signed-in user.
export async function POST() {
  const user = await requireUser()
  const lang = langOf(user)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { error } = await supabase.from('users').update({ onboarding_dismissed: true }).eq('id', user.id)
  if (error) return serverError(lang, error, 'user/onboarding')
  return NextResponse.json({ ok: true })
}
