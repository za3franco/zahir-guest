'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { essentials, type Library } from '@/lib/questionnaireLibrary'
import styles from '../questionnaires.module.css'

type Lang = 'en' | 'fr'
type Mode = 'guided' | 'copy' | null

const T = {
  back: { en: '← Questionnaires', fr: '← Questionnaires' },
  title: { en: 'New questionnaire', fr: 'Nouveau questionnaire' },
  subtitle: { en: 'Choose how you want to start. Everything stays editable afterwards.', fr: 'Choisissez comment démarrer. Tout reste modifiable ensuite.' },
  guided: { en: 'Start from the Zahir Guest standards', fr: 'Partir des standards Zahir Guest' },
  guidedDesc: { en: 'Tick the departments to audit; questions are filled in for you, in English and French.', fr: 'Cochez les services à auditer : les questions sont remplies pour vous, en français et en anglais.' },
  recommended: { en: 'Recommended', fr: 'Recommandé' },
  ai: { en: 'Convert your own standards', fr: 'Convertir vos propres standards' },
  aiDesc: { en: 'Upload your existing standards or questionnaire (PDF, Word, Excel, photo): AI puts it into the Zahir Guest format.', fr: "Déposez vos standards ou votre questionnaire existant (PDF, Word, Excel, photo) : l'IA le met au format Zahir Guest." },
  file: { en: 'Import a spreadsheet', fr: 'Importer un tableur' },
  fileDesc: { en: 'A CSV or Excel file already in the Zahir Guest columns.', fr: 'Un fichier CSV ou Excel déjà aux colonnes Zahir Guest.' },
  copy: { en: 'Copy a questionnaire', fr: 'Copier un questionnaire' },
  copyDesc: { en: 'Duplicate one of your questionnaires or a standard, then adapt it.', fr: "Dupliquez l'un de vos questionnaires ou un standard, puis adaptez-le." },
  blank: { en: 'or start from a blank questionnaire', fr: 'ou partir d’un questionnaire vide' },
  name: { en: 'Questionnaire name', fr: 'Nom du questionnaire' },
  namePh: { en: 'e.g. Resort audit 2027', fr: 'ex. Audit resort 2027' },
  cover: { en: '1. What will the audit cover?', fr: "1. Que couvre l'audit ?" },
  presets: { en: 'Quick choice:', fr: 'Choix rapide :' },
  pFull: { en: 'Full hotel', fr: 'Hôtel complet' },
  pRooms: { en: 'Rooms division', fr: 'Hébergement' },
  pFnb: { en: 'Food & beverage', fr: 'Restauration & bar' },
  pWell: { en: 'Wellness & spa', fr: 'Bien-être & spa' },
  pNone: { en: 'Clear', fr: 'Tout décocher' },
  toWrite: { en: 'questions to write', fr: 'questions à rédiger' },
  questions: { en: 'questions', fr: 'questions' },
  depth: { en: '2. How detailed?', fr: '2. Quel niveau de détail ?' },
  essential: { en: 'Essentials', fr: 'Essentiel' },
  essentialDesc: { en: 'About 10 questions per section, including every critical one. Faster audits.', fr: 'Environ 10 questions par section, dont toutes les critiques. Audits plus rapides.' },
  complete: { en: 'Complete', fr: 'Complet' },
  completeDesc: { en: 'Every question of the standard for the chosen sections.', fr: 'Toutes les questions du standard pour les sections choisies.' },
  total: (q: number, s: number, l: Lang) => (l === 'en' ? `${q} questions in ${s} sections` : `${q} questions dans ${s} sections`),
  create: { en: 'Create and review', fr: 'Créer et relire' },
  creating: { en: 'Creating…', fr: 'Création…' },
  needName: { en: 'Please name the questionnaire.', fr: 'Donnez un nom au questionnaire.' },
  needSection: { en: 'Tick at least one section.', fr: 'Cochez au moins une section.' },
  copyFrom: { en: 'Questionnaire to copy', fr: 'Questionnaire à copier' },
  copyBtn: { en: 'Copy and edit', fr: 'Copier et modifier' },
}

const PRESETS: Record<string, (dk: string, sk: string) => boolean> = {
  full: () => true,
  rooms: (dk, sk) => dk === 'front-office' || dk === 'housekeeping' || sk === 'the-room-product-facilities',
  fnb: dk => dk === 'food-beverage',
  wellness: (_dk, sk) => sk === 'fitness-facilities-pool-wellness' || sk === 'spa-treatment',
}

export default function NewWizard({ lang, library, templates }: { lang: Lang; library: Library; templates: { id: string; name: string }[] }) {
  const router = useRouter()
  const t = (k: { en: string; fr: string }) => k[lang]
  const [mode, setMode] = useState<Mode>(null)
  const [name, setName] = useState('')
  const [depth, setDepth] = useState<'essential' | 'complete'>('essential')
  const [from, setFrom] = useState(templates[0]?.id ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(library.flatMap(d => d.sections.filter(s => !s.optional && s.questions.length).map(s => `${d.key}/${s.key}`)))
  )

  const label = (x: { name_en: string; name_fr: string }) => (lang === 'en' ? x.name_en : x.name_fr)
  const count = (qs: Library[number]['sections'][number]['questions']) => (depth === 'essential' ? essentials(qs).length : qs.length)
  const toggle = (k: string, on: boolean) => setPicked(p => { const n = new Set(p); on ? n.add(k) : n.delete(k); return n })
  const preset = (key: keyof typeof PRESETS | 'none') =>
    setPicked(new Set(key === 'none' ? [] : library.flatMap(d => d.sections.filter(s => s.questions.length && PRESETS[key](d.key, s.key)).map(s => `${d.key}/${s.key}`))))

  const totals = useMemo(() => {
    let q = 0, s = 0
    for (const d of library) for (const sec of d.sections) if (picked.has(`${d.key}/${sec.key}`)) { s++; q += count(sec.questions) }
    return { q, s }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, depth, library])

  async function post(body: Record<string, unknown>) {
    setBusy(true); setError(null)
    const res = await fetch('/api/questionnaires/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error || 'Error'); setBusy(false); return }
    router.push(`/dashboard/questionnaires/${json.id}/edit`)
  }

  function createGuided() {
    if (!name.trim()) return setError(t(T.needName))
    if (!picked.size) return setError(t(T.needSection))
    const tree = library
      .map(d => ({
        name_en: d.name_en, name_fr: d.name_fr,
        sections: d.sections.filter(s => picked.has(`${d.key}/${s.key}`)).map(s => ({
          name_en: s.name_en, name_fr: s.name_fr, optional: s.optional,
          standards: depth === 'essential' ? essentials(s.questions) : s.questions,
        })),
      }))
      .filter(d => d.sections.length)
    post({ name, tree })
  }

  const card = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', cursor: 'pointer', background: active ? 'rgba(200,164,90,0.08)' : 'var(--color-slate-navy)',
    border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border-subtle)'}`, borderRadius: 12, padding: 16,
    color: 'inherit', font: 'inherit', display: 'flex', flexDirection: 'column', gap: 6, textDecoration: 'none',
  })
  const cardTitle: React.CSSProperties = { color: 'var(--color-ivory)', fontFamily: 'var(--font-display)', fontSize: '1.25rem' }

  return (
    <div className={styles.page}>
      <div>
        <a href="/dashboard/questionnaires" className={styles.muted}>{t(T.back)}</a>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <p className={styles.subtitle}>{t(T.subtitle)}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12 }}>
        <button type="button" style={card(mode === 'guided')} onClick={() => setMode('guided')}>
          <span className={styles.pill} style={{ marginLeft: 0, alignSelf: 'flex-start' }}>{t(T.recommended)}</span>
          <span style={cardTitle}>{t(T.guided)}</span>
          <span className={styles.muted}>{t(T.guidedDesc)}</span>
        </button>
        <a href="/dashboard/questionnaires/ai-import" style={card(false)}>
          <span style={cardTitle}>{t(T.ai)}</span>
          <span className={styles.muted}>{t(T.aiDesc)}</span>
        </a>
        <a href="/dashboard/questionnaires/import" style={card(false)}>
          <span style={cardTitle}>{t(T.file)}</span>
          <span className={styles.muted}>{t(T.fileDesc)}</span>
        </a>
        <button type="button" style={card(mode === 'copy')} onClick={() => setMode('copy')}>
          <span style={cardTitle}>{t(T.copy)}</span>
          <span className={styles.muted}>{t(T.copyDesc)}</span>
        </button>
      </div>

      {mode && (
        <div className={styles.panel}>
          <div className={styles.field}>
            <label className={styles.label}>{t(T.name)} *</label>
            <input className={styles.input} value={name} maxLength={120} placeholder={t(T.namePh)} onChange={e => setName(e.target.value)} />
          </div>
        </div>
      )}

      {mode === 'copy' && (
        <div className={styles.panel}>
          <div className={styles.field}>
            <label className={styles.label}>{t(T.copyFrom)}</label>
            <select className={styles.input} value={from} onChange={e => setFrom(e.target.value)}>
              {templates.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className="btn btn-primary" disabled={busy || !from} onClick={() => (name.trim() ? post({ name, from }) : setError(t(T.needName)))}>
              {busy ? t(T.creating) : t(T.copyBtn)}
            </button>
          </div>
        </div>
      )}

      {mode === 'guided' && (
        <>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t(T.cover)}</h2>
            <div className={styles.actions} style={{ alignItems: 'center' }}>
              <span className={styles.muted}>{t(T.presets)}</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset('full')}>{t(T.pFull)}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset('rooms')}>{t(T.pRooms)}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset('fnb')}>{t(T.pFnb)}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset('wellness')}>{t(T.pWell)}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => preset('none')}>{t(T.pNone)}</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: 16 }}>
              {library.map(d => {
                const keys = d.sections.map(s => `${d.key}/${s.key}`)
                const all = keys.every(k => picked.has(k))
                return (
                  <div key={d.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--color-gold)', fontFamily: 'var(--font-display)', fontSize: '1.125rem' }}>
                      <input type="checkbox" checked={all} onChange={e => setPicked(p => { const n = new Set(p); keys.forEach(k => (e.target.checked ? n.add(k) : n.delete(k))); return n })} />
                      {label(d)}
                    </label>
                    {d.sections.map(s => {
                      const k = `${d.key}/${s.key}`
                      return (
                        <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--color-ivory)', fontSize: '0.9375rem', paddingLeft: 26 }}>
                          <input type="checkbox" checked={picked.has(k)} onChange={e => toggle(k, e.target.checked)} style={{ marginTop: 3 }} />
                          <span>
                            {label(s)}{' '}
                            <span className={styles.muted}>({s.questions.length ? `${count(s.questions)} ${t(T.questions)}` : t(T.toWrite)})</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t(T.depth)}</h2>
            {(['essential', 'complete'] as const).map(v => (
              <label key={v} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', color: 'var(--color-ivory)' }}>
                <input type="radio" name="depth" checked={depth === v} onChange={() => setDepth(v)} style={{ marginTop: 4 }} />
                <span>
                  <strong style={{ fontWeight: 500 }}>{v === 'essential' ? t(T.essential) : t(T.complete)}</strong>
                  <span className={styles.muted} style={{ display: 'block' }}>{v === 'essential' ? t(T.essentialDesc) : t(T.completeDesc)}</span>
                </span>
              </label>
            ))}
          </div>

          <div style={{ position: 'sticky', bottom: 0, background: 'var(--color-deep-ink)', padding: '12px 0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-subtle)' }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={createGuided}>{busy ? t(T.creating) : t(T.create)}</button>
            <span className={styles.ok}>{T.total(totals.q, totals.s, lang)}</span>
            {error && <span className={styles.error}>{error}</span>}
          </div>
        </>
      )}

      {!mode && (
        <button type="button" className={styles.muted} style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', alignSelf: 'flex-start' }}
          onClick={() => { const n = window.prompt(t(T.name)); if (n && n.trim()) post({ name: n.trim() }) }}>
          {t(T.blank)}
        </button>
      )}
    </div>
  )
}
