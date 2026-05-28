'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'
import styles from './CampaignForm.module.css'

const T = {
  createTitle: { en: 'New campaign', fr: 'Nouvelle campagne' },
  editTitle: { en: 'Edit campaign', fr: 'Modifier la campagne' },
  createSubtitle: { en: 'Set up a new mystery guest audit campaign.', fr: 'Configurez une nouvelle campagne d\'audit mystère.' },
  editSubtitle: { en: 'Update the details for this campaign.', fr: 'Mettez à jour les informations de cette campagne.' },
  sections: {
    basic: { en: 'Campaign details', fr: 'Détails de la campagne' },
    assignment: { en: 'Assignment', fr: 'Assignation' },
    window: { en: 'Visit window', fr: 'Fenêtre de visite' },
  },
  fields: {
    name: { en: 'Campaign name', fr: 'Nom de la campagne' },
    namePlaceholder: { en: 'e.g. Es Saadi Palace — June 2026', fr: 'ex. Es Saadi Palace — Juin 2026' },
    property: { en: 'Property', fr: 'Établissement' },
    propertyNone: { en: '— Select a property —', fr: '— Sélectionnez un établissement —' },
    template: { en: 'Questionnaire template', fr: 'Modèle de questionnaire' },
    templateNone: { en: '— Select a template —', fr: '— Sélectionnez un modèle —' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    auditorNone: { en: '— Assign later —', fr: '— Assigner plus tard —' },
    visitStart: { en: 'Visit from', fr: 'Visite du' },
    visitEnd: { en: 'Visit until', fr: 'Visite au' },
  },
  save: { en: 'Save campaign', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  errors: {
    nameRequired: { en: 'Campaign name is required.', fr: 'Le nom de la campagne est requis.' },
    propertyRequired: { en: 'Please select a property.', fr: 'Veuillez sélectionner un établissement.' },
    templateRequired: { en: 'Please select a questionnaire template.', fr: 'Veuillez sélectionner un modèle de questionnaire.' },
    saveFailed: { en: 'Failed to save. Please try again.', fr: 'Erreur lors de l\'enregistrement. Veuillez réessayer.' },
    noProperties: { en: 'No properties found. Add a property first.', fr: 'Aucun établissement trouvé. Ajoutez d\'abord un établissement.' },
    noTemplates: { en: 'No questionnaire templates available.', fr: 'Aucun modèle de questionnaire disponible.' },
  },
}

interface CampaignFormProps {
  user: User
  campaign?: any
  properties: { id: string; name: string; city?: string | null; category: string }[]
  auditors: { id: string; name: string; email: string }[]
  templates: { id: string; name: string; tier: string }[]
  mode: 'create' | 'edit'
  defaultPropertyId?: string
}

export default function CampaignForm({
  user,
  campaign,
  properties,
  auditors,
  templates,
  mode,
  defaultPropertyId,
}: CampaignFormProps) {
  const router = useRouter()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: campaign?.name ?? '',
    property_id: campaign?.property_id ?? defaultPropertyId ?? '',
    template_id: campaign?.template_id ?? (templates.length === 1 ? templates[0].id : ''),
    auditor_user_id: campaign?.auditor_user_id ?? '',
    visit_window_start: campaign?.visit_window_start?.slice(0, 10) ?? '',
    visit_window_end: campaign?.visit_window_end?.slice(0, 10) ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError(t(T.errors.nameRequired)); return }
    if (!form.property_id) { setError(t(T.errors.propertyRequired)); return }
    if (!form.template_id) { setError(t(T.errors.templateRequired)); return }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      property_id: form.property_id,
      template_id: form.template_id,
      auditor_user_id: form.auditor_user_id || null,
      visit_window_start: form.visit_window_start || null,
      visit_window_end: form.visit_window_end || null,
    }

    const url = mode === 'create' ? '/api/campaigns' : `/api/campaigns/${campaign.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? t(T.errors.saveFailed))
        setSaving(false)
        return
      }

      const data = await res.json()
      router.push(`/dashboard/campaigns/${mode === 'create' ? data.id : campaign.id}`)
    } catch {
      setError(t(T.errors.saveFailed))
      setSaving(false)
    }
  }

  if (properties.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <p>{t(T.errors.noProperties)}</p>
          <a href="/dashboard/properties/new" className="btn btn-primary">
            {lang === 'en' ? '+ Add property' : '+ Ajouter un établissement'}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <style>{`
        @media (max-width: 768px) {
          input, select, textarea {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      <div className={styles.header}>
        <h1 className={styles.title}>{t(mode === 'create' ? T.createTitle : T.editTitle)}</h1>
        <p className={styles.subtitle}>{t(mode === 'create' ? T.createSubtitle : T.editSubtitle)}</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>

        {/* Basic details */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.basic)}</h2>

          <div className={styles.field}>
            <label className={styles.label}>{t(T.fields.name)} *</label>
            <input
              className={styles.input}
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder={t(T.fields.namePlaceholder)}
              required
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.property)} *</label>
              <select className={styles.select} value={form.property_id} onChange={e => set('property_id', e.target.value)} required>
                <option value="">{t(T.fields.propertyNone)}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.city ? ` — ${p.city}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.template)} *</label>
              <select className={styles.select} value={form.template_id} onChange={e => set('template_id', e.target.value)} required>
                <option value="">{t(T.fields.templateNone)}</option>
                {templates.map(tpl => (
                  <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.assignment)}</h2>

          <div className={styles.field}>
            <label className={styles.label}>{t(T.fields.auditor)}</label>
            <select className={styles.select} value={form.auditor_user_id} onChange={e => set('auditor_user_id', e.target.value)}>
              <option value="">{t(T.fields.auditorNone)}</option>
              {auditors.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visit window */}
        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.window)}</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.visitStart)}</label>
              <input
                className={styles.input}
                type="date"
                value={form.visit_window_start}
                onChange={e => set('visit_window_start', e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.visitEnd)}</label>
              <input
                className={styles.input}
                type="date"
                value={form.visit_window_end}
                onChange={e => set('visit_window_end', e.target.value)}
              />
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
