export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { effectivePlan, listMonthlyValue, planName } from '@/lib/plans'
import { EUR_PER_UNIT, isCurrency } from '@/lib/currency'
import TenantActions from './TenantActions'
import CreateTenantForm from './CreateTenantForm'
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

const eur = (n: number) => `€${Math.round(n).toLocaleString('en-GB')}`
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await supabase
    .from('superadmin_tenant_stats')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
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
    { label: 'MRR (estimated)', value: eur(mrr), note: `ARR ≈ ${eur(mrr * 12)}` },
    { label: 'Paying customers', value: String(paying), note: `${customers.length} customers in total` },
    { label: 'Active pilots', value: String(trialing.length), note: `${soon.length} ending within 3 days` },
    { label: 'New (30 days)', value: String(newThisMonth), note: 'signups + paid checkouts' },
    { label: 'Audits this month', value: String(auditsMonth), note: 'campaigns created, all tenants' },
    { label: 'Payment issues', value: String(atRisk), note: 'past due / unpaid' },
  ]

  return (
    <div>
      <h1 className={styles.title}>Platform overview</h1>
      {error && <div className={styles.error}>Could not load tenants: {error.message}</div>}

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
        <h2 className={styles.subtitle}>Tenants ({rows.length})</h2>
        <CreateTenantForm />
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tenant</th><th>Plan</th><th>Status</th><th>Users</th><th>Properties</th>
              <th>Audits (month / total)</th><th>Created</th><th>Trial ends / renews</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const internal = r.subscription_tier === 'za3fran_internal'
              const plan = planName(r.subscription_tier, 'en') ?? (internal ? 'Internal' : '—')
              const status = r.subscription_status ?? '—'
              const isTrial = status === 'trialing' && !r.stripe_subscription_id
              return (
                <tr key={r.id}>
                  <td className={styles.nameCell}>{r.name}</td>
                  <td>{plan}{r.billing_mode === 'direct' ? ' · direct contract' : r.billing_interval ? ` · ${r.billing_interval}` : ''}</td>
                  <td>
                    <span className={`${styles.pill} ${status === 'active' ? styles.pillOk : ['suspended', 'canceled', 'trial_expired', 'unpaid', 'past_due'].includes(status) ? styles.pillBad : styles.pillNeutral}`}>
                      {isTrial ? 'trial' : status}
                    </span>
                    {r.cancel_at_period_end && <span className={`${styles.pill} ${styles.pillBad}`} style={{ marginLeft: 6 }}>cancelled — ends</span>}
                  </td>
                  <td>{r.users_count}</td>
                  <td>{r.properties_count}</td>
                  <td>{r.campaigns_month} / {r.campaigns_count}</td>
                  <td>{day(r.created_at)}</td>
                  <td>{isTrial ? day(r.trial_ends_at) : day(r.current_period_end)}</td>
                  <td><TenantActions tenantId={r.id} name={r.name} suspended={status === 'suspended'} internal={internal} main={r.id === 'a0000000-0000-0000-0000-000000000001'} pilot={isTrial} free={effectivePlan(r as any).kind === 'free'} offline={!!(r as any).offline_audit_enabled} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.footnote}>MRR is computed from each tenant&apos;s plan and billing interval (annual plans divided by 12), counting active and past-due subscriptions; direct contracts count their contract value (or the list price if none was entered). Stripe remains the source of truth for actual revenue.</p>
    </div>
  )
}
