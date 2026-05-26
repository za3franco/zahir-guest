export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import type { User } from '@/types'
import styles from './users.module.css'

const T = {
  title: { en: 'Users', fr: 'Utilisateurs' },
  subtitle: { en: 'Manage your team — auditors and property managers.', fr: 'Gérez votre équipe — auditeurs et directeurs d\'établissement.' },
  inviteUser: { en: '+ Invite user', fr: '+ Inviter un utilisateur' },
  cols: {
    name: { en: 'Name', fr: 'Nom' },
    email: { en: 'Email', fr: 'Email' },
    role: { en: 'Role', fr: 'Rôle' },
    language: { en: 'Language', fr: 'Langue' },
    joined: { en: 'Joined', fr: 'Inscrit le' },
    actions: { en: 'Actions', fr: 'Actions' },
  },
  roles: {
    super_admin: { en: 'Super Admin', fr: 'Super Admin' },
    tenant_admin: { en: 'Admin', fr: 'Administrateur' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    property_manager: { en: 'Property Manager', fr: 'Directeur' },
  },
  languages: {
    en: { en: 'English', fr: 'Anglais' },
    fr: { en: 'French', fr: 'Français' },
    bilingual: { en: 'Bilingual', fr: 'Bilingue' },
  },
  remove: { en: 'Remove', fr: 'Supprimer' },
  empty: { en: 'No users yet.', fr: 'Aucun utilisateur pour l\'instant.' },
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

  const { data } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: true })

  const users: User[] = (data ?? []) as User[]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
        <a href="/dashboard/users/invite" className="btn btn-primary">
          {t(T.inviteUser)}
        </a>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>{t(T.cols.name)}</th>
              <th>{t(T.cols.email)}</th>
              <th>{t(T.cols.role)}</th>
              <th>{t(T.cols.language)}</th>
              <th>{t(T.cols.joined)}</th>
              <th>{t(T.cols.actions)}</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <span className={styles.userName}>
                    {u.name}
                    {u.id === user.id && (
                      <span className={styles.youBadge}>{t(T.you)}</span>
                    )}
                  </span>
                </td>
                <td className={styles.meta}>{u.email}</td>
                <td>
                  <span className={`badge ${u.role === 'tenant_admin' ? 'badge-gold' : 'badge-sand'}`}>
                    {t(T.roles[u.role] ?? { en: u.role, fr: u.role })}
                  </span>
                </td>
                <td className={styles.meta}>
                  {t(T.languages[u.default_language as keyof typeof T.languages] ?? { en: u.default_language, fr: u.default_language })}
                </td>
                <td className={styles.meta}>
                  {new Date(u.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td>
                  {u.id !== user.id && (
                    <form action={`/api/users/${u.id}`} method="POST">
  <input type="hidden" name="_method" value="DELETE" />
  <button
    type="submit"
    className="btn btn-ghost btn-sm"
    style={{ color: 'var(--color-terracotta)' }}
    onClick={e => {
      if (!confirm(lang === 'en' ? `Remove ${u.name}?` : `Supprimer ${u.name} ?`)) e.preventDefault()
    }}
  >
    {t(T.remove)}
  </button>
</form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
'use client'
function DeleteUserButton({ userId, userName, lang }: { userId: string; userName: string; lang: string }) {
  return (
    <form action={`/api/users/${userId}`} method="POST">
      <input type="hidden" name="_method" value="DELETE" />
      <button
        type="submit"
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--color-terracotta)' }}
        onClick={e => {
          if (!confirm(lang === 'en' ? `Remove ${userName}?` : `Supprimer ${userName} ?`)) e.preventDefault()
        }}
      >
        {lang === 'en' ? 'Remove' : 'Supprimer'}
      </button>
    </form>
  )
}
