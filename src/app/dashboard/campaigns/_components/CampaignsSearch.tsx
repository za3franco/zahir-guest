'use client'

import { useState } from 'react'
import styles from '../campaigns.module.css'

interface CampaignRow {
  id: string; name: string; propertyName: string; propertyCity: string
  auditorName: string; statusLabel: string; dateFormatted: string; href: string
}

interface Props {
  campaigns: CampaignRow[]
  searchPlaceholder: string; clearLabel: string; emptyLabel: string; isPM: boolean
  colLabels: { campaign: string; property: string; auditor: string; status: string; date: string }
}

export default function CampaignsSearch({ campaigns, searchPlaceholder, clearLabel, emptyLabel, isPM, colLabels }: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? campaigns.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.propertyName.toLowerCase().includes(query.toLowerCase()) ||
        c.propertyCity.toLowerCase().includes(query.toLowerCase())
      )
    : campaigns

  return (
    <>
      <div className={styles.searchRow}>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder} className={styles.searchInput} autoComplete="off" />
        {query && (
          <button onClick={() => setQuery('')} className={styles.clearBtn} type="button">
            {clearLabel} ×
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{colLabels.campaign}</th>
              <th>{colLabels.property}</th>
              {!isPM && <th>{colLabels.auditor}</th>}
              {!isPM && <th>{colLabels.status}</th>}
              <th>{colLabels.date}</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr><td colSpan={isPM ? 3 : 5} className={styles.empty}>{emptyLabel}</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><a href={c.href} className={styles.tableLink}>{c.name}</a></td>
                <td className={styles.muted}>{c.propertyName}{c.propertyCity ? ` · ${c.propertyCity}` : ''}</td>
                {!isPM && <td className={styles.muted}>{c.auditorName}</td>}
                {!isPM && <td><span className="badge badge-sand">{c.statusLabel}</span></td>}
                <td className={styles.muted}>{c.dateFormatted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileCards}>
        {!filtered.length ? (
          <p className={styles.empty}>{emptyLabel}</p>
        ) : filtered.map(c => (
          <a key={c.id} href={c.href} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <span className={styles.mobileCardName}>{c.name}</span>
              {!isPM && <span className="badge badge-sand">{c.statusLabel}</span>}
            </div>
            <div className={styles.mobileCardSub}>{c.propertyName}{c.propertyCity ? ` · ${c.propertyCity}` : ''}</div>
            <div className={styles.mobileCardMeta}>{c.dateFormatted}</div>
          </a>
        ))}
      </div>
    </>
  )
}
