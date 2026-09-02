'use client'

import styles from './ReportDetail.module.css'

interface DomainScore {
  name_en: string
  name_fr: string
  score_percent: number | null
  sections?: {
    name_en: string
    name_fr: string
    score_percent: number | null
    emotional_rating?: number | null
  }[]
}

interface Props {
  report: {
    id: string
    report_json: any
    executive_summary: string | null
    published_at: string | null
    generated_at: string
  }
  campaign: {
    id: string
    name: string
    visit_window_start: string | null
    visit_window_end: string | null
    published_at: string | null
  }
  property: {
    id: string
    name: string
    city: string | null
    country: string
    category: string
  } | null
  lang: string
  canDownload: boolean
  backHref: string
}

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  '5_star': { en: '5 Stars', fr: '5 Étoiles' },
  '4_star': { en: '4 Stars', fr: '4 Étoiles' },
  '3_star': { en: '3 Stars', fr: '3 Étoiles' },
  '2_star': { en: '2 Stars', fr: '2 Étoiles' },
  '1_star': { en: '1 Star', fr: '1 Étoile' },
  unrated: { en: 'Unrated', fr: 'Non classé' },
}

const SCORE_COLOR = (pct: number | null) => {
  if (pct === null) return 'var(--color-sand)'
  if (pct >= 85) return '#4A7C6B'
  if (pct >= 70) return '#C8A45A'
  if (pct >= 50) return '#D4882A'
  return '#C0503A'
}

const SCORE_BG = (pct: number | null) => {
  if (pct === null) return 'transparent'
  if (pct >= 85) return 'rgba(74,124,107,0.12)'
  if (pct >= 70) return 'rgba(200,164,90,0.12)'
  if (pct >= 50) return 'rgba(212,136,42,0.12)'
  return 'rgba(192,80,58,0.12)'
}

const SCORE_LABEL = (pct: number | null, lang: string) => {
  if (pct === null) return '—'
  if (pct >= 85) return lang === 'en' ? 'Excellent' : 'Excellent'
  if (pct >= 70) return lang === 'en' ? 'Good' : 'Bien'
  if (pct >= 50) return lang === 'en' ? 'Developing' : 'En développement'
  return lang === 'en' ? 'Needs attention' : 'À améliorer'
}

export default function ReportDetail({ report, campaign, property, lang, canDownload, backHref }: Props) {
  const t = (en: string, fr: string) => lang === 'en' ? en : fr
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const json = report.report_json as any
  const overallPct: number | null = json?.overall_percent ?? null
  const domains: DomainScore[] = json?.domains ?? []

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const categoryLabel = property?.category
    ? (CATEGORY_LABELS[property.category]?.[lang as 'en' | 'fr'] ?? property.category)
    : ''

  return (
    <div className={styles.page}>
      {/* Top nav */}
      <div className={styles.topNav}>
        <a href={backHref} className={styles.backLink}>
          ← {t('Back to reports', 'Retour aux rapports')}
        </a>
        {canDownload && (
          <button
            onClick={() => window.print()}
            className="btn btn-primary btn-sm"
          >
            ↓ {t('Download PDF', 'Télécharger PDF')}
          </button>
        )}
      </div>

      {/* Report header */}
      <div className={styles.reportHeader}>
        <div className={styles.reportHeaderLeft}>
          <div className={styles.propertyMeta}>
            {property?.name}
            {property?.city && ` · ${property.city}`}
            {categoryLabel && ` · ${categoryLabel}`}
          </div>
          <h1 className={styles.reportTitle}>{campaign.name}</h1>
          <div className={styles.reportDates}>
            {campaign.visit_window_end && (
              <span>{t('Visit:', 'Visite :')} {formatDate(campaign.visit_window_end)}</span>
            )}
            {campaign.published_at && (
              <span>{t('Published:', 'Publié le :')} {formatDate(campaign.published_at)}</span>
            )}
          </div>
        </div>
        {overallPct !== null && (
          <div className={styles.overallScore}>
            <div
              className={styles.overallScoreCircle}
              style={{ borderColor: SCORE_COLOR(overallPct), color: SCORE_COLOR(overallPct) }}
            >
              <span className={styles.overallScoreValue}>{overallPct}%</span>
              <span className={styles.overallScoreLabel}>{t('Overall', 'Global')}</span>
            </div>
            <div className={styles.overallScoreRating} style={{ color: SCORE_COLOR(overallPct) }}>
              {SCORE_LABEL(overallPct, lang)}
            </div>
          </div>
        )}
      </div>

      {/* Executive summary */}
      {report.executive_summary && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t('Executive Summary', 'Synthèse exécutive')}</h2>
          <p className={styles.executiveSummary}>{report.executive_summary}</p>
        </div>
      )}

      {/* Domain scores */}
      {domains.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t('Score by domain', 'Score par domaine')}</h2>
          <div className={styles.domainList}>
            {domains.map((domain, i) => {
              const name = lang === 'en' ? domain.name_en : domain.name_fr
              const pct = domain.score_percent
              return (
                <div key={i} className={styles.domainRow}>
                  <div className={styles.domainHeader}>
                    <span className={styles.domainName}>{name}</span>
                    <div className={styles.domainRight}>
                      <div className={styles.domainBar}>
                        <div
                          className={styles.domainBarFill}
                          style={{
                            width: `${pct ?? 0}%`,
                            background: SCORE_COLOR(pct),
                          }}
                        />
                      </div>
                      <span
                        className={styles.domainScore}
                        style={{ color: SCORE_COLOR(pct), background: SCORE_BG(pct) }}
                      >
                        {pct !== null ? `${pct}%` : '—'}
                      </span>
                    </div>
                  </div>
                  {/* Section breakdown */}
                  {domain.sections && domain.sections.length > 0 && (
                    <div className={styles.sectionList}>
                      {domain.sections.map((section, j) => {
                        const sName = lang === 'en' ? section.name_en : section.name_fr
                        return (
                          <div key={j} className={styles.sectionRow}>
                            <span className={styles.sectionName}>{sName}</span>
                            <span
                              className={styles.sectionScore}
                              style={{ color: SCORE_COLOR(section.score_percent) }}
                            >
                              {section.score_percent !== null ? `${section.score_percent}%` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
