import { apiError, requestLang } from '@/lib/apiErrors'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { SITE_URL } from '@/lib/site'
import { passwordLinkUrl } from '@/lib/authLinks'
import { sendPasswordResetEmail } from '@/lib/accountEmails'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const WINDOW_MS = 3600_000
const MAX_PER_IP = 10 // a hotel office often shares one address
const MAX_PER_EMAIL = 3 // each new link cancels the previous one: do not let a stranger flood someone's inbox
// Every answer that could tell whether an account exists takes at least this long, so the time it takes does not
// reveal it either (looking up the account, creating the link and calling Brevo only happen when it exists).
const MIN_ANSWER_MS = 2500

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Counters live in signup_attempts (no new table). Keyed HMACs: never the raw address or IP, not reversible without
// the server key, and in a different value space from the signup counters (plain SHA-256 of the IP), so they never mix.
function counterKey(kind: 'ip' | 'email', value: string) {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`pwreset-${kind}:${value}`).digest('hex')
}

// Public endpoint behind /auth/forgot-password. Sends the reset link by Brevo, in the language of the account,
// instead of the standard Supabase Auth email. Same answer whether or not an account exists for the address.
export async function POST(request: Request) {
  const started = Date.now()
  let body: any
  try {
    body = await request.json()
  } catch {
    return apiError(requestLang(request), 'invalid_request')
  }
  const pageLang = requestLang(request, body?.lang)

  const email = String(body?.email ?? '').trim().toLowerCase()
  if (email.length > 200 || !EMAIL_RE.test(email)) return apiError(pageLang, 'invalid_email')

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const count = async (key: string) => {
    const { count, error } = await supabase
      .from('signup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', key)
      .gte('created_at', since)
    if (error) throw error
    return count ?? 0
  }

  // The same answer for every address, after the same minimum time
  const done = async () => {
    await sleep(Math.max(0, started + MIN_ANSWER_MS - Date.now()))
    return NextResponse.json({ ok: true })
  }

  try {
    // Per IP: refusing says nothing about any account, so it can be explicit
    const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
    const ipKey = counterKey('ip', ip)
    if ((await count(ipKey)) >= MAX_PER_IP) return apiError(pageLang, 'too_many_attempts')

    // Per address: counted before knowing whether the account exists, and silent (same answer as a success)
    const emailKey = counterKey('email', email)
    const emailCount = await count(emailKey)
    await supabase.from('signup_attempts').insert(
      emailCount >= MAX_PER_EMAIL ? [{ ip_hash: ipKey }] : [{ ip_hash: ipKey }, { ip_hash: emailKey }]
    )
    if (emailCount >= MAX_PER_EMAIL) return await done()

    // Emails are stored in lower case (signup and invitation both normalise them)
    const { data: user } = await supabase
      .from('users')
      .select('id, tenant_id, name, email, default_language')
      .eq('email', email)
      .maybeSingle()
    if (!user) return await done()

    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
      options: { redirectTo: `${SITE_URL}/auth/set-password` },
    })
    const tokenHash = link?.properties?.hashed_token
    if (linkError || !tokenHash) {
      console.error('[auth/forgot-password] link not created for user', user.id, linkError?.message ?? 'no token')
      return await done()
    }

    // Our own link (see src/lib/authLinks.ts: token after the '#'). The language is the account's.
    const lang: 'en' | 'fr' = user.default_language === 'en' ? 'en' : 'fr'
    const url = passwordLinkUrl(tokenHash, lang, 'recovery')
    const sent = await sendPasswordResetEmail({ name: user.name ?? '', email: user.email }, lang, url, user.tenant_id)
    if (!sent) console.error('[auth/forgot-password] email not sent for user', user.id)
    return await done()
  } catch (err) {
    // Log the reason (never the address), answer as usual
    console.error('[auth/forgot-password]', err instanceof Error ? err.message : (err as any)?.message ?? String(err))
    return await done()
  }
}
