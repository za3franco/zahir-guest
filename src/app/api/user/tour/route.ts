import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'

// Marks the first-login guided tour as completed (or skipped) for the signed-in user.
export async function POST() {
  const user = await requireUser()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  // While a super admin is "viewing as" a tenant, never flip anything on the real profile's behalf
  if (user.impersonating_tenant_id) return NextResponse.json({ ok: true })
  const { error } = await supabase.from('users').update({ tour_completed: true }).eq('id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
