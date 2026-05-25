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

function tryExtractToken(value: string): string | null {
  // Direct JWT
  if (value.split('.').length === 3) return value
  // Try URL decode then JSON
  const attempts = [value, (() => { try { return decodeURIComponent(value) } catch { return value } })()]
  for (const v of attempts) {
    try { const p = JSON.parse(v); if (p?.access_token) return p.access_token } catch { /* skip */ }
    try { const p = JSON.parse(Buffer.from(v, 'base64').toString()); if (p?.access_token) return p.access_token } catch { /* skip */ }
    try { const p = JSON.parse(Buffer.from(v, 'base64url').toString()); if (p?.access_token) return p.access_token } catch { /* skip */ }
  }
  return null
}

export async function requireUser(): Promise<User> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()

  // Log ALL cookies with full names (truncated values)
  const allNames = allCookies.map(c => c.name).join(' | ')
  console.log('[auth] cookie names:', allNames || 'NONE')

  // Grab ANY sb- cookie — don't filter by exact project ref
  const sbCookies = allCookies
    .filter(c => c.name.startsWith('sb-'))
    .sort((a, b) => a.name.localeCompare(b.name))

  console.log('[auth] sb cookies:', sbCookies.map(c => `${c.name}(${c.value.length})`).join(' | ') || 'NONE')

  if (sbCookies.length === 0) {
    console.log('[auth] FAIL no sb- cookies')
    redirect('/login')
  }

  // Reassemble (handles chunked tokens)
  // Group by base name (strip trailing .0 .1 etc)
  const grouped: Record<string, string> = {}
  for (const c of sbCookies) {
    const base = c.name.replace(/\.\d+$/, '')
    grouped[base] = (grouped[base] ?? '') + c.value
  }

  console.log('[auth] grouped keys:', Object.keys(grouped).join(' | '))

  let accessToken: string | null = null
  let foundKey = ''

  for (const [key, val] of Object.entries(grouped)) {
    const token = tryExtractToken(val)
    if (token) {
      accessToken = token
      foundKey = key
      break
    }
  }

  console.log('[auth] token from:', foundKey || 'NONE', 'found:', !!accessToken)

  if (!accessToken) {
    console.log('[auth] FAIL could not parse any token')
    redirect('/login')
  }

  const payload = decodeJwtPayload(accessToken!)
  const userId = payload?.sub
  console.log('[auth] userId:', userId ?? 'NONE')

  if (!userId) {
    console.log('[auth] FAIL no sub in payload')
    redirect('/login')
  }

  const { data: userProfile, error } = await supabaseAdmin
    .from('users').select('*').eq('id', userId!).single()

  console.log('[auth] profile:', userProfile?.email ?? 'NULL', error?.message ?? '')

  if (!userProfile) redirect('/login?error=no_profile')

  return userProfile as User
}
