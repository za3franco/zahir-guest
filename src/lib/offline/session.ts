'use client'

// App-level pieces of the offline audit mode (ZG-6): service worker registration, preparing audits for offline
// use, and logging out without losing (or leaving behind) data kept on the phone.

import { pendingCount, wipeDevice } from './store'

const SW_URL = '/sw.js'

export function swSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator && typeof window !== 'undefined' && window.isSecureContext
}

export async function registerOfflineApp(): Promise<ServiceWorkerRegistration | null> {
  if (!swSupported()) return null
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' })
  } catch {
    return null
  }
}

/** Removes the offline app cache of this browser (offline mode switched off, or logout). */
export async function clearAppCaches(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      for (const k of await caches.keys()) if (k.startsWith('zg-')) await caches.delete(k)
    }
  } catch { /* nothing cached */ }
}

/** Kill switch: the workspace no longer has the offline mode → unregister and clear (data still to send is kept). */
export async function disableOfflineApp(): Promise<void> {
  if (!swSupported()) return
  try {
    const regs = await navigator.serviceWorker.getRegistrations()
    const ours = regs.filter(r => (r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? '').endsWith(SW_URL))
    if (!ours.length) return
    for (const r of ours) await r.unregister()
    await clearAppCaches()
  } catch { /* best effort */ }
}

/**
 * Asks the service worker to keep the pages of these audits (and the code of the current page) so they open
 * without network. Names are shown on the offline page.
 */
export async function prepareOffline(audits: { url: string; name: string }[]): Promise<void> {
  if (!swSupported()) return
  try {
    const reg = await navigator.serviceWorker.ready
    const statics = performance.getEntriesByType('resource')
      .map(e => e.name)
      .filter(u => { try { const x = new URL(u); return x.origin === location.origin && x.pathname.startsWith('/_next/static/') } catch { return false } })
    const names: Record<string, string> = {}
    audits.forEach(a => { if (a.name) names[new URL(a.url, location.origin).pathname] = a.name })
    reg.active?.postMessage({ type: 'precache', urls: [...audits.map(a => a.url), ...statics], names })
  } catch { /* best effort */ }
}

/** Everything this device keeps for the offline mode: audits, changes, photos and cached pages. */
export async function clearOfflineData(): Promise<void> {
  await wipeDevice()
  await clearAppCaches()
}

/**
 * Before logging out: refuses while offline, warns when changes have not reached the server yet, then erases what
 * the phone keeps (decision 5). Returns false when the logout should not happen.
 */
export async function prepareLogout(userId: string, lang: 'en' | 'fr'): Promise<boolean> {
  const en = lang === 'en'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    window.alert(en
      ? 'You are offline. Sign out once the network is back: changes still on this phone would otherwise be lost.'
      : 'Vous êtes hors ligne. Déconnectez-vous une fois le réseau revenu : sinon les modifications encore sur ce téléphone seraient perdues.')
    return false
  }
  const n = await pendingCount(userId)
  if (n > 0) {
    const ok = window.confirm(en
      ? `${n} change${n > 1 ? 's have' : ' has'} not reached the server yet. Signing out now deletes ${n > 1 ? 'them' : 'it'} from this phone. Sign out anyway?`
      : `${n} modification${n > 1 ? 's ne sont' : " n'est"} pas encore arrivée${n > 1 ? 's' : ''} sur le serveur. Vous déconnecter maintenant ${n > 1 ? 'les efface' : "l'efface"} de ce téléphone. Se déconnecter quand même ?`)
    if (!ok) return false
  }
  await clearOfflineData()
  return true
}
