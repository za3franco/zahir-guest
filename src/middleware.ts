import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { AUTO_CURRENCY_COOKIE, currencyForCountry, madPaymentsEnabled } from '@/lib/currency'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — this is the only job of the middleware
  // Do NOT add redirect logic here — let server components handle it
  // This prevents the race condition where the cookie isn't set yet
  await supabase.auth.getUser()

  // Billing currency from the visitor's country (Vercel header, free). Refreshed daily so a change of
  // country or switching MAD payments on is picked up; a manual choice (zg_cur cookie) always wins.
  if (!request.cookies.get(AUTO_CURRENCY_COOKIE)) {
    const cur = currencyForCountry(request.headers.get('x-vercel-ip-country'), madPaymentsEnabled())
    supabaseResponse.cookies.set(AUTO_CURRENCY_COOKIE, cur, { path: '/', maxAge: 86400, sameSite: 'lax' })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
