export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { STATUS_LABELS } from '@/types'
import styles from './campaigns.module.css'
import CampaignsSearch from './_components/CampaignsSearch'

const T = {
  title: { en: 'Campaigns', fr: 'Campagnes' },
  titlePM: { en: 'Reports', fr: 'Rapports' },
  new: { en: 'New campaign', fr: 'Nouvelle campagne' },
  filters: {
    all: { en: 'All', fr: 'Toutes' },
    assigned: { en: 'Assigned', fr: 'Assignées' },
    inProgress: { en: 'In progress', fr: 'En cours' },
    submitted: { en: 'Submitted', fr: 'Soumises' },
    underReview: { en: 'Under review', fr: 'En révision' },
    finalized: { en: 'Finalized', fr: 'Finalisées' },
    published: { en: 'Published', fr: 'Publiées' },
  },
}

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: { status?: string; from?: string; to?: string; property?: string }
}) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const isPM = user.role === 'property_manager' || user.role === 'department_manager'
  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'

  const activeStatus = searchParams.status ?? 'all'
  const fromDate = searchParams.from ?? ''
  const toDate = searchParams.to ?? ''

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // For PM: get their assigned properties first
  let pmPropertyIds: string[] = []
  let pmProperties: { id: string; name: string }[] = []
  if (isPM) {
    const roleColumn = user.role === 'department_manager'
      ? 'department_manager_user_id'
      : 'property_manager_user_id'

    const { data: props } = await supabaseAdmin
      .from('properties')
      .select('id, name')
      .eq('tenant_id', user.tenant_id)
      .eq(roleColumn, user.id)
      .eq('is_archived', false)
      .order('name')

    pmProperties = props ?? []
    pmPropertyIds = pmProperties.map((p: any) => p.id)
  }

  // Build query
  let query = supabaseAdmin
    .from('campaigns')
    .select(`
      id, name, status, created_at, published_at, visit_window_end,
      property_id,
      property:properties(name, city),
      auditor:users!campaigns_auditor_user_id_fkey(name)
    `)
    .eq('tenant_id', user.tenant_id)
    .order('published_at', { ascending: false })

  if (isPM) {
    // PM only sees published campaigns for their properties
    query = query.eq('status', 'published')
    if (pmPropertyIds.length > 0) {
      query = query.in('property_id', pmPropertyIds)
    } else {
      // No properties assigned — return empty
      query = query.eq('property_id', '00000000-0000-0000-0000-000000000000')
    }
    // Date range filter
    if (fromDate) query = query.gte('published_at', fromDate)
    if (toDate) query = query.lte('published_at', toDate + 'T23:59:59Z')
  } else {
    // Admin: status filter
    if (activeStatus !== 'all') query = query.eq('status', activeStatus)
    query = query.order('created_at', { ascending: false })
  }

  const { data: campaigns } = await query

  const campaignsData = (campaigns ?? []).map((c: any) => {
    const s = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]
    return {
      id: c.id,
      name: c.name,
      propertyName: c.property?.name ?? '—',
      propertyCity: c.property?.city ?? '',
      auditorName: c.auditor?.name ?? '—',
      statusLabel: lang === 'en' ? (s?.en ?? c.status) : (s?.fr ?? c.status),
      dateFormatted: new Date(c.published_at ?? c.created_at).toLocaleDateString(dateLocale, {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
      publishedAt: c.published_at,
      reviewHref: `/dashboard/campaigns/${c.id}/review`,
    }
  })

  const filterTabs = [
    { key: 'all', label: t(T.filters.all) },
    { key: 'assigned', label: t(T.filters.assigned) },
    { key: 'in_progress', label: t(T.filters.inProgress) },
    { key: 'submitted', label: t(T.filters.submitted) },
    { key: 'under_review', label: t(T.filters.underReview) },
    { key: 'finalized', label: t(T.filters.finalized) },
    { key: 'published', label: t(T.filters.published) },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {isPM ? t(T.titlePM) : t(T.title)}
        </h1>
        {isAdmin && (
          <a href="/dashboard/campaigns/new" className="btn btn-primary btn-sm">
            + {t(T.new)}
          </a>
        )}
      </div>

      {/* Admin: status tabs */}
      {isAdmin && (
        <div className={styles.filters}>
          {filterTabs.map(tab => (
            <a
              key={tab.key}
              href={tab.key === 'all' ? '/dashboard/campaigns' : `/dashboard/campaigns?status=${tab.key}`}
              className={`${styles.filterTab} ${activeStatus === tab.key ? styles.filterTabActive : ''}`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      )}

      {/* PM: date range filter */}
      {isPM && (
        <form method="GET" action="/dashboard/campaigns" className={styles.dateFilterForm}>
          <div className={styles.dateFilterRow}>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>
                {lang === 'en' ? 'From' : 'Du'}
              </label>
              <input
                type="date"
                name="from"
                defaultValue={fromDate}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateField}>
              <label className={styles.dateLabel}>
                {lang === 'en' ? 'To' : 'Au'}
              </label>
              <input
                type="date"
                name="to"
                defaultValue={toDate}
                className={styles.dateInput}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              {lang === 'en' ? 'Apply' : 'Appliquer'}
            </button>
            {(fromDate || toDate) && (
              <a href="/dashboard/campaigns" className="btn btn-ghost btn-sm">
                {lang === 'en' ? 'Clear' : 'Effacer'}
              </a>
            )}
          </div>
        </form>
      )}

      <CampaignsSearch
        campaigns={campaignsData}
        searchPlaceholder={lang === 'en' ? 'Search by name or property…' : 'Rechercher par nom ou établissement…'}
        clearLabel={lang === 'en' ? 'Clear' : 'Effacer'}
        emptyLabel={lang === 'en' ? 'No campaigns found.' : 'Aucune campagne trouvée.'}
        isPM={isPM}
        colLabels={{
          campaign: lang === 'en' ? 'Audit' : 'Audit',
          property: lang === 'en' ? 'Property' : 'Établissement',
          auditor: lang === 'en' ? 'Auditor' : 'Auditeur',
          status: lang === 'en' ? 'Status' : 'Statut',
          date: lang === 'en' ? 'Published' : 'Publié le',
        }}
      />
    </div>
  )
}
