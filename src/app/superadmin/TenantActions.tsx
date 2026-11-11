'use client'

import { useState } from 'react'
import styles from './superadmin.module.css'

export default function TenantActions({ tenantId, name, suspended, internal }: {
  tenantId: string
  name: string
  suspended: boolean
  internal: boolean
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
      {!internal && (
        <button type="button" className={`${styles.btn} ${suspended ? '' : styles.btnDanger}`} disabled={busy} onClick={toggleSuspend}>
          {suspended ? 'Reactivate' : 'Suspend'}
        </button>
      )}
      {!internal && (
        <button type="button" className={`${styles.btn} ${styles.btnDanger}`} disabled={busy} onClick={remove}>Delete</button>
      )}
      {error && <span className={styles.note}>{error}</span>}
    </div>
  )
}
