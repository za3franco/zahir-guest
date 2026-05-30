'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import styles from './profile.module.css'

const T = {
  title: { en: 'My Profile', fr: 'Mon Profil' },
  subtitle: { en: 'Manage your account settings.', fr: 'Gérez les paramètres de votre compte.' },
  sections: {
    identity: { en: 'Identity', fr: 'Identité' },
    password: { en: 'Change Password', fr: 'Changer le mot de passe' },
  },
  fields: {
    name: { en: 'Full name', fr: 'Nom complet' },
    email: { en: 'Email', fr: 'Email' },
    role: { en: 'Role', fr: 'Rôle' },
    language: { en: 'Interface language', fr: "Langue de l'interface" },
    newPassword: { en: 'New password', fr: 'Nouveau mot de passe' },
    confirmPassword: { en: 'Confirm new password', fr: 'Confirmer le nouveau mot de passe' },
  },
  save: { en: 'Save changes', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  updatePassword: { en: 'Update password', fr: 'Mettre à jour' },
  updating: { en: 'Updating…', fr: 'Mise à jour…' },
  back: { en: '← Back to dashboard', fr: '← Retour au tableau de bord' },
  successProfile: { en: 'Profile updated.', fr: 'Profil mis à jour.' },
  successPassword: { en: 'Password updated successfully.', fr: 'Mot de passe mis à jour.' },
  errors: {
    passwordMismatch: { en: 'Passwords do not match.', fr: 'Les mots de passe ne correspondent pas.' },
    passwordShort: { en: 'Password must be at least 8 characters.', fr: 'Le mot de passe doit contenir au moins 8 caractères.' },
    failed: { en: 'Update failed. Please try again.', fr: 'Échec de la mise à jour. Veuillez réessayer.' },
  },
  roleLabels: {
    super_admin: { en: 'Super Admin', fr: 'Super Admin' },
    tenant_admin: { en: 'Admin', fr: 'Administrateur' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    property_manager: { en: 'Property Manager', fr: 'Directeur' },
  },
}

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  default_language: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [lang, setLang] = useState<'en' | 'fr'>('fr')
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [language, setLanguage] = useState('fr')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const t = (key: { en: string; fr: string }) => key[lang]

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/user/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data)
        setName(data.name)
        setLanguage(data.default_language ?? 'fr')
        setLang(data.default_language === 'en' ? 'en' : 'fr')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    setSavingProfile(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), default_language: language }),
      })
      if (!res.ok) {
        const data = await res.json()
        setProfileError(data.error ?? t(T.errors.failed))
      } else {
        setProfileSuccess(true)
        setTimeout(() => setProfileSuccess(false), 3000)
        if (language !== user?.default_language) {
          setTimeout(() => window.location.reload(), 500)
        }
      }
    } catch {
      setProfileError(t(T.errors.failed))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 8) { setPasswordError(t(T.errors.passwordShort)); return }
    if (newPassword !== confirmPassword) { setPasswordError(t(T.errors.passwordMismatch)); return }

    setSavingPassword(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setPasswordError(error.message)
      } else {
        setPasswordSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordSuccess(false), 4000)
      }
    } catch {
      setPasswordError(t(T.errors.failed))
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <div className={styles.page}><p style={{ color: 'var(--color-sand)' }}>Loading…</p></div>
  }
  if (!user) return null

  const roleLabel = T.roleLabels[user.role as keyof typeof T.roleLabels]?.[lang] ?? user.role

  return (
    <div className={styles.page}>
      <a href="/dashboard" className={styles.backLink}>{t(T.back)}</a>

      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <p className={styles.subtitle}>{t(T.subtitle)}</p>
      </div>

      <div className={styles.sections}>
        {/* Identity */}
        <form onSubmit={handleSaveProfile} className={styles.section}>
          <h2 className={styles.sectionTitle}>{t(T.sections.identity)}</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.name)}</label>
              <input className={styles.input} type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.email)}</label>
              <div className={styles.readOnly}>{user.email}</div>
              <p className={styles.hint}>
                {lang === 'en' ? 'Contact your admin to change your email.' : 'Contactez votre administrateur pour changer votre email.'}
              </p>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.role)}</label>
              <div className={styles.readOnly}>{roleLabel}</div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.language)}</label>
              <select className={styles.select} value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {profileSuccess && <div className={styles.successBanner}>{t(T.successProfile)}</div>}
          {profileError && <div className={styles.errorBanner}>{profileError}</div>}

          <div className={styles.formActions}>
            <a href="/dashboard" className="btn btn-ghost">{lang === 'en' ? 'Cancel' : 'Annuler'}</a>
            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? t(T.saving) : t(T.save)}
            </button>
          </div>
        </form>

        {/* Password */}
        <form onSubmit={handleChangePassword} className={styles.section}>
          <h2 className={styles.sectionTitle}>{t(T.sections.password)}</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.newPassword)}</label>
              <input className={styles.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8 characters" minLength={8} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.confirmPassword)}</label>
              <input className={styles.input} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={lang === 'en' ? 'Repeat new password' : 'Répéter le nouveau mot de passe'} required />
            </div>
          </div>

          {passwordSuccess && <div className={styles.successBanner}>{t(T.successPassword)}</div>}
          {passwordError && <div className={styles.errorBanner}>{passwordError}</div>}

          <div className={styles.formActions}>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? t(T.updating) : t(T.updatePassword)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
