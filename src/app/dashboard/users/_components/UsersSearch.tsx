'use client'

import { useState } from 'react'
import styles from '../users.module.css'
import DeleteUserButton from './DeleteUserButton'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  isYou: boolean
  roleLabel: string
  dateFormatted: string
}

interface Props {
  users: UserRow[]
  currentUserId: string
  lang: string
  youLabel: string
  editLabel: string
  emptyLabel: string
  searchPlaceholder: string
  clearLabel: string
  colLabels: { name: string; email: string; role: string; joined: string; actions: string }
}

export default function UsersSearch({
  users,
  lang,
  youLabel,
  editLabel,
  emptyLabel,
  searchPlaceholder,
  clearLabel,
  colLabels,
}: Props) {
  const [query, setQuery] = useState('')

  const filtered = query.trim()
    ? users.filter(
        u =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          u.email.toLowerCase().includes(query.toLowerCase())
      )
    : users

  return (
    <>
      {/* Search */}
      <div className={styles.searchRow}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className={styles.searchInput}
          autoComplete="off"
        />
        {query && (
          <button onClick={() => setQuery('')} className={styles.clearBtn} type="button">
            {clearLabel} ×
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{colLabels.name}</th>
              <th>{colLabels.email}</th>
              <th>{colLabels.role}</th>
              <th>{colLabels.joined}</th>
              <th>{colLabels.actions}</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr><td colSpan={5} className={styles.empty}>{emptyLabel}</td></tr>
            ) : filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <span className={styles.userName}>{u.name}</span>
                  {u.isYou && <span className={styles.youBadge}>{youLabel}</span>}
                </td>
                <td className={styles.muted}>{u.email}</td>
                <td><span className={styles.rolePill}>{u.roleLabel}</span></td>
                <td className={styles.muted}>{u.dateFormatted}</td>
                <td>
                  <div className={styles.rowActions}>
                    {!u.isYou && (
                      <a href={`/dashboard/users/${u.id}/edit`} className="btn btn-ghost btn-sm">
                        {editLabel}
                      </a>
                    )}
                    {!u.isYou && (
                      <DeleteUserButton userId={u.id} userName={u.name} lang={lang} />
                    )}
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
          <p className={styles.empty}>{emptyLabel}</p>
        ) : filtered.map(u => (
          <div key={u.id} className={styles.mobileCard}>
            <div className={styles.mobileCardTop}>
              <div>
                <div className={styles.mobileCardName}>
                  {u.name}
                  {u.isYou && <span className={styles.youBadge}>{youLabel}</span>}
                </div>
                <div className={styles.mobileCardEmail}>{u.email}</div>
              </div>
              <span className={styles.rolePill}>{u.roleLabel}</span>
            </div>
            <div className={styles.mobileCardFooter}>
              <span className={styles.mobileCardDate}>{u.dateFormatted}</span>
              <div className={styles.rowActions}>
                {!u.isYou && (
                  <a href={`/dashboard/users/${u.id}/edit`} className="btn btn-ghost btn-sm">
                    {editLabel}
                  </a>
                )}
                {!u.isYou && (
                  <DeleteUserButton userId={u.id} userName={u.name} lang={lang} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
