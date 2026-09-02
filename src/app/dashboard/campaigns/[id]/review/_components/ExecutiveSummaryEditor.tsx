'use client'

import { useState } from 'react'
import styles from './ExecutiveSummaryEditor.module.css'

const T = {
  title: { en: 'Executive Summary', fr: 'Synthèse exécutive' },
  subtitleEdit: { en: 'Write a narrative summary of the audit findings. This will appear at the top of the published report.', fr: "Rédigez une synthèse narrative des résultats de l'audit. Elle apparaîtra en haut du rapport publié." },
  subtitleRead: { en: 'Executive summary as published in the report.', fr: 'Synthèse exécutive telle que publiée dans le rapport.' },
  placeholder: { en: 'Write your executive summary here…\n\nDescribe the overall guest experience, key strengths, areas for improvement, and your main recommendations.', fr: "Rédigez votre synthèse ici…\n\nDécrivez l'expérience client globale, les points forts, les axes d'amélioration et vos principales recommandations." },
  empty: { en: 'No executive summary has been written yet.', fr: 'Aucune synthèse exécutive n\'a encore été rédigée.' },
  save: { en: 'Save summary', fr: 'Enregistrer la synthèse' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  saved: { en: 'Saved ✓', fr: 'Enregistré ✓' },
  charCount: { en: 'characters', fr: 'caractères' },
  tips: {
    title: { en: 'Writing tips', fr: 'Conseils de rédaction' },
    items: {
      en: [
        'Open with the overall score and a one-sentence impression',
        'Highlight 2–3 standout strengths with specific examples',
        'Address the most critical BELOW standards directly',
        'Note any patterns in the classification breakdown',
        'Close with 3–5 prioritised recommendations',
      ],
      fr: [
        'Ouvrez avec le score global et une impression en une phrase',
        'Soulignez 2 à 3 points forts avec des exemples précis',
        'Abordez directement les critères NON CONFORMES les plus critiques',
        'Notez les tendances dans la répartition par classification',
        'Concluez avec 3 à 5 recommandations prioritaires',
      ],
    },
  },
}

interface Props {
  campaignId: string
  existingSummary: string
  lang: string
  readOnly?: boolean
}

export default function ExecutiveSummaryEditor({ campaignId, existingSummary, lang, readOnly = false }: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']
  const [summary, setSummary] = useState(existingSummary)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  async function handleSave() {
    setStatus('saving')
    try {
      await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executive_summary: summary }),
      })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('idle')
    }
  }

  const tips = T.tips.items[lang as 'en' | 'fr']

  // Read-only view for PM
  if (readOnly) {
    return (
      <div className={styles.container}>
        <div className={styles.editorSection}>
          <div className={styles.editorHeader}>
            <div>
              <h2 className={styles.title}>{t(T.title)}</h2>
              <p className={styles.subtitle}>{t(T.subtitleRead)}</p>
            </div>
          </div>
          {summary.trim() ? (
            <div className={styles.readOnlyText}>
              {summary}
            </div>
          ) : (
            <p className={styles.emptyText}>{t(T.empty)}</p>
          )}
        </div>
      </div>
    )
  }

  // Editable view for admin
  return (
    <div className={styles.container}>
      <div className={styles.editorSection}>
        <div className={styles.editorHeader}>
          <div>
            <h2 className={styles.title}>{t(T.title)}</h2>
            <p className={styles.subtitle}>{t(T.subtitleEdit)}</p>
          </div>
        </div>

        <textarea
          className={styles.editor}
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder={t(T.placeholder)}
          rows={16}
        />

        <div className={styles.editorFooter}>
          <span className={styles.charCount}>
            {summary.length} {t(T.charCount)}
          </span>
          <button
            onClick={handleSave}
            className={styles.saveBtn}
            disabled={status === 'saving' || !summary.trim()}
          >
            {status === 'saving' ? t(T.saving) :
             status === 'saved' ? t(T.saved) :
             t(T.save)}
          </button>
        </div>
      </div>

      <div className={styles.tipsSection}>
        <h3 className={styles.tipsTitle}>{t(T.tips.title)}</h3>
        <ul className={styles.tipsList}>
          {tips.map((tip, i) => (
            <li key={i} className={styles.tipItem}>{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
