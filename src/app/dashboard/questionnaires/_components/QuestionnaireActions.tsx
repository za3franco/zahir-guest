'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function QuestionnaireActions({ id, name, active, lang }: { id: string; name: string; active: boolean; lang: 'en' | 'fr' }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const en = lang === 'en'

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    await fetch(`/api/questionnaires/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setBusy(false)
    router.refresh()
  }

  async function remove() {
    if (!window.confirm(en ? `Delete “${name}” permanently?` : `Supprimer définitivement « ${name} » ?`)) return
    setBusy(true)
    const res = await fetch(`/api/questionnaires/${id}`, { method: 'DELETE' })
    const json = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { window.alert(json.error || (en ? 'Could not delete.' : 'Suppression impossible.')); return }
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={busy}
        onClick={() => {
          const n = window.prompt(en ? 'New name' : 'Nouveau nom', name)
          if (n && n.trim() && n.trim() !== name) patch({ name: n.trim() })
        }}
      >
        {en ? 'Rename' : 'Renommer'}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => patch({ is_active: !active })}>
        {active ? (en ? 'Archive' : 'Archiver') : (en ? 'Restore' : 'Restaurer')}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={remove} style={{ color: '#E8897E' }}>
        {en ? 'Delete' : 'Supprimer'}
      </button>
    </div>
  )
}
