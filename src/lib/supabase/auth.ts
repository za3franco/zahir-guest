import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { jwtDecode } from 'jwt-decode'
import { redirect } from 'next/navigation'
import type { User } from '@/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function requireUser(): Promise<User> {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  // Supabase SSR sets cookies with name pattern: sb-<project-ref>-auth-token
  // or sb-<project-ref>-auth-token.0, .1 etc (chunked)
  // Collect all sb- auth token chunks and reassemble
  const chunkCookies = allCookies
    .filter(c => c.name.match(/sb-.+-auth-token(\.\d+)?$/))
    .sort((a, b) => a.name.localeCompare(b.name))

  let rawValue = ''
  if (chunkCookies.length > 0) {
    rawValue = chunkCookies.map(c => c.value).join('')
  } else {
    // Fallback: any cookie with access_token in name
    const fallback = allCookies.find(c => c.name.includes('access_token'))
    rawValue = fallback?.value ?? ''
  }

  if (!rawValue) {
    console.log('[requireUser] no auth cookie found. Cookies:', allCookies.map(c => c.name))
    redirect('/login')
  }

  let userId: string | null = null
  try {
    let token = rawValue
    // Cookie value is base64url encoded JSON: {"access_token":"...","refresh_token":"..."}
    try {
      // Try direct JSON parse first
      const parsed = JSON.parse(token)
      token = parsed.access_token ?? token
    } catch {
      // Try base64 decode
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8')
        const parsed = JSON.parse(decoded)
        token = parsed.access_token ?? token
      } catch {
        // Use as-is — might already be the raw JWT
      }
    }
    const payload = jwtDecode<{ sub: string }>(token)
    userId = payload.sub
  } catch (e) {
    console.log('[requireUser] failed to extract userId:', e)
    redirect('/login')
  }

  if (!userId) redirect('/login')

  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (!userProfile) redirect('/login?error=no_profile')

  return userProfile as User
}
