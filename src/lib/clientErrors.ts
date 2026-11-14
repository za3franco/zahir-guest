// Error texts for the screens, in the user's language. Two sources of English text the app does not control:
//  - the browser, when a request cannot leave the phone ("Load failed" on iPhone, "Failed to fetch" elsewhere);
//  - Supabase Auth (password, session), whose messages are English only.
// Texts that come from our own API (`{ error }`) are already translated by the server (src/lib/apiErrors.ts).

export type Lang = 'en' | 'fr'

export const GENERIC: Record<Lang, string> = {
  en: 'Something went wrong. Please try again.',
  fr: "Une erreur s'est produite. Veuillez réessayer.",
}

export const NETWORK: Record<Lang, string> = {
  en: 'No connection. Check your network and try again.',
  fr: 'Pas de connexion. Vérifiez votre réseau puis réessayez.',
}

/**
 * What to show for a caught error. A failed `fetch` throws a TypeError whose text is the browser's own English
 * wording: show a translated "no connection" instead. An Error built from our API's answer keeps its (translated) text.
 */
export function failureText(e: unknown, lang: Lang, fallback: string = GENERIC[lang]): string {
  if (e instanceof TypeError) return NETWORK[lang]
  return (e instanceof Error && e.message) || fallback
}

const AUTH: Record<string, Record<Lang, string>> = {
  invalid_credentials: { en: 'Incorrect email or password.', fr: 'Email ou mot de passe incorrect.' },
  weak_password: { en: 'This password is too weak. Use at least 8 characters, with letters and numbers.', fr: 'Ce mot de passe est trop faible. Utilisez au moins 8 caractères, avec des lettres et des chiffres.' },
  same_password: { en: 'The new password must be different from the current one.', fr: 'Le nouveau mot de passe doit être différent de l’actuel.' },
  email_not_confirmed: { en: 'This email address is not confirmed yet.', fr: "Cette adresse email n'est pas encore confirmée." },
  over_request_rate_limit: { en: 'Too many attempts. Please wait a few minutes and try again.', fr: 'Trop de tentatives. Patientez quelques minutes puis réessayez.' },
  over_email_send_rate_limit: { en: 'Too many emails sent. Please wait a few minutes and try again.', fr: "Trop d'emails envoyés. Patientez quelques minutes puis réessayez." },
  session_expired: { en: 'Your session has expired. Please sign in again.', fr: 'Votre session a expiré. Veuillez vous reconnecter.' },
  session_not_found: { en: 'Your session has expired. Please sign in again.', fr: 'Votre session a expiré. Veuillez vous reconnecter.' },
  user_banned: { en: 'This account is disabled. Please contact us.', fr: 'Ce compte est désactivé. Merci de nous contacter.' },
}

/** Supabase Auth error → text in the user's language (generic text when the code is not one we know). */
export function authErrorText(error: { code?: string; message?: string; status?: number } | null | undefined, lang: Lang): string {
  if (!error) return GENERIC[lang]
  // Older answers carry only the English message
  const code = error.code ?? (error.message === 'Invalid login credentials' ? 'invalid_credentials' : undefined)
  if (code && AUTH[code]) return AUTH[code][lang]
  if (error.status === 429) return AUTH.over_request_rate_limit[lang]
  if (error.message && /fetch|network|load failed/i.test(error.message)) return NETWORK[lang]
  return GENERIC[lang]
}
