'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Property, User } from '@/types'
import styles from './PropertyForm.module.css'

const T = {
  createTitle: { en: 'Add a property', fr: 'Ajouter un établissement' },
  editTitle: { en: 'Edit property', fr: "Modifier l'établissement" },
  createSubtitle: { en: 'Add a new hotel or establishment to your account.', fr: 'Ajoutez un nouvel hôtel ou établissement à votre compte.' },
  editSubtitle: { en: 'Update the details for this property.', fr: 'Mettez à jour les informations de cet établissement.' },
  sections: {
    basic: { en: 'Basic information', fr: 'Informations générales' },
    location: { en: 'Location', fr: 'Localisation' },
    contact: { en: 'Contact', fr: 'Contact' },
    profile: { en: 'Property profile', fr: "Profil de l'établissement" },
  },
  fields: {
    name: { en: 'Property name', fr: "Nom de l'établissement" },
    namePlaceholder: { en: 'e.g. Es Saadi Palace', fr: 'ex. Es Saadi Palace' },
    category: { en: 'Star rating', fr: 'Catégorie' },
    type: { en: 'Property type', fr: "Type d'établissement" },
    city: { en: 'City', fr: 'Ville' },
    cityPlaceholder: { en: 'e.g. Marrakech', fr: 'ex. Marrakech' },
    country: { en: 'Country', fr: 'Pays' },
    countryPlaceholder: { en: 'e.g. Morocco', fr: 'ex. Maroc' },
    region: { en: 'Region (optional)', fr: 'Région (optionnel)' },
    regionPlaceholder: { en: 'e.g. Marrakech-Safi', fr: 'ex. Marrakech-Safi' },
    contactName: { en: 'Contact name', fr: 'Nom du contact' },
    contactNamePlaceholder: { en: 'e.g. Ahmed Benali', fr: 'ex. Ahmed Benali' },
    contactEmail: { en: 'Contact email', fr: 'Email du contact' },
    propertyManager: { en: 'Property manager (optional)', fr: "Directeur d'établissement (optionnel)" },
    pmNone: { en: '— None assigned —', fr: '— Aucun assigné —' },
    phone: { en: 'Phone number', fr: 'Téléphone' },
    phonePlaceholder: { en: '+212 5XX XX XX XX', fr: '+212 5XX XX XX XX' },
    website: { en: 'Website', fr: 'Site web' },
    websitePlaceholder: { en: 'https://www.hotel.com', fr: 'https://www.hotel.com' },
    roomsCount: { en: 'Number of rooms', fr: 'Nombre de chambres' },
    roomsCountPlaceholder: { en: 'e.g. 120', fr: 'ex. 120' },
    gmName: { en: 'General Manager', fr: 'Directeur Général' },
    gmNamePlaceholder: { en: 'e.g. Fatima Zahra El Amrani', fr: 'ex. Fatima Zahra El Amrani' },
    officialStarRating: { en: 'Official classification (optional)', fr: 'Classement officiel (optionnel)' },
    officialStarRatingPlaceholder: { en: 'e.g. 5* Ministry of Tourism', fr: 'ex. 5* Ministère du Tourisme' },
  },
  categoryOptions: {
    '5_star': { en: '5 Stars ★★★★★', fr: '5 Étoiles ★★★★★' },
    '4_star': { en: '4 Stars ★★★★', fr: '4 Étoiles ★★★★' },
    '3_star': { en: '3 Stars ★★★', fr: '3 Étoiles ★★★' },
    '2_star': { en: '2 Stars ★★', fr: '2 Étoiles ★★' },
    '1_star': { en: '1 Star ★', fr: '1 Étoile ★' },
    unrated: { en: 'Unrated', fr: 'Non classé' },
  },
  typeOptions: {
    hotel: { en: 'Hotel', fr: 'Hôtel' },
    riad: { en: 'Riad', fr: 'Riad' },
    resort: { en: 'Resort', fr: 'Resort' },
    guesthouse: { en: 'Guesthouse', fr: "Maison d'hôtes" },
    apartment: { en: 'Apartment', fr: 'Appartement' },
    other: { en: 'Other', fr: 'Autre' },
  },
  save: { en: 'Save property', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  errors: {
    nameRequired: { en: 'Property name is required.', fr: "Le nom de l'établissement est requis." },
    countryRequired: { en: 'Country is required.', fr: 'Le pays est requis.' },
    saveFailed: { en: 'Failed to save. Please try again.', fr: "Erreur lors de l'enregistrement. Veuillez réessayer." },
  },
}

interface PropertyFormProps {
  user: User
  property?: Property
  propertyManagers: { id: string; name: string; email: string }[]
  mode: 'create' | 'edit'
}

export default function PropertyForm({ user, property, propertyManagers, mode }: PropertyFormProps) {
  const router = useRouter()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: property?.name ?? '',
    category: property?.category ?? '5_star',
    type: property?.type ?? 'hotel',
    city: property?.city ?? '',
    country: property?.country ?? 'Morocco',
    contact_name: property?.contact_name ?? '',
    contact_email: property?.contact_email ?? '',
    property_manager_user_id: property?.property_manager_user_id ?? '',
    region: property?.region ?? '',
    phone: property?.phone ?? '',
    website: property?.website ?? '',
    rooms_count: property?.rooms_count != null ? String(property.rooms_count) : '',
    gm_name: property?.gm_name ?? '',
    official_star_rating: property?.official_star_rating ?? '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim()) { setError(t(T.errors.nameRequired)); return }
    if (!form.country.trim()) { setError(t(T.errors.countryRequired)); return }

    setSaving(true)

    const payload = {
      ...form,
      city: form.city.trim() || null,
      contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim() || null,
      property_manager_user_id: form.property_manager_user_id || null,
      region: form.region.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      rooms_count: form.rooms_count.trim() ? parseInt(form.rooms_count.trim(), 10) : null,
      gm_name: form.gm_name.trim() || null,
      official_star_rating: form.official_star_rating.trim() || null,
    }

    const url = mode === 'create' ? '/api/properties' : `/api/properties/${property!.id}`
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
      router.push(`/dashboard/properties/${mode === 'create' ? data.id : property!.id}`)
    } catch {
      setError(t(T.errors.saveFailed))
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(mode === 'create' ? T.createTitle : T.editTitle)}</h1>
          <p className={styles.subtitle}>{t(mode === 'create' ? T.createSubtitle : T.editSubtitle)}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>

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
              <label className={styles.label}>{t(T.fields.category)}</label>
              <select className={styles.select} value={form.category} onChange={e => set('category', e.target.value)}>
                {Object.entries(T.categoryOptions).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.type)}</label>
              <select className={styles.select} value={form.type} onChange={e => set('type', e.target.value)}>
                {Object.entries(T.typeOptions).map(([value, label]) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.location)}</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.city)}</label>
              <input
                className={styles.input}
                type="text"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder={t(T.fields.cityPlaceholder)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.country)} *</label>
              <input
                className={styles.input}
                type="text"
                value={form.country}
                onChange={e => set('country', e.target.value)}
                placeholder={t(T.fields.countryPlaceholder)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t(T.fields.region)}</label>
            <input
              className={styles.input}
              type="text"
              value={form.region}
              onChange={e => set('region', e.target.value)}
              placeholder={t(T.fields.regionPlaceholder)}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.profile)}</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.roomsCount)}</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                value={form.rooms_count}
                onChange={e => set('rooms_count', e.target.value)}
                placeholder={t(T.fields.roomsCountPlaceholder)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.officialStarRating)}</label>
              <input
                className={styles.input}
                type="text"
                value={form.official_star_rating}
                onChange={e => set('official_star_rating', e.target.value)}
                placeholder={t(T.fields.officialStarRatingPlaceholder)}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.phone)}</label>
              <input
                className={styles.input}
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder={t(T.fields.phonePlaceholder)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.website)}</label>
              <input
                className={styles.input}
                type="url"
                value={form.website}
                onChange={e => set('website', e.target.value)}
                placeholder={t(T.fields.websitePlaceholder)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>{t(T.fields.gmName)}</label>
            <input
              className={styles.input}
              type="text"
              value={form.gm_name}
              onChange={e => set('gm_name', e.target.value)}
              placeholder={t(T.fields.gmNamePlaceholder)}
            />
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.formSectionTitle}>{t(T.sections.contact)}</h2>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.contactName)}</label>
              <input
                className={styles.input}
                type="text"
                value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)}
                placeholder={t(T.fields.contactNamePlaceholder)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.contactEmail)}</label>
              <input
                className={styles.input}
                type="email"
                value={form.contact_email}
                onChange={e => set('contact_email', e.target.value)}
                placeholder="contact@hotel.com"
              />
            </div>
          </div>

          {propertyManagers.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>{t(T.fields.propertyManager)}</label>
              <select
                className={styles.select}
                value={form.property_manager_user_id}
                onChange={e => set('property_manager_user_id', e.target.value)}
              >
                <option value="">{t(T.fields.pmNone)}</option>
                {propertyManagers.map(pm => (
                  <option key={pm.id} value={pm.id}>{pm.name} ({pm.email})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <div className={styles.formActions}>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-ghost"
            disabled={saving}
          >
            {t(T.cancel)}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? t(T.saving) : t(T.save)}
          </button>
        </div>
      </form>
    </div>
  )
}
