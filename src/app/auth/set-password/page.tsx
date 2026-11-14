import { headers } from 'next/headers'
import SetPasswordForm from './SetPasswordForm'

// The invitation link opens this page before anyone is signed in: start in the language of the phone's browser
// (so an English iPhone never flashes French), then the form switches to the language chosen for the invited person.
export const dynamic = 'force-dynamic'

export default function SetPasswordPage() {
  const accept = (headers().get('accept-language') ?? '').trim().toLowerCase()
  return <SetPasswordForm initialLang={accept.startsWith('en') ? 'en' : 'fr'} />
}
