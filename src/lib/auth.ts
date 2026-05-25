import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import type { User } from '@/types'

function decodeJwtPayload(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4)
    const decoded = Buffer.from(padded, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

function extractAccessToken(raw: string): string | null {
  // Try 1: direct JWT (three dot-separated parts)
  if (raw.split('.').length === 3) return raw

  // Try 2: URL-decode first, then parse
  let value = raw
  try { value = decodeURIComponent(raw) } catch { /* use raw */ }

  // Try 3: JSON object with access_token
  try {
    const parsed = JSON.parse(value)
    if (parsed.access_token) return parsed.access_token
  } catch { /* not JSON */ }

  // Try 4: base64 encoded JSON
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf-8')
    const parsed = JSON.parse(decoded)
    if (parsed.access_token) return parsed.access_token
  } catch { /* not base64 JSON */ }

  return null
}

export async function requireUser(): Promise<User> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  const cookieNames = allCookies.map(c => c.name)

  console.log('[auth] all cookies:', cookieNames.join(' | '))

  // Collect all Supabase auth token cookies (handles chunked tokens)
  // Cookie name: sb-<project-ref>-auth-token or sb-<project-ref>-auth-token.0, .1 etc
  const PROJECT_REF = 'fnrafhbautactzhemmjb'
  const BASE_NAME = `sb-${PROJECT_REF}-auth-token`

  const authChunks = allCookies
    .filter(c => c.name === BASE_NAME || c.name.startsWith(`${BASE_NAME}.`))
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log('[auth] auth cookies found:', authChunks.map(c => c.name).join(' | ') || 'NONE')

  if (authChunks.length === 0) {
    console.log('[auth] no auth cookie — redirecting')
    redirect('/login')
  }

  // Reassemble chunked cookie value
  const raw = authChunks.map(c => c.value).join('')
  console.log('[auth] raw value length:', raw.length, 'starts with:', raw.substring(0, 20))

  const accessToken = extractAccessToken(raw)
  console.log('[auth] access token found:', accessToken ? 'YES (length ' + accessToken.length + ')' : 'NO')

  if (!accessToken) {
    console.log('[auth] could not extract access token')
    redirect('/login')
  }

  const payload = decodeJwtPayload(accessToken)
  const userId = payload?.sub
  console.log('[auth] userId:', userId ?? 'NOT FOUND')

  if (!userId) redirect('/login')

  const { data: userProfile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  console.log('[auth] profile:', userProfile?.email ?? 'NOT FOUND', error?.message ?? '')

  if (!userProfile) redirect('/login?error=no_profile')

  return userProfile as User
}
