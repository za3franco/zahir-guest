import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

export const IMPERSONATE_COOKIE = 'zg_impersonate_tenant'
import type { User } from '@/types'

function tryExtractToken(value: string): string | null {
  // Direct JWT
  if (value.split('.').length === 3) return value
  // @supabase/ssr stores the session as JSON, optionally URL-encoded or base64 ("base64-" prefix)
  const raw = value.startsWith('base64-') ? value.slice(7) : value
  const attempts = [raw, (() => { try { return decodeURIComponent(raw) } catch { return raw } })()]
  for (const v of attempts) {
    try { const p = JSON.parse(v); if (p?.access_token) return p.access_token } catch { /* skip */ }
    try { const p = JSON.parse(Buffer.from(v, 'base64').toString()); if (p?.access_token) return p.access_token } catch { /* skip */ }
    try { const p = JSON.parse(Buffer.from(v, 'base64url').toString()); if (p?.access_token) return p.access_token } catch { /* skip */ }
  }
  return null
}

// One verifier per server instance: it keeps the project's public signing keys in memory.
let verifier: ReturnType<typeof createClient> | null = null
function getVerifier() {
  verifier ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return verifier
}

/**
 * The signed-in user's id, taken ONLY from an access token whose signature and expiry Supabase Auth
 * has verified (getClaims: checked locally with the project's public keys, or by the Auth server for
 * projects still on the legacy shared secret). A cookie that merely looks like a token is never trusted.
 */
async function verifiedUserId(token: string): Promise<string | null> {
  try {
    const { data, error } = await getVerifier().auth.getClaims(token)
    if (error || !data?.claims) return null
    const sub = data.claims.sub
    return typeof sub === 'string' && sub ? sub : null
  } catch {
    return null
  }
}

// Real signed-in profile, ignoring any impersonation.
async function loadRealUser(): Promise<User> {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Session cookies: sb-<project ref>-auth-token, possibly split into .0, .1 ... chunks.
  // The middleware has already refreshed an expired session before this runs.
  const grouped: Record<string, string> = {}
  for (const c of cookies().getAll().filter(c => c.name.startsWith('sb-')).sort((a, b) => a.name.localeCompare(b.name))) {
    const base = c.name.replace(/\.\d+$/, '')
    grouped[base] = (grouped[base] ?? '') + c.value
  }

  // This project's cookie first; any other sb- cookie is only a fallback and must verify too
  let ref = ''
  try { ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0] } catch { /* keep empty */ }
  const own = `sb-${ref}-auth-token`
  const keys = Object.keys(grouped).sort((a, b) => Number(b === own) - Number(a === own))

  let userId: string | null = null
  for (const key of keys) {
    const token = tryExtractToken(grouped[key])
    if (token && (userId = await verifiedUserId(token))) break
  }
  if (!userId) redirect('/login')

  const { data: userProfile } = await supabaseAdmin
    .from('users').select('*').eq('id', userId!).single()

  if (!userProfile) redirect('/login?error=no_profile')

  return userProfile as User
}

/**
 * The current user. A super_admin who started "view as" gets their profile re-scoped to the chosen
 * tenant as a tenant_admin (impersonating_tenant_id set); everyone else is unaffected.
 */
export async function requireUser(): Promise<User> {
  const real = await loadRealUser()
  if (real.role === 'super_admin') {
    const target = cookies().get(IMPERSONATE_COOKIE)?.value
    if (target && /^[0-9a-f-]{36}$/i.test(target)) {
      return { ...real, tenant_id: target, role: 'tenant_admin', impersonating_tenant_id: target }
    }
  }
  return real
}

/** Only for /superadmin pages and APIs: the real super_admin, never an impersonated view. */
export async function requireSuperAdmin(): Promise<User> {
  const real = await loadRealUser()
  if (real.role !== 'super_admin') redirect('/dashboard')
  return real
}
