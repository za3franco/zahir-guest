'use client'

import { useMemo, useState } from 'react'
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
  isManager: boolean
  clientIds: string[]
  accessLabel: string
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
  clients: { id: string; name: string }[]
  roleOptions: { id: string; name: string }[]
  colLabels: { name: string; email: string; role: string; joined: string; actions: string; access: string }
}

interface Group { key: string; title: string; users: UserRow[] }

// Users grouped by who they work for: your own team first, then one section per client,
// then managers who have no access yet. Filters: search, role, client.
export default function UsersSearch({
  users,
  lang,
  youLabel,
  editLabel,
  emptyLabel,
  searchPlaceholder,
  clearLabel,
  clients,
  roleOptions,
  colLabels,
}: Props) {
  const en = lang === 'en'
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [client, setClient] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(u =>
      (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (!role || u.role === role) &&
      (!client || u.clientIds.includes(client))
    )
  }, [users, query, role, client])

  const groups: Group[] = useMemo(() => {
    const out: Group[] = []
    const team = filtered.filter(u => !u.isManager)
    if (team.length && !client) out.push({ key: 'team', title: en ? 'Your team (admins and auditors)' : 'Votre équipe (administrateurs et auditeurs)', users: team })
    for (const c of clients) {
      if (client && c.id !== client) continue
      const list = filtered.filter(u => u.isManager && u.clientIds.includes(c.id))
      if (list.length) out.push({ key: c.id, title: c.name, users: list })
    }
    const knownClients = new Set(clients.map(c => c.id))
    const noClient = filtered.filter(u => u.isManager && !u.clientIds.some(id => knownClients.has(id)))
    if (noClient.length && !client) {
      out.push({ key: 'none', title: en ? 'Managers without a client' : 'Responsables sans client', users: noClient })
    }
    return out
  }, [filtered, clients, client, en])

  const actions = (u: UserRow) => (
    <div className={styles.rowActions}>
      {!u.isYou && <a href={`/dashboard/users/${u.id}/edit`} className="btn btn-ghost btn-sm">{editLabel}</a>}
      {!u.isYou && <DeleteUserButton userId={u.id} userName={u.name} lang={lang} />}
    </div>
  )

  const selectStyle: React.CSSProperties = {
    background: 'var(--color-slate-navy)', border: '1px solid var(--color-border-subtle)', borderRadius: 8,
    color: 'var(--color-ivory)', fontSize: 16, padding: '10px 12px', fontFamily: 'var(--font-body)', maxWidth: '100%', width: 'auto',
  }

  return (
    <>
      <div className={styles.searchRow} style={{ flexWrap: 'wrap' }}>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className={styles.searchInput}
          autoComplete="off"
        />
        <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle} aria-label={colLabels.role}>
          <option value="">{en ? 'All roles' : 'Tous les rôles'}</option>
          {roleOptions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        {clients.length > 0 && (
          <select value={client} onChange={e => setClient(e.target.value)} style={selectStyle} aria-label="Client">
            <option value="">{en ? 'All clients' : 'Tous les clients'}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {(query || role || client) && (
          <button onClick={() => { setQuery(''); setRole(''); setClient('') }} className={styles.clearBtn} type="button">
            {clearLabel} ×
          </button>
        )}
      </div>

      {!groups.length && <p className={styles.empty}>{emptyLabel}</p>}

      {/* Desktop table */}
      {groups.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{colLabels.name}</th>
                <th>{colLabels.role}</th>
                <th>{colLabels.access}</th>
                <th>{colLabels.joined}</th>
                <th>{colLabels.actions}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => (
                <GroupRows key={g.key} group={g} youLabel={youLabel} actions={actions} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {groups.map(g => (
          <div key={g.key}>
            <p style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', fontSize: '1.125rem', margin: '16px 0 8px' }}>
              {g.title} <span style={{ color: 'var(--color-sand)', fontSize: '0.8125rem' }}>({g.users.length})</span>
            </p>
            {g.users.map(u => (
              <div key={u.id} className={styles.mobileCard}>
                <div className={styles.mobileCardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.mobileCardName}>
                      {u.name}
                      {u.isYou && <span className={styles.youBadge}>{youLabel}</span>}
                    </div>
                    <div className={styles.mobileCardEmail}>{u.email}</div>
                  </div>
                  <span className={styles.rolePill}>{u.roleLabel}</span>
                </div>
                {u.isManager && <div className={styles.mobileCardEmail} style={{ marginTop: 6 }}>{colLabels.access} : {u.accessLabel}</div>}
                <div className={styles.mobileCardFooter}>
                  <span className={styles.mobileCardDate}>{u.dateFormatted}</span>
                  {actions(u)}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}

function GroupRows({ group, youLabel, actions }: { group: Group; youLabel: string; actions: (u: UserRow) => React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={5} style={{ background: 'rgba(200,164,90,0.06)', color: 'var(--color-gold)', fontFamily: 'var(--font-display)', fontSize: '1.0625rem' }}>
          {group.title} <span style={{ color: 'var(--color-sand)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>({group.users.length})</span>
        </td>
      </tr>
      {group.users.map(u => (
        <tr key={`${group.key}-${u.id}`}>
          <td>
            <span className={styles.userName}>{u.name}</span>
            {u.isYou && <span className={styles.youBadge}>{youLabel}</span>}
            <div className={styles.muted} style={{ fontSize: '0.8125rem' }}>{u.email}</div>
          </td>
          <td><span className={styles.rolePill}>{u.roleLabel}</span></td>
          <td className={styles.muted} style={{ maxWidth: 280, whiteSpace: 'normal' }}>{u.accessLabel}</td>
          <td className={styles.muted}>{u.dateFormatted}</td>
          <td>{actions(u)}</td>
        </tr>
      ))}
    </>
  )
}
