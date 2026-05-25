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
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

export async function requireUser(): Promise<User> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  // Log ALL cookie names and values (truncated) before any redirect
  const cookieSummary = allCookies
    .map(c => `${c.name}=${c.value.substring(0, 30)}`)
    .join(' || ')
  console.log('[auth] COOKIES:', cookieSummary || 'EMPTY')

  const PROJECT_REF = 'fnrafhbautactzhemmjb'
  const BASE_NAME = `sb-${PROJECT_REF}-auth-token`

  const authChunks = allCookies
    .filter(c => c.name === BASE_NAME || c.name.startsWith(`${BASE_NAME}.`))
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log('[auth] chunks:', authChunks.length, authChunks.map(c => `${c.name}(${c.value.length})`).join(' '))

  if (authChunks.length === 0) {
    console.log('[auth] FAIL: no auth chunks')
    redirect('/login')
  }

  const raw = authChunks.map(c => c.value).join('')
  console.log('[auth] raw len:', raw.length, 'preview:', raw.substring(0, 50))

  // Try to extract access token from various formats
  let accessToken: string | null = null
  let parseMethod = 'none'

  // Format 1: raw is already a JWT
  if (raw.split('.').length === 3) {
    accessToken = raw
    parseMethod = 'raw-jwt'
  }

  // Format 2: JSON string
  if (!accessToken) {
    try {
      const decoded = decodeURIComponent(raw)
      const parsed = JSON.parse(decoded)
      if (parsed.access_token) { accessToken = parsed.access_token; parseMethod = 'json-urldecoded' }
    } catch { /* skip */ }
  }

  // Format 3: plain JSON (no URL encoding)
  if (!accessToken) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.access_token) { accessToken = parsed.access_token; parseMethod = 'json-plain' }
    } catch { /* skip */ }
  }

  // Format 4: base64 encoded JSON
  if (!accessToken) {
    try {
      const decoded = Buffer.from(raw, 'base64url').toString('utf-8')
      const parsed = JSON.parse(decoded)
      if (parsed.access_token) { accessToken = parsed.access_token; parseMethod = 'base64url' }
    } catch { /* skip */ }
  }

  // Format 5: base64 (standard)
  if (!accessToken) {
    try {
      const decoded = Buffer.from(raw, 'base64').toString('utf-8')
      const parsed = JSON.parse(decoded)
      if (parsed.access_token) { accessToken = parsed.access_token; parseMethod = 'base64' }
    } catch { /* skip */ }
  }

  console.log('[auth] token method:', parseMethod, 'found:', !!accessToken)

  if (!accessToken) {
    console.log('[auth] FAIL: could not parse token from raw value')
    redirect('/login')
  }

  const payload = decodeJwtPayload(accessToken!)
  const userId = payload?.sub
  console.log('[auth] userId:', userId ?? 'NOT FOUND', 'payload keys:', payload ? Object.keys(payload).join(',') : 'null')

  if (!userId) {
    console.log('[auth] FAIL: no sub in JWT payload')
    redirect('/login')
  }

  const { data: userProfile, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId!)
    .single()

  console.log('[auth] profile result:', userProfile?.email ?? 'NULL', 'error:', error?.message ?? 'none')

  if (!userProfile) redirect('/login?error=no_profile')

  return userProfile as User
}
