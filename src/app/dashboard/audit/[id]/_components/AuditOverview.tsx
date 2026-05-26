'use client'

import styles from './AuditOverview.module.css'
import type { Domain, Section, EmotionalRatingMap } from './AuditInterface'

const T = {
  auditIn: { en: 'Audit in progress', fr: 'Audit en cours' },
  progress: { en: 'Overall progress', fr: 'Progression globale' },
  standards: { en: 'standards answered', fr: 'critères répondus' },
  submitAudit: { en: 'Review & submit', fr: 'Vérifier et soumettre' },
  complete: { en: 'Complete', fr: 'Terminé' },
  inProgress: { en: 'In progress', fr: 'En cours' },
  notStarted: { en: 'Not started', fr: 'Non commencé' },
  tapToStart: { en: 'Tap to start', fr: 'Appuyer pour commencer' },
  tapToContinue: { en: 'Tap to continue', fr: 'Appuyer pour continuer' },
  tapToReview: { en: 'Tap to review', fr: 'Appuyer pour revoir' },
}

interface Props {
  campaign: any
  domains: Domain[]
  sections: Section[]
  getSectionProgress: (id: string) => { total: number; answered: number }
  getSectionComplete: (id: string) => boolean
  emotionalRatings: EmotionalRatingMap
  overallPercent: number
  answeredStandards: number
  totalStandards: number
  onOpenSection: (id: string) => void
  onSubmit: () => void
  lang: string
  domainName: (d: Domain) => string
  sectionName: (s: Section) => string
}

export default function AuditOverview({
  campaign,
  domains,
  sections,
  getSectionProgress,
  getSectionComplete,
  emotionalRatings,
  overallPercent,
  answeredStandards,
  totalStandards,
  onOpenSection,
  onSubmit,
  lang,
  domainName,
  sectionName,
}: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']
  const propertyName = (campaign.property as any)?.name ?? ''
  const propertyCity = (campaign.property as any)?.city ?? ''

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <span className={styles.auditLabel}>{t(T.auditIn)}</span>
        </div>
        <h1 className={styles.propertyName}>{propertyName}</h1>
        {propertyCity && <p className={styles.propertyCity}>{propertyCity}</p>}
        <p className={styles.campaignName}>{campaign.name}</p>
      </div>

      {/* Progress ring */}
      <div className={styles.progressSection}>
        <div className={styles.progressRingWrapper}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#253549" strokeWidth="8"/>
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke="#C8A45A"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - overallPercent / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
            <text x="60" y="56" textAnchor="middle" fill="#F4F1EC" fontSize="22" fontWeight="600">
              {overallPercent}%
            </text>
            <text x="60" y="72" textAnchor="middle" fill="#9B9488" fontSize="10">
              {t(T.progress)}
            </text>
          </svg>
        </div>
        <p className={styles.progressDetail}>
          {answeredStandards} / {totalStandards} {t(T.standards)}
        </p>
      </div>

      {/* Domains and sections */}
      <div className={styles.domainList}>
        {domains.map(domain => {
          const domainSections = sections.filter(s => s.domain_id === domain.id)
          return (
            <div key={domain.id} className={styles.domain}>
              <h2 className={styles.domainTitle}>{domainName(domain)}</h2>
              <div className={styles.sectionList}>
                {domainSections.map(section => {
                  const { total, answered } = getSectionProgress(section.id)
                  const complete = getSectionComplete(section.id)
                  const started = answered > 0
                  const hasRating = emotionalRatings[section.id] != null

                  return (
                    <button
                      key={section.id}
                      onClick={() => onOpenSection(section.id)}
                      className={`${styles.sectionBtn} ${complete ? styles.sectionComplete : started ? styles.sectionStarted : ''}`}
                    >
                      <div className={styles.sectionLeft}>
                        <div className={styles.sectionIndicator}>
                          {complete ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7C6B" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : started ? (
                            <div className={styles.sectionDotAmber} />
                          ) : (
                            <div className={styles.sectionDotGray} />
                          )}
                        </div>
                        <div className={styles.sectionInfo}>
                          <span className={styles.sectionName}>{sectionName(section)}</span>
                          <span className={styles.sectionCount}>{answered}/{total}</span>
                        </div>
                      </div>
                      <div className={styles.sectionRight}>
                        {hasRating && (
                          <span className={styles.emotionalDot} title="Emotional rating set">★</span>
                        )}
                        <span className={styles.sectionArrow}>›</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit button */}
      <div className={styles.submitSection}>
        <button onClick={onSubmit} className={styles.submitBtn}>
          {t(T.submitAudit)} →
        </button>
      </div>
    </div>
  )
}
