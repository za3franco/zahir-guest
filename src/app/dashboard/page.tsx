import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { User, Campaign, Property } from '@/types'
import { STATUS_LABELS } from '@/types'
import styles from './page.module.css'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!userProfile) redirect('/login')

  const user = userProfile as User
  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'
  const isAuditor = user.role === 'auditor'

  // Load data based on role
  let campaigns: Campaign[] = []
  let properties: Property[] = []
  let stats = { total: 0, inProgress: 0, submitted: 0, published: 0 }

  if (isAdmin) {
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*, property:properties(name, city), auditor:users!campaigns_auditor_user_id_fkey(name)')
      .eq('tenant_id', user.tenant_id)
      .order('created_at', { ascending: false })
      .limit(10)

    campaigns = (campaignData ?? []) as unknown as Campaign[]

    const { data: propData } = await supabase
      .from('properties')
      .select('*')
      .eq('tenant_id', user.tenant_id)
      .eq('is_archived', false)
      .order('name')
      .limit(5)

    properties = (propData ?? []) as Property[]

    // Stats
    const { data: allCampaigns } = await supabase
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
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*, property:properties(name, city)')
      .eq('auditor_user_id', authUser.id)
      .in('status', ['assigned', 'in_progress'])
      .order('created_at', { ascending: false })

    campaigns = (campaignData ?? []) as unknown as Campaign[]
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.greeting}>{greeting},</p>
          <h1 className={styles.name}>{user.name}</h1>
        </div>
        <div className={styles.goldLine} />
      </div>

      {/* Admin view */}
      {isAdmin && (
        <>
          {/* Stats row */}
          <div className={styles.statsGrid}>
            <StatCard
              value={stats.total}
              label="Campagnes totales"
              sublabel="Total campaigns"
              color="gold"
            />
            <StatCard
              value={stats.inProgress}
              label="En cours"
              sublabel="In progress"
              color="amber"
            />
            <StatCard
              value={stats.submitted}
              label="En révision"
              sublabel="Under review"
              color="warm"
            />
            <StatCard
              value={stats.published}
              label="Publiées"
              sublabel="Published"
              color="sage"
            />
          </div>

          {/* Recent campaigns */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Campagnes récentes</h2>
              <a href="/campaigns" className="btn btn-ghost btn-sm">
                Voir tout →
              </a>
            </div>

            {campaigns.length === 0 ? (
              <EmptyState
                message="Aucune campagne pour l'instant."
                action={{ href: '/campaigns/new', label: '+ Créer une campagne' }}
              />
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Campagne</th>
                      <th>Établissement</th>
                      <th>Auditeur</th>
                      <th>Statut</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(c => (
                      <tr key={c.id}>
                        <td>
                          <a href={`/campaigns/${c.id}`} className={styles.tableLink}>
                            {c.name}
                          </a>
                        </td>
                        <td className={styles.tableSecondary}>
                          {(c.property as any)?.name ?? '—'}
                          {(c.property as any)?.city && (
                            <span className={styles.tableMeta}> · {(c.property as any).city}</span>
                          )}
                        </td>
                        <td className={styles.tableSecondary}>
                          {(c.auditor as any)?.name ?? '—'}
                        </td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td className={styles.tableSecondary}>
                          {new Date(c.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Properties */}
          {properties.length > 0 && (
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Établissements actifs</h2>
                <a href="/properties" className="btn btn-ghost btn-sm">
                  Gérer →
                </a>
              </div>
              <div className={styles.propertiesGrid}>
                {properties.map(p => (
                  <a key={p.id} href={`/properties/${p.id}`} className={styles.propertyCard}>
                    <div className={styles.propertyIcon}>
                      {PROPERTY_TYPE_ICONS[p.type] ?? '🏨'}
                    </div>
                    <div>
                      <div className={styles.propertyName}>{p.name}</div>
                      <div className={styles.propertyMeta}>
                        {p.city && <span>{p.city}</span>}
                        <span>{CATEGORY_LABELS[p.category] ?? p.category}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Auditor view */}
      {isAuditor && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Mes missions en cours</h2>
          </div>

          {campaigns.length === 0 ? (
            <EmptyState message="Aucune mission assignée pour l'instant." />
          ) : (
            <div className={styles.auditCards}>
              {campaigns.map(c => (
                <a key={c.id} href={`/audit/${c.id}`} className={styles.auditCard}>
                  <div className={styles.auditCardHeader}>
                    <StatusBadge status={c.status} />
                    {c.visit_window_end && (
                      <span className={styles.auditDeadline}>
                        Avant le {new Date(c.visit_window_end).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long'
                        })}
                      </span>
                    )}
                  </div>
                  <h3 className={styles.auditCardTitle}>{c.name}</h3>
                  <p className={styles.auditCardProperty}>
                    {(c.property as any)?.name ?? ''}
                    {(c.property as any)?.city && ` · ${(c.property as any).city}`}
                  </p>
                  <div className={styles.auditCardCta}>
                    {c.status === 'assigned' ? 'Commencer l\'audit →' : 'Continuer l\'audit →'}
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

// ─── Sub-components ──────────────────────────

function StatCard({ value, label, sublabel, color }: {
  value: number
  label: string
  sublabel: string
  color: 'gold' | 'amber' | 'warm' | 'sage'
}) {
  const colorMap = {
    gold: '#C8A45A',
    amber: '#D4882A',
    warm: '#E8C87A',
    sage: '#4A7C6B',
  }
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue} style={{ color: colorMap[color] }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statSublabel}>{sublabel}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status as keyof typeof STATUS_LABELS]
  if (!s) return <span className="badge badge-sand">{status}</span>
  const colorClass = {
    '#9B9488': 'badge-sand',
    '#C8A45A': 'badge-gold',
    '#E8C87A': 'badge-gold',
    '#D4882A': 'badge-amber',
    '#4A7C6B': 'badge-sage',
  }[s.color] ?? 'badge-sand'
  return <span className={`badge ${colorClass}`}>{s.fr}</span>
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

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  hotel: '🏨',
  riad: '🏯',
  resort: '🌴',
  guesthouse: '🏠',
  apartment: '🏢',
  other: '🏛️',
}

const CATEGORY_LABELS: Record<string, string> = {
  '5_star': '5 étoiles',
  '4_star': '4 étoiles',
  '3_star': '3 étoiles',
  '2_star': '2 étoiles',
  '1_star': '1 étoile',
  'unrated': 'Non classé',
}
