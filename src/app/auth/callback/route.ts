import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  // Handle password reset / invite token
  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (!error && data.session) {
      // Set the session cookies so set-password page has an active session
      const cookieStore = cookies()
      const { access_token, refresh_token } = data.session

      cookieStore.set('sb-access-token', access_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      })
      cookieStore.set('sb-refresh-token', refresh_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      })

      return NextResponse.redirect(`${origin}/auth/set-password`)
    }

    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  // Handle OAuth / magic link code exchange
  if (code) {
    const { createClient: createServerClient } = await import('@/lib/supabase/server')
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
