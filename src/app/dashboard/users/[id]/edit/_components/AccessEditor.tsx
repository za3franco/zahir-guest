'use client'

import { useMemo, useState } from 'react'
import styles from './EditUserForm.module.css'

type Lang = 'en' | 'fr'

interface Props {
  userId: string
  lang: Lang
  clients: { id: string; name: string }[]
  properties: { id: string; name: string; city: string | null; client_id: string | null }[]
  initialClientIds: string[]
  initialPropertyIds: string[]
}

const T = {
  title: { en: 'Access to reports', fr: 'Accès aux rapports' },
  intro: {
    en: 'Choose what this person can see. A whole client includes all its properties, including those added later. They only ever see published reports.',
    fr: "Choisissez ce que cette personne peut voir. Un client entier inclut tous ses établissements, y compris ceux ajoutés plus tard. Elle ne voit que les rapports publiés.",
  },
  whole: { en: 'Whole client', fr: 'Tout le client' },
  noClient: { en: 'Properties without a client', fr: 'Établissements sans client' },
  save: { en: 'Save access', fr: "Enregistrer l'accès" },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  saved: { en: 'Access saved.', fr: 'Accès enregistré.' },
  failed: { en: 'Failed to save access.', fr: "Échec de l'enregistrement de l'accès." },
  summary: (c: number, p: number, l: Lang) =>
    l === 'en' ? `${c} client(s) and ${p} individual property(ies)` : `${c} client(s) et ${p} établissement(s) à l'unité`,
  empty: { en: 'No property yet. Create properties first.', fr: "Aucun établissement. Créez d'abord des établissements." },
}

export default function AccessEditor({ userId, lang, clients, properties, initialClientIds, initialPropertyIds }: Props) {
  const t = (k: { en: string; fr: string }) => k[lang]
  const [clientIds, setClientIds] = useState<string[]>(initialClientIds)
  const [propertyIds, setPropertyIds] = useState<string[]>(initialPropertyIds)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const groups = useMemo(() => {
    const g = clients.map(c => ({ id: c.id as string | null, name: c.name, props: properties.filter(p => p.client_id === c.id) }))
    const orphans = properties.filter(p => !p.client_id || !clients.some(c => c.id === p.client_id))
    if (orphans.length) g.push({ id: null, name: t(T.noClient), props: orphans })
    return g
  }, [clients, properties]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) =>
    set(on ? Array.from(new Set([...list, id])) : list.filter(x => x !== id))

  async function save() {
    setBusy(true)
    setMsg(null)
    // Properties already covered by a whole client are not stored twice
    const covered = new Set(properties.filter(p => p.client_id && clientIds.includes(p.client_id)).map(p => p.id))
    const res = await fetch(`/api/users/${userId}/access`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientIds, propertyIds: propertyIds.filter(id => !covered.has(id)) }),
    })
    const d = await res.json().catch(() => ({}))
    setBusy(false)
    setMsg(res.ok ? { ok: true, text: t(T.saved) } : { ok: false, text: d.error ?? t(T.failed) })
  }

  return (
    <div className={styles.section} style={{ marginTop: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.25rem', color: 'var(--color-gold)', margin: '0 0 6px' }}>{t(T.title)}</h2>
      <p style={{ color: 'var(--color-sand)', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 16px' }}>{t(T.intro)}</p>

      {!properties.length && <p style={{ color: 'var(--color-sand)' }}>{t(T.empty)}</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.filter(g => g.props.length || g.id).map(g => {
          const whole = !!g.id && clientIds.includes(g.id)
          return (
            <div key={g.id ?? 'none'} style={{ border: '1px solid var(--color-border-subtle)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <strong style={{ color: 'var(--color-ivory)' }}>{g.name}</strong>
                {g.id && (
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.875rem', color: 'var(--color-gold)' }}>
                    <input type="checkbox" checked={whole} onChange={e => toggle(clientIds, setClientIds, g.id!, e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--color-gold)' }} />
                    {t(T.whole)}
                  </label>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {g.props.map(p => (
                  <label key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.9375rem', color: whole ? 'var(--color-sand)' : 'var(--color-ivory)' }}>
                    <input type="checkbox" disabled={whole} checked={whole || propertyIds.includes(p.id)}
                      onChange={e => toggle(propertyIds, setPropertyIds, p.id, e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--color-gold)' }} />
                    {p.name}{p.city ? ` · ${p.city}` : ''}
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? t(T.saving) : t(T.save)}</button>
        <span style={{ fontSize: '0.8125rem', color: msg ? (msg.ok ? '#7fc4a8' : '#E8897E') : 'var(--color-sand)' }}>
          {msg ? msg.text : T.summary(clientIds.length, propertyIds.length, lang)}
        </span>
      </div>
    </div>
  )
}
