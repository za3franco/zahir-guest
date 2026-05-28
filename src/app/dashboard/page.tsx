export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { STATUS_LABELS } from '@/types'
import styles from './dashboard.module.css'

const T = {
  greeting: { en: 'Hello', fr: 'Bonjour' },
  stats: {
    total: { en: 'Total campaigns', fr: 'Campagnes totales' },
    inProgress: { en: 'In progress', fr: 'En cours' },
    underReview: { en: 'Under review', fr: 'En révision' },
    published: { en: 'Published', fr: 'Publiées' },
  },
  recent: { en: 'Recent campaigns', fr: 'Campagnes récentes' },
  viewAll: { en: 'View all →', fr: 'Voir tout →' },
  properties: { en: 'Active properties', fr: 'Établissements actifs' },
  manage: { en: 'Manage →', fr: 'Gérer →' },
  cols: {
    campaign: { en: 'Campaign', fr: 'Campagne' },
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    status: { en: 'Status', fr: 'Statut' },
    date: { en: 'Date', fr: 'Date' },
  },
  noCampaigns: { en: 'No campaigns yet', fr: 'Aucune campagne' },
  noProperties: { en: 'No properties yet', fr: 'Aucun établissement' },
  myCampaigns: { en: 'My assigned audits', fr: 'Mes audits assignés' },
  startAudit: { en: 'Start audit →', fr: 'Commencer l\'audit →' },
}

export default async function DashboardPage() {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  if (user.role === 'auditor') {
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, name, status, visit_window_end, property:properties(name, city)')
      .eq('auditor_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    return (
      <div className={styles.page}>
        <div className={styles.greeting}>
          <span className={styles.greetingWord}>{t(T.greeting)},</span>
          <h1 className={styles.greetingName}>{user.name}</h1>
        </div>
        <h2 className={styles.sectionTitle}>{t(T.myCampaigns)}</h2>
        <div className={styles.auditCards}>
          {(campaigns ?? []).map((c: any) => {
            const s = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]
            return (
              <a key={c.id} href={`/dashboard/audit/${c.id}`} className={styles.auditCard}>
                <div className={styles.auditCardName}>{c.name}</div>
                <div className={styles.auditCardProp}>{c.property?.name}{c.property?.city ? ` · ${c.property.city}` : ''}</div>
                <div className={styles.auditCardFooter}>
                  <span className={`badge badge-${s?.color ? 'gold' : 'sand'}`}>{lang === 'en' ? s?.en : s?.fr}</span>
                  <span className={styles.auditCardCta}>{t(T.startAudit)}</span>
                </div>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  // Admin dashboard
  const [{ data: campaigns }, { data: properties }] = await Promise.all([
    supabaseAdmin
      .from('campaigns')
      .select('id, name, status, created_at, property:properties(name, city), auditor:users!campaigns_auditor_user_id_fkey(name)')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('properties')
      .select('id, name, city, category')
      .eq('tenant_id', user.tenant_id)
      .eq('is_archived', false)
      .order('name')
      .limit(6),
  ])

  const allCampaigns = campaigns ?? []
  const total = allCampaigns.length
  const inProgress = allCampaigns.filter((c: any) => c.status === 'in_progress').length
  const underReview = allCampaigns.filter((c: any) => ['submitted', 'under_review', 'finalized'].includes(c.status)).length
  const published = allCampaigns.filter((c: any) => c.status === 'published').length

  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  return (
    <div className={styles.page}>
      <div className={styles.greeting}>
        <span className={styles.greetingWord}>{t(T.greeting)},</span>
        <h1 className={styles.greetingName}>{user.name}</h1>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{total}</span>
          <span className={styles.statLabel}>{t(T.stats.total)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} style={{ color: 'var(--color-amber)' }}>{inProgress}</span>
          <span className={styles.statLabel}>{t(T.stats.inProgress)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} style={{ color: 'var(--color-gold)' }}>{underReview}</span>
          <span className={styles.statLabel}>{t(T.stats.underReview)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} style={{ color: 'var(--color-sage)' }}>{published}</span>
          <span className={styles.statLabel}>{t(T.stats.published)}</span>
        </div>
      </div>

      {/* Recent campaigns */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t(T.recent)}</h2>
          <a href="/dashboard/campaigns" className={styles.sectionLink}>{t(T.viewAll)}</a>
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
              {allCampaigns.length === 0 ? (
                <tr><td colSpan={5} className={styles.empty}>{t(T.noCampaigns)}</td></tr>
              ) : allCampaigns.map((c: any) => {
                const s = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]
                return (
                  <tr key={c.id}>
                    <td>
                      <a href={`/dashboard/campaigns/${c.id}`} className={styles.tableLink}>{c.name}</a>
                    </td>
                    <td className={styles.tableMuted}>
                      {c.property?.name}{c.property?.city ? ` · ${c.property.city}` : ''}
                    </td>
                    <td className={styles.tableMuted}>{c.auditor?.name ?? '—'}</td>
                    <td>
                      <span className="badge badge-sand">{lang === 'en' ? s?.en : s?.fr}</span>
                    </td>
                    <td className={styles.tableMuted}>
                      {new Date(c.created_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className={styles.mobileCards}>
          {allCampaigns.length === 0 ? (
            <p className={styles.empty}>{t(T.noCampaigns)}</p>
          ) : allCampaigns.map((c: any) => {
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

      {/* Properties */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t(T.properties)}</h2>
          <a href="/dashboard/properties" className={styles.sectionLink}>{t(T.manage)}</a>
        </div>
        <div className={styles.propertyGrid}>
          {(properties ?? []).length === 0 ? (
            <p className={styles.empty}>{t(T.noProperties)}</p>
          ) : (properties ?? []).map((p: any) => (
            <a key={p.id} href={`/dashboard/properties/${p.id}`} className={styles.propertyCard}>
              <div className={styles.propertyCardIcon}>🏨</div>
              <div className={styles.propertyCardName}>{p.name}</div>
              <div className={styles.propertyCardMeta}>{[p.city, p.category].filter(Boolean).join(' · ')}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
