'use client'

import { useState } from 'react'
import styles from './AuditSubmit.module.css'
import type { Domain, Section, Standard, ResponseMap, EmotionalRatingMap } from './AuditInterface'

const T = {
  title: { en: 'Review & submit', fr: 'Vérification et soumission' },
  subtitle: { en: 'Check your progress before submitting. Submission cannot be undone.', fr: 'Vérifiez votre progression avant de soumettre. La soumission est définitive.' },
  back: { en: '← Back to overview', fr: '← Retour à la vue d\'ensemble' },
  sectionProgress: { en: 'answered', fr: 'répondus' },
  complete: { en: 'Complete', fr: 'Terminé' },
  incomplete: { en: 'Incomplete', fr: 'Incomplet' },
  emotionalSet: { en: 'Rating set', fr: 'Note définie' },
  emotionalMissing: { en: 'No rating', fr: 'Pas de note' },
  submitBtn: { en: 'Submit audit', fr: 'Soumettre l\'audit' },
  submitting: { en: 'Submitting…', fr: 'Soumission en cours…' },
  confirmTitle: { en: 'Submit this audit?', fr: 'Soumettre cet audit ?' },
  confirmMsg: { en: 'Once submitted, you cannot make changes. The admin will be notified to review.', fr: 'Une fois soumis, vous ne pouvez plus faire de modifications. L\'administrateur sera notifié.' },
  confirm: { en: 'Yes, submit', fr: 'Oui, soumettre' },
  cancel: { en: 'Cancel', fr: 'Annuler' },
  warningIncomplete: { en: 'Some sections are incomplete. You can still submit, but incomplete standards will be excluded from scoring.', fr: 'Certaines sections sont incomplètes. Vous pouvez quand même soumettre, mais les critères sans réponse seront exclus du calcul.' },
  successTitle: { en: 'Audit submitted', fr: 'Audit soumis' },
  successMsg: { en: 'Your audit has been submitted successfully. The admin will review it shortly.', fr: 'Votre audit a été soumis avec succès. L\'administrateur le révisera prochainement.' },
  overall: { en: 'Overall progress', fr: 'Progression globale' },
  waitSaving: { en: 'Saving your last answers… you can submit in a moment.', fr: 'Enregistrement de vos dernières réponses… vous pourrez soumettre dans un instant.' },
  unsaved: { en: 'Some answers are not saved yet. Check your connection, then tap Retry before submitting.', fr: "Certaines réponses ne sont pas encore enregistrées. Vérifiez votre connexion, puis touchez Réessayer avant de soumettre." },
  retry: { en: 'Retry', fr: 'Réessayer' },
  submitFailed: { en: 'The audit could not be submitted. Check your connection and try again.', fr: "L'audit n'a pas pu être soumis. Vérifiez votre connexion et réessayez." },
}

interface Props {
  campaign: any
  sections: Section[]
  domains: Domain[]
  standards: Standard[]
  responses: ResponseMap
  emotionalRatings: EmotionalRatingMap
  getSectionProgress: (id: string) => { total: number; answered: number }
  onBack: () => void
  lang: string
  /** Saves still in flight / failed: submitting now would score the audit without them */
  saving: boolean
  unsaved: number
  onRetry: () => void
}

export default function AuditSubmit({
  campaign,
  sections,
  domains,
  standards,
  responses,
  emotionalRatings,
  getSectionProgress,
  onBack,
  lang,
  saving,
  unsaved,
  onRetry,
}: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const blocked = saving || unsaved > 0

  const totalAnswered = standards.filter(s => responses[s.id]?.response != null).length
  const totalStandards = standards.length
  const overallPercent = totalStandards > 0 ? Math.round((totalAnswered / totalStandards) * 100) : 0
  const hasIncomplete = sections.some(s => {
    const { total, answered } = getSectionProgress(s.id)
    return answered < total
  })

  async function handleSubmit() {
    if (blocked) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/audit/${campaign.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok && !res.redirected) {
        setSubmitted(true)
        return
      }
      const data = await res.json().catch(() => ({}))
      setSubmitError(typeof data.error === 'string' && res.status !== 500 ? data.error : t(T.submitFailed))
    } catch {
      setSubmitError(t(T.submitFailed))
    }
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>{t(T.successTitle)}</h1>
          <p className={styles.successMsg}>{t(T.successMsg)}</p>
          <a href="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            {lang === 'en' ? 'Back to dashboard' : 'Retour au tableau de bord'}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>{t(T.back)}</button>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <p className={styles.subtitle}>{t(T.subtitle)}</p>
      </div>

      {/* Overall progress */}
      <div className={styles.overallCard}>
        <div className={styles.overallLabel}>{t(T.overall)}</div>
        <div className={styles.overallBar}>
          <div className={styles.overallFill} style={{ width: `${overallPercent}%` }} />
        </div>
        <div className={styles.overallCount}>{totalAnswered}/{totalStandards} — {overallPercent}%</div>
      </div>

      {hasIncomplete && (
        <div className={styles.warningBanner}>
          ⚠️ {t(T.warningIncomplete)}
        </div>
      )}

      {/* Section checklist */}
      <div className={styles.sectionList}>
        {domains.map(domain => {
          const domainSections = sections.filter(s => s.domain_id === domain.id)
          const domainName = lang === 'en' ? domain.name_en : domain.name_fr
          return (
            <div key={domain.id} className={styles.domainGroup}>
              <h2 className={styles.domainTitle}>{domainName}</h2>
              {domainSections.map(section => {
                const { total, answered } = getSectionProgress(section.id)
                const complete = answered === total
                const hasRating = emotionalRatings[section.id] != null
                const sectionName = lang === 'en' ? section.name_en : section.name_fr

                return (
                  <div key={section.id} className={`${styles.sectionRow} ${complete ? styles.sectionRowComplete : ''}`}>
                    <div className={styles.sectionRowLeft}>
                      <div className={styles.sectionCheck}>
                        {complete ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A7C6B" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <div className={styles.sectionCheckEmpty} />
                        )}
                      </div>
                      <span className={styles.sectionRowName}>{sectionName}</span>
                    </div>
                    <div className={styles.sectionRowRight}>
                      <span className={`${styles.sectionStat} ${complete ? styles.sectionStatComplete : styles.sectionStatIncomplete}`}>
                        {answered}/{total}
                      </span>
                      <span className={`${styles.emotionalStat} ${hasRating ? styles.emotionalStatSet : ''}`}>
                        {hasRating ? `★ ${emotionalRatings[section.id]}` : '★ —'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {blocked && (
        <div className={styles.warningBanner} role="status">
          {unsaved > 0 ? (
            <>⚠️ {t(T.unsaved)}{' '}<button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>{t(T.retry)}</button></>
          ) : t(T.waitSaving)}
        </div>
      )}
      {submitError && <div className={styles.warningBanner} role="alert">⚠️ {submitError}</div>}

      {/* Submit */}
      {!showConfirm ? (
        <button onClick={() => setShowConfirm(true)} className={styles.submitBtn} disabled={blocked}>
          {t(T.submitBtn)}
        </button>
      ) : (
        <div className={styles.confirmCard}>
          <h3 className={styles.confirmTitle}>{t(T.confirmTitle)}</h3>
          <p className={styles.confirmMsg}>{t(T.confirmMsg)}</p>
          <div className={styles.confirmActions}>
            <button onClick={() => setShowConfirm(false)} className="btn btn-ghost" disabled={submitting}>
              {t(T.cancel)}
            </button>
            <button onClick={handleSubmit} className={styles.confirmBtn} disabled={submitting || blocked}>
              {submitting ? t(T.submitting) : t(T.confirm)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
