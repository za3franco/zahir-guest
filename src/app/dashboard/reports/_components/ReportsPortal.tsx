'use client'

import { useState, useMemo } from 'react'
import ScoreTrendChart from './ScoreTrendChart'
import DomainComparisonTable from './DomainComparisonTable'
import styles from './ReportsPortal.module.css'

interface Campaign {
  id: string
  name: string
  publishedAt: string | null
  visitStart: string | null
  visitEnd: string | null
  auditorName: string | null
  propertyId: string
  propertyName: string
  propertyCity: string | null
  propertyCategory: string
  reportId: string | null
  overallPercent: number | null
  domainScores: { name_en: string; name_fr: string; score_percent: number | null }[]
}

interface Property {
  id: string
  name: string
  city: string | null
  country: string
  category: string
}

interface Props {
  properties: Property[]
  campaigns: Campaign[]
  userRole: string
  lang: string
}

const VISIT_FILTERS = [
  { key: '3', en: 'Last 3 audits', fr: '3 derniers audits' },
  { key: '6', en: 'Last 6 audits', fr: '6 derniers audits' },
  { key: '12', en: 'Last 12 audits', fr: '12 derniers audits' },
  { key: 'all', en: 'All audits', fr: 'Tous les audits' },
]

const SCORE_COLOR = (pct: number | null) => {
  if (pct === null) return 'var(--color-sand)'
  if (pct >= 85) return '#4A7C6B'
  if (pct >= 70) return '#C8A45A'
  if (pct >= 50) return '#D4882A'
  return '#C0503A'
}

export default function ReportsPortal({ properties, campaigns, userRole, lang }: Props) {
  const t = (en: string, fr: string) => lang === 'en' ? en : fr

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties[0]?.id ?? ''
  )
  const [visitFilter, setVisitFilter] = useState('all')
  const canDownload = userRole === 'property_manager'

  const propertyCampaigns = useMemo(() =>
    campaigns.filter(c => c.propertyId === selectedPropertyId),
    [campaigns, selectedPropertyId]
  )

  const filteredCampaigns = useMemo(() => {
    const sorted = [...propertyCampaigns].sort((a, b) =>
      new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
    )
    if (visitFilter === 'all') return sorted
    return sorted.slice(0, parseInt(visitFilter))
  }, [propertyCampaigns, visitFilter])

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const formatDateShort = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('Reports', 'Rapports')}</h1>
          <p className={styles.subtitle}>
            {t('Your published audit reports and performance trends.', 'Vos rapports d\'audit publiés et tendances de performance.')}
          </p>
        </div>
      </div>

      {/* Property selector — shown if manager has multiple properties */}
      {properties.length > 1 && (
        <div className={styles.propertySelector}>
          {properties.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPropertyId(p.id)}
              className={`${styles.propertyTab} ${selectedPropertyId === p.id ? styles.propertyTabActive : ''}`}
            >
              {p.name}
              {p.city && <span className={styles.propertyTabCity}> · {p.city}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Property header */}
      {selectedProperty && (
        <div className={styles.propertyHeader}>
          <div className={styles.propertyName}>{selectedProperty.name}</div>
          {selectedProperty.city && (
            <div className={styles.propertyMeta}>
              {[selectedProperty.city, selectedProperty.country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      )}

      {filteredCampaigns.length === 0 ? (
        <div className={styles.empty}>
          {t('No published reports yet for this property.', 'Aucun rapport publié pour cet établissement.')}
        </div>
      ) : (
        <>
          {/* Visit filter */}
          <div className={styles.visitFilterRow}>
            <span className={styles.visitFilterLabel}>{t('Show:', 'Afficher :')}</span>
            {VISIT_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setVisitFilter(f.key)}
                className={`${styles.visitFilterBtn} ${visitFilter === f.key ? styles.visitFilterBtnActive : ''}`}
              >
                {lang === 'en' ? f.en : f.fr}
              </button>
            ))}
          </div>

          {/* Score trend chart */}
          {filteredCampaigns.length >= 2 && (
            <div className={styles.chartCard}>
              <h2 className={styles.cardTitle}>
                {t('Score trend', 'Évolution des scores')}
              </h2>
              <ScoreTrendChart campaigns={filteredCampaigns} lang={lang} />
            </div>
          )}

          {/* Domain comparison — only when 2+ audits */}
          {filteredCampaigns.length >= 2 && (
            <div className={styles.chartCard}>
              <h2 className={styles.cardTitle}>
                {t('Domain scores by audit', 'Scores par domaine et par audit')}
              </h2>
              <DomainComparisonTable campaigns={filteredCampaigns} lang={lang} />
            </div>
          )}

          {/* Report list */}
          <div className={styles.reportList}>
            <h2 className={styles.cardTitle}>{t('All reports', 'Tous les rapports')}</h2>
            {filteredCampaigns.map(c => (
              <div key={c.id} className={styles.reportCard}>
                <div className={styles.reportCardLeft}>
                  <div className={styles.reportCardName}>{c.name}</div>
                  <div className={styles.reportCardMeta}>
                    {t('Published', 'Publié le')} {formatDate(c.publishedAt)}
                    {c.visitEnd && (
                      <> · {t('Visit', 'Visite')} {formatDateShort(c.visitEnd)}</>
                    )}
                  </div>
                </div>
                <div className={styles.reportCardRight}>
                  {c.overallPercent !== null && (
                    <div
                      className={styles.scoreBadge}
                      style={{ color: SCORE_COLOR(c.overallPercent), borderColor: SCORE_COLOR(c.overallPercent) + '44' }}
                    >
                      {c.overallPercent}%
                    </div>
                  )}
                  {c.reportId && (
                    <a
                      href={`/dashboard/reports/${c.reportId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`btn btn-secondary btn-sm`}
                    >
                      {canDownload ? t('View & PDF ↗', 'Voir & PDF ↗') : t('View ↗', 'Consulter ↗')}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
