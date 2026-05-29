'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import styles from './EditUserForm.module.css'

const T = {
  title: { en: 'Edit User', fr: "Modifier l'utilisateur" },
  subtitle: { en: "Update this user's details.", fr: "Mettez à jour les informations de cet utilisateur." },
  fields: {
    name: { en: 'Full name', fr: 'Nom complet' },
    email: { en: 'Email', fr: 'Email' },
    role: { en: 'Role', fr: 'Rôle' },
    language: { en: 'Preferred language', fr: 'Langue préférée' },
  },
  roles: {
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    property_manager: { en: 'Property Manager', fr: "Directeur d'établissement" },
    tenant_admin: { en: 'Admin', fr: 'Administrateur' },
  },
  save: { en: 'Save changes', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  errors: {
    failed: { en: 'Update failed. Please try again.', fr: 'Échec de la mise à jour.' },
    nameRequired: { en: 'Name is required.', fr: 'Le nom est requis.' },
  },
  back: { en: '← Users', fr: '← Utilisateurs' },
}

interface Props {
  currentUser: User
  targetUser: {
    id: string
    name: string
    email: string
    role: string
    default_language: string
  }
}

export default function EditUserForm({ currentUser, targetUser }: Props) {
  const router = useRouter()
  const lang = currentUser.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]

  const [name, setName] = useState(targetUser.name)
  const [role, setRole] = useState(targetUser.role)
  const [language, setLanguage] = useState(targetUser.default_language ?? 'fr')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError(t(T.errors.nameRequired)); return }

    setSaving(true)
    try {
      const res = await fetch(`/api/users/${targetUser.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role, default_language: language }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t(T.errors.failed))
        setSaving(false)
        return
      }
      router.push('/dashboard/users')
    } catch {
      setError(t(T.errors.failed))
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <a href="/dashboard/users" className={styles.backLink}>{t(T.back)}</a>

      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <p className={styles.subtitle}>{t(T.subtitle)}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.name)} *</label>
              <input
                className={styles.input}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.email)}</label>
              <div className={styles.readOnly}>{targetUser.email}</div>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.role)}</label>
              <select
                className={styles.select}
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                {Object.entries(T.roles).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.language)}</label>
              <select
                className={styles.select}
                value={language}
                onChange={e => setLanguage(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.formActions}>
          <button type="button" onClick={() => router.back()} className="btn btn-ghost" disabled={saving}>
            {t(T.cancel)}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t(T.saving) : t(T.save)}
          </button>
        </div>
      </form>
    </div>
  )
}
