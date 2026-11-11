export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import styles from './users.module.css'
import DeleteUserButton from './_components/DeleteUserButton'
import UsersSearch from './_components/UsersSearch'

import { ROLE_LABELS, isViewer } from '@/lib/access'

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

  const [{ data: users }, { data: clients }, { data: props }, { data: access }] = await Promise.all([
    supabaseAdmin.from('users').select('id, name, email, role, created_at').eq('tenant_id', user.tenant_id).order('name'),
    supabaseAdmin.from('clients').select('id, name').eq('tenant_id', user.tenant_id).eq('is_archived', false).order('name'),
    supabaseAdmin.from('properties').select('id, name, client_id').eq('tenant_id', user.tenant_id),
    supabaseAdmin.from('user_access').select('user_id, client_id, property_id').eq('tenant_id', user.tenant_id),
  ])
  const clientName = new Map((clients ?? []).map((c: any) => [c.id, c.name as string]))
  const propInfo = new Map((props ?? []).map((p: any) => [p.id, { name: p.name as string, client_id: p.client_id as string | null }]))

  // For each manager: which clients they belong to (whole client or one of its properties) and a short summary
  const accessOf = new Map<string, { clientIds: Set<string>; labels: string[] }>()
  for (const a of access ?? []) {
    const cur = accessOf.get(a.user_id) ?? { clientIds: new Set<string>(), labels: [] }
    if (a.client_id) {
      cur.clientIds.add(a.client_id)
      cur.labels.push(`${clientName.get(a.client_id) ?? '?'} (${lang === 'en' ? 'all' : 'tout'})`)
    } else if (a.property_id) {
      const p = propInfo.get(a.property_id)
      if (p?.client_id) cur.clientIds.add(p.client_id)
      if (p) cur.labels.push(p.name)
    }
    accessOf.set(a.user_id, cur)
  }

  // Serialize for client component
  const usersData = (users ?? []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
    isYou: u.id === user.id,
    roleLabel: ROLE_LABELS[u.role]?.[lang] ?? u.role,
    isManager: isViewer(u.role),
    clientIds: Array.from(accessOf.get(u.id)?.clientIds ?? []),
    accessLabel: isViewer(u.role)
      ? (accessOf.get(u.id)?.labels.join(', ') || (lang === 'en' ? 'No access yet' : 'Aucun accès'))
      : (lang === 'en' ? 'Whole workspace' : 'Tout l\'espace'),
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
        clients={(clients ?? []).map((c: any) => ({ id: c.id, name: c.name }))}
        roleOptions={Object.entries(ROLE_LABELS).filter(([k]) => k !== 'super_admin').map(([k, v]) => ({ id: k, name: v[lang] }))}
        colLabels={{
          access: lang === 'en' ? 'Sees' : 'Voit',
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
