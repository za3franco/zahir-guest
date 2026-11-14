export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { loadSales, type SalesData, type SubRow } from '@/lib/sales'
import { listMonthlyValue, planName } from '@/lib/plans'
import { EUR_PER_UNIT, isCurrency } from '@/lib/currency'
import { SA, eurCents, num, pct, day, monthLabel, dateTime, localPlan, type Lang } from '@/lib/superadminText'
import { getSuperAdmin } from '../session'
import styles from '../superadmin.module.css'

/** "déc. 25" → ["déc.", " 25"]: the year is hidden on narrow screens so labels do not overlap */
const splitMonth = (label: string): [string, string] => {
  const m = /^(.*?)([\s\u00a0\u202f]\d+)$/.exec(label)
  return m ? [m[1], m[2]] : [label, '']
}

function Bars({ title, points, note, lang }: { title: string; points: { label: string; value: number }[]; note?: string; lang: Lang }) {
  const eur = (cents: number) => eurCents(cents, lang)
  const max = Math.max(1, ...points.map(p => p.value))
  return (
    <div className={styles.chartCard}>
      <p className={styles.chartTitle}>{title}</p>
      <div className={styles.bars} role="img" aria-label={`${title}: ${points.map(p => `${p.label} ${eur(p.value)}`).join(', ')}`}>
        {points.map(p => (
          <div key={p.label} className={styles.barCol} title={`${p.label}: ${eur(p.value)}`}>
            <span className={styles.barValue}>{p.value ? eur(p.value) : ''}</span>
            <div className={styles.bar} style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }} />
            <span className={styles.barLabel}>{splitMonth(p.label)[0]}<span className={styles.barYear}>{splitMonth(p.label)[1]}</span></span>
          </div>
        ))}
      </div>
      {note && <p className={styles.footnote}>{note}</p>}
    </div>
  )
}

function SubTable({ rows, dateLabel, date, empty, lang }: { rows: SubRow[]; dateLabel: string; date: (r: SubRow) => number | null; empty: string; lang: Lang }) {
  const t = SA[lang]
  const eur = (cents: number) => eurCents(cents, lang)
  if (!rows.length) return <p className={styles.note}>{empty}</p>
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>{t.thCustomer}</th><th>{t.thPlan}</th><th>{t.thBilling}</th><th>{t.thAmount}</th><th>{t.thMrr}</th><th>{dateLabel}</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td className={styles.nameCell}>{r.customerName}</td>
              <td>{localPlan(r.plan, lang)}</td>
              <td>{r.interval === 'year' ? t.annual : t.monthly}</td>
              <td>{eur(r.periodCents)}</td>
              <td>{eur(r.mrrCents)}</td>
              <td>{day(date(r), lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default async function SalesPage() {
  const { lang } = await getSuperAdmin()
  const t = SA[lang]
  const eur = (cents: number) => eurCents(cents, lang)
  const pctL = (n: number) => pct(n, lang)
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, subscription_tier, subscription_status, stripe_customer_id, stripe_subscription_id, trial_ends_at, billing_mode, contract_mrr_eur, created_at, billing_currency, billing_interval, extra_properties, current_period_end')
  const all = tenants ?? []
  const byCustomer = new Map<string, { id: string; name: string }>()
  for (const t of all) if (t.stripe_customer_id) byCustomer.set(t.stripe_customer_id, { id: t.id, name: t.name })

  let sales: SalesData | null = null
  let error: string | null = null
  try {
    const { data: ycp } = await supabase
      .from('billing_payments')
      .select('amount_minor, currency, paid_at')
      .eq('status', 'paid')
      .gte('paid_at', new Date(Date.now() - 366 * 86400_000).toISOString())
    sales = await loadSales(byCustomer, (ycp ?? []) as any)
  } catch (e: any) {
    console.error('[superadmin/sales] could not load Stripe data:', e?.message ?? e)
    error = t.loadSalesFailed
  }

  // Direct contracts (billed outside Stripe)
  const direct = all.filter(t => t.billing_mode === 'direct' && t.subscription_status === 'active')
  const directMrrCents = direct.reduce((n, t) => {
    const cur = isCurrency(t.billing_currency) ? t.billing_currency : 'EUR'
    const v = t.contract_mrr_eur != null ? Number(t.contract_mrr_eur) : listMonthlyValue(t.subscription_tier, t.billing_interval, t.extra_properties ?? 0, cur) * EUR_PER_UNIT[cur]
    return n + Math.round(v * 100)
  }, 0)

  // MAD prepaid periods (YouCan Pay): list value of the running periods, converted to EUR
  const youcan = all.filter(t => t.billing_mode === 'youcan' && t.subscription_status === 'active' && t.current_period_end && new Date(t.current_period_end).getTime() > Date.now())
  const youcanMrrCents = youcan.reduce((n, t) => n + Math.round(listMonthlyValue(t.subscription_tier, t.billing_interval, t.extra_properties ?? 0, 'MAD') * EUR_PER_UNIT.MAD * 100), 0)

  // Sign-ups (database): free or pilot → paid over the last 90 days
  const since90 = Date.now() - 90 * 86400_000
  const trialCohort = all.filter(t => t.billing_mode !== 'direct' && t.subscription_tier !== 'za3fran_internal' && new Date(t.created_at).getTime() >= since90)
  const converted = trialCohort.filter(t => (t.stripe_subscription_id || t.billing_mode === 'youcan') && ['active', 'past_due'].includes(t.subscription_status ?? ''))
  const trialsRunning = all.filter(t => t.subscription_status === 'trialing' && !t.stripe_subscription_id)
  const trialsEnding7 = trialsRunning.filter(t => t.trial_ends_at && new Date(t.trial_ends_at).getTime() - Date.now() <= 7 * 86400_000)

  const thisMonth = sales?.months[sales.months.length - 1]
  const lastMonth = sales?.months[sales.months.length - 2]
  const churnRate = (m?: { churnMrrCents: number; mrrStartCents: number }) => (m && m.mrrStartCents ? m.churnMrrCents / m.mrrStartCents : 0)
  const totalMrr = (sales?.mrrCents ?? 0) + directMrrCents + youcanMrrCents

  return (
    <div>
      <h1 className={styles.title}>{t.salesTitle}</h1>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{eur(totalMrr)}</span>
          <span className={styles.statLabel}>{t.sMrr}</span>
          <span className={styles.statNote}>{t.sMrrNote(eur(sales?.mrrCents ?? 0), eur(youcanMrrCents), eur(directMrrCents), eur(totalMrr * 12))}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{eur(sales?.revenue30Cents ?? 0)}</span>
          <span className={styles.statLabel}>{t.sCollected}</span>
          <span className={styles.statNote}>{t.sCollectedNote(eur(sales?.revenueYtdCents ?? 0), eur(sales?.revenue12Cents ?? 0))}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{(sales?.activeCount ?? 0) + direct.length + youcan.length}</span>
          <span className={styles.statLabel}>{t.sPaying}</span>
          <span className={styles.statNote}>{t.sPayingNote(sales?.activeCount ?? 0, youcan.length, direct.length, eur(sales?.arpaCents ?? 0))}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{thisMonth ? `${thisMonth.newCount} / ${thisMonth.churnCount}` : '—'}</span>
          <span className={styles.statLabel}>{t.sNewLost}</span>
          <span className={styles.statNote}>{t.sNewLostNote(eur(thisMonth?.newMrrCents ?? 0), eur(thisMonth?.churnMrrCents ?? 0), pctL(churnRate(thisMonth)), pctL(churnRate(lastMonth)))}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{trialCohort.length ? pctL(converted.length / trialCohort.length) : '—'}</span>
          <span className={styles.statLabel}>{t.sConversion}</span>
          <span className={styles.statNote}>{t.sConversionNote(converted.length, trialCohort.length, trialsRunning.length, trialsEnding7.length)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{(sales?.paymentIssues.length ?? 0) + (sales?.openInvoicesCount ?? 0)}</span>
          <span className={styles.statLabel}>{t.sIssues}</span>
          <span className={styles.statNote}>{t.sIssuesNote(sales?.paymentIssues.length ?? 0, sales?.openInvoicesCount ?? 0, eur(sales?.openInvoicesCents ?? 0))}</span>
        </div>
      </div>

      {sales && (
        <>
          <div className={styles.chartsGrid}>
            <Bars lang={lang} title={t.chartRevenue} points={sales.months.map(m => ({ label: monthLabel(m.key, lang), value: m.revenueCents }))} note={t.chartRevenueNote} />
            <Bars lang={lang} title={t.chartMrr} points={sales.months.map(m => ({ label: monthLabel(m.key, lang), value: m.mrrStartCents }))} note={t.chartMrrNote} />
          </div>

          <h2 className={styles.subtitle}>{t.renewals(sales.renewals30.length)}</h2>
          <SubTable lang={lang} rows={sales.renewals30} dateLabel={t.renewsOn} date={r => r.periodEnd} empty={t.noRenewals} />

          <h2 className={styles.subtitle}>{t.cancellations(sales.scheduledCancellations.length)}</h2>
          <SubTable lang={lang} rows={sales.scheduledCancellations} dateLabel={t.endsOn} date={r => r.cancelAt ?? r.periodEnd} empty={t.noCancellations} />

          <h2 className={styles.subtitle}>{t.issues(sales.paymentIssues.length)}</h2>
          <SubTable lang={lang} rows={sales.paymentIssues} dateLabel={t.periodEnds} date={r => r.periodEnd} empty={t.noIssues} />

          <h2 className={styles.subtitle}>{t.monthByMonth}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>{t.thMonth}</th><th>{t.thRevenue}</th><th>{t.thMrrFirst}</th><th>{t.thNew}</th><th>{t.thNewMrr}</th><th>{t.thLost}</th><th>{t.thLostMrr}</th><th>{t.thNet}</th><th>{t.thChurn}</th></tr></thead>
              <tbody>
                {[...sales.months].reverse().map(m => (
                  <tr key={m.key}>
                    <td className={styles.nameCell}>{monthLabel(m.key, lang)}</td>
                    <td>{eur(m.revenueCents)}</td>
                    <td>{eur(m.mrrStartCents)}</td>
                    <td>{m.newCount}</td>
                    <td>{eur(m.newMrrCents)}</td>
                    <td>{m.churnCount}</td>
                    <td>{eur(m.churnMrrCents)}</td>
                    <td>{m.newMrrCents - m.churnMrrCents >= 0 ? '+' : '−'}{eur(Math.abs(m.newMrrCents - m.churnMrrCents))}</td>
                    <td>{pctL(churnRate(m))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.chartsGrid}>
            <div>
              <h2 className={styles.subtitle}>{t.byPlan}</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>{t.thPlan}</th><th>{t.thCustomers}</th><th>{t.thMrr}</th><th>{t.thShare}</th></tr></thead>
                  <tbody>
                    {sales.byPlan.length ? sales.byPlan.map(g => (
                      <tr key={g.plan}><td className={styles.nameCell}>{localPlan(g.plan, lang)}</td><td>{g.count}</td><td>{eur(g.mrrCents)}</td><td>{sales!.mrrCents ? pctL(g.mrrCents / sales!.mrrCents) : '—'}</td></tr>
                    )) : <tr><td colSpan={4} className={styles.note}>{t.noPaying}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 className={styles.subtitle}>{t.byInterval}</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>{t.thBilling}</th><th>{t.thCustomers}</th><th>{t.thMrr}</th><th>{t.thShare}</th></tr></thead>
                  <tbody>
                    {sales.byInterval.length ? sales.byInterval.map(g => (
                      <tr key={g.interval}><td className={styles.nameCell}>{g.interval === 'Annual' ? t.annual : t.monthly}</td><td>{g.count}</td><td>{eur(g.mrrCents)}</td><td>{sales!.mrrCents ? pctL(g.mrrCents / sales!.mrrCents) : '—'}</td></tr>
                    )) : <tr><td colSpan={4} className={styles.note}>{t.noPaying}</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {direct.length > 0 && (
            <>
              <h2 className={styles.subtitle}>{t.directContracts(direct.length)}</h2>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>{t.thCustomer}</th><th>{t.thPlan}</th><th>{t.thMonthlyValue}</th><th>{t.thSince}</th></tr></thead>
                  <tbody>
                    {direct.map(d => (
                      <tr key={d.id}>
                        <td className={styles.nameCell}>{d.name}</td>
                        <td>{planName(d.subscription_tier, lang) ?? d.subscription_tier}</td>
                        <td>{d.contract_mrr_eur != null ? eurCents(Number(d.contract_mrr_eur) * 100, lang) : t.listPrice}</td>
                        <td>{day(d.created_at, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2 className={styles.subtitle}>{t.allSubs(sales.subs.length)}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>{t.thCustomer}</th><th>{t.thPlan}</th><th>{t.thBilling}</th><th>{t.thMrr}</th><th>{t.thStatus}</th><th>{t.thStarted}</th><th>{t.thEnded}</th></tr></thead>
              <tbody>
                {sales.subs.slice(0, 100).map(r => (
                  <tr key={r.id}>
                    <td className={styles.nameCell}>{r.customerName}</td>
                    <td>{localPlan(r.plan, lang)}</td>
                    <td>{r.interval === 'year' ? t.annual : t.monthly}</td>
                    <td>{eur(r.mrrCents)}</td>
                    <td>
                      <span className={`${styles.pill} ${r.status === 'active' ? styles.pillOk : ['past_due', 'unpaid', 'canceled'].includes(r.status) ? styles.pillBad : styles.pillNeutral}`}>{t.status[r.status] ?? r.status}</span>
                      {r.cancelAtPeriodEnd && <span className={`${styles.pill} ${styles.pillBad}`} style={{ marginLeft: 6 }}>{t.ends}</span>}
                    </td>
                    <td>{day(r.created, lang)}</td>
                    <td>{day(r.endedAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className={styles.footnote}>
            {t.salesFootnote}
            {' '}{t.salesRates}
            {sales.byCurrency.length > 0 && ` ${t.salesByCurrency(sales.byCurrency.map(c => `${c.currency} ${num(c.nativeMrrCents / 100, lang)} (${c.count})`).join(' · '))}`}
            {' '}{t.salesUpdated(dateTime(sales.generatedAt, lang))}
          </p>
        </>
      )}
    </div>
  )
}
