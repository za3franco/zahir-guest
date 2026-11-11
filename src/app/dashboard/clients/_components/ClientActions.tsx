'use client'

import { useState } from 'react'

type Lang = 'en' | 'fr'

export function ArchiveClientButton({ clientId, archived, lang }: { clientId: string; archived: boolean; lang: Lang }) {
  const [busy, setBusy] = useState(false)
  const label = archived ? (lang === 'en' ? 'Restore' : 'Restaurer') : (lang === 'en' ? 'Archive' : 'Archiver')
  async function go() {
    if (!archived && !window.confirm(lang === 'en'
      ? 'Archive this client? Its properties, reports and accesses are kept; it is only hidden from the list.'
      : "Archiver ce client ? Ses établissements, rapports et accès sont conservés ; il est seulement masqué de la liste.")) return
    setBusy(true)
    const res = await fetch(`/api/clients/${clientId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: !archived }) })
    if (res.ok) window.location.reload()
    else setBusy(false)
  }
  return <button type="button" className="btn btn-ghost btn-sm" onClick={go} disabled={busy}>{label}</button>
}

export function ClientPropertiesManager({ clientId, linked, available, lang, styles }: {
  clientId: string
  linked: { id: string; name: string; city: string | null }[]
  available: { id: string; name: string; city: string | null; clientName: string | null }[]
  lang: Lang
  styles: Record<string, string>
}) {
  const [adding, setAdding] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const en = lang === 'en'

  async function patch(body: unknown) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/clients/${clientId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) window.location.reload()
    else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? (en ? 'Failed' : 'Échec'))
      setBusy(false)
    }
  }

  return (
    <div>
      {linked.length ? (
        <ul className={styles.list}>
          {linked.map(p => (
            <li key={p.id}>
              <span>
                <a href={`/dashboard/properties/${p.id}`}>{p.name}</a>
                {p.city && <span className={styles.muted}> · {p.city}</span>}
              </span>
              <button type="button" className={styles.inlineBtn} disabled={busy}
                onClick={() => window.confirm(en ? `Detach ${p.name} from this client?` : `Retirer ${p.name} de ce client ?`) && patch({ removePropertyIds: [p.id] })}>
                {en ? 'Detach' : 'Retirer'}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.muted}>{en ? 'No property attached yet.' : 'Aucun établissement rattaché.'}</p>
      )}

      {available.length > 0 && !adding && (
        <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
          {en ? 'Attach existing properties' : 'Rattacher des établissements existants'}
        </button>
      )}
      {adding && (
        <div>
          <div className={styles.checkList}>
            {available.map(p => (
              <label key={p.id}>
                <input type="checkbox" checked={picked.includes(p.id)}
                  onChange={e => setPicked(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))} />
                <span>{p.name}{p.city ? ` · ${p.city}` : ''}{p.clientName && <span className={styles.muted}> ({en ? 'now' : 'actuellement'} : {p.clientName})</span>}</span>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !picked.length} onClick={() => patch({ addPropertyIds: picked })}>
              {en ? `Attach (${picked.length})` : `Rattacher (${picked.length})`}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setAdding(false); setPicked([]) }}>{en ? 'Cancel' : 'Annuler'}</button>
          </div>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
