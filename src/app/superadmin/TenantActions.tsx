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
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/superadmin/tenants/${tenantId}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend: !suspended }),
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
      {error && <span className={styles.note}>{error}</span>}
    </div>
  )
}
