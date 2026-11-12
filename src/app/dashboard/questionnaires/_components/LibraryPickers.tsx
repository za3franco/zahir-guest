'use client'

import { useMemo, useState } from 'react'
import { keyOf, type LibQuestion } from '@/lib/questionnaireLibrary'
import styles from '../questionnaires.module.css'

type Lang = 'en' | 'fr'
type Named = { name_en: string; name_fr: string }

const CUSTOM = '__custom__'

/** A drop-down of ready-made names (both languages filled at once), with "Other…" to type your own. */
export function NamePicker({ lang, value, options, onChange, otherLabel, placeholder }: {
  lang: Lang
  value: Named
  options: Named[]
  onChange: (v: Named) => void
  otherLabel: string
  placeholder: string
}) {
  const match = options.find(o => keyOf(o.name_en) === keyOf(value.name_en) || (value.name_fr && keyOf(o.name_fr) === keyOf(value.name_fr)))
  const [custom, setCustom] = useState(!match && !!(value.name_en || value.name_fr))
  const selected = custom ? CUSTOM : match ? keyOf(match.name_en) : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <select
        className={styles.input}
        value={selected}
        onChange={e => {
          if (e.target.value === CUSTOM) { setCustom(true); if (match) onChange({ name_en: '', name_fr: '' }); return }
          const o = options.find(x => keyOf(x.name_en) === e.target.value)
          if (o) { setCustom(false); onChange({ name_en: o.name_en, name_fr: o.name_fr }) }
        }}
      >
        {!selected && <option value="">{placeholder}</option>}
        {options.map(o => <option key={keyOf(o.name_en)} value={keyOf(o.name_en)}>{lang === 'en' ? o.name_en : o.name_fr}</option>)}
        <option value={CUSTOM}>{otherLabel}</option>
      </select>
      {custom && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 8 }}>
          <input className={styles.input} placeholder={lang === 'en' ? 'Name in English' : 'Nom en français'} value={lang === 'en' ? value.name_en : value.name_fr}
            onChange={e => onChange(lang === 'en' ? { ...value, name_en: e.target.value } : { ...value, name_fr: e.target.value })} />
          <input className={styles.input} placeholder={lang === 'en' ? 'Name in French (optional)' : 'Nom en anglais (facultatif)'} value={lang === 'en' ? value.name_fr : value.name_en}
            onChange={e => onChange(lang === 'en' ? { ...value, name_fr: e.target.value } : { ...value, name_en: e.target.value })} />
        </div>
      )}
    </div>
  )
}

/** Pick questions from the library: the matching section first, search across everything. */
export function QuestionPicker({ lang, sectionQuestions, allQuestions, existing, onAdd, onClose }: {
  lang: Lang
  sectionQuestions: LibQuestion[]
  allQuestions: (LibQuestion & { where: string })[]
  existing: Set<string>
  onAdd: (qs: LibQuestion[]) => void
  onClose: () => void
}) {
  const en = lang === 'en'
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'section' | 'all'>(sectionQuestions.length ? 'section' : 'all')
  const [sel, setSel] = useState<Set<number>>(new Set())
  const text = (q: LibQuestion) => (en ? q.question_en : q.question_fr)

  const list = useMemo(() => {
    const base: (LibQuestion & { where?: string })[] = scope === 'section' ? sectionQuestions : allQuestions
    const q = query.trim().toLowerCase()
    return base.filter(x => !existing.has(keyOf(x.question_en)) && (!q || x.question_en.toLowerCase().includes(q) || x.question_fr.toLowerCase().includes(q))).slice(0, 200)
  }, [scope, query, sectionQuestions, allQuestions, existing])

  return (
    <div style={{ border: '1px solid var(--color-gold)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-deep-ink)' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className={styles.input} style={{ flex: '1 1 220px', width: 'auto' }} placeholder={en ? 'Search a question…' : 'Rechercher une question…'} value={query} onChange={e => setQuery(e.target.value)} />
        {sectionQuestions.length > 0 && (
          <select className={styles.input} style={{ width: 'auto' }} value={scope} onChange={e => { setScope(e.target.value as 'section' | 'all'); setSel(new Set()) }}>
            <option value="section">{en ? 'This section' : 'Cette section'}</option>
            <option value="all">{en ? 'Whole library' : 'Toute la bibliothèque'}</option>
          </select>
        )}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSel(new Set(list.map((_, i) => i)))}>{en ? 'Select all' : 'Tout sélectionner'}</button>
        <span className={styles.muted}>{list.length} {en ? 'available' : 'disponibles'}</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.length === 0 && <p className={styles.muted} style={{ margin: 0 }}>{en ? 'Nothing more to add here.' : 'Plus rien à ajouter ici.'}</p>}
        {list.map((q, i) => (
          <label key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--color-ivory)', fontSize: '0.9375rem' }}>
            <input type="checkbox" checked={sel.has(i)} onChange={e => setSel(p => { const n = new Set(p); e.target.checked ? n.add(i) : n.delete(i); return n })} style={{ marginTop: 3 }} />
            <span>
              {text(q)}
              {q.critical && <span className={styles.pill}>{en ? 'critical' : 'critique'}</span>}
              {'where' in q && q.where && scope === 'all' && <span className={styles.muted} style={{ display: 'block' }}>{q.where}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary btn-sm" disabled={!sel.size} onClick={() => onAdd(list.filter((_, i) => sel.has(i)))}>
          {en ? `Add ${sel.size || ''} question${sel.size > 1 ? 's' : ''}` : `Ajouter ${sel.size || ''} question${sel.size > 1 ? 's' : ''}`}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>{en ? 'Close' : 'Fermer'}</button>
      </div>
    </div>
  )
}
