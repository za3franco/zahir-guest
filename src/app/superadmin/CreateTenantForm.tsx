'use client'

import { useState } from 'react'
import { PLAN_DISPLAY } from '@/lib/plans'
import styles from './superadmin.module.css'

// Super admin: create a workspace by hand (direct sale or offered trial).
export default function CreateTenantForm() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [f, setF] = useState({
    companyName: '', adminName: '', email: '', lang: 'fr', plan: 'professional',
    mode: 'trial', trialDays: '14', contractMrrEur: '', sendEmail: true,
  })
  const set = (k: keyof typeof f, v: string | boolean) => setF(prev => ({ ...prev, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setDone(null)
    const res = await fetch('/api/superadmin/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(d.error ?? 'Failed')
      return
    }
    setDone(
      d.emailed
        ? `Workspace "${f.companyName}" created. Welcome email sent to ${f.email}.`
        : `Workspace "${f.companyName}" created. No email was sent${d.setPasswordLink ? ': send this set-password link yourself (valid 24 h):' : '.'}`
    )
    if (d.setPasswordLink) setDone(prev => `${prev} ${d.setPasswordLink}`)
    setTimeout(() => window.location.reload(), d.setPasswordLink ? 60000 : 2500)
  }

  if (!open) {
    return (
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setOpen(true)}>
        + New workspace
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formGrid}>
        <label>Company / client name<input required value={f.companyName} onChange={e => set('companyName', e.target.value)} /></label>
        <label>Admin full name<input required value={f.adminName} onChange={e => set('adminName', e.target.value)} /></label>
        <label>Admin email<input required type="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
        <label>Language
          <select value={f.lang} onChange={e => set('lang', e.target.value)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>Plan
          <select value={f.plan} onChange={e => set('plan', e.target.value)}>
            {PLAN_DISPLAY.map(p => <option key={p.tier} value={p.tier}>{p.name}</option>)}
          </select>
        </label>
        <label>Billing
          <select value={f.mode} onChange={e => set('mode', e.target.value)}>
            <option value="trial">Free trial, then Stripe (self-serve)</option>
            <option value="direct">Direct contract (active now, billed outside Stripe)</option>
          </select>
        </label>
        {f.mode === 'trial' ? (
          <label>Trial length (days)<input type="number" min={1} max={90} value={f.trialDays} onChange={e => set('trialDays', e.target.value)} /></label>
        ) : (
          <label>Contract value per month (€, optional)<input type="number" min={0} step="1" value={f.contractMrrEur} onChange={e => set('contractMrrEur', e.target.value)} placeholder="e.g. 450" /></label>
        )}
        <label className={styles.checkbox}>
          <input type="checkbox" checked={f.sendEmail} onChange={e => set('sendEmail', e.target.checked)} />
          Send the welcome email with the set-password link
        </label>
      </div>
      <p className={styles.note}>
        {f.mode === 'direct'
          ? 'Direct contract: the workspace is active immediately with the plan limits, has no trial and no Stripe checkout. Suspend it yourself if the contract ends.'
          : 'Trial: same as a public signup. At the end of the trial the admin is asked to subscribe through Stripe.'}
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {done && <p className={styles.success}>{done}</p>}
      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</button>
        <button type="button" className={styles.btn} disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  )
}
