'use client'

import { useRef, useState } from 'react'
import { compressImage } from '@/lib/imageCompress'
import { MAX_PHOTOS_PER_STANDARD, MAX_PHOTOS_PER_CAMPAIGN } from '@/lib/photos'
import type { PhotoView } from '@/lib/offline/auditSync'
import styles from './StandardPhotos.module.css'

const T = {
  add: { en: 'Add photo', fr: 'Ajouter une photo' },
  preparing: { en: 'Preparing…', fr: 'Préparation…' },
  remove: { en: 'Remove photo', fr: 'Retirer la photo' },
  confirm: { en: 'Remove this photo?', fr: 'Retirer cette photo ?' },
  failed: { en: 'Photo could not be added.', fr: "La photo n'a pas pu être ajoutée." },
  pending: { en: 'On the phone', fr: 'Sur le téléphone' },
  rejected: { en: 'Refused', fr: 'Refusée' },
  limitStandard: { en: `Maximum ${MAX_PHOTOS_PER_STANDARD} photos per standard.`, fr: `Maximum ${MAX_PHOTOS_PER_STANDARD} photos par standard.` },
  limitTotal: { en: `Maximum ${MAX_PHOTOS_PER_CAMPAIGN} photos per audit.`, fr: `Maximum ${MAX_PHOTOS_PER_CAMPAIGN} photos par audit.` },
}

// Photos of one standard. A new photo is shrunk, kept on the phone and shown at once; it is uploaded in the
// background by the synchronisation (works offline). The "On the phone" badge stays until the server has it.
export default function StandardPhotos({ photos, lang, onAdd, onRemove }: {
  photos: PhotoView[]
  lang: 'en' | 'fr'
  onAdd: (blob: Blob) => Promise<'limit_standard' | 'limit_total' | null>
  onRemove: (photoId: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = (k: { en: string; fr: string }) => k[lang]

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow picking the same file again
    if (!files.length) return
    setBusy(true)
    setError(null)
    for (const f of files.slice(0, Math.max(0, MAX_PHOTOS_PER_STANDARD - photos.length))) {
      try {
        const small = await compressImage(f)
        const limit = await onAdd(small)
        if (limit) { setError(t(limit === 'limit_standard' ? T.limitStandard : T.limitTotal)); break }
      } catch {
        setError(t(T.failed))
        break
      }
    }
    setBusy(false)
  }

  function remove(id: string) {
    if (!window.confirm(t(T.confirm))) return
    onRemove(id)
  }

  return (
    <div className={styles.wrap}>
      {photos.length > 0 && (
        <div className={styles.thumbs}>
          {photos.map(p => (
            <div key={p.id} className={`${styles.thumb} ${p.rejected ? styles.thumbRejected : ''}`} title={p.rejected ?? undefined}>
              <a href={p.src} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt="" loading="lazy" />
              </a>
              {p.pending && (
                <span className={`${styles.badge} ${p.rejected ? styles.badgeError : ''}`}>
                  {p.rejected ? `⚠ ${t(T.rejected)}` : t(T.pending)}
                </span>
              )}
              <button type="button" onClick={() => remove(p.id)} aria-label={t(T.remove)} className={styles.del}>×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < MAX_PHOTOS_PER_STANDARD && (
        <>
          <button type="button" className={styles.addBtn} onClick={() => inputRef.current?.click()} disabled={busy}>
            📷 {busy ? t(T.preparing) : t(T.add)}
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} className={styles.hidden} />
        </>
      )}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  )
}
