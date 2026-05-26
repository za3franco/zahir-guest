export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import type { Campaign } from '@/types'
import { STATUS_LABELS } from '@/types'
import styles from './campaigns.module.css'

const T = {
  title: { en: 'Campaigns', fr: 'Campagnes' },
  subtitle: { en: 'Manage your mystery guest audit campaigns.', fr: 'Gérez vos campagnes d\'audit mystère.' },
  newCampaign: { en: '+ New campaign', fr: '+ Nouvelle campagne' },
  cols: {
    name: { en: 'Campaign', fr: 'Campagne' },
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    status: { en: 'Status', fr: 'Statut' },
    window: { en: 'Visit window', fr: 'Fenêtre de visite' },
    actions: { en: 'Actions', fr: 'Actions' },
  },
  filters: {
    all: { en: 'All', fr: 'Toutes' },
    assigned: { en: 'Assigned', fr: 'Assignées' },
    in_progress: { en: 'In progress', fr: 'En cours' },
    submitted: { en: 'Submitted', fr: 'Soumises' },
    under_review: { en: 'Under review', fr: 'En révision' },
    finalized: { en: 'Finalized', fr: 'Finalisées' },
    published: { en: 'Published', fr: 'Publiées' },
  },
  view: { en: 'View', fr: 'Voir' },
  empty: { en: 'No campaigns yet.', fr: 'Aucune campagne pour l\'instant.' },
  emptyFiltered: { en: 'No campaigns with this status.', fr: 'Aucune campagne avec ce statut.' },
  emptyHint: { en: 'Create your first campaign to start auditing.', fr: 'Créez votre première campagne pour commencer les audits.' },
  noDate: { en: 'No date set', fr: 'Date non définie' },
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const statusFilter = searchParams.status ?? 'all'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabaseAdmin
    .from('campaigns')
    .select('*, property:properties(name, city), auditor:users!campaigns_auditor_user_id_fkey(name)')
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  const { data } = await query
  const campaigns: Campaign[] = (data ?? []) as unknown as Campaign[]

  const filterKeys = ['all', 'assigned', 'in_progress', 'submitted', 'under_review', 'finalized', 'published']

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
        <a href="/dashboard/campaigns/new" className="btn btn-primary">
          {t(T.newCampaign)}
        </a>
      </div>

      {/* Status filters */}
      <div className={styles.filters}>
        {filterKeys.map(key => (
          <a
            key={key}
            href={key === 'all' ? '/dashboard/campaigns' : `/dashboard/campaigns?status=${key}`}
            className={`${styles.filterBtn} ${statusFilter === key ? styles.filterBtnActive : ''}`}
          >
            {t(T.filters[key as keyof typeof T.filters])}
          </a>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📋</div>
          <p className={styles.emptyText}>
            {statusFilter === 'all' ? t(T.empty) : t(T.emptyFiltered)}
          </p>
          {statusFilter === 'all' && (
            <p className={styles.emptyHint}>{t(T.emptyHint)}</p>
          )}
          {statusFilter === 'all' && (
            <a href="/dashboard/campaigns/new" className="btn btn-secondary">
              {t(T.newCampaign)}
            </a>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t(T.cols.name)}</th>
                <th>{t(T.cols.property)}</th>
                <th>{t(T.cols.auditor)}</th>
                <th>{t(T.cols.status)}</th>
                <th>{t(T.cols.window)}</th>
                <th>{t(T.cols.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => {
                const s = STATUS_LABELS[c.status]
                const colorClass = {
                  '#9B9488': 'badge-sand',
                  '#C8A45A': 'badge-gold',
                  '#E8C87A': 'badge-gold',
                  '#D4882A': 'badge-amber',
                  '#4A7C6B': 'badge-sage',
                }[s?.color ?? ''] ?? 'badge-sand'

                const windowStart = c.visit_window_start
                  ? new Date(c.visit_window_start).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })
                  : null
                const windowEnd = c.visit_window_end
                  ? new Date(c.visit_window_end).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })
                  : null

                return (
                  <tr key={c.id}>
                    <td>
                      <a href={`/dashboard/campaigns/${c.id}`} className={styles.campaignLink}>
                        {c.name}
                      </a>
                    </td>
                    <td className={styles.meta}>
                      {(c.property as any)?.name ?? '—'}
                      {(c.property as any)?.city && (
                        <span className={styles.metaSub}> · {(c.property as any).city}</span>
                      )}
                    </td>
                    <td className={styles.meta}>{(c.auditor as any)?.name ?? '—'}</td>
                    <td>
                      <span className={`badge ${colorClass}`}>
                        {lang === 'en' ? s?.en : s?.fr}
                      </span>
                    </td>
                    <td className={styles.meta}>
                      {windowStart && windowEnd
                        ? `${windowStart} → ${windowEnd}`
                        : t(T.noDate)}
                    </td>
                    <td>
                      <a href={`/dashboard/campaigns/${c.id}`} className="btn btn-ghost btn-sm">
                        {t(T.view)}
                      </a>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
