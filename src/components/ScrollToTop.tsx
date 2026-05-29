'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ScrollToTop() {
  const pathname = usePathname()

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM has updated before scrolling
    // This fixes Safari iOS where scrollTo fires before the new page renders
    const frame = requestAnimationFrame(() => {
      try {
        // Try smooth first, fall back to instant for Safari
        document.documentElement.scrollTop = 0
        document.body.scrollTop = 0
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      } catch {
        window.scrollTo(0, 0)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [pathname])

  return null
}
