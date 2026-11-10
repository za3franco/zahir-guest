'use client'

import { useState } from 'react'
import styles from './TrialBanner.module.css'

// Shown to a super admin while "viewing as" a tenant. Actions taken here affect the real tenant.
export default function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  const [busy, setBusy] = useState(false)

  async function exit() {
    setBusy(true)
    await fetch('/api/superadmin/impersonate', { method: 'DELETE' }).catch(() => {})
    window.location.href = '/superadmin'
  }

  return (
    <div className={`${styles.banner} ${styles.warn}`} role="status">
      <span>Viewing as <strong>{tenantName}</strong>. Changes you make here affect this customer&apos;s real data.</span>
      <button type="button" onClick={exit} disabled={busy} className={styles.cta} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit' }}>
        Exit
      </button>
    </div>
  )
}
