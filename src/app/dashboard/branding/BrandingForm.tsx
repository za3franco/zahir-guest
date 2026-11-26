'use client'

import { useMemo, useState } from 'react'
import {
  DEFAULT_ACCENT, DEFAULT_THEME, HEX_RE, THEME_PRESETS, dominantColor, readableAccent, themeVars,
} from '@/lib/brandColors'
import styles from './branding.module.css'

interface Props {
  lang: 'en' | 'fr'
  allowed: boolean
  initial: { brandName: string; color: string; theme: string; logoUrl: string | null }
}

const T = {
  intro: {
    en: 'Make Zahir Guest look like your company: your logo and name, your colours across the whole application, and your name as the sender of notification emails.',
    fr: "Faites ressembler Zahir Guest à votre société : votre logo et votre nom, vos couleurs dans toute l'application, et votre nom comme expéditeur des emails de notification.",
  },
  locked: {
    en: 'White-label branding is included in the Professional and Enterprise plans.',
    fr: 'La marque blanche est incluse dans les forfaits Professionnel et Entreprise.',
  },
  upgrade: { en: 'View plans', fr: 'Voir les forfaits' },
  name: { en: 'Brand name', fr: 'Nom de la marque' },
  logo: { en: 'Logo (PNG, JPG or WebP, max 1 MB)', fr: 'Logo (PNG, JPG ou WebP, 1 Mo max)' },
  remove: { en: 'Remove logo', fr: 'Retirer le logo' },
  fromLogo: { en: 'Use the colours of my logo', fr: 'Reprendre les couleurs de mon logo' },
  fromLogoNone: {
    en: 'No dominant colour found in this logo (it looks black, white or grey). Pick the colours below.',
    fr: "Aucune couleur dominante dans ce logo (il semble noir, blanc ou gris). Choisissez les couleurs ci-dessous.",
  },
  fromLogoDone: {
    en: 'Colours taken from your logo. Adjust them below if you wish.',
    fr: 'Couleurs reprises de votre logo. Ajustez-les ci-dessous si besoin.',
  },
  main: { en: 'Main colour', fr: 'Couleur principale' },
  mainHint: {
    en: 'Buttons, titles, links and highlighted items. Pick the colour of your brand.',
    fr: 'Boutons, titres, liens et éléments mis en avant. Choisissez la couleur de votre marque.',
  },
  bg: { en: 'Background colour (theme)', fr: 'Couleur du fond (thème)' },
  bgHint: {
    en: 'The tint of the application background. It stays light so that texts remain readable: your colour sets the hue.',
    fr: "La teinte de l'arrière-plan de l'application. Il reste clair pour que les textes restent lisibles : votre couleur donne la teinte.",
  },
  custom: { en: 'Other colour', fr: 'Autre couleur' },
  reset: { en: 'Back to the Zahir Guest colours', fr: 'Revenir aux couleurs Zahir Guest' },
  invalidHex: { en: 'Use the format #RRGGBB (for example #8A5A18).', fr: 'Utilisez le format #RRGGBB (par exemple #8A5A18).' },
  save: { en: 'Save', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  saved: { en: 'Saved. Reload the page to see it everywhere.', fr: "Enregistré. Rechargez la page pour le voir partout." },
  preview: { en: 'Preview', fr: 'Aperçu' },
  previewTitle: { en: 'Audits in progress', fr: 'Audits en cours' },
  previewButton: { en: 'New campaign', fr: 'Nouvelle campagne' },
  generic: { en: 'Something went wrong.', fr: 'Une erreur est survenue.' },
}

/** Dominant colour of an image source, or null (needs a same-origin or CORS-enabled image). */
function colourFromImage(src: string, remote: boolean): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image()
    if (remote) img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size; canvas.height = size
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, size, size)
        resolve(dominantColor(ctx.getImageData(0, 0, size, size).data))
      } catch { resolve(null) }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function ColourField({ id, label, hint, value, onChange, swatches, lang, invalid }: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
  swatches?: { hex: string; name: string }[]
  lang: 'en' | 'fr'
  invalid: boolean
}) {
  const picker = HEX_RE.test(value) ? value : '#000000'
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">{label}</label>
      <p className={styles.hint}>{hint}</p>
      {swatches && (
        <div className={styles.swatches} role="group" aria-label={label}>
          {swatches.map(s => (
            <button key={s.hex} type="button" title={s.name} aria-label={s.name} aria-pressed={value.toUpperCase() === s.hex}
              className={`${styles.swatch} ${value.toUpperCase() === s.hex ? styles.swatchOn : ''}`}
              style={{ background: s.hex }} onClick={() => onChange(s.hex)} />
          ))}
        </div>
      )}
      <div className={styles.colorRow}>
        <input id={id} type="color" value={picker} onChange={e => onChange(e.target.value.toUpperCase())} className={styles.colorPicker}
          aria-label={`${label} (${lang === 'en' ? 'picker' : 'sélecteur'})`} />
        <input type="text" className="form-input" value={value} maxLength={7} spellCheck={false} autoCapitalize="characters"
          onChange={e => onChange(e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`)} aria-label={`${label} (#RRGGBB)`} />
      </div>
      {invalid && <span className={styles.error} role="alert">{lang === 'en' ? T.invalidHex.en : T.invalidHex.fr}</span>}
    </div>
  )
}

export default function BrandingForm({ lang, allowed, initial }: Props) {
  const [brandName, setBrandName] = useState(initial.brandName)
  const [color, setColor] = useState(initial.color)
  const [theme, setTheme] = useState(initial.theme)
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl)
  const [file, setFile] = useState<File | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [logoNote, setLogoNote] = useState<string | null>(null)
  const t = (k: { en: string; fr: string }) => k[lang]

  const previewSrc = useMemo(() => (file ? URL.createObjectURL(file) : removeLogo ? null : logoUrl), [file, removeLogo, logoUrl])
  const colorOk = HEX_RE.test(color)
  const themeOk = HEX_RE.test(theme)

  // The preview applies the colours exactly as the application does
  const previewVars = {
    ...(themeOk ? themeVars(theme) ?? {} : {}),
    '--color-gold': readableAccent(colorOk ? color : DEFAULT_ACCENT),
  } as React.CSSProperties

  async function takeLogoColours() {
    setLogoNote(null)
    if (!previewSrc) return
    const c = await colourFromImage(previewSrc, !file)
    if (!c) { setLogoNote(t(T.fromLogoNone)); return }
    setColor(c)
    setTheme(c)
    setLogoNote(t(T.fromLogoDone))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!colorOk || !themeOk) return
    setLoading(true)
    setError(null)
    setOk(false)
    const fd = new FormData()
    fd.set('brand_name', brandName)
    fd.set('primary_color', color)
    fd.set('theme_color', theme.toUpperCase() === DEFAULT_THEME ? '' : theme)
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
          <label htmlFor="logo" className="form-label">{t(T.logo)}</label>
          <input id="logo" type="file" accept="image/png,image/jpeg,image/webp"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setRemoveLogo(false); setLogoNote(null) }} />
          <div className={styles.logoActions}>
            {previewSrc && (
              <button type="button" className={styles.secondaryBtn} onClick={takeLogoColours}>{t(T.fromLogo)}</button>
            )}
            {(logoUrl || file) && (
              <button type="button" className={styles.linkBtn} onClick={() => { setFile(null); setRemoveLogo(true); setLogoNote(null) }}>
                {t(T.remove)}
              </button>
            )}
          </div>
          {logoNote && <span className={styles.hint} role="status">{logoNote}</span>}
        </div>

        <ColourField id="color" label={t(T.main)} hint={t(T.mainHint)} value={color} onChange={setColor} lang={lang} invalid={!colorOk} />

        <ColourField id="theme" label={t(T.bg)} hint={t(T.bgHint)} value={theme} onChange={setTheme} lang={lang} invalid={!themeOk}
          swatches={THEME_PRESETS.map(p => ({ hex: p.hex, name: lang === 'en' ? p.en : p.fr }))} />

        <button type="button" className={styles.linkBtn} onClick={() => { setColor(DEFAULT_ACCENT); setTheme(DEFAULT_THEME); setLogoNote(null) }}>
          {t(T.reset)}
        </button>
      </fieldset>

      <div className={styles.previewLabel}>{t(T.preview)}</div>
      <div className={styles.mock} style={previewVars} aria-hidden="true">
        <div className={styles.mockSide}>
          {previewSrc
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={previewSrc} alt="" className={styles.previewLogo} />
            : <span className={styles.previewDot} />}
          <span className={styles.previewName}>{brandName || 'Zahir Guest'}</span>
          <span className={styles.mockNav} />
          <span className={styles.mockNav} />
        </div>
        <div className={styles.mockMain}>
          <span className={styles.mockTitle}>{t(T.previewTitle)}</span>
          <span className={styles.mockCard}><span className={styles.mockLine} /><span className={styles.mockLineShort} /></span>
          <span className={styles.mockButton}>{t(T.previewButton)}</span>
        </div>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}
      {ok && <div className={styles.ok} role="status">{t(T.saved)}</div>}

      <button type="submit" className="btn btn-primary" disabled={!allowed || loading || !colorOk || !themeOk}>
        {loading ? t(T.saving) : t(T.save)}
      </button>
    </form>
  )
}
