'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  role: string
}

// 8 hours for admins, 2 hours for auditors on mobile
const TIMEOUT_MS: Record<string, number> = {
  tenant_admin: 8 * 60 * 60 * 1000,
  super_admin: 8 * 60 * 60 * 1000,
  auditor: 2 * 60 * 60 * 1000,
  property_manager: 8 * 60 * 60 * 1000,
}

const EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click']

export default function SessionTimeout({ role }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timeoutMs = TIMEOUT_MS[role] ?? 8 * 60 * 60 * 1000

  useEffect(() => {
    async function logout() {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/login?reason=timeout'
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(logout, timeoutMs)
    }

    // Start timer
    resetTimer()

    // Reset on any activity
    EVENTS.forEach(event => window.addEventListener(event, resetTimer, { passive: true }))

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      EVENTS.forEach(event => window.removeEventListener(event, resetTimer))
    }
  }, [timeoutMs])

  return null
}
