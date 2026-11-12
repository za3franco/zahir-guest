'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../questionnaires.module.css'

type Lang = 'en' | 'fr'
interface Q { question_en: string; question_fr: string; classification: string; critical: boolean; guidance_en: string; guidance_fr: string }
interface S { name_en: string; name_fr: string; standards: Q[] }
interface D { name_en: string; name_fr: string; sections: S[] }
interface Item extends Q { domain_en: string; domain_fr: string; section_en: string; section_fr: string; applies: number[] }
interface Filter { col: number; label: string; count: number }

const treeToItems = (tree: D[]): Item[] =>
  tree.flatMap(d => d.sections.flatMap(s => s.standards.map(q => ({ ...q, domain_en: d.name_en, domain_fr: d.name_fr, section_en: s.name_en, section_fr: s.name_fr, applies: [] as number[] }))))

function itemsToTree(items: Item[]): D[] {
  const out: D[] = []
  for (const it of items) {
    let d = out.find(x => x.name_en === it.domain_en)
    if (!d) { d = { name_en: it.domain_en, name_fr: it.domain_fr, sections: [] }; out.push(d) }
    let s = d.sections.find(x => x.name_en === it.section_en)
    if (!s) { s = { name_en: it.section_en, name_fr: it.section_fr, standards: [] }; d.sections.push(s) }
    s.standards.push({ question_en: it.question_en, question_fr: it.question_fr, classification: it.classification, critical: it.critical, guidance_en: it.guidance_en, guidance_fr: it.guidance_fr })
  }
  return out
}

const T = {
  back: { en: '← New questionnaire', fr: '← Nouveau questionnaire' },
  title: { en: 'Convert your own standards', fr: 'Convertir vos propres standards' },
  intro: {
    en: 'Upload your brand standards, SOPs, checklist or an existing questionnaire. The AI turns each observable standard into an audit question, sorts them into domains and sections, picks the type, flags critical items and translates into English and French. You review everything before it is saved.',
    fr: "Déposez vos standards de marque, procédures, check-lists ou un questionnaire existant. L'IA transforme chaque standard observable en question d'audit, la range dans un domaine et une section, choisit son type, repère les points critiques et traduit en français et en anglais. Vous relisez tout avant l'enregistrement.",
  },
  formats: { en: 'PDF, Word (.docx), Excel (.xls, .xlsx), CSV, text or a photo of a paper document · 4 MB max', fr: 'PDF, Word (.docx), Excel (.xls, .xlsx), CSV, texte ou photo d’un document papier · 4 Mo max' },
  file: { en: 'Document', fr: 'Document' },
  orPaste: { en: 'or paste the text', fr: 'ou collez le texte' },
  pastePh: { en: 'Paste your standards here…', fr: 'Collez vos standards ici…' },
  convert: { en: 'Convert with AI', fr: "Convertir avec l'IA" },
  working: { en: 'The AI is reading your document… this usually takes 30 seconds to 3 minutes. Keep this page open.', fr: "L'IA lit votre document… cela prend en général de 30 secondes à 3 minutes. Gardez cette page ouverte." },
  found: (n: number, l: Lang) => (l === 'en' ? `${n} questions written so far` : `${n} questions rédigées pour l'instant`),
  result: { en: 'Result', fr: 'Résultat' },
  summary: (q: number, d: number, s: number, c: number, l: Lang) =>
    l === 'en' ? `${q} questions · ${d} domains · ${s} sections · ${c} critical` : `${q} questions · ${d} domaines · ${s} sections · ${c} critiques`,
  check: { en: 'Untick any section you do not want. You can edit every question after creating the questionnaire.', fr: 'Décochez les sections que vous ne voulez pas. Vous pourrez modifier chaque question après la création.' },
  name: { en: 'Questionnaire name', fr: 'Nom du questionnaire' },
  create: { en: 'Create and review', fr: 'Créer et relire' },
  creating: { en: 'Creating…', fr: 'Création…' },
  again: { en: 'Start again', fr: 'Recommencer' },
  needName: { en: 'Please name the questionnaire.', fr: 'Donnez un nom au questionnaire.' },
  failed: { en: 'Something went wrong. Please try again.', fr: "Une erreur s'est produite. Veuillez réessayer." },
  critical: { en: 'critical', fr: 'critique' },
  onlyFor: { en: 'Keep only the standards that apply to', fr: "Ne garder que les standards applicables à" },
  allRows: (n: number, l: Lang) => (l === 'en' ? `All properties (${n} standards)` : `Tous les établissements (${n} standards)`),
}

export default function AiImport({ lang }: { lang: Lang }) {
  const router = useRouter()
  const t = (k: { en: string; fr: string }) => k[lang]
  const [file, setFile] = useState<File | null>(null)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<'input' | 'working' | 'review'>('input')
  const [progress, setProgress] = useState(0)
  const [items, setItems] = useState<Item[]>([])
  const [filters, setFilters] = useState<Filter[]>([])
  const [only, setOnly] = useState<number | null>(null)
  const [phaseLabel, setPhaseLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const L = (x: { name_en: string; name_fr: string }) => (lang === 'en' ? x.name_en : x.name_fr)

  async function convert() {
    setError(null); setPhase('working'); setProgress(0)
    const fd = new FormData()
    if (file) fd.append('file', file)
    else fd.append('text', text)
    try {
      const res = await fetch('/api/questionnaires/ai-import', { method: 'POST', body: fd })
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || t(T.failed))
      }
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let finished = false
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let i
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i); buf = buf.slice(i + 1)
          if (!line.trim()) continue
          const ev = JSON.parse(line)
          if (ev.type === 'progress') setProgress(ev.questions)
          else if (ev.type === 'phase') setPhaseLabel(phaseText(ev))
          else if (ev.type === 'error') throw new Error(ev.error)
          else if (ev.type === 'done') {
            finished = true
            setItems(ev.mode === 'table' ? ev.items : treeToItems(ev.tree)); setFilters(ev.filters ?? []); setOnly(null)
            setNotes(ev.notes ?? ''); setSkip(new Set()); setPhase('review')
            if (!name && file) setName(file.name.replace(/\.[^.]+$/, ''))
          }
        }
      }
      if (!finished) throw new Error(t(T.failed))
    } catch (e: any) {
      setError(e.message || t(T.failed)); setPhase('input'); setPhaseLabel('')
    }
  }

  const phaseText = (ev: any) => {
    const en = lang === 'en'
    if (ev.phase === 'mapping') return en ? 'Reading the columns of your spreadsheet…' : 'Lecture des colonnes de votre tableur…'
    if (ev.phase === 'rows') return en ? `${ev.count} standards found` : `${ev.count} standards trouvés`
    if (ev.phase === 'sections') return en ? 'Organising domains and sections…' : 'Organisation en domaines et sections…'
    if (ev.phase === 'classify') return en ? `Classifying standards: ${ev.done} / ${ev.total}` : `Classement des standards : ${ev.done} / ${ev.total}`
    return ''
  }
  const tree = itemsToTree(only == null ? items : items.filter(it => it.applies.includes(only)))
  const skey = (d: D, s: S) => `${d.name_en}|${s.name_en}`
  const kept = tree.map(d => ({ ...d, sections: d.sections.filter(s => !skip.has(skey(d, s))) })).filter(d => d.sections.length)
  const stats = {
    q: kept.reduce((n, d) => n + d.sections.reduce((m, s) => m + s.standards.length, 0), 0),
    s: kept.reduce((n, d) => n + d.sections.length, 0),
    c: kept.reduce((n, d) => n + d.sections.reduce((m, s) => m + s.standards.filter(q => q.critical).length, 0), 0),
  }

  async function create() {
    if (!name.trim()) return setError(t(T.needName))
    setBusy(true); setError(null)
    const res = await fetch('/api/questionnaires/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, tree: kept }) })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { setError(json.error || t(T.failed)); setBusy(false); return }
    router.push(`/dashboard/questionnaires/${json.id}/edit`)
  }

  return (
    <div className={styles.page}>
      <div>
        <a href="/dashboard/questionnaires/new" className={styles.muted}>{t(T.back)}</a>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <p className={styles.subtitle}>{t(T.intro)}</p>
      </div>

      {phase !== 'review' && (
        <div className={styles.panel}>
          <div className={styles.field}>
            <label className={styles.label}>{t(T.file)}</label>
            <input className={styles.input} type="file" disabled={phase === 'working'}
              accept=".pdf,.docx,.xls,.xlsx,.csv,.txt,.tsv,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
              onChange={e => setFile(e.target.files?.[0] ?? null)} />
            <span className={styles.muted}>{t(T.formats)}</span>
          </div>
          {!file && (
            <div className={styles.field}>
              <label className={styles.label}>{t(T.orPaste)}</label>
              <textarea className={styles.input} rows={6} value={text} placeholder={t(T.pastePh)} disabled={phase === 'working'} onChange={e => setText(e.target.value)} />
            </div>
          )}
          {phase === 'working' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p className={styles.ok} style={{ margin: 0 }}>{t(T.working)}</p>
              {phaseLabel && <p className={styles.muted} style={{ margin: 0 }}>{phaseLabel}</p>}
              {progress > 0 && !phaseLabel && <p className={styles.muted} style={{ margin: 0 }}>{T.found(progress, lang)}</p>}
            </div>
          ) : (
            <div className={styles.actions}>
              <button type="button" className="btn btn-primary" disabled={!file && !text.trim()} onClick={convert}>{t(T.convert)}</button>
            </div>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t(T.result)}</h2>
            <p className={styles.ok} style={{ margin: 0 }}>{T.summary(stats.q, kept.length, stats.s, stats.c, lang)}</p>
            {notes && <p className={styles.muted} style={{ margin: 0 }}>{notes}</p>}
            {filters.length > 0 && (
              <div className={styles.field}>
                <label className={styles.label}>{t(T.onlyFor)}</label>
                <select className={styles.input} value={only ?? ''} onChange={e => { setOnly(e.target.value === '' ? null : Number(e.target.value)); setSkip(new Set()) }}>
                  <option value="">{T.allRows(items.length, lang)}</option>
                  {filters.map(f => <option key={f.col} value={f.col}>{f.label} ({f.count})</option>)}
                </select>
              </div>
            )}
            <p className={styles.muted} style={{ margin: 0 }}>{t(T.check)}</p>
            {tree.map(d => (
              <div key={d.name_en} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <strong style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-display)', fontSize: '1.125rem', fontWeight: 400 }}>{L(d)}</strong>
                {d.sections.map(s => {
                  const k = skey(d, s)
                  return (
                    <details key={k} style={{ paddingLeft: 8 }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--color-ivory)', display: 'flex', gap: 10, alignItems: 'center' }}>
                        <input type="checkbox" checked={!skip.has(k)} onClick={e => e.stopPropagation()}
                          onChange={e => setSkip(p => { const n = new Set(p); e.target.checked ? n.delete(k) : n.add(k); return n })} />
                        {L(s)} <span className={styles.muted}>({s.standards.length})</span>
                      </summary>
                      <ol style={{ margin: '8px 0 8px 1.5rem', padding: 0, color: 'var(--color-sand)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                        {s.standards.map((q, qi) => (
                          <li key={qi}>
                            <span style={{ color: 'var(--color-ivory)' }}>{lang === 'en' ? q.question_en : q.question_fr}</span>
                            {q.critical && <span className={styles.pill}>{t(T.critical)}</span>}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )
                })}
              </div>
            ))}
          </div>
          <div className={styles.panel}>
            <div className={styles.field}>
              <label className={styles.label}>{t(T.name)} *</label>
              <input className={styles.input} value={name} maxLength={120} onChange={e => setName(e.target.value)} />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.actions}>
              <button type="button" className="btn btn-primary" disabled={busy || !stats.q} onClick={create}>{busy ? t(T.creating) : t(T.create)}</button>
              <button type="button" className="btn btn-ghost" onClick={() => { setPhase('input'); setItems([]); setFilters([]); setPhaseLabel('') }}>{t(T.again)}</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
