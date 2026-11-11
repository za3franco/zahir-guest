'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../questionnaires.module.css'

export default function NewQuestionnaire({ lang, templates }: { lang: 'en' | 'fr'; templates: { id: string; name: string }[] }) {
  const router = useRouter()
  const en = lang === 'en'
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [from, setFrom] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create() {
    if (!name.trim()) { setError(en ? 'Please name the questionnaire.' : 'Donnez un nom au questionnaire.'); return }
    setBusy(true); setError(null)
    const res = await fetch('/api/questionnaires/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, from: from || undefined }) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error || (en ? 'Error' : 'Erreur')); setBusy(false); return }
    router.push(`/dashboard/questionnaires/${json.id}/edit`)
  }

  if (!open) return <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ {en ? 'Create a questionnaire' : 'Créer un questionnaire'}</button>
  return (
    <div className={styles.panel} style={{ width: '100%' }}>
      <h2 className={styles.panelTitle}>{en ? 'New questionnaire' : 'Nouveau questionnaire'}</h2>
      <div className={styles.field}>
        <label className={styles.label}>{en ? 'Name' : 'Nom'} *</label>
        <input className={styles.input} value={name} maxLength={120} onChange={e => setName(e.target.value)} />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>{en ? 'Start from' : 'Partir de'}</label>
        <select className={styles.input} value={from} onChange={e => setFrom(e.target.value)}>
          <option value="">{en ? 'A blank questionnaire' : 'Un questionnaire vide'}</option>
          {templates.map(x => <option key={x.id} value={x.id}>{en ? 'A copy of: ' : 'Une copie de : '}{x.name}</option>)}
        </select>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={create}>{busy ? '…' : en ? 'Create and edit' : 'Créer et modifier'}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{en ? 'Cancel' : 'Annuler'}</button>
      </div>
    </div>
  )
}
