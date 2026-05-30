export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { STATUS_LABELS } from '@/types'
import styles from './campaigns.module.css'
import CampaignsSearch from './_components/CampaignsSearch'

const T = {
  title: { en: 'Campaigns', fr: 'Campagnes' },
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
  searchParams: { status?: string }
}) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const activeStatus = searchParams.status ?? 'all'
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabaseAdmin
    .from('campaigns')
    .select(`
      id, name, status, created_at,
      property:properties(name, city),
      auditor:users!campaigns_auditor_user_id_fkey(name)
    `)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  if (activeStatus !== 'all') {
    query = query.eq('status', activeStatus)
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
      dateFormatted: new Date(c.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }),
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
        <h1 className={styles.title}>{t(T.title)}</h1>
        <a href="/dashboard/campaigns/new" className="btn btn-primary btn-sm">
          + {t(T.new)}
        </a>
      </div>

      {/* Status filter tabs — server-side */}
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

      {/* Client-side search + table */}
      <CampaignsSearch
        campaigns={campaignsData}
        searchPlaceholder={lang === 'en' ? 'Search by name or property…' : 'Rechercher par nom ou établissement…'}
        clearLabel={lang === 'en' ? 'Clear' : 'Effacer'}
        emptyLabel={lang === 'en' ? 'No campaigns found.' : 'Aucune campagne trouvée.'}
        colLabels={{
          campaign: lang === 'en' ? 'Campaign' : 'Campagne',
          property: lang === 'en' ? 'Property' : 'Établissement',
          auditor: lang === 'en' ? 'Auditor' : 'Auditeur',
          status: lang === 'en' ? 'Status' : 'Statut',
          date: lang === 'en' ? 'Date' : 'Date',
        }}
      />
    </div>
  )
}
