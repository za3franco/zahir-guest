'use client'

import { useState } from 'react'
import { PLAN_NAMES, type PlanTier } from '@/lib/plans'
import { SA, type Lang } from '@/lib/superadminText'
import { failureText } from '@/lib/clientErrors'
import styles from './superadmin.module.css'

// Super admin: create a workspace by hand (direct sale or offered trial).
export default function CreateTenantForm({ lang }: { lang: Lang }) {
  const t = SA[lang]
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
    let res: Response
    try {
      res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
    } catch (err) {
      setBusy(false)
      setError(failureText(err, lang))
      return
    }
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setError(d.error ?? t.failed)
      return
    }
    setDone(
      d.emailed
        ? t.createdEmailed(f.companyName, f.email)
        : d.setPasswordLink ? t.createdNoEmailLink(f.companyName) : t.createdNoEmail(f.companyName)
    )
    if (d.setPasswordLink) setDone(prev => `${prev} ${d.setPasswordLink}`)
    setTimeout(() => window.location.reload(), d.setPasswordLink ? 60000 : 2500)
  }

  if (!open) {
    return (
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setOpen(true)}>
        {t.newWorkspace}
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.formGrid}>
        <label>{t.fCompany}<input required value={f.companyName} onChange={e => set('companyName', e.target.value)} /></label>
        <label>{t.fAdminName}<input required value={f.adminName} onChange={e => set('adminName', e.target.value)} /></label>
        <label>{t.fAdminEmail}<input required type="email" value={f.email} onChange={e => set('email', e.target.value)} /></label>
        <label>{t.fLanguage}
          <select value={f.lang} onChange={e => set('lang', e.target.value)}>
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>{t.fPlan}
          <select value={f.plan} onChange={e => set('plan', e.target.value)}>
            {(['starter', 'professional', 'enterprise'] as PlanTier[]).map(p => <option key={p} value={p}>{PLAN_NAMES[p][lang]}</option>)}
          </select>
        </label>
        <label>{t.fBilling}
          <select value={f.mode} onChange={e => set('mode', e.target.value)}>
            <option value="trial">{t.modePilot}</option>
            <option value="free">{t.modeFree}</option>
            <option value="direct">{t.modeDirect}</option>
          </select>
        </label>
        {f.mode === 'trial' ? (
          <label>{t.fTrialDays}<input type="number" min={1} max={90} value={f.trialDays} onChange={e => set('trialDays', e.target.value)} /></label>
        ) : (
          <label>{t.fContract}<input type="number" min={0} step="1" value={f.contractMrrEur} onChange={e => set('contractMrrEur', e.target.value)} placeholder={t.fContractPlaceholder} /></label>
        )}
        <label className={styles.checkbox}>
          <input type="checkbox" checked={f.sendEmail} onChange={e => set('sendEmail', e.target.checked)} />
          {t.fSendEmail}
        </label>
      </div>
      <p className={styles.note}>
        {f.mode === 'direct' ? t.noteDirect : f.mode === 'free' ? t.noteFree : t.notePilot}
      </p>
      {error && <p className={styles.error}>{error}</p>}
      {done && <p className={styles.success}>{done}</p>}
      <div className={styles.actions}>
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy}>{busy ? t.creating : t.create}</button>
        <button type="button" className={styles.btn} disabled={busy} onClick={() => setOpen(false)}>{t.cancel}</button>
      </div>
    </form>
  )
}
