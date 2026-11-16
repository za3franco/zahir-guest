// Audience statistics (Vercel Web Analytics, no cookie): what is counted and what is not.
//
// Counted: the public pages (landing, pricing, contact, sign-up, login, legal pages), so that the numbers describe
// visitors and not the people who work inside the product.
// Never counted: the signed-in application and the super admin (/dashboard, /superadmin), the password pages, the API.
// Also never counted: a browser that has opted out. The owner opts out once per browser by opening
// https://www.zahirguest.com/?analytics=off (and back in with ?analytics=on). The choice is kept in localStorage
// under 'va-disable', the key documented by Vercel for this purpose.

export const OPT_OUT_KEY = 'va-disable'

const PRIVATE_PREFIXES = ['/dashboard', '/superadmin', '/auth', '/api', '/reports', '/users', '/en/dashboard']

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface AnalyticsEvent { url: string }

/** Returns null when the event must not be sent. Safe when localStorage is unavailable. */
export function filterAnalyticsEvent<T extends AnalyticsEvent>(event: T, storage: Storage | null): T | null {
  let url: URL
  try { url = new URL(event.url, 'https://www.zahirguest.com') } catch { return null }

  // Opt-in / opt-out links (the visit that carries the parameter is never counted)
  const choice = url.searchParams.get('analytics')
  if (choice === 'off' || choice === 'on') {
    try { choice === 'off' ? storage?.setItem(OPT_OUT_KEY, '1') : storage?.removeItem(OPT_OUT_KEY) } catch { /* storage blocked */ }
    return null
  }
  try { if (storage?.getItem(OPT_OUT_KEY)) return null } catch { /* storage blocked: count the visit */ }

  const path = url.pathname
  if (PRIVATE_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return null
  return event
}
