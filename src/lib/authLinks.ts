import { SITE_URL } from '@/lib/site'

// Links that let a person choose a password: invitation, welcome email of a new workspace, "forgot password".
//
// The single-use token sits after the '#': a browser never sends that part to a server, so it is in no request log
// (ours, Brevo's click tracking after the redirect, or a proxy), and it is only used when the page's script runs, so a
// mail scanner that merely opens the link does not use it up. The domain is SITE_URL, never the Host header of a request.
//
// `hashedToken` comes from supabase.auth.admin.generateLink({ type: 'recovery' }).properties.hashed_token
// (the page exchanges it with verifyOtp). `kind` only changes the wording of the page.
export function passwordLinkUrl(hashedToken: string, lang: 'en' | 'fr', kind: 'invite' | 'recovery'): string {
  return `${SITE_URL}/auth/set-password?type=${kind}&lang=${lang}#token_hash=${encodeURIComponent(hashedToken)}`
}
