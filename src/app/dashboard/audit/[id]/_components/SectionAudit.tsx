'use client'

import { useState } from 'react'
import styles from './SectionAudit.module.css'
import type { Section, Standard, Domain, ResponseMap } from './AuditInterface'

const T = {
  meet: { en: 'MEET', fr: 'CONFORME' },
  below: { en: 'BELOW', fr: 'NON CONFORME' },
  na: { en: 'N/A', fr: 'N/A' },
  notesPlaceholder: { en: 'Observation (optional)…', fr: 'Observation (optionnel)…' },
  emotionalTitle: { en: 'Section emotional rating', fr: 'Note émotionnelle de la section' },
  emotionalLabels: {
    5: { en: 'Pampered', fr: 'Choyé(e)' },
    4: { en: 'Delighted', fr: 'Ravi(e)' },
    3: { en: 'Content', fr: 'Satisfait(e)' },
    2: { en: 'Disappointed', fr: 'Déçu(e)' },
    1: { en: 'Frustrated', fr: 'Frustré(e)' },
  },
  back: { en: '← Overview', fr: '← Vue d\'ensemble' },
  next: { en: 'Next section →', fr: 'Section suivante →' },
  finish: { en: 'Review & submit →', fr: 'Vérifier et soumettre →' },
  saving: { en: 'Saving…', fr: 'Enregistrement…' },
  saved: { en: 'Saved', fr: 'Enregistré' },
  critical: { en: 'Critical standard', fr: 'Critère critique' },
  progress: { en: 'answered', fr: 'répondus' },
  guidance: { en: 'Guidance', fr: 'Guide' },
}

interface Props {
  campaign: any
  section: Section
  domain: Domain | null
  standards: Standard[]
  responses: ResponseMap
  emotionalRating: number | null
  onResponseChange: (standardId: string, response: 'meet' | 'below' | 'na' | null, note: string) => void
  onEmotionalRatingChange: (sectionId: string, rating: number) => void
  onBack: () => void
  onNext: () => void
  hasNext: boolean
  saving: boolean
  lang: string
  sectionName: string
  domainName: string
}

export default function SectionAudit({
  section,
  domain,
  standards,
  responses,
  emotionalRating,
  onResponseChange,
  onEmotionalRatingChange,
  onBack,
  onNext,
  hasNext,
  saving,
  lang,
  sectionName,
  domainName,
}: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [expandedGuidance, setExpandedGuidance] = useState<Set<string>>(new Set())

  const answered = standards.filter(s => responses[s.id]?.response != null).length
  const total = standards.length

  function toggleNotes(standardId: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(standardId)) next.delete(standardId)
      else next.add(standardId)
      return next
    })
  }

  function toggleGuidance(standardId: string) {
    setExpandedGuidance(prev => {
      const next = new Set(prev)
      if (next.has(standardId)) next.delete(standardId)
      else next.add(standardId)
      return next
    })
  }

  function handleResponse(standard: Standard, value: 'meet' | 'below' | 'na') {
    const current = responses[standard.id]
    const newValue = current?.response === value ? null : value
    onResponseChange(standard.id, newValue, current?.note ?? '')
  }

  function handleNote(standard: Standard, note: string) {
    const current = responses[standard.id]
    onResponseChange(standard.id, current?.response ?? null, note)
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>{t(T.back)}</button>
        <div className={styles.headerCenter}>
          {domain && <span className={styles.domainLabel}>{domainName}</span>}
          <h1 className={styles.sectionTitle}>{sectionName}</h1>
        </div>
        <div className={styles.progressPill}>
          {answered}/{total}
        </div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
        />
      </div>

      {/* Standards list */}
      <div className={styles.standardsList}>
        {standards.map((standard, index) => {
          const current = responses[standard.id]
          const response = current?.response ?? null
          const note = current?.note ?? ''
          const hasNote = note.trim().length > 0
          const hasGuidance = lang === 'en' ? !!standard.guidance_en : !!standard.guidance_fr
          const guidanceText = lang === 'en' ? standard.guidance_en : standard.guidance_fr
          const questionText = lang === 'en' ? standard.question_en : standard.question_fr

          return (
            <div
              key={standard.id}
              className={`${styles.standard} ${
                response === 'meet' ? styles.standardMeet :
                response === 'below' ? styles.standardBelow :
                response === 'na' ? styles.standardNa : ''
              }`}
            >
              {/* Standard header */}
              <div className={styles.standardHeader}>
                <span className={styles.standardNumber}>{index + 1}</span>
                {standard.is_critical && (
                  <span className={styles.criticalBadge}>{t(T.critical)}</span>
                )}
              </div>

              {/* Question */}
              <p className={styles.questionText}>{questionText}</p>

              {/* Guidance */}
              {hasGuidance && (
                <div className={styles.guidanceSection}>
                  <button
                    onClick={() => toggleGuidance(standard.id)}
                    className={styles.guidanceToggle}
                  >
                    {t(T.guidance)} {expandedGuidance.has(standard.id) ? '▲' : '▼'}
                  </button>
                  {expandedGuidance.has(standard.id) && (
                    <p className={styles.guidanceText}>{guidanceText}</p>
                  )}
                </div>
              )}

              {/* Response buttons */}
              <div className={styles.responseButtons}>
                <button
                  onClick={() => handleResponse(standard, 'meet')}
                  className={`${styles.responseBtn} ${styles.responseMeet} ${response === 'meet' ? styles.responseBtnActive : ''}`}
                >
                  {t(T.meet)}
                </button>
                <button
                  onClick={() => handleResponse(standard, 'below')}
                  className={`${styles.responseBtn} ${styles.responseBelow} ${response === 'below' ? styles.responseBtnActive : ''}`}
                >
                  {t(T.below)}
                </button>
                <button
                  onClick={() => handleResponse(standard, 'na')}
                  className={`${styles.responseBtn} ${styles.responseNa} ${response === 'na' ? styles.responseBtnActive : ''}`}
                >
                  {t(T.na)}
                </button>
              </div>

              {/* Notes toggle */}
              <button
                onClick={() => toggleNotes(standard.id)}
                className={`${styles.notesToggle} ${hasNote ? styles.notesToggleActive : ''}`}
              >
                {hasNote ? '📝 ' : '+ '}{lang === 'en' ? 'Add observation' : 'Ajouter une observation'}
              </button>

              {expandedNotes.has(standard.id) && (
                <textarea
                  className={styles.notesInput}
                  value={note}
                  onChange={e => handleNote(standard, e.target.value)}
                  placeholder={t(T.notesPlaceholder)}
                  rows={3}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Emotional rating */}
      <div className={styles.emotionalSection}>
        <h3 className={styles.emotionalTitle}>{t(T.emotionalTitle)}</h3>
        <div className={styles.emotionalButtons}>
          {([5, 4, 3, 2, 1] as const).map(rating => (
            <button
              key={rating}
              onClick={() => onEmotionalRatingChange(section.id, rating)}
              className={`${styles.emotionalBtn} ${emotionalRating === rating ? styles.emotionalBtnActive : ''}`}
            >
              <span className={styles.emotionalScore}>{rating}</span>
              <span className={styles.emotionalLabel}>
                {t(T.emotionalLabels[rating])}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className={styles.savingIndicator}>{t(T.saving)}</div>
      )}

      {/* Navigation */}
      <div className={styles.navigation}>
        <button onClick={onNext} className={styles.nextBtn}>
          {hasNext ? t(T.next) : t(T.finish)}
        </button>
      </div>
    </div>
  )
}
