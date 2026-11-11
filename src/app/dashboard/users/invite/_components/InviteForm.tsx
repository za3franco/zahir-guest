'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import styles from './InviteForm.module.css'

const T = {
  title: { en: 'Invite a user', fr: 'Inviter un utilisateur' },
  subtitle: { en: 'They will receive an email with a link to set their password and access the platform.', fr: 'Ils recevront un email avec un lien pour définir leur mot de passe et accéder à la plateforme.' },
  sections: { details: { en: 'User details', fr: 'Informations utilisateur' } },
  fields: {
    name: { en: 'Full name', fr: 'Nom complet' },
    namePlaceholder: { en: 'e.g. Ahmed Benali', fr: 'ex. Ahmed Benali' },
    email: { en: 'Email address', fr: 'Adresse email' },
    emailPlaceholder: { en: 'e.g. ahmed@hotel.com', fr: 'ex. ahmed@hotel.com' },
    role: { en: 'Role', fr: 'Rôle' },
    language: { en: 'Preferred language', fr: 'Langue préférée' },
  },
  roles: {
    auditor: { en: 'Auditor — conducts audits on mobile', fr: 'Auditeur — conduit les audits sur mobile' },
    client_admin: { en: 'Client manager — sees every property of a client', fr: "Responsable client — voit tous les établissements d'un client" },
    property_manager: { en: 'Property manager — sees the reports of their properties', fr: "Directeur d'établissement — voit les rapports de ses établissements" },
    department_manager: { en: 'Department manager — sees the reports of their properties', fr: 'Chef de département — voit les rapports de ses établissements' },
    tenant_admin: { en: 'Admin — full access to the platform', fr: 'Administrateur — accès complet à la plateforme' },
  },
  setAccess: { en: 'Set what they can see →', fr: 'Choisir ce que cette personne voit →' },
  accessHint: {
    en: 'This person sees nothing until you give them access to a client or to properties.',
    fr: "Cette personne ne voit rien tant que vous ne lui donnez pas accès à un client ou à des établissements.",
  },
  languages: { fr: { en: 'French', fr: 'Français' }, en: { en: 'English', fr: 'Anglais' } },
  send: { en: 'Send invitation', fr: "Envoyer l'invitation" },
  sending: { en: 'Sending…', fr: 'Envoi en cours…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  successTitle: { en: 'Invitation sent', fr: 'Invitation envoyée' },
  successMessage: { en: 'An email has been sent to', fr: 'Un email a été envoyé à' },
  successHint: { en: 'They can use the link to set their password and log in.', fr: 'Ils peuvent utiliser le lien pour définir leur mot de passe et se connecter.' },
  inviteAnother: { en: 'Invite another user', fr: 'Inviter un autre utilisateur' },
  backToUsers: { en: 'Back to users', fr: 'Retour aux utilisateurs' },
  errors: {
    nameRequired: { en: 'Full name is required.', fr: 'Le nom complet est requis.' },
    emailRequired: { en: 'Email address is required.', fr: "L'adresse email est requise." },
    failed: { en: 'Failed to send invitation. Please try again.', fr: "Échec de l'envoi. Veuillez réessayer." },
  },
}

interface InviteFormProps { user: User }

export default function InviteForm({ user }: InviteFormProps) {
  const router = useRouter()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [newUserId, setNewUserId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<string>('auditor')
  const [form, setForm] = useState({ name: '', email: '', role: 'auditor', default_language: lang })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) { setError(t(T.errors.nameRequired)); return }
    if (!form.email.trim()) { setError(t(T.errors.emailRequired)); return }
    setSending(true)
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t(T.errors.failed))
        setSending(false)
        return
      }
      const d = await res.json().catch(() => ({}))
      setNewUserId(d.userId ?? null)
      setNewRole(form.role)
      setSuccess(form.email)
    } catch {
      setError(t(T.errors.failed))
    } finally {
      setSending(false)
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✉️</div>
          <h1 className={styles.successTitle}>{t(T.successTitle)}</h1>
          <p className={styles.successMessage}>{t(T.successMessage)} <strong>{success}</strong>.</p>
          <p className={styles.successHint}>{t(T.successHint)}</p>
          {newUserId && ['client_admin', 'property_manager', 'department_manager'].includes(newRole) && (
            <>
              <p className={styles.successHint} style={{ color: 'var(--color-gold)' }}>{t(T.accessHint)}</p>
              <a href={`/dashboard/users/${newUserId}/edit`} className="btn btn-primary" style={{ marginBottom: 12 }}>{t(T.setAccess)}</a>
            </>
          )}
          <div className={styles.successActions}>
            <button onClick={() => { setSuccess(null); setForm({ name: '', email: '', role: 'auditor', default_language: lang }) }} className="btn btn-secondary">
              {t(T.inviteAnother)}
            </button>
            <a href="/dashboard/users" className="btn btn-primary">{t(T.backToUsers)}</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.details)}</h2>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.name)} *</label>
              <input className={styles.input} type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t(T.fields.namePlaceholder)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.email)} *</label>
              <input className={styles.input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder={t(T.fields.emailPlaceholder)} required />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.role)}</label>
              <select className={styles.select} value={form.role} onChange={e => set('role', e.target.value)}>
                {Object.entries(T.roles).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.language)}</label>
              <select className={styles.select} value={form.default_language} onChange={e => set('default_language', e.target.value)}>
                {Object.entries(T.languages).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {error && <div className={styles.errorBanner}>{error}</div>}
        <div className={styles.formActions}>
          <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={sending}>{t(T.cancel)}</button>
          <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? t(T.sending) : t(T.send)}</button>
        </div>
      </form>
    </div>
  )
}
