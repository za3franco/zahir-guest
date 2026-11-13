'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { clearAppCaches, disableOfflineApp, prepareOffline, registerOfflineApp } from '@/lib/offline/session'
import { deviceStore, purgeOld } from '@/lib/offline/store'

// Mounted in the dashboard layout. With the offline mode: registers the service worker and prepares for offline
// use the current audit and every audit linked from the page (dashboard list), plus the code they need.
// Without it: removes any service worker and cached pages left from an earlier rollout (kill switch).
const USER_KEY = 'zg-offline-user'

/** Cached audit pages belong to whoever opened them: a different person signing in on this browser starts clean. */
async function forgetOtherUser(userId: string) {
  try {
    const previous = localStorage.getItem(USER_KEY)
    if (previous && previous !== userId) await clearAppCaches()
    localStorage.setItem(USER_KEY, userId)
  } catch { /* storage unavailable: nothing to compare */ }
}

export default function OfflineApp({ enabled, userId }: { enabled: boolean; userId: string }) {
  const pathname = usePathname()

  useEffect(() => {
    if (!enabled) { void disableOfflineApp(); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      await forgetOtherUser(userId)
      const reg = await registerOfflineApp()
      if (!reg || cancelled) return
      const audits: { url: string; name: string }[] = []
      if (/^\/dashboard\/audit\/[0-9a-f-]{36}\/?$/i.test(location.pathname)) {
        const name = document.querySelector('h1')?.textContent?.trim() ?? ''
        audits.push({ url: location.pathname, name })
      }
      document.querySelectorAll<HTMLAnchorElement>('a[href^="/dashboard/audit/"]').forEach(a => {
        const href = a.getAttribute('href') ?? ''
        const name = (a.querySelector('[class*="Name"]')?.textContent ?? a.textContent ?? '').trim().slice(0, 120)
        if (!audits.some(x => x.url === href)) audits.push({ url: href, name })
      })
      await prepareOffline(audits)
      void deviceStore().then(store => purgeOld(store))
    }, 1500) // after the page has settled
    return () => { cancelled = true; clearTimeout(timer) }
  }, [enabled, pathname, userId])

  return null
}
