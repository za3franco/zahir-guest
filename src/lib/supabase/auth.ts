import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { User } from '@/types'

function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    // Base64url decode the payload (middle part)
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export async function requireUser(): Promise<User> {
  // Create inside function — avoids build-time env var errors
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  // Supabase SSR stores the session as JSON in cookies named:
  // sb-<ref>-auth-token  (small sessions)
  // sb-<ref>-auth-token.0, .1 ... (chunked large sessions)
  const authCookies = allCookies
    .filter(c => /sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  const raw = authCookies.map(c => c.value).join('')

  if (!raw) {
    console.log('[auth] no session cookie. Available:', allCookies.map(c => c.name).join(', '))
    redirect('/login')
  }

  // The cookie value is a JSON string: {"access_token":"...","refresh_token":"...","..."}
  let accessToken: string | null = null
  try {
    const session = JSON.parse(raw)
    accessToken = session.access_token ?? null
  } catch {
    // Not JSON — might be the raw JWT itself
    accessToken = raw
  }

  if (!accessToken) {
    console.log('[auth] could not extract access_token from cookie')
    redirect('/login')
  }

  const payload = decodeJwtPayload(accessToken)
  const userId = payload?.sub

  if (!userId) {
    console.log('[auth] could not decode userId from JWT')
    redirect('/login')
  }

  const { data: userProfile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !userProfile) {
    console.log('[auth] user profile not found for id:', userId, error?.message)
    redirect('/login?error=no_profile')
  }

  return userProfile as User
}
