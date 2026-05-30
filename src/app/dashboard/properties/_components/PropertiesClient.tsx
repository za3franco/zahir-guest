'use client'

import { useState } from 'react'
import styles from '../properties.module.css'

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  '5_star': { en: '5 Stars', fr: '5 Étoiles' },
  '4_star': { en: '4 Stars', fr: '4 Étoiles' },
  '3_star': { en: '3 Stars', fr: '3 Étoiles' },
  '2_star': { en: '2 Stars', fr: '2 Étoiles' },
  '1_star': { en: '1 Star', fr: '1 Étoile' },
  unrated: { en: 'Unrated', fr: 'Non classé' },
}

interface PropertyRow {
  id: string
  name: string
  city: string | null
  country: string
  category: string
  type: string
}

interface Props {
  properties: PropertyRow[]
  showArchived: boolean
  lang: string
  labels: {
    searchPlaceholder: string
    clearLabel: string
    allCategories: string
    empty: string
    emptyArchived: string
    editLabel: string
    archiveLabel: string
    restoreLabel: string
    colName: string
    colCity: string
    colCategory: string
    colActions: string
  }
}

export default function PropertiesClient({ properties, showArchived, lang, labels }: Props) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const t = (key: { en: string; fr: string }) => key[lang as 'en' | 'fr']

  // Get distinct categories present in the data
  const presentCategories = Array.from(new Set(properties.map(p => p.category).filter(Boolean)))

  const filtered = properties.filter(p => {
    const matchesQuery = !query.trim() ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.city ?? '').toLowerCase().includes(query.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    return matchesQuery && matchesCategory
  })

  const hasActiveFilter = query.trim() || categoryFilter !== 'all'

  function clearAll() {
    setQuery('')
    setCategoryFilter('all')
  }

  const emptyMsg = showArchived ? labels.emptyArchived : labels.empty

  return (
    <>
      {/* Search + clear */}
      <div className={styles.searchRow}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          className={styles.searchInput}
          autoComplete="off"
        />
        {hasActiveFilter && (
          <button onClick={clearAll} className={styles.clearBtn} type="button">
            {labels.clearLabel} ×
          </button>
        )}
      </div>

      {/* Category filter tabs */}
      {presentCategories.length > 1 && (
        <div className={styles.filters}>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`${styles.filterTab} ${categoryFilter === 'all' ? styles.filterTabActive : ''}`}
          >
            {labels.allCategories}
          </button>
          {presentCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`${styles.filterTab} ${categoryFilter === cat ? styles.filterTabActive : ''}`}
            >
              {t(CATEGORY_LABELS[cat] ?? { en: cat, fr: cat })}
            </button>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{labels.colName}</th>
              <th>{labels.colCity}</th>
              <th>{labels.colCategory}</th>
              <th>{labels.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr><td colSpan={4} className={styles.empty}>{emptyMsg}</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <a href={`/dashboard/properties/${p.id}`} className={styles.tableLink}>{p.name}</a>
                </td>
                <td className={styles.muted}>{[p.city, p.country].filter(Boolean).join(', ') || '—'}</td>
                <td className={styles.muted}>
                  {t(CATEGORY_LABELS[p.category] ?? { en: p.category, fr: p.category })}
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <a href={`/dashboard/properties/${p.id}/edit`} className="btn btn-ghost btn-sm">
                      {labels.editLabel}
                    </a>
                    <form action={`/api/properties/${p.id}/archive`} method="POST">
                      <input type="hidden" name="archived" value={showArchived ? '0' : '1'} />
                      <button type="submit" className="btn btn-ghost btn-sm">
                        {showArchived ? labels.restoreLabel : labels.archiveLabel}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {!filtered.length ? (
          <p className={styles.empty}>{emptyMsg}</p>
        ) : filtered.map(p => (
          <div key={p.id} className={styles.mobileCard}>
            <a href={`/dashboard/properties/${p.id}`} className={styles.mobileCardLink}>
              <div className={styles.mobileCardName}>{p.name}</div>
              <div className={styles.mobileCardMeta}>
                {[p.city, p.country, t(CATEGORY_LABELS[p.category] ?? { en: p.category, fr: p.category })].filter(Boolean).join(' · ')}
              </div>
            </a>
            <div className={styles.mobileCardActions}>
              <a href={`/dashboard/properties/${p.id}/edit`} className="btn btn-ghost btn-sm">
                {labels.editLabel}
              </a>
              <form action={`/api/properties/${p.id}/archive`} method="POST">
                <input type="hidden" name="archived" value={showArchived ? '0' : '1'} />
                <button type="submit" className="btn btn-ghost btn-sm">
                  {showArchived ? labels.restoreLabel : labels.archiveLabel}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
