'use client'

import { useState } from 'react'
import { SA, type Lang } from '@/lib/superadminText'
import { failureText } from '@/lib/clientErrors'
import styles from './superadmin.module.css'

export default function TenantActions({ tenantId, name, suspended, internal, main, pilot, free, offline, lang }: {
  lang: Lang
  tenantId: string
  name: string
  suspended: boolean
  internal: boolean
  /** The Za3fran workspace itself: never deletable. Other internal-tier workspaces are test spaces. */
  main?: boolean
  /** A Professional pilot is running */
  pilot?: boolean
  /** The workspace is on the free plan (pilot can be opened) */
  free?: boolean
  /** Offline audit mode is on for this workspace */
  offline?: boolean
}) {
  const t = SA[lang]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** One request; `then` runs on success, otherwise the (already translated) server message or a generic one is shown. */
  async function call(url: string, method: 'POST' | 'DELETE', body: unknown, then: () => void) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { then(); return }
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? t.failed)
    } catch (e) {
      setError(failureText(e, lang))
    }
    setBusy(false)
  }
  const reload = () => window.location.reload()

  function viewAs() {
    call('/api/superadmin/impersonate', 'POST', { tenantId }, () => { window.location.href = '/dashboard' })
  }

  function toggleSuspend() {
    if (!window.confirm(suspended ? t.confirmReactivate(name) : t.confirmSuspend(name))) return
    const notify = window.confirm(t.confirmNotify(suspended))
    call(`/api/superadmin/tenants/${tenantId}/suspend`, 'POST', { suspend: !suspended, notify }, reload)
  }

  function togglePilot() {
    if (pilot) {
      if (!window.confirm(t.confirmEndPilot(name))) return
      call(`/api/superadmin/tenants/${tenantId}/pilot`, 'POST', { end: true }, reload)
      return
    }
    const d = window.prompt(t.promptPilot(name), '14')
    if (d === null) return
    call(`/api/superadmin/tenants/${tenantId}/pilot`, 'POST', { days: Number(d) }, reload)
  }

  function toggleOffline() {
    if (!window.confirm(offline ? t.confirmOfflineOff(name) : t.confirmOfflineOn(name))) return
    call(`/api/superadmin/tenants/${tenantId}/offline`, 'POST', { enabled: !offline }, reload)
  }

  function remove() {
    const typed = window.prompt(t.promptDelete(name))
    if (typed === null) return
    if (typed.trim() !== name) {
      setError(t.nameMismatch)
      return
    }
    call(`/api/superadmin/tenants/${tenantId}`, 'DELETE', { confirm: typed.trim() }, reload)
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.btn} disabled={busy} onClick={viewAs}>{t.viewAs}</button>
      <button type="button" className={styles.btn} disabled={busy} onClick={toggleOffline} title={t.offlineTitle}>
        {offline ? t.offlineOn : t.offlineOff}
      </button>
      {!internal && !suspended && (pilot || free) && (
        <button type="button" className={styles.btn} disabled={busy} onClick={togglePilot}>
          {pilot ? t.endPilot : t.openPilot}
        </button>
      )}
      {!internal && (
        <button type="button" className={`${styles.btn} ${suspended ? '' : styles.btnDanger}`} disabled={busy} onClick={toggleSuspend}>
          {suspended ? t.reactivate : t.suspend}
        </button>
      )}
      {!main && (
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={remove}>{t.delete}</button>
      )}
      {error && <span className={styles.note}>{error}</span>}
    </div>
  )
}
