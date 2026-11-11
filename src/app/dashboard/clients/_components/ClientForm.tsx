'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CLIENT_TYPES, CLIENT_TYPE_LABELS, type ClientRow } from '@/lib/clients'
import styles from '@/app/dashboard/properties/_components/PropertyForm.module.css'

type Lang = 'en' | 'fr'

const T = {
  newTitle: { en: 'New client', fr: 'Nouveau client' },
  editTitle: { en: 'Edit client', fr: 'Modifier le client' },
  subtitle: {
    en: 'A client groups properties (a hotel group, a hotel, a programme) and the people who can see their reports.',
    fr: 'Un client regroupe des établissements (un groupe, un hôtel, un programme) et les personnes qui voient leurs rapports.',
  },
  identity: { en: 'Client', fr: 'Client' },
  contact: { en: 'Main contact', fr: 'Contact principal' },
  contract: { en: 'Contract (internal, not visible to the client)', fr: 'Contrat (interne, non visible par le client)' },
  name: { en: 'Name', fr: 'Nom' },
  type: { en: 'Type', fr: 'Type' },
  contactName: { en: 'Contact name', fr: 'Nom du contact' },
  contactEmail: { en: 'Email', fr: 'Email' },
  contactPhone: { en: 'Phone', fr: 'Téléphone' },
  ref: { en: 'Contract reference', fr: 'Référence du contrat' },
  value: { en: 'Contract value (€, excl. tax)', fr: 'Montant du contrat (€ HT)' },
  start: { en: 'Start date', fr: 'Date de début' },
  end: { en: 'End date', fr: 'Date de fin' },
  planned: { en: 'Audits planned', fr: 'Audits prévus' },
  notes: { en: 'Notes', fr: 'Notes' },
  save: { en: 'Save client', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  failed: { en: 'Failed to save. Please try again.', fr: "Erreur lors de l'enregistrement. Veuillez réessayer." },
}

export default function ClientForm({ lang, client }: { lang: Lang; client?: ClientRow }) {
  const router = useRouter()
  const t = (k: { en: string; fr: string }) => k[lang]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [f, setF] = useState({
    name: client?.name ?? '',
    type: client?.type ?? 'group',
    contact_name: client?.contact_name ?? '',
    contact_email: client?.contact_email ?? '',
    contact_phone: client?.contact_phone ?? '',
    contract_ref: client?.contract_ref ?? '',
    contract_value_eur: client?.contract_value_eur != null ? String(client.contract_value_eur) : '',
    contract_start: client?.contract_start ?? '',
    contract_end: client?.contract_end ?? '',
    audits_planned: client?.audits_planned != null ? String(client.audits_planned) : '',
    notes: client?.notes ?? '',
  })
  const set = (k: keyof typeof f, v: string) => setF(p => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(client ? `/api/clients/${client.id}` : '/api/clients', {
        method: client ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d.error ?? t(T.failed))
        setSaving(false)
        return
      }
      router.push(`/dashboard/clients/${client?.id ?? d.id}`)
      router.refresh()
    } catch {
      setError(t(T.failed))
      setSaving(false)
    }
  }

  const input = (k: keyof typeof f, label: string, type = 'text', extra: Record<string, unknown> = {}) => (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input className={styles.input} type={type} value={f[k]} onChange={e => set(k, e.target.value)} {...extra} />
    </div>
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{client ? t(T.editTitle) : t(T.newTitle)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
      </div>
      <form onSubmit={submit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.identity)}</h2>
          <div className={styles.fieldRow}>
            {input('name', `${t(T.name)} *`, 'text', { required: true, maxLength: 160 })}
            <div className={styles.field}>
              <label className={styles.label}>{t(T.type)}</label>
              <select className={styles.select} value={f.type} onChange={e => set('type', e.target.value)}>
                {CLIENT_TYPES.map(ct => <option key={ct} value={ct}>{CLIENT_TYPE_LABELS[ct][lang]}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.contact)}</h2>
          <div className={styles.fieldRow}>
            {input('contact_name', t(T.contactName))}
            {input('contact_email', t(T.contactEmail), 'email')}
          </div>
          <div className={styles.fieldRow}>
            {input('contact_phone', t(T.contactPhone), 'tel')}
            <div className={styles.field} />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.contract)}</h2>
          <div className={styles.fieldRow}>
            {input('contract_ref', t(T.ref))}
            {input('contract_value_eur', t(T.value), 'number', { min: 0, step: '1', inputMode: 'decimal' })}
          </div>
          <div className={styles.fieldRow}>
            {input('contract_start', t(T.start), 'date')}
            {input('contract_end', t(T.end), 'date')}
          </div>
          <div className={styles.fieldRow}>
            {input('audits_planned', t(T.planned), 'number', { min: 0, step: '1', inputMode: 'numeric' })}
            <div className={styles.field} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>{t(T.notes)}</label>
            <textarea className={styles.input} rows={4} value={f.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        <div className={styles.formActions}>
          <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={saving}>{t(T.cancel)}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t(T.saving) : t(T.save)}</button>
        </div>
      </form>
    </div>
  )
}
