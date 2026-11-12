'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CLASSIFICATIONS } from '@/lib/questionnaireImport'
import type { Tree, TreeDomain, TreeSection, TreeStandard } from '@/lib/questionnaireTree'
import { essentials, keyOf, type LibQuestion, type Library } from '@/lib/questionnaireLibrary'
import { NamePicker, QuestionPicker } from './LibraryPickers'
import styles from '../questionnaires.module.css'

type Lang = 'en' | 'fr'

const CLASS_LABEL: Record<string, { en: string; fr: string }> = {
  SERVICE: { en: 'Service', fr: 'Service' },
  EFFICIENCY: { en: 'Efficiency', fr: 'Efficacité' },
  PRODUCT: { en: 'Product', fr: 'Produit' },
  CLEANLINESS: { en: 'Cleanliness', fr: 'Propreté' },
  EMOTIONAL_INTELLIGENCE: { en: 'Emotional intelligence', fr: 'Intelligence émotionnelle' },
  SALES_OPPORTUNITY: { en: 'Sales opportunity', fr: 'Opportunité de vente' },
}

const T = {
  back: { en: '← Questionnaires', fr: '← Questionnaires' },
  title: { en: 'Edit questionnaire', fr: 'Modifier le questionnaire' },
  name: { en: 'Questionnaire name', fr: 'Nom du questionnaire' },
  inUse: {
    en: 'This questionnaire is already used by campaigns. You can edit texts and add questions; questions that already have answers cannot be deleted.',
    fr: "Ce questionnaire est déjà utilisé par des campagnes. Vous pouvez modifier les textes et ajouter des questions ; les questions qui ont déjà des réponses ne peuvent pas être supprimées.",
  },
  hint: { en: 'Pick domains, sections and questions from the lists; use “Other” only for what is specific to you.', fr: 'Choisissez domaines, sections et questions dans les listes ; « Autre » seulement pour ce qui vous est propre.' },
  domain: { en: 'Domain', fr: 'Domaine' },
  section: { en: 'Section', fr: 'Section' },
  question: { en: 'Question', fr: 'Question' },
  addDomain: { en: '+ Add a domain', fr: '+ Ajouter un domaine' },
  addSection: { en: '+ Add a section', fr: '+ Ajouter une section' },
  addQuestion: { en: '+ Write my own question', fr: '+ Écrire ma propre question' },
  editQ: { en: 'Edit', fr: 'Modifier' },
  close: { en: 'Close', fr: 'Fermer' },
  fromLibrary: { en: '+ Add from the library', fr: '+ Ajouter depuis la bibliothèque' },
  other: { en: 'Other (type a name)…', fr: 'Autre (saisir un nom)…' },
  chooseDomain: { en: '— Choose a domain —', fr: '— Choisir un domaine —' },
  chooseSection: { en: '— Choose a section —', fr: '— Choisir une section —' },
  suggest: { en: 'Suggested questions are available for this section:', fr: 'Des questions sont proposées pour cette section :' },
  addEssentials: (n: number, l: Lang) => (l === 'en' ? `Add the ${n} essentials` : `Ajouter les ${n} essentielles`),
  addAll: (n: number, l: Lang) => (l === 'en' ? `Add all ${n}` : `Ajouter les ${n}`),
  nameEn: { en: 'Name (EN)', fr: 'Nom (EN)' },
  nameFr: { en: 'Name (FR)', fr: 'Nom (FR)' },
  qEn: { en: 'Question (English)', fr: 'Question en anglais (si vide, le français est utilisé)' },
  qFr: { en: 'Question in French (if empty, English is used)', fr: 'Question (français)' },
  gEn: { en: 'Guidance for the auditor (EN, optional)', fr: "Consigne pour l'auditeur (EN, facultatif)" },
  gFr: { en: 'Guidance for the auditor (FR, optional)', fr: "Consigne pour l'auditeur (FR, facultatif)" },
  type: { en: 'Type', fr: 'Type' },
  critical: { en: 'Critical', fr: 'Critique' },
  remove: { en: 'Delete', fr: 'Supprimer' },
  up: { en: 'Move up', fr: 'Monter' },
  down: { en: 'Move down', fr: 'Descendre' },
  save: { en: 'Save', fr: 'Enregistrer' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  saved: { en: 'Saved ✓', fr: 'Enregistré ✓' },
  unsaved: { en: 'Unsaved changes', fr: 'Modifications non enregistrées' },
  failed: { en: 'Could not save. Please try again.', fr: "Impossible d'enregistrer. Veuillez réessayer." },
  questions: { en: 'questions', fr: 'questions' },
  confirmDel: { en: 'Delete this and everything inside it?', fr: 'Supprimer cet élément et tout ce qu’il contient ?' },
}

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'))
const newQuestion = (): TreeStandard => ({ id: uid(), question_en: '', question_fr: '', classification: 'SERVICE', critical: false, guidance_en: '', guidance_fr: '' })
const newSection = (): TreeSection => ({ id: uid(), name_en: '', name_fr: '', standards: [] })
const fromLib = (q: LibQuestion): TreeStandard => ({ id: uid(), ...q })
const newDomain = (): TreeDomain => ({ id: uid(), name_en: '', name_fr: '', sections: [newSection()] })

function move<T>(arr: T[], i: number, d: -1 | 1): T[] {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const out = arr.slice()
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export default function QuestionnaireEditor({ tree, lang, inUse, library }: { tree: Tree; lang: Lang; inUse: boolean; library: Library }) {
  const router = useRouter()
  const t = (k: { en: string; fr: string }) => k[lang]
  const [name, setName] = useState(tree.name)
  const [domains, setDomains] = useState<TreeDomain[]>(tree.domains)
  const [status, setStatus] = useState<'clean' | 'dirty' | 'saving' | 'saved'>('clean')
  const [error, setError] = useState<string | null>(null)
  // Only open sections are rendered, so a 500-question questionnaire stays fast to edit
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(tree.domains.length === 1 && tree.domains[0].sections.length === 1 ? [tree.domains[0].sections[0].id] : []))
  const toggle = (id: string, open: boolean) => setOpenIds(prev => { const n = new Set(prev); if (open) n.add(id); else n.delete(id); return n })

  useEffect(() => {
    if (status !== 'dirty') return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  const edit = (fn: (d: TreeDomain[]) => TreeDomain[]) => { setDomains(fn); setStatus('dirty') }
  const setDomain = (di: number, patch: Partial<TreeDomain>) => edit(ds => ds.map((d, i) => (i === di ? { ...d, ...patch } : d)))
  const setSection = (di: number, si: number, patch: Partial<TreeSection>) =>
    edit(ds => ds.map((d, i) => (i === di ? { ...d, sections: d.sections.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : d)))
  const setQuestion = (di: number, si: number, qi: number, patch: Partial<TreeStandard>) =>
    setSection(di, si, { standards: domains[di].sections[si].standards.map((q, k) => (k === qi ? { ...q, ...patch } : q)) })
  const confirmDel = () => window.confirm(t(T.confirmDel))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const expand = (id: string, on: boolean) => setExpanded(p => { const n = new Set(p); on ? n.add(id) : n.delete(id); return n })
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const libDomain = (d: TreeDomain) => library.find(x => x.key === keyOf(d.name_en) || keyOf(x.name_fr) === keyOf(d.name_fr))
  const libSection = (d: TreeDomain, s: TreeSection) => {
    const k = keyOf(s.name_en)
    return libDomain(d)?.sections.find(x => x.key === k) ?? library.flatMap(x => x.sections).find(x => x.key === k)
  }
  const sectionOptions = (d: TreeDomain) => libDomain(d)?.sections ?? library.flatMap(x => x.sections)
  const allLib = library.flatMap(dd => dd.sections.flatMap(ss => ss.questions.map(q => ({ ...q, where: `${lang === 'en' ? dd.name_en : dd.name_fr} › ${lang === 'en' ? ss.name_en : ss.name_fr}` }))))
  const addQuestions = (di: number, si: number, qs: LibQuestion[]) =>
    setSection(di, si, { standards: [...domains[di].sections[si].standards.filter(q => q.question_en || q.question_fr), ...qs.map(fromLib)] })
  const total = domains.reduce((n, d) => n + d.sections.reduce((m, s) => m + s.standards.length, 0), 0)

  async function save() {
    setStatus('saving'); setError(null)
    try {
      const res = await fetch(`/api/questionnaires/${tree.id}/structure`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, domains }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || t(T.failed))
      setStatus('saved')
      router.refresh()
    } catch (e: any) {
      setError(e.message || t(T.failed)); setStatus('dirty')
    }
  }

  const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 10 }
  const small: React.CSSProperties = { padding: '4px 10px' }
  const ctrl = (up: () => void, down: () => void, del: () => void, noConfirm = false) => (
    <div className={styles.actions}>
      <button type="button" className="btn btn-ghost btn-sm" style={small} onClick={up} aria-label={t(T.up)}>↑</button>
      <button type="button" className="btn btn-ghost btn-sm" style={small} onClick={down} aria-label={t(T.down)}>↓</button>
      <button type="button" className="btn btn-ghost btn-sm" style={small} onClick={() => (noConfirm || confirmDel()) && del()}>{t(T.remove)}</button>
    </div>
  )

  return (
    <div className={styles.page}>
      <div>
        <a href="/dashboard/questionnaires" className={styles.muted}>{t(T.back)}</a>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <p className={styles.subtitle}>{total} {t(T.questions)} · {t(T.hint)}</p>
      </div>
      {inUse && <p className={styles.muted} style={{ margin: 0 }}>{t(T.inUse)}</p>}

      <div className={styles.panel}>
        <div className={styles.field}>
          <label className={styles.label}>{t(T.name)}</label>
          <input className={styles.input} value={name} maxLength={120} onChange={e => { setName(e.target.value); setStatus('dirty') }} />
        </div>
      </div>

      {domains.map((d, di) => (
        <div key={d.id} className={styles.panel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <h2 className={styles.panelTitle}>{t(T.domain)} {di + 1}</h2>
            {ctrl(() => edit(ds => move(ds, di, -1)), () => edit(ds => move(ds, di, 1)), () => edit(ds => ds.filter((_, i) => i !== di)))}
          </div>
          <NamePicker lang={lang} value={d} options={library} onChange={v => setDomain(di, v)} otherLabel={t(T.other)} placeholder={t(T.chooseDomain)} />

          {d.sections.map((s, si) => (
            <details key={s.id} style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: 12 }} open={openIds.has(s.id)} onToggle={e => toggle(s.id, (e.currentTarget as HTMLDetailsElement).open)}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-ivory)', padding: '4px 0' }}>
                {t(T.section)} {si + 1} — {(lang === 'en' ? s.name_en || s.name_fr : s.name_fr || s.name_en) || '…'} <span className={styles.muted}>({s.standards.length})</span>
              </summary>
              {openIds.has(s.id) && <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {ctrl(() => setDomain(di, { sections: move(d.sections, si, -1) }), () => setDomain(di, { sections: move(d.sections, si, 1) }), () => setDomain(di, { sections: d.sections.filter((_, i) => i !== si) }))}
                </div>
                <NamePicker lang={lang} value={s} options={sectionOptions(d)} onChange={v => setSection(di, si, v)} otherLabel={t(T.other)} placeholder={t(T.chooseSection)} />
                {(() => {
                  const ls = libSection(d, s)
                  const filled = s.standards.filter(q => q.question_en || q.question_fr).length
                  if (!ls || !ls.questions.length || filled) return null
                  return (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'rgba(200,164,90,0.08)', borderRadius: 8, padding: 10 }}>
                      <span className={styles.muted}>{t(T.suggest)}</span>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => addQuestions(di, si, essentials(ls.questions))}>{T.addEssentials(essentials(ls.questions).length, lang)}</button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => addQuestions(di, si, ls.questions)}>{T.addAll(ls.questions.length, lang)}</button>
                    </div>
                  )
                })()}

                {s.standards.map((q, qi) => {
                  const open = expanded.has(q.id)
                  const label = (lang === 'en' ? q.question_en || q.question_fr : q.question_fr || q.question_en) || '…'
                  return (
                  <div key={q.id} style={{ background: 'var(--color-deep-ink)', border: `1px solid ${open ? 'var(--color-gold)' : 'var(--color-border-subtle)'}`, borderRadius: 10, padding: open ? 12 : '8px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <button type="button" onClick={() => expand(q.id, !open)} style={{ flex: '1 1 240px', minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--color-ivory)', font: 'inherit', fontSize: '0.9375rem' }}>
                        <span className={styles.muted}>{qi + 1}. </span>{label}
                        <span className={styles.muted} style={{ marginLeft: 8 }}>· {CLASS_LABEL[q.classification]?.[lang] ?? q.classification}</span>
                        {q.critical && <span className={styles.pill}>{t(T.critical)}</span>}
                      </button>
                      <div className={styles.actions}>
                        <button type="button" className="btn btn-ghost btn-sm" style={small} onClick={() => expand(q.id, !open)}>{open ? t(T.close) : t(T.editQ)}</button>
                        {ctrl(() => setSection(di, si, { standards: move(s.standards, qi, -1) }), () => setSection(di, si, { standards: move(s.standards, qi, 1) }), () => setSection(di, si, { standards: s.standards.filter((_, k) => k !== qi) }), true)}
                      </div>
                    </div>
                    {open && <>
                    <div style={row}>
                      {(lang === 'en' ? (['en', 'fr'] as const) : (['fr', 'en'] as const)).map(l => (
                        <div key={l} className={styles.field}>
                          <label className={styles.label}>{l === 'en' ? t(T.qEn) : t(T.qFr)}</label>
                          <textarea className={styles.input} rows={2} value={l === 'en' ? q.question_en : q.question_fr}
                            onChange={e => setQuestion(di, si, qi, l === 'en' ? { question_en: e.target.value } : { question_fr: e.target.value })} />
                        </div>
                      ))}
                    </div>
                    <div style={row}>
                      <div className={styles.field}>
                        <label className={styles.label}>{t(T.type)}</label>
                        <select className={styles.input} value={q.classification} onChange={e => setQuestion(di, si, qi, { classification: e.target.value })}>
                          {CLASSIFICATIONS.map(c => <option key={c} value={c}>{CLASS_LABEL[c][lang]}</option>)}
                        </select>
                      </div>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--color-ivory)', fontSize: '0.9375rem', alignSelf: 'end', padding: '10px 0' }}>
                        <input type="checkbox" checked={q.critical} onChange={e => setQuestion(di, si, qi, { critical: e.target.checked })} />
                        {t(T.critical)}
                      </label>
                    </div>
                    <div style={row}>
                      <div className={styles.field}><label className={styles.label}>{t(T.gEn)}</label><textarea className={styles.input} rows={2} value={q.guidance_en} onChange={e => setQuestion(di, si, qi, { guidance_en: e.target.value })} /></div>
                      <div className={styles.field}><label className={styles.label}>{t(T.gFr)}</label><textarea className={styles.input} rows={2} value={q.guidance_fr} onChange={e => setQuestion(di, si, qi, { guidance_fr: e.target.value })} /></div>
                    </div>
                    </>}
                  </div>
                  )
                })}
                {pickerFor === s.id ? (
                  <QuestionPicker
                    lang={lang}
                    sectionQuestions={libSection(d, s)?.questions ?? []}
                    allQuestions={allLib}
                    existing={new Set(s.standards.map(q => keyOf(q.question_en)))}
                    onAdd={qs => { addQuestions(di, si, qs); setPickerFor(null) }}
                    onClose={() => setPickerFor(null)}
                  />
                ) : (
                  <div className={styles.actions}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPickerFor(s.id)}>{t(T.fromLibrary)}</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { const nq = newQuestion(); expand(nq.id, true); setSection(di, si, { standards: [...s.standards, nq] }) }}>{t(T.addQuestion)}</button>
                  </div>
                )}
              </div>}
            </details>
          ))}
          <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { const ns = newSection(); toggle(ns.id, true); setDomain(di, { sections: [...d.sections, ns] }) }}>{t(T.addSection)}</button></div>
        </div>
      ))}

      <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { const nd = newDomain(); toggle(nd.sections[0].id, true); edit(ds => [...ds, nd]) }}>{t(T.addDomain)}</button></div>

      <div style={{ position: 'sticky', bottom: 0, background: 'var(--color-deep-ink)', padding: '12px 0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid var(--color-border-subtle)' }}>
        <button type="button" className="btn btn-primary" disabled={status === 'saving' || status === 'clean' || status === 'saved'} onClick={save}>
          {status === 'saving' ? t(T.saving) : t(T.save)}
        </button>
        <span className={status === 'saved' ? styles.ok : styles.muted}>{status === 'saved' ? t(T.saved) : status === 'dirty' ? t(T.unsaved) : ''}</span>
        {error && <span className={styles.error}>{error}</span>}
      </div>
    </div>
  )
}
