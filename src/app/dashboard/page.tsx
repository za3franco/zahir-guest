export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import type { User, Campaign, Property } from '@/types'
import { STATUS_LABELS } from '@/types'
import { requireUser } from '@/lib/auth'
import styles from './page.module.css'

export const metadata = { title: 'Dashboard' }

const T = {
  greeting: {
    morning: { en: 'Good morning', fr: 'Bonjour' },
    afternoon: { en: 'Good afternoon', fr: 'Bon après-midi' },
    evening: { en: 'Good evening', fr: 'Bonsoir' },
  },
  stats: {
    total: { en: 'Total campaigns', fr: 'Campagnes totales' },
    inProgress: { en: 'In progress', fr: 'En cours' },
    underReview: { en: 'Under review', fr: 'En révision' },
    published: { en: 'Published', fr: 'Publiées' },
  },
  sections: {
    recentCampaigns: { en: 'Recent campaigns', fr: 'Campagnes récentes' },
    viewAll: { en: 'View all →', fr: 'Voir tout →' },
    activeProperties: { en: 'Active properties', fr: 'Établissements actifs' },
    manage: { en: 'Manage →', fr: 'Gérer →' },
    myMissions: { en: 'My active missions', fr: 'Mes missions en cours' },
  },
  table: {
    campaign: { en: 'Campaign', fr: 'Campagne' },
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    status: { en: 'Status', fr: 'Statut' },
    date: { en: 'Date', fr: 'Date' },
  },
  empty: {
    noCampaigns: { en: 'No campaigns yet.', fr: 'Aucune campagne pour l'instant.' },
    createCampaign: { en: '+ Create a campaign', fr: '+ Créer une campagne' },
    noMissions: { en: 'No missions assigned yet.', fr: 'Aucune mission assignée pour l'instant.' },
  },
  audit: {
    before: { en: 'Before', fr: 'Avant le' },
    start: { en: 'Start audit →', fr: "Commencer l'audit →" },
    continue: { en: 'Continue audit →', fr: "Continuer l'audit →" },
  },
  category: {
    '5_star': { en: '5 stars', fr: '5 étoiles' },
    '4_star': { en: '4 stars', fr: '4 étoiles' },
    '3_star': { en: '3 stars', fr: '3 étoiles' },
    '2_star': { en: '2 stars', fr: '2 étoiles' },
    '1_star': { en: '1 star', fr: '1 étoile' },
    unrated: { en: 'Unrated', fr: 'Non classé' },
  },
}

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  hotel: '🏨', riad: '🏯', resort: '🌴', guesthouse: '🏠', apartment: '🏢', other: '🏛️',
}

export default async function DashboardPage() {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'
  const isAuditor = user.role === 'auditor'

  let campaigns: Campaign[] = []
  let properties: Property[] = []
  let stats = { total: 0, inProgress: 0, submitted: 0, published: 0 }

  if (isAdmin) {
    const { data: campaignData } = await supabaseAdmin
      .from('campaigns')
      .select('*, property:properties(name, city), auditor:users!campaigns_auditor_user_id_fkey(name)')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10)

    campaigns = (campaignData ?? []) as unknown as Campaign[]

    const { data: propData } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .eq('is_archived', false)
      .order('name')
      .limit(5)

    properties = (propData ?? []) as Property[]

    const { data: allCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('status')
      .eq('tenant_id', user.tenant_id)

    if (allCampaigns) {
      stats.total = allCampaigns.length
      stats.inProgress = allCampaigns.filter(c => c.status === 'in_progress').length
      stats.submitted = allCampaigns.filter(c => ['submitted', 'under_review'].includes(c.status)).length
      stats.published = allCampaigns.filter(c => c.status === 'published').length
    }
  }

  if (isAuditor) {
    const { data: campaignData } = await supabaseAdmin
      .from('campaigns')
      .select('*, property:properties(name, city)')
      .eq('auditor_user_id', user.id)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false })

    campaigns = (campaignData ?? []) as unknown as Campaign[]
  }

  const hour = new Date().getHours()
  const greeting = hour < 12
    ? t(T.greeting.morning)
    : hour < 18
    ? t(T.greeting.afternoon)
    : t(T.greeting.evening)

  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.name}>{user.name}</h1>
        </div>
        <div className={styles.goldLine} />
      </div>

      {isAdmin && (
        <>
          <div className={styles.statsGrid}>
            <StatCard value={stats.total} label={t(T.stats.total)} color="gold" />
            <StatCard value={stats.inProgress} label={t(T.stats.inProgress)} color="amber" />
            <StatCard value={stats.submitted} label={t(T.stats.underReview)} color="warm" />
            <StatCard value={stats.published} label={t(T.stats.published)} color="sage" />
          </div>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{t(T.sections.recentCampaigns)}</h2>
              <a href="/campaigns" className="btn btn-ghost btn-sm">{t(T.sections.viewAll)}</a>
            </div>
            {campaigns.length === 0 ? (
              <EmptyState
                message={t(T.empty.noCampaigns)}
                action={{ href: '/campaigns/new', label: t(T.empty.createCampaign) }}
              />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>{t(T.table.campaign)}</th>
                      <th>{t(T.table.property)}</th>
                      <th>{t(T.table.auditor)}</th>
                      <th>{t(T.table.status)}</th>
                      <th>{t(T.table.date)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id}>
                        <td>
                          <a href={`/campaigns/${c.id}`} className={styles.tableLink}>{c.name}</a>
                        </td>
                        <td className={styles.tableSecondary}>
                          {(c.property as any)?.name ?? '—'}
                          {(c.property as any)?.city && (
                            <span className={styles.tableMeta}> · {(c.property as any).city}</span>
                          )}
                        </td>
                        <td className={styles.tableSecondary}>{(c.auditor as any)?.name ?? '—'}</td>
                        <td><StatusBadge status={c.status} lang={lang} /></td>
                        <td className={styles.tableSecondary}>
                          {new Date(c.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {properties.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t(T.sections.activeProperties)}</h2>
                <a href="/properties" className="btn btn-ghost btn-sm">{t(T.sections.manage)}</a>
              </div>
              <div className={styles.propertiesGrid}>
                {properties.map(p => (
                  <a key={p.id} href={`/properties/${p.id}`} className={styles.propertyCard}>
                    <div className={styles.propertyIcon}>{PROPERTY_TYPE_ICONS[p.type] ?? '🏨'}</div>
                    <div>
                      <div className={styles.propertyName}>{p.name}</div>
                      <div className={styles.propertyMeta}>
                        {p.city && <span>{p.city}</span>}
                        <span>{(T.category[p.category as keyof typeof T.category] ?? { en: p.category, fr: p.category })[lang]}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {isAuditor && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t(T.sections.myMissions)}</h2>
          </div>
          {campaigns.length === 0 ? (
            <EmptyState message={t(T.empty.noMissions)} />
          ) : (
            <div className={styles.auditCards}>
              {campaigns.map(c => (
                <a key={c.id} href={`/audit/${c.id}`} className={styles.auditCard}>
                  <div className={styles.auditCardHeader}>
                    <StatusBadge status={c.status} lang={lang} />
                    {c.visit_window_end && (
                      <span className={styles.auditDeadline}>
                        {t(T.audit.before)} {new Date(c.visit_window_end).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' })}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.auditCardTitle}>{c.name}</h3>
                  <p className={styles.auditCardProperty}>
                    {(c.property as any)?.name ?? ''}
                    {(c.property as any)?.city && ` · ${(c.property as any).city}`}
                  </p>
                  <div className={styles.auditCardCta}>
                    {c.status === 'assigned' ? t(T.audit.start) : t(T.audit.continue)}
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function StatCard({ value, label, color }: {
  value: number
  label: string
  color: 'gold' | 'amber' | 'warm' | 'sage'
}) {
  const colorMap = { gold: '#C8A45A', amber: '#D4882A', warm: '#E8C87A', sage: '#4A7C6B' }
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: colorMap[color] }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  )
}

function StatusBadge({ status, lang }: { status: string; lang: 'en' | 'fr' }) {
  const s = STATUS_LABELS[status as keyof typeof STATUS_LABELS]
  if (!s) return <span className="badge badge-sand">{status}</span>
  const colorClass = {
    '#9B9488': 'badge-sand',
    '#C8A45A': 'badge-gold',
    '#E8C87A': 'badge-gold',
    '#D4882A': 'badge-amber',
    '#4A7C6B': 'badge-sage',
  }[s.color] ?? 'badge-sand'
  return <span className={`badge ${colorClass}`}>{lang === 'en' ? s.en : s.fr}</span>
}

function EmptyState({ message, action }: {
  message: string
  action?: { href: string; label: string }
}) {
  return (
    <div className={styles.emptyState}>
      <p>{message}</p>
      {action && (
        <a href={action.href} className="btn btn-secondary btn-sm">{action.label}</a>
      )}
    </div>
  )
}
