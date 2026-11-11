'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseQuestionnaire, TEMPLATE_CSV } from '@/lib/questionnaireImport'
import styles from '../questionnaires.module.css'

type Lang = 'en' | 'fr'

const T = {
  title: { en: 'Import a questionnaire', fr: 'Importer un questionnaire' },
  back: { en: '← Questionnaires', fr: '← Questionnaires' },
  how: { en: 'How it works', fr: 'Comment ça marche' },
  s1: { en: 'Download the template and fill in one row per question.', fr: 'Téléchargez le modèle et remplissez une ligne par question.' },
  s2: { en: 'In Excel: File → Save as → CSV. In Google Sheets: File → Download → CSV.', fr: 'Dans Excel : Fichier → Enregistrer sous → CSV. Dans Google Sheets : Fichier → Télécharger → CSV.' },
  s3: { en: 'Choose the file below, check the preview, then import.', fr: "Choisissez le fichier ci-dessous, vérifiez l'aperçu, puis importez." },
  cols: {
    en: 'Columns: domain, section, question, classification (SERVICE, EFFICIENCY, PRODUCT, CLEANLINESS, EMOTIONAL_INTELLIGENCE or SALES_OPPORTUNITY), critical (yes/no), guidance. For a bilingual questionnaire add domain_fr, section_fr, question_fr and guidance_fr.',
    fr: 'Colonnes : domain, section, question, classification (SERVICE, EFFICIENCY, PRODUCT, CLEANLINESS, EMOTIONAL_INTELLIGENCE ou SALES_OPPORTUNITY), critical (oui/non), guidance. Pour un questionnaire bilingue, ajoutez domain_fr, section_fr, question_fr et guidance_fr.',
  },
  download: { en: 'Download the template', fr: 'Télécharger le modèle' },
  name: { en: 'Questionnaire name', fr: 'Nom du questionnaire' },
  file: { en: 'CSV file', fr: 'Fichier CSV' },
  preview: { en: 'Preview', fr: 'Aperçu' },
  summary: (q: number, d: number, s: number, l: Lang) =>
    l === 'en' ? `${q} questions, ${d} domains, ${s} sections` : `${q} questions, ${d} domaines, ${s} sections`,
  more: (n: number, l: Lang) => (l === 'en' ? `… and ${n} more` : `… et ${n} autres`),
  errorsTitle: { en: 'To fix in the file:', fr: 'À corriger dans le fichier :' },
  import: { en: 'Import', fr: 'Importer' },
  importing: { en: 'Importing…', fr: 'Import en cours…' },
  nameRequired: { en: 'Please name the questionnaire.', fr: 'Donnez un nom au questionnaire.' },
  failed: { en: 'Import failed. Please try again.', fr: "L'import a échoué. Veuillez réessayer." },
  cDomain: { en: 'Domain', fr: 'Domaine' },
  cSection: { en: 'Section', fr: 'Section' },
  cQuestion: { en: 'Question', fr: 'Question' },
  cClass: { en: 'Class', fr: 'Type' },
  cCritical: { en: 'Critical', fr: 'Critique' },
}

function describe(msg: string, line: number, l: Lang): string {
  const [code, arg] = msg.split(':')
  const en = l === 'en'
  const prefix = line > 0 ? (en ? `Line ${line}: ` : `Ligne ${line} : `) : ''
  switch (code) {
    case 'EMPTY': return en ? 'The file is empty or has no question rows.' : 'Le fichier est vide ou ne contient aucune question.'
    case 'MISSING_COLUMN': return en ? `Missing column “${arg}”.` : `Colonne « ${arg} » manquante.`
    case 'NO_QUESTION': return prefix + (en ? 'question is empty.' : 'la question est vide.')
    case 'NO_DOMAIN': return prefix + (en ? 'domain is empty.' : 'le domaine est vide.')
    case 'BAD_CLASSIFICATION': return prefix + (en ? `unknown classification “${arg}”.` : `classification inconnue « ${arg} ».`)
    case 'TOO_MANY': return en ? `Too many questions (maximum ${arg}).` : `Trop de questions (maximum ${arg}).`
    default: return prefix + msg
  }
}

export default function ImportForm({ lang }: { lang: Lang }) {
  const router = useRouter()
  const t = (k: { en: string; fr: string }) => k[lang]
  const [name, setName] = useState('')
  const [csv, setCsv] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const result = useMemo(() => (csv ? parseQuestionnaire(csv) : null), [csv])
  const canImport = !!result && result.errors.length === 0 && result.rows.length > 0

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setCsv(await f.text())
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  function downloadTemplate() {
    const url = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'zahir-guest-questionnaire-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function submit() {
    if (!name.trim()) { setError(t(T.nameRequired)); return }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/questionnaires/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, csv }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || t(T.failed))
      router.push('/dashboard/questionnaires')
      router.refresh()
    } catch (err: any) {
      setError(err.message || t(T.failed))
      setBusy(false)
    }
  }

  return (
    <div className={styles.page}>
      <div>
        <a href="/dashboard/questionnaires" className={styles.muted}>{t(T.back)}</a>
        <h1 className={styles.title}>{t(T.title)}</h1>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>{t(T.how)}</h2>
        <ol className={styles.steps}>
          <li>{t(T.s1)}</li>
          <li>{t(T.s2)}</li>
          <li>{t(T.s3)}</li>
        </ol>
        <p className={styles.muted}>{t(T.cols)}</p>
        <div className={styles.actions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={downloadTemplate}>{t(T.download)}</button>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.field}>
          <label className={styles.label}>{t(T.name)} *</label>
          <input className={styles.input} value={name} onChange={e => setName(e.target.value)} maxLength={120} />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>{t(T.file)} *</label>
          <input className={styles.input} type="file" accept=".csv,text/csv,.txt" onChange={onFile} />
        </div>
      </div>

      {result && result.errors.length > 0 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t(T.errorsTitle)}</h2>
          <ul className={styles.errList}>
            {result.errors.slice(0, 50).map((er, i) => <li key={i}>{describe(er.message, er.line, lang)}</li>)}
            {result.errors.length > 50 && <li>{T.more(result.errors.length - 50, lang)}</li>}
          </ul>
        </div>
      )}

      {result && result.rows.length > 0 && (
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>{t(T.preview)}</h2>
          <p className={styles.ok}>{T.summary(result.rows.length, result.domains, result.sections, lang)}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>{t(T.cDomain)}</th><th>{t(T.cSection)}</th><th>{t(T.cQuestion)}</th><th>{t(T.cClass)}</th><th>{t(T.cCritical)}</th></tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 8).map(r => (
                  <tr key={r.line}>
                    <td>{lang === 'en' ? r.domain_en : r.domain_fr}</td>
                    <td>{lang === 'en' ? r.section_en : r.section_fr}</td>
                    <td>{lang === 'en' ? r.question_en : r.question_fr}</td>
                    <td>{r.classification}</td>
                    <td>{r.critical ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.rows.length > 8 && <p className={styles.muted}>{T.more(result.rows.length - 8, lang)}</p>}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" disabled={!canImport || busy} onClick={submit}>
          {busy ? t(T.importing) : t(T.import)}
        </button>
        <a href="/dashboard/questionnaires" className="btn btn-ghost">{lang === 'en' ? 'Cancel' : 'Annuler'}</a>
      </div>
    </div>
  )
}
