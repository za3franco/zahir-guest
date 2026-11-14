'use client'

import { useState } from 'react'
import styles from './superadmin.module.css'

export default function TenantActions({ tenantId, name, suspended, internal, main, pilot, free, offline }: {
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
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function viewAs() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/superadmin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    if (res.ok) window.location.href = '/dashboard'
    else {
      setError('Failed')
      setBusy(false)
    }
  }

  async function toggleSuspend() {
    const verb = suspended ? 'Reactivate' : 'Suspend'
    if (!window.confirm(`${verb} ${name}?${suspended ? '' : ' All its users will be locked out immediately.'}`)) return
    const notify = window.confirm(`Email the workspace admins about this ${suspended ? 'reactivation' : 'suspension'}?\n\nOK = send the email · Cancel = no email`)
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend: !suspended, notify }),
    })
    if (res.ok) window.location.reload()
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed')
      setBusy(false)
    }
  }

  async function togglePilot() {
    if (pilot) {
      if (!window.confirm(`End the pilot of ${name} now? The workspace goes back to the free Discovery plan.`)) return
    } else {
      const d = window.prompt(`Open a Professional pilot for ${name}.\n\nNumber of days (1–30):`, '14')
      if (d === null) return
      setBusy(true)
      setError(null)
      const res = await fetch(`/api/superadmin/tenants/${tenantId}/pilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: Number(d) }),
      })
      if (res.ok) window.location.reload()
      else {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Failed')
        setBusy(false)
      }
      return
    }
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/pilot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ end: true }),
    })
    if (res.ok) window.location.reload()
    else {
      setError('Failed')
      setBusy(false)
    }
  }

  async function toggleOffline() {
    if (!window.confirm(offline
      ? `Switch OFF the offline audit mode for ${name}? Changes already on phones are still sent; phones stop keeping audits offline.`
      : `Switch ON the offline audit mode for ${name}? Auditors' phones will keep their audits (answers, notes, photos) until synchronised.`)) return
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/offline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !offline }),
    })
    if (res.ok) window.location.reload()
    else {
      setError('Failed')
      setBusy(false)
    }
  }

  async function remove() {
    const typed = window.prompt(
      `PERMANENTLY delete "${name}"?\n\nThis deletes its users, properties, campaigns, reports, photos and logo, and cancels any running Stripe subscription immediately (no refund). It cannot be undone.\n\nType the workspace name to confirm:`
    )
    if (typed === null) return
    if (typed.trim() !== name) {
      setError('Name did not match: nothing deleted')
      return
    }
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/superadmin/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: typed.trim() }),
    })
    if (res.ok) window.location.reload()
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'Failed')
      setBusy(false)
    }
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.btn} disabled={busy} onClick={viewAs}>View as</button>
      <button type="button" className={styles.btn} disabled={busy} onClick={toggleOffline} title="Offline audit mode (ZG-6)">
        {offline ? 'Offline: on' : 'Offline: off'}
      </button>
      {!internal && !suspended && (pilot || free) && (
        <button type="button" className={styles.btn} disabled={busy} onClick={togglePilot}>
          {pilot ? 'End pilot' : 'Open pilot'}
        </button>
      )}
      {!internal && (
        <button type="button" className={`${styles.btn} ${suspended ? '' : styles.btnDanger}`} disabled={busy} onClick={toggleSuspend}>
          {suspended ? 'Reactivate' : 'Suspend'}
        </button>
      )}
      {!main && (
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={remove}>Delete</button>
      )}
      {error && <span className={styles.note}>{error}</span>}
    </div>
  )
}
