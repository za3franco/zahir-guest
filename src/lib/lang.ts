// The language the person chose with the FR / EN toggle follows them everywhere: it is kept in a cookie and,
// once signed in, in their profile. The phone's or browser's language is only a last resort for a first visit.

export type Lang = 'en' | 'fr'
export const LANG_COOKIE = 'zg_lang'

/** Language stored in a cookie string (document.cookie or a Cookie header), or null. */
export function langFromCookieString(cookies: string | null | undefined): Lang | null {
  const m = (cookies ?? '').match(new RegExp(`(?:^|;\\s*)${LANG_COOKIE}=(en|fr)\\b`))
  return (m?.[1] as Lang | undefined) ?? null
}

/** Remembers the choice for a year (browser only). */
export function rememberLang(lang: Lang) {
  try {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`
  } catch { /* cookies blocked: the choice still applies to the current page */ }
}
