'use client'

import { useRef, useState } from 'react'
import { compressImage } from '@/lib/imageCompress'
import { MAX_PHOTOS_PER_STANDARD } from '@/lib/photos'
import styles from './StandardPhotos.module.css'

export interface PhotoRef { id: string }

const T = {
  add: { en: 'Add photo', fr: 'Ajouter une photo' },
  uploading: { en: 'Uploading…', fr: 'Envoi…' },
  remove: { en: 'Remove photo', fr: 'Retirer la photo' },
  confirm: { en: 'Remove this photo?', fr: 'Retirer cette photo ?' },
  failed: { en: 'Photo could not be added.', fr: "La photo n'a pas pu être ajoutée." },
}

export default function StandardPhotos({ campaignId, standardId, photos, lang, onChange }: {
  campaignId: string
  standardId: string
  photos: PhotoRef[]
  lang: 'en' | 'fr'
  onChange: (photos: PhotoRef[]) => void
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
    let current = photos
    for (const f of files.slice(0, MAX_PHOTOS_PER_STANDARD - photos.length)) {
      try {
        const small = await compressImage(f)
        const fd = new FormData()
        fd.set('standard_id', standardId)
        fd.set('file', small)
        const res = await fetch(`/api/audit/${campaignId}/photos`, { method: 'POST', body: fd })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) { setError(data.error ?? t(T.failed)); break }
        current = [...current, { id: data.id }]
        onChange(current)
      } catch {
        setError(t(T.failed))
        break
      }
    }
    setBusy(false)
  }

  async function remove(id: string) {
    if (!window.confirm(t(T.confirm))) return
    const res = await fetch(`/api/audit/${campaignId}/photos?photo_id=${id}`, { method: 'DELETE' })
    if (res.ok) onChange(photos.filter(p => p.id !== id))
  }

  return (
    <div className={styles.wrap}>
      {photos.length > 0 && (
        <div className={styles.thumbs}>
          {photos.map(p => (
            <div key={p.id} className={styles.thumb}>
              <a href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/photos/${p.id}`} alt="" loading="lazy" />
              </a>
              <button type="button" onClick={() => remove(p.id)} aria-label={t(T.remove)} className={styles.del}>×</button>
            </div>
          ))}
        </div>
      )}
      {photos.length < MAX_PHOTOS_PER_STANDARD && (
        <>
          <button type="button" className={styles.addBtn} onClick={() => inputRef.current?.click()} disabled={busy}>
            📷 {busy ? t(T.uploading) : t(T.add)}
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} className={styles.hidden} />
        </>
      )}
      {error && <div className={styles.error} role="alert">{error}</div>}
    </div>
  )
}
