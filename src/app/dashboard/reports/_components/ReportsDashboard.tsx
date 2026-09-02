'use client'

import { useState, useMemo } from 'react'
import ScoreTrendChart from './ScoreTrendChart'
import DomainComparisonTable from './DomainComparisonTable'
import styles from './ReportsDashboard.module.css'

interface Campaign {
  id: string; name: string; publishedAt: string | null; visitStart: string | null
  visitEnd: string | null; propertyId: string; propertyName: string
  propertyCity: string | null; propertyCategory: string; reportId: string | null
  overallPercent: number | null
  domainScores: { name_en: string; name_fr: string; score_percent: number | null }[]
}

interface Property { id: string; name: string; city: string | null; country: string; category: string }
interface Props { properties: Property[]; campaigns: Campaign[]; lang: string }

const VISIT_FILTERS = [
  { key: '3', en: 'Last 3', fr: '3 derniers' },
  { key: '6', en: 'Last 6', fr: '6 derniers' },
  { key: '12', en: 'Last 12', fr: '12 derniers' },
  { key: 'all', en: 'All', fr: 'Tous' },
]

const SCORE_COLOR = (pct: number | null) => {
  if (pct === null) return 'var(--color-sand)'
  if (pct >= 85) return '#4A7C6B'
  if (pct >= 70) return '#C8A45A'
  if (pct >= 50) return '#D4882A'
  return '#C0503A'
}

export default function ReportsDashboard({ properties, campaigns, lang }: Props) {
  const t = (en: string, fr: string) => lang === 'en' ? en : fr
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id ?? '')
  const [visitFilter, setVisitFilter] = useState('all')

  const propertyCampaigns = useMemo(() =>
    campaigns.filter(c => c.propertyId === selectedPropertyId),
    [campaigns, selectedPropertyId]
  )

  const filteredCampaigns = useMemo(() => {
    const sorted = [...propertyCampaigns].sort((a, b) =>
      new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
    )
    return visitFilter === 'all' ? sorted : sorted.slice(0, parseInt(visitFilter))
  }, [propertyCampaigns, visitFilter])

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  const latestScore = filteredCampaigns[0]?.overallPercent ?? null

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('Dashboard', 'Tableau de bord')}</h1>
        <p className={styles.subtitle}>{t('Performance trends and score analysis.', 'Tendances de performance et analyse des scores.')}</p>
      </div>

      {properties.length > 1 && (
        <div className={styles.propertySelector}>
          {properties.map(p => (
            <button key={p.id} onClick={() => setSelectedPropertyId(p.id)}
              className={`${styles.propertyTab} ${selectedPropertyId === p.id ? styles.propertyTabActive : ''}`}>
              {p.name}{p.city && <span className={styles.propertyTabCity}> · {p.city}</span>}
            </button>
          ))}
        </div>
      )}

      {selectedProperty && (
        <div className={styles.propertyHeader}>
          <div>
            <div className={styles.propertyName}>{selectedProperty.name}</div>
            {selectedProperty.city && (
              <div className={styles.propertyMeta}>{[selectedProperty.city, selectedProperty.country].filter(Boolean).join(', ')}</div>
            )}
          </div>
          {latestScore !== null && (
            <div className={styles.latestScore}>
              <div className={styles.latestScoreValue} style={{ color: SCORE_COLOR(latestScore) }}>{latestScore}%</div>
              <div className={styles.latestScoreLabel}>{t('Latest score', 'Dernier score')}</div>
            </div>
          )}
        </div>
      )}

      {filteredCampaigns.length === 0 ? (
        <div className={styles.empty}>{t('No published reports yet for this property.', 'Aucun rapport publié pour cet établissement.')}</div>
      ) : (
        <>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>{t('Period:', 'Période :')}</span>
            {VISIT_FILTERS.map(f => (
              <button key={f.key} onClick={() => setVisitFilter(f.key)}
                className={`${styles.filterBtn} ${visitFilter === f.key ? styles.filterBtnActive : ''}`}>
                {lang === 'en' ? f.en : f.fr}
              </button>
            ))}
            <a href="/dashboard/reports/list" className={styles.viewReportsLink}>
              {t('View all reports →', 'Voir tous les rapports →')}
            </a>
          </div>

          {filteredCampaigns.length >= 2 ? (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('Score trend', 'Évolution des scores')}</h2>
              <ScoreTrendChart campaigns={filteredCampaigns} lang={lang} />
            </div>
          ) : (
            <div className={styles.card} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--color-sand)', fontSize: '0.9375rem' }}>
                {t('Trend chart will appear once 2 or more audits are published.', 'Le graphique apparaîtra dès que 2 audits ou plus seront publiés.')}
              </p>
            </div>
          )}

          {filteredCampaigns.length >= 2 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>{t('Domain scores by audit', 'Scores par domaine et par audit')}</h2>
              <DomainComparisonTable campaigns={filteredCampaigns} lang={lang} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
