export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import styles from './users.module.css'
import DeleteUserButton from './_components/DeleteUserButton'
import UsersSearch from './_components/UsersSearch'

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
  edit: { en: 'Edit', fr: 'Modifier' },
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

  // Serialize for client component
  const usersData = (users ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
    isYou: u.id === user.id,
    roleLabel: ROLE_LABELS[u.role]?.[lang] ?? u.role,
    dateFormatted: new Date(u.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }),
  }))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <a href="/dashboard/users/invite" className="btn btn-primary btn-sm">
          + {t(T.invite)}
        </a>
      </div>

      <UsersSearch
        users={usersData}
        currentUserId={user.id}
        lang={lang}
        youLabel={t(T.you)}
        editLabel={t(T.edit)}
        colLabels={{
          name: t(T.cols.name),
          email: t(T.cols.email),
          role: t(T.cols.role),
          joined: t(T.cols.joined),
          actions: t(T.cols.actions),
        }}
        emptyLabel={t(T.empty)}
        searchPlaceholder={lang === 'en' ? 'Search by name or email…' : 'Rechercher par nom ou email…'}
        clearLabel={lang === 'en' ? 'Clear' : 'Effacer'}
      />
    </div>
  )
}
