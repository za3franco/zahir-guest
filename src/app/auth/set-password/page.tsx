import type { Metadata } from 'next'
import { headers } from 'next/headers'
import SetPasswordForm from './SetPasswordForm'

// The invitation link opens this page before anyone is signed in: start in the language of the phone's browser
// (so an English iPhone never flashes French), then the form switches to the language chosen for the invited person.
// A "forgot password" link carries that language itself (?lang=), and a single-use token: never send the address
// of this page to another site.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { referrer: 'no-referrer' }

export default async function SetPasswordPage({ searchParams: searchParamsP }: { searchParams: Promise<{ lang?: string; type?: string }> }) {
  const searchParams = await searchParamsP
  const accept = ((await headers()).get('accept-language') ?? '').trim().toLowerCase()
  const fromLink = searchParams.lang === 'en' || searchParams.lang === 'fr' ? searchParams.lang : null
  return (
    <SetPasswordForm
      initialLang={fromLink ?? (accept.startsWith('en') ? 'en' : 'fr')}
      langFromLink={fromLink !== null}
      kind={searchParams.type === 'recovery' ? 'recovery' : searchParams.type === 'invite' ? 'invite' : 'legacy'}
    />
  )
}
