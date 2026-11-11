export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { loadSales, type SalesData, type SubRow } from '@/lib/sales'
import { PLAN_DISPLAY } from '@/lib/plans'
import styles from '../superadmin.module.css'

const eur = (cents: number) => `€${(cents / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
const day = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const pct = (n: number) => `${(n * 100).toLocaleString('en-GB', { maximumFractionDigits: 1 })}%`

function Bars({ title, points, note }: { title: string; points: { label: string; value: number }[]; note?: string }) {
  const max = Math.max(1, ...points.map(p => p.value))
  return (
    <div className={styles.chartCard}>
      <p className={styles.chartTitle}>{title}</p>
      <div className={styles.bars} role="img" aria-label={`${title}: ${points.map(p => `${p.label} ${eur(p.value)}`).join(', ')}`}>
        {points.map(p => (
          <div key={p.label} className={styles.barCol} title={`${p.label}: ${eur(p.value)}`}>
            <span className={styles.barValue}>{p.value ? eur(p.value) : ''}</span>
            <div className={styles.bar} style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }} />
            <span className={styles.barLabel}>{p.label}</span>
          </div>
        ))}
      </div>
      {note && <p className={styles.footnote}>{note}</p>}
    </div>
  )
}

function SubTable({ rows, dateLabel, date, empty }: { rows: SubRow[]; dateLabel: string; date: (r: SubRow) => number | null; empty: string }) {
  if (!rows.length) return <p className={styles.note}>{empty}</p>
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Customer</th><th>Plan</th><th>Billing</th><th>Amount</th><th>MRR</th><th>{dateLabel}</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className={styles.nameCell}>{r.customerName}</td>
              <td>{r.plan}</td>
              <td>{r.interval === 'year' ? 'Annual' : 'Monthly'}</td>
              <td>{eur(r.periodCents)}</td>
              <td>{eur(r.mrrCents)}</td>
              <td>{day(date(r))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function SalesPage() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, billing_mode, contract_mrr_eur, created_at')
  const all = tenants ?? []
  const byCustomer = new Map<string, { id: string; name: string }>()
  for (const t of all) if (t.stripe_customer_id) byCustomer.set(t.stripe_customer_id, { id: t.id, name: t.name })

  let sales: SalesData | null = null
  let error: string | null = null
  try {
    sales = await loadSales(byCustomer)
  } catch (e: any) {
    error = e?.message ?? 'Unknown error'
  }

  // Direct contracts (billed outside Stripe)
  const direct = all.filter(t => t.billing_mode === 'direct' && t.subscription_status === 'active')
  const directMrrCents = direct.reduce((n, t) => {
    const v = t.contract_mrr_eur != null ? Number(t.contract_mrr_eur) : PLAN_DISPLAY.find(p => p.tier === t.subscription_tier)?.monthlyEur ?? 0
    return n + Math.round(v * 100)
  }, 0)

  // Trials (database): conversion over the last 90 days
  const since90 = Date.now() - 90 * 86400_000
  const trialCohort = all.filter(t => t.billing_mode !== 'direct' && t.subscription_tier !== 'za3fran_internal' && t.trial_ends_at && new Date(t.created_at).getTime() >= since90)
  const converted = trialCohort.filter(t => t.stripe_subscription_id && ['active', 'past_due'].includes(t.subscription_status ?? ''))
  const trialsRunning = all.filter(t => t.subscription_status === 'trialing' && !t.stripe_subscription_id)
  const trialsEnding7 = trialsRunning.filter(t => t.trial_ends_at && new Date(t.trial_ends_at).getTime() - Date.now() <= 7 * 86400_000)

  const thisMonth = sales?.months[sales.months.length - 1]
  const lastMonth = sales?.months[sales.months.length - 2]
  const churnRate = (m?: { churnMrrCents: number; mrrStartCents: number }) => (m && m.mrrStartCents ? m.churnMrrCents / m.mrrStartCents : 0)
  const totalMrr = (sales?.mrrCents ?? 0) + directMrrCents

  return (
    <div>
      <h1 className={styles.title}>Sales</h1>
      {error && <div className={styles.error}>Could not load Stripe data: {error}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{eur(totalMrr)}</span>
          <span className={styles.statLabel}>MRR</span>
          <span className={styles.statNote}>Stripe {eur(sales?.mrrCents ?? 0)} + direct contracts {eur(directMrrCents)} · ARR ≈ {eur(totalMrr * 12)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{eur(sales?.revenue30Cents ?? 0)}</span>
          <span className={styles.statLabel}>Collected, last 30 days</span>
          <span className={styles.statNote}>{eur(sales?.revenueYtdCents ?? 0)} this year · {eur(sales?.revenue12Cents ?? 0)} over 12 months (Stripe, excl. tax)</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{(sales?.activeCount ?? 0) + direct.length}</span>
          <span className={styles.statLabel}>Paying customers</span>
          <span className={styles.statNote}>{sales?.activeCount ?? 0} Stripe + {direct.length} direct · avg {eur(sales?.arpaCents ?? 0)}/month (Stripe)</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{thisMonth ? `${thisMonth.newCount} / ${thisMonth.churnCount}` : '—'}</span>
          <span className={styles.statLabel}>New / lost this month</span>
          <span className={styles.statNote}>+{eur(thisMonth?.newMrrCents ?? 0)} / −{eur(thisMonth?.churnMrrCents ?? 0)} MRR · churn {pct(churnRate(thisMonth))} (last month {pct(churnRate(lastMonth))})</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{trialCohort.length ? pct(converted.length / trialCohort.length) : '—'}</span>
          <span className={styles.statLabel}>Trial → paid (90 days)</span>
          <span className={styles.statNote}>{converted.length} of {trialCohort.length} trials · {trialsRunning.length} running, {trialsEnding7.length} ending within 7 days</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{(sales?.paymentIssues.length ?? 0) + (sales?.openInvoicesCount ?? 0)}</span>
          <span className={styles.statLabel}>Payment issues</span>
          <span className={styles.statNote}>{sales?.paymentIssues.length ?? 0} overdue subscriptions · {sales?.openInvoicesCount ?? 0} open invoices ({eur(sales?.openInvoicesCents ?? 0)})</span>
        </div>
      </div>

      {sales && (
        <>
          <div className={styles.chartsGrid}>
            <Bars title="Revenue collected per month" points={sales.months.map(m => ({ label: m.label, value: m.revenueCents }))} note="Paid Zahir Guest invoices, after discounts, excluding tax." />
            <Bars title="MRR at the start of each month" points={sales.months.map(m => ({ label: m.label, value: m.mrrStartCents }))} note="Stripe subscriptions running on the 1st, at their current price (plan changes are not replayed). Direct contracts excluded." />
          </div>

          <h2 className={styles.subtitle}>Renewals in the next 30 days ({sales.renewals30.length})</h2>
          <SubTable rows={sales.renewals30} dateLabel="Renews on" date={r => r.periodEnd} empty="No renewal in the next 30 days." />

          <h2 className={styles.subtitle}>Scheduled cancellations ({sales.scheduledCancellations.length})</h2>
          <SubTable rows={sales.scheduledCancellations} dateLabel="Ends on" date={r => r.cancelAt ?? r.periodEnd} empty="No subscription is set to end." />

          <h2 className={styles.subtitle}>Payment issues ({sales.paymentIssues.length})</h2>
          <SubTable rows={sales.paymentIssues} dateLabel="Period ends" date={r => r.periodEnd} empty="No overdue subscription." />

          <h2 className={styles.subtitle}>Month by month</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Month</th><th>Revenue</th><th>MRR on the 1st</th><th>New</th><th>New MRR</th><th>Lost</th><th>Lost MRR</th><th>Net MRR</th><th>Churn</th></tr></thead>
              <tbody>
                {[...sales.months].reverse().map(m => (
                  <tr key={m.key}>
                    <td className={styles.nameCell}>{m.label}</td>
                    <td>{eur(m.revenueCents)}</td>
                    <td>{eur(m.mrrStartCents)}</td>
                    <td>{m.newCount}</td>
                    <td>{eur(m.newMrrCents)}</td>
                    <td>{m.churnCount}</td>
                    <td>{eur(m.churnMrrCents)}</td>
                    <td>{m.newMrrCents - m.churnMrrCents >= 0 ? '+' : '−'}{eur(Math.abs(m.newMrrCents - m.churnMrrCents))}</td>
                    <td>{pct(churnRate(m))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.chartsGrid}>
            <div>
              <h2 className={styles.subtitle}>By plan</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Plan</th><th>Customers</th><th>MRR</th><th>Share</th></tr></thead>
                  <tbody>
                    {sales.byPlan.length ? sales.byPlan.map(g => (
                      <tr key={g.plan}><td className={styles.nameCell}>{g.plan}</td><td>{g.count}</td><td>{eur(g.mrrCents)}</td><td>{sales!.mrrCents ? pct(g.mrrCents / sales!.mrrCents) : '—'}</td></tr>
                    )) : <tr><td colSpan={4} className={styles.note}>No paying subscription yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className={styles.subtitle}>Monthly vs annual</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Billing</th><th>Customers</th><th>MRR</th><th>Share</th></tr></thead>
                  <tbody>
                    {sales.byInterval.length ? sales.byInterval.map(g => (
                      <tr key={g.interval}><td className={styles.nameCell}>{g.interval}</td><td>{g.count}</td><td>{eur(g.mrrCents)}</td><td>{sales!.mrrCents ? pct(g.mrrCents / sales!.mrrCents) : '—'}</td></tr>
                    )) : <tr><td colSpan={4} className={styles.note}>No paying subscription yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {direct.length > 0 && (
            <>
              <h2 className={styles.subtitle}>Direct contracts ({direct.length})</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Customer</th><th>Plan</th><th>Monthly value</th><th>Since</th></tr></thead>
                  <tbody>
                    {direct.map(t => (
                      <tr key={t.id}>
                        <td className={styles.nameCell}>{t.name}</td>
                        <td>{PLAN_DISPLAY.find(p => p.tier === t.subscription_tier)?.name ?? t.subscription_tier}</td>
                        <td>{t.contract_mrr_eur != null ? `€${Number(t.contract_mrr_eur).toLocaleString('en-GB')}` : `list price`}</td>
                        <td>{day(new Date(t.created_at).getTime())}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 className={styles.subtitle}>All subscriptions ({sales.subs.length})</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Customer</th><th>Plan</th><th>Billing</th><th>MRR</th><th>Status</th><th>Started</th><th>Ended</th></tr></thead>
              <tbody>
                {sales.subs.slice(0, 100).map(r => (
                  <tr key={r.id}>
                    <td className={styles.nameCell}>{r.customerName}</td>
                    <td>{r.plan}</td>
                    <td>{r.interval === 'year' ? 'Annual' : 'Monthly'}</td>
                    <td>{eur(r.mrrCents)}</td>
                    <td>
                      <span className={`${styles.pill} ${r.status === 'active' ? styles.pillOk : ['past_due', 'unpaid', 'canceled'].includes(r.status) ? styles.pillBad : styles.pillNeutral}`}>{r.status}</span>
                      {r.cancelAtPeriodEnd && <span className={`${styles.pill} ${styles.pillBad}`} style={{ marginLeft: 6 }}>ends</span>}
                    </td>
                    <td>{day(r.created)}</td>
                    <td>{day(r.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.footnote}>
            Source: Stripe (live), Zahir Guest prices only — the Stripe account is shared with Za3fran. Amounts in euros, after recurring discounts, excluding tax.
            {sales.otherCurrencies.length > 0 && ` Subscriptions in other currencies (${sales.otherCurrencies.join(', ')}) are not included.`}
            {' '}Updated {new Date(sales.generatedAt).toLocaleString('en-GB')} — reload the page to refresh.
          </p>
        </>
      )}
    </div>
  )
}
