'use client'

import { useEffect } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { filterAnalyticsEvent } from '@/lib/analyticsFilter'

// Vercel Web Analytics: no cookie, no personal profile. The script is served from our own origin
// (/_vercel/insights/script.js), so the Content-Security-Policy needs no change. It only exists in production
// and only once Web Analytics is enabled on the project (Vercel dashboard → Analytics).
function browserStorage(): Storage | null {
  try { return window.localStorage } catch { return null }
}

export default function SiteAnalytics() {
  // The opt-out / opt-in links (?analytics=off / ?analytics=on) take effect as soon as the page loads, whether or not
  // the Vercel script has been served yet.
  useEffect(() => {
    filterAnalyticsEvent({ url: window.location.href }, browserStorage())
  }, [])

  return (
    <Analytics
      beforeSend={event => filterAnalyticsEvent(event, browserStorage())}
    />
  )
}
