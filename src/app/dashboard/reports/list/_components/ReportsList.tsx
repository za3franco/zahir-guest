'use client'

import { useState } from 'react'
import styles from './ReportsList.module.css'

interface ReportRow {
  id: string
  name: string
  publishedAt: string | null
  visitEnd: string | null
  propertyName: string
  propertyCity: string | null
  reportId: string | null
  overallPercent: number | null
}

interface Props {
  reports: ReportRow[]
  lang: string
  canDownload: boolean
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

export default function ReportsList({ reports, lang, canDownload }: Props) {
  const t = (en: string, fr: string) => lang === 'en' ? en : fr
  const [query, setQuery] = useState('')
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const filtered = query.trim()
    ? reports.filter(r =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.propertyName.toLowerCase().includes(query.toLowerCase())
      )
    : reports

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const formatDateShort = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
    : '—'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('Reports', 'Rapports')}</h1>
          <p className={styles.subtitle}>
            {t('All published audit reports.', 'Tous les rapports d\'audit publiés.')}
          </p>
        </div>
        <a href="/dashboard/reports" className={styles.backLink}>
          ← {t('Dashboard', 'Tableau de bord')}
        </a>
      </div>

      {/* Search */}
      <div className={styles.searchRow}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('Search reports…', 'Rechercher…')}
          className={styles.searchInput}
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery('')} className={styles.clearBtn} type="button">
            {t('Clear', 'Effacer')} ×
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('Audit', 'Audit')}</th>
              <th>{t('Property', 'Établissement')}</th>
              <th>{t('Visit date', 'Date de visite')}</th>
              <th>{t('Published', 'Publié le')}</th>
              <th>{t('Score', 'Score')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className={styles.empty}>{t('No reports found.', 'Aucun rapport trouvé.')}</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td className={styles.auditName}>{r.name}</td>
                <td className={styles.muted}>{r.propertyName}{r.propertyCity ? ` · ${r.propertyCity}` : ''}</td>
                <td className={styles.muted}>{formatDateShort(r.visitEnd)}</td>
                <td className={styles.muted}>{formatDateShort(r.publishedAt)}</td>
                <td>
                  {r.overallPercent !== null ? (
                    <span className={styles.scoreBadge} style={{
                      color: SCORE_COLOR(r.overallPercent),
                      background: SCORE_BG(r.overallPercent),
                    }}>
                      {r.overallPercent}%
                    </span>
                  ) : '—'}
                </td>
                <td>
                  {r.reportId && (
                    <a href={`/dashboard/reports/${r.reportId}`} className="btn btn-ghost btn-sm">
                      {t('View →', 'Consulter →')}
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>{t('No reports found.', 'Aucun rapport trouvé.')}</p>
        ) : filtered.map(r => (
          <div key={r.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div>
                <div className={styles.mobileCardName}>{r.name}</div>
                <div className={styles.mobileCardMeta}>{r.propertyName} · {formatDateShort(r.visitEnd)}</div>
              </div>
              {r.overallPercent !== null && (
                <span className={styles.scoreBadge} style={{
                  color: SCORE_COLOR(r.overallPercent),
                  background: SCORE_BG(r.overallPercent),
                }}>
                  {r.overallPercent}%
                </span>
              )}
            </div>
            {r.reportId && (
              <div className={styles.mobileCardActions}>
                <a href={`/dashboard/reports/${r.reportId}`} className="btn btn-ghost btn-sm">
                  {t('View →', 'Consulter →')}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
