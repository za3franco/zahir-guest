export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { effectivePlan, listMonthlyValue, planName } from '@/lib/plans'
import { EUR_PER_UNIT, isCurrency } from '@/lib/currency'
import { SA, eur, day } from '@/lib/superadminText'
import TenantActions from './TenantActions'
import CreateTenantForm from './CreateTenantForm'
import { getSuperAdmin } from './session'
import styles from './superadmin.module.css'

interface Row {
  id: string
  name: string
  subscription_tier: string | null
  subscription_status: string | null
  billing_interval: string | null
  trial_ends_at: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean | null
  stripe_subscription_id: string | null
  created_at: string
  users_count: number
  properties_count: number
  campaigns_count: number
  campaigns_month: number
  billing_mode: string | null
  contract_mrr_eur: number | null
  billing_currency?: string | null
  extra_properties?: number | null
}

// Monthly-equivalent revenue of a paying tenant, from its plan and billing interval.
function monthlyValue(r: Row): number {
  if (r.subscription_tier === 'za3fran_internal') return 0
  if (!['active', 'past_due'].includes(r.subscription_status ?? '')) return 0
  const cur = isCurrency(r.billing_currency) ? r.billing_currency : 'EUR'
  const list = listMonthlyValue(r.subscription_tier, r.billing_interval, r.extra_properties ?? 0, cur) * EUR_PER_UNIT[cur]
  // Direct contracts: use the contract value when one was entered, else the list price
  if (r.billing_mode === 'direct') return r.contract_mrr_eur != null ? Number(r.contract_mrr_eur) : list
  return list
}

export default async function SuperAdminPage() {
  const { lang } = await getSuperAdmin()
  const t = SA[lang]
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from('superadmin_tenant_stats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) console.error('[superadmin] could not load tenants:', error.message)
  const rows = (data ?? []) as Row[]

  const customers = rows.filter(r => r.subscription_tier !== 'za3fran_internal')
  const mrr = customers.reduce((sum, r) => sum + monthlyValue(r), 0)
  const paying = customers.filter(r => monthlyValue(r) > 0).length
  const trialing = customers.filter(r => r.subscription_status === 'trialing' && !r.stripe_subscription_id)
  const soon = trialing.filter(r => r.trial_ends_at && new Date(r.trial_ends_at).getTime() - Date.now() < 3 * 86400_000)
  const since = Date.now() - 30 * 86400_000
  const newThisMonth = customers.filter(r => new Date(r.created_at).getTime() >= since).length
  const auditsMonth = rows.reduce((s, r) => s + Number(r.campaigns_month), 0)
  const atRisk = customers.filter(r => ['past_due', 'unpaid'].includes(r.subscription_status ?? '')).length

  const stats = [
    { label: t.statMrr, value: eur(mrr, lang), note: t.statMrrNote(eur(mrr * 12, lang)) },
    { label: t.statPaying, value: String(paying), note: t.statPayingNote(customers.length) },
    { label: t.statPilots, value: String(trialing.length), note: t.statPilotsNote(soon.length) },
    { label: t.statNew, value: String(newThisMonth), note: t.statNewNote },
    { label: t.statAudits, value: String(auditsMonth), note: t.statAuditsNote },
    { label: t.statIssues, value: String(atRisk), note: t.statIssuesNote },
  ]

  return (
    <div>
      <h1 className={styles.title}>{t.overviewTitle}</h1>
      {error && <div className={styles.error}>{t.loadTenantsFailed}</div>}

      <div className={styles.stats}>
        {stats.map(s => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statNote}>{s.note}</span>
          </div>
        ))}
      </div>

      <div className={styles.sectionHead}>
        <h2 className={styles.subtitle}>{t.workspaces(rows.length)}</h2>
        <CreateTenantForm lang={lang} />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.thWorkspace}</th><th>{t.thPlan}</th><th>{t.thStatus}</th><th>{t.thUsers}</th><th>{t.thProperties}</th>
              <th>{t.thAudits}</th><th>{t.thCreated}</th><th>{t.thTrialEnds}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const internal = r.subscription_tier === 'za3fran_internal'
              const plan = planName(r.subscription_tier, lang) ?? (internal ? t.internalPlan : '—')
              const status = r.subscription_status ?? '—'
              const isTrial = status === 'trialing' && !r.stripe_subscription_id
              return (
                <tr key={r.id}>
                  <td className={styles.nameCell}>{r.name}</td>
                  <td>{plan}{r.billing_mode === 'direct' ? ` · ${t.directContract}` : r.billing_interval ? ` · ${r.billing_interval === 'month' ? t.intervalMonth : r.billing_interval === 'year' ? t.intervalYear : r.billing_interval}` : ''}</td>
                  <td>
                    <span className={`${styles.pill} ${status === 'active' ? styles.pillOk : ['suspended', 'canceled', 'trial_expired', 'unpaid', 'past_due'].includes(status) ? styles.pillBad : styles.pillNeutral}`}>
                      {isTrial ? t.status.trial : (t.status[status] ?? status)}
                    </span>
                    {r.cancel_at_period_end && <span className={`${styles.pill} ${styles.pillBad}`} style={{ marginLeft: 6 }}>{t.cancelledEnds}</span>}
                  </td>
                  <td>{r.users_count}</td>
                  <td>{r.properties_count}</td>
                  <td>{r.campaigns_month} / {r.campaigns_count}</td>
                  <td>{day(r.created_at, lang)}</td>
                  <td>{isTrial ? day(r.trial_ends_at, lang) : day(r.current_period_end, lang)}</td>
                  <td><TenantActions tenantId={r.id} name={r.name} suspended={status === 'suspended'} internal={internal} main={r.id === 'a0000000-0000-0000-0000-000000000001'} pilot={isTrial} free={effectivePlan(r as any).kind === 'free'} offline={!!(r as any).offline_audit_enabled} lang={lang} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.footnote}>{t.overviewFootnote}</p>
    </div>
  )
}
