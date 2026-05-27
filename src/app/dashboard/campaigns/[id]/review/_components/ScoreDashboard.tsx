'use client'

import styles from './ScoreDashboard.module.css'

const CLASSIFICATION_LABELS: Record<string, { en: string; fr: string }> = {
  EFFICIENCY: { en: 'Efficiency', fr: 'Efficacité' },
  SERVICE: { en: 'Service', fr: 'Service' },
  SALES_OPPORTUNITY: { en: 'Sales Opportunity', fr: 'Opportunité Commerciale' },
  EMOTIONAL_INTELLIGENCE: { en: 'Emotional Intelligence', fr: 'Intelligence Émotionnelle' },
  CLEANLINESS: { en: 'Cleanliness', fr: 'Propreté' },
  PRODUCT: { en: 'Product', fr: 'Produit' },
}

const EMOTIONAL_LABELS: Record<number, { en: string; fr: string }> = {
  5: { en: 'Pampered', fr: 'Choyé(e)' },
  4: { en: 'Delighted', fr: 'Ravi(e)' },
  3: { en: 'Content', fr: 'Satisfait(e)' },
  2: { en: 'Disappointed', fr: 'Déçu(e)' },
  1: { en: 'Frustrated', fr: 'Frustré(e)' },
}

function scoreColor(percent: number | null): string {
  if (percent === null) return '#9B9488'
  if (percent >= 85) return '#4A7C6B'
  if (percent >= 70) return '#C8A45A'
  if (percent >= 50) return '#D4882A'
  return '#C0503A'
}

function ScoreRing({ percent, size = 80 }: { percent: number | null; size?: number }) {
  const r = (size / 2) - 6
  const circumference = 2 * Math.PI * r
  const offset = percent !== null
    ? circumference * (1 - percent / 100)
    : circumference
  const color = scoreColor(percent)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#253549" strokeWidth="5"/>
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text
        x={size/2} y={size/2 + 5}
        textAnchor="middle"
        fill={percent !== null ? '#F4F1EC' : '#9B9488'}
        fontSize={size > 60 ? "14" : "11"}
        fontWeight="600"
      >
        {percent !== null ? `${percent}%` : 'N/A'}
      </text>
    </svg>
  )
}

interface Props {
  scores: any
  lang: string
}

export default function ScoreDashboard({ scores, lang }: Props) {
  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']

  return (
    <div className={styles.dashboard}>

      {/* Overall summary */}
      <div className={styles.overallCard}>
        <div className={styles.overallLeft}>
          <ScoreRing percent={scores.overall_percent} size={100} />
          <div>
            <p className={styles.overallLabel}>
              {lang === 'en' ? 'Overall score' : 'Score global'}
            </p>
            <p className={styles.overallStats}>
              {scores.total_meet} {lang === 'en' ? 'meet' : 'conformes'} ·{' '}
              {scores.total_below} {lang === 'en' ? 'below' : 'non conformes'} ·{' '}
              {scores.total_na} N/A
            </p>
            {scores.average_emotional_rating && (
              <p className={styles.overallEmotional}>
                ★ {scores.average_emotional_rating} —{' '}
                {t(EMOTIONAL_LABELS[Math.round(scores.average_emotional_rating)] ?? { en: '', fr: '' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Domain scores */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {lang === 'en' ? 'Domain scores' : 'Scores par domaine'}
        </h2>
        <div className={styles.domainGrid}>
          {scores.domains?.map((domain: any) => (
            <div key={domain.domain_id} className={styles.domainCard}>
              <div className={styles.domainTop}>
                <ScoreRing percent={domain.score_percent} size={64} />
                <div className={styles.domainInfo}>
                  <p className={styles.domainName}>
                    {lang === 'en' ? domain.name_en : domain.name_fr}
                  </p>
                  <p className={styles.domainSections}>
                    {domain.sections?.length} {lang === 'en' ? 'sections' : 'sections'}
                  </p>
                </div>
              </div>
              {/* Section breakdown */}
              <div className={styles.sectionList}>
                {domain.sections?.map((section: any) => (
                  <div key={section.section_id} className={styles.sectionRow}>
                    <span className={styles.sectionName}>
                      {lang === 'en' ? section.name_en : section.name_fr}
                    </span>
                    <div className={styles.sectionRight}>
                      {section.emotional_rating && (
                        <span className={styles.emotionalStar}>★{section.emotional_rating}</span>
                      )}
                      <span
                        className={styles.sectionScore}
                        style={{ color: scoreColor(section.score_percent) }}
                      >
                        {section.score_percent !== null ? `${section.score_percent}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Classification breakdown */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {lang === 'en' ? 'Performance by classification' : 'Performance par classification'}
        </h2>
        <div className={styles.classificationList}>
          {Object.entries(scores.classification_breakdown ?? {}).map(([key, value]: [string, any]) => {
            if (value.total === 0) return null
            const label = CLASSIFICATION_LABELS[key]
            const percent = value.meet_percent
            return (
              <div key={key} className={styles.classificationRow}>
                <span className={styles.classificationName}>
                  {label ? t(label) : key}
                </span>
                <div className={styles.classificationBarWrapper}>
                  <div
                    className={styles.classificationBar}
                    style={{
                      width: `${percent ?? 0}%`,
                      background: scoreColor(percent),
                    }}
                  />
                </div>
                <span
                  className={styles.classificationPercent}
                  style={{ color: scoreColor(percent) }}
                >
                  {percent !== null ? `${percent}%` : 'N/A'}
                </span>
                <span className={styles.classificationCount}>
                  {value.meet}/{value.scored}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Critical failures */}
      {scores.domains?.some((d: any) =>
        d.sections?.some((s: any) => s.critical_failures?.length > 0)
      ) && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitleAlert}>
            {lang === 'en' ? 'Critical failures' : 'Échecs critiques'}
          </h2>
          <div className={styles.criticalList}>
            {scores.domains?.map((domain: any) =>
              domain.sections?.map((section: any) =>
                section.critical_failures?.map((std: any) => (
                  <div key={std.standard_id} className={styles.criticalItem}>
                    <div className={styles.criticalHeader}>
                      <span className={styles.criticalDomain}>
                        {lang === 'en' ? domain.name_en : domain.name_fr}
                      </span>
                      <span className={styles.criticalSection}>
                        {lang === 'en' ? section.name_en : section.name_fr}
                      </span>
                    </div>
                    <p className={styles.criticalQuestion}>
                      {lang === 'en' ? std.question_en : std.question_fr}
                    </p>
                    {std.auditor_note && (
                      <p className={styles.criticalNote}>"{std.auditor_note}"</p>
                    )}
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
