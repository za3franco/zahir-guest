export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { STATUS_LABELS } from '@/types'
import styles from './campaigns.module.css'

const T = {
  title: { en: 'Campaigns', fr: 'Campagnes' },
  new: { en: 'New campaign', fr: 'Nouvelle campagne' },
  searchPlaceholder: { en: 'Search by name or property…', fr: 'Rechercher par nom ou établissement…' },
  cols: {
    campaign: { en: 'Campaign', fr: 'Campagne' },
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    status: { en: 'Status', fr: 'Statut' },
    date: { en: 'Date', fr: 'Date' },
  },
  empty: { en: 'No campaigns found.', fr: 'Aucune campagne trouvée.' },
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
  searchParams: { status?: string; q?: string }
}) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const activeStatus = searchParams.status ?? 'all'
  const searchQuery = searchParams.q?.toLowerCase().trim() ?? ''
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabaseAdmin
    .from('campaigns')
    .select(`
      id, name, status, created_at, visit_window_end,
      property:properties(name, city),
      auditor:users!campaigns_auditor_user_id_fkey(name)
    `)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
  }

  const { data: allCampaigns } = await query

  // Client-side search filter (post-fetch)
  const campaigns = searchQuery
    ? (allCampaigns ?? []).filter((c: any) =>
        c.name.toLowerCase().includes(searchQuery) ||
        (c.property?.name ?? '').toLowerCase().includes(searchQuery) ||
        (c.property?.city ?? '').toLowerCase().includes(searchQuery)
      )
    : (allCampaigns ?? [])

  const filterTabs = [
    { key: 'all', label: t(T.filters.all) },
    { key: 'assigned', label: t(T.filters.assigned) },
    { key: 'in_progress', label: t(T.filters.inProgress) },
    { key: 'submitted', label: t(T.filters.submitted) },
    { key: 'under_review', label: t(T.filters.underReview) },
    { key: 'finalized', label: t(T.filters.finalized) },
    { key: 'published', label: t(T.filters.published) },
  ]

  function filterHref(key: string) {
    const base = key === 'all' ? '/dashboard/campaigns' : `/dashboard/campaigns?status=${key}`
    return searchQuery ? `${base}${key === 'all' ? '?' : '&'}q=${encodeURIComponent(searchQuery)}` : base
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t(T.title)}</h1>
        <a href="/dashboard/campaigns/new" className="btn btn-primary btn-sm">
          + {t(T.new)}
        </a>
      </div>

      {/* Search */}
      <form method="GET" action="/dashboard/campaigns" className={styles.searchForm}>
        {activeStatus !== 'all' && <input type="hidden" name="status" value={activeStatus} />}
        <input
          type="search"
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder={t(T.searchPlaceholder)}
          className={styles.searchInput}
          autoComplete="off"
        />
      </form>

      {/* Filter tabs */}
      <div className={styles.filters}>
        {filterTabs.map(tab => (
          <a
            key={tab.key}
            href={filterHref(tab.key)}
            className={`${styles.filterTab} ${activeStatus === tab.key ? styles.filterTabActive : ''}`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t(T.cols.campaign)}</th>
              <th>{t(T.cols.property)}</th>
              <th>{t(T.cols.auditor)}</th>
              <th>{t(T.cols.status)}</th>
              <th>{t(T.cols.date)}</th>
            </tr>
          </thead>
          <tbody>
            {!campaigns?.length ? (
              <tr><td colSpan={5} className={styles.empty}>{t(T.empty)}</td></tr>
            ) : campaigns.map((c: any) => {
              const s = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]
              return (
                <tr key={c.id}>
                  <td>
                    <a href={`/dashboard/campaigns/${c.id}`} className={styles.tableLink}>
                      {c.name}
                    </a>
                  </td>
                  <td className={styles.muted}>
                    {c.property?.name}{c.property?.city ? ` · ${c.property.city}` : ''}
                  </td>
                  <td className={styles.muted}>{c.auditor?.name ?? '—'}</td>
                  <td>
                    <span className="badge badge-sand">{lang === 'en' ? s?.en : s?.fr}</span>
                  </td>
                  <td className={styles.muted}>
                    {new Date(c.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {!campaigns?.length ? (
          <p className={styles.empty}>{t(T.empty)}</p>
        ) : campaigns.map((c: any) => {
          const s = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]
          return (
            <a key={c.id} href={`/dashboard/campaigns/${c.id}`} className={styles.mobileCard}>
              <div className={styles.mobileCardTop}>
                <span className={styles.mobileCardName}>{c.name}</span>
                <span className="badge badge-sand">{lang === 'en' ? s?.en : s?.fr}</span>
              </div>
              <div className={styles.mobileCardSub}>
                {c.property?.name}{c.property?.city ? ` · ${c.property.city}` : ''}
              </div>
              <div className={styles.mobileCardMeta}>
                {c.auditor?.name ?? '—'} · {new Date(c.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
