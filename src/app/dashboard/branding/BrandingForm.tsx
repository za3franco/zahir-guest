'use client'

import { useState } from 'react'
import styles from './branding.module.css'

interface Props {
  lang: 'en' | 'fr'
  allowed: boolean
  initial: { brandName: string; color: string; logoUrl: string | null }
}

const T = {
  intro: {
    en: 'Your logo, name and colour appear in the sidebar, on report covers and as the sender name of notification emails.',
    fr: "Votre logo, votre nom et votre couleur apparaissent dans la barre latérale, sur la couverture des rapports et comme nom d'expéditeur des emails de notification.",
  },
  locked: {
    en: 'White-label branding is included in the Professional and Enterprise plans.',
    fr: 'La marque blanche est incluse dans les forfaits Professional et Enterprise.',
  },
  upgrade: { en: 'View plans', fr: 'Voir les forfaits' },
  name: { en: 'Brand name', fr: 'Nom de la marque' },
  color: { en: 'Accent colour', fr: "Couleur d'accent" },
  logo: { en: 'Logo (PNG, JPG or WebP, max 1 MB)', fr: 'Logo (PNG, JPG ou WebP, 1 Mo max)' },
  remove: { en: 'Remove logo', fr: 'Retirer le logo' },
  save: { en: 'Save', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  saved: { en: 'Saved. Reload the page to see it in the sidebar.', fr: 'Enregistré. Rechargez la page pour le voir dans la barre latérale.' },
  preview: { en: 'Preview', fr: 'Aperçu' },
  generic: { en: 'Something went wrong.', fr: 'Une erreur est survenue.' },
}

export default function BrandingForm({ lang, allowed, initial }: Props) {
  const [brandName, setBrandName] = useState(initial.brandName)
  const [color, setColor] = useState(initial.color)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [file, setFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const t = (k: { en: string; fr: string }) => k[lang]

  const previewSrc = file ? URL.createObjectURL(file) : removeLogo ? null : logoUrl

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOk(false)
    const fd = new FormData()
    fd.set('brand_name', brandName)
    fd.set('primary_color', color)
    if (file) fd.set('logo', file)
    if (removeLogo) fd.set('remove_logo', '1')
    try {
      const res = await fetch('/api/branding', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? t(T.generic))
      } else {
        setLogoUrl(data.logo_url ?? null)
        setFile(null)
        setRemoveLogo(false)
        setOk(true)
      }
    } catch {
      setError(t(T.generic))
    }
    setLoading(false)
  }

  return (
    <form onSubmit={onSubmit} className={styles.card}>
      <p className={styles.intro}>{t(T.intro)}</p>

      {!allowed && (
        <div className={styles.locked}>
          <span>{t(T.locked)}</span>
          <a href="/dashboard/billing" className={styles.lockedLink}>{t(T.upgrade)}</a>
        </div>
      )}

      <fieldset disabled={!allowed || loading} className={styles.fields}>
        <div className="form-group">
          <label htmlFor="brand_name" className="form-label">{t(T.name)}</label>
          <input id="brand_name" type="text" className="form-input" value={brandName} maxLength={80}
            onChange={e => setBrandName(e.target.value)} />
        </div>

        <div className="form-group">
          <label htmlFor="color" className="form-label">{t(T.color)}</label>
          <div className={styles.colorRow}>
            <input id="color" type="color" value={color} onChange={e => setColor(e.target.value)} className={styles.colorPicker} />
            <input type="text" className="form-input" value={color} maxLength={7}
              onChange={e => setColor(e.target.value)} aria-label={t(T.color)} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="logo" className="form-label">{t(T.logo)}</label>
          <input id="logo" type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setRemoveLogo(false) }} />
          {(logoUrl || file) && (
            <button type="button" className={styles.linkBtn} onClick={() => { setFile(null); setRemoveLogo(true) }}>
              {t(T.remove)}
            </button>
          )}
        </div>
      </fieldset>

      <div className={styles.previewLabel}>{t(T.preview)}</div>
      <div className={styles.preview}>
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewSrc} alt="" className={styles.previewLogo} />
        ) : (
          <span className={styles.previewDot} style={{ background: color }} />
        )}
        <span className={styles.previewName}>{brandName || 'Zahir Guest'}</span>
        <span className={styles.previewBar} style={{ background: color }} />
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {ok && <div className={styles.ok} role="status">{t(T.saved)}</div>}

      <button type="submit" className="btn btn-primary" disabled={!allowed || loading}>
        {loading ? t(T.saving) : t(T.save)}
      </button>
    </form>
  )
}
