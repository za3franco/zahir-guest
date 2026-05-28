export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import styles from './users.module.css'
import DeleteUserButton from './_components/DeleteUserButton'

const ROLE_LABELS: Record<string, { en: string; fr: string }> = {
  super_admin: { en: 'Super Admin', fr: 'Super Admin' },
  tenant_admin: { en: 'Admin', fr: 'Administrateur' },
  auditor: { en: 'Auditor', fr: 'Auditeur' },
  property_manager: { en: 'Property Manager', fr: 'Directeur' },
}

const T = {
  title: { en: 'Users', fr: 'Utilisateurs' },
  invite: { en: 'Invite user', fr: 'Inviter un utilisateur' },
  cols: {
    name: { en: 'Name', fr: 'Nom' },
    email: { en: 'Email', fr: 'Email' },
    role: { en: 'Role', fr: 'Rôle' },
    joined: { en: 'Joined', fr: 'Inscrit' },
    actions: { en: 'Actions', fr: 'Actions' },
  },
  empty: { en: 'No users yet.', fr: 'Aucun utilisateur.' },
  you: { en: '(you)', fr: '(vous)' },
  
}

export default async function UsersPage() {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <a href="/dashboard/users/invite" className="btn btn-primary btn-sm">
          + {t(T.invite)}
        </a>
      </div>

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t(T.cols.name)}</th>
              <th>{t(T.cols.email)}</th>
              <th>{t(T.cols.role)}</th>
              <th>{t(T.cols.joined)}</th>
              <th>{t(T.cols.actions)}</th>
            </tr>
          </thead>
          <tbody>
            {!users?.length ? (
              <tr><td colSpan={5} className={styles.empty}>{t(T.empty)}</td></tr>
            ) : users.map((u: any) => {
              const isYou = u.id === user.id
              const roleLabel = ROLE_LABELS[u.role]?.[lang] ?? u.role
              return (
                <tr key={u.id}>
                  <td>
                    <span className={styles.userName}>{u.name}</span>
                    {isYou && <span className={styles.youBadge}>{t(T.you)}</span>}
                  </td>
                  <td className={styles.muted}>{u.email}</td>
                  <td>
                    <span className={styles.rolePill}>{roleLabel}</span>
                  </td>
                  <td className={styles.muted}>
                    {new Date(u.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td>
                    {!isYou && (
                      <DeleteUserButton
                        userId={u.id}
                        userName={u.name}
                        lang={lang}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {!users?.length ? (
          <p className={styles.empty}>{t(T.empty)}</p>
        ) : users.map((u: any) => {
          const isYou = u.id === user.id
          const roleLabel = ROLE_LABELS[u.role]?.[lang] ?? u.role
          return (
            <div key={u.id} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <div>
                  <div className={styles.mobileCardName}>
                    {u.name}
                    {isYou && <span className={styles.youBadge}>{t(T.you)}</span>}
                  </div>
                  <div className={styles.mobileCardEmail}>{u.email}</div>
                </div>
                <span className={styles.rolePill}>{roleLabel}</span>
              </div>
              <div className={styles.mobileCardFooter}>
                <span className={styles.mobileCardDate}>
                  {new Date(u.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {!isYou && (
                  <DeleteUserButton
                        userId={u.id}
                        userName={u.name}
                        lang={lang}
                      />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
