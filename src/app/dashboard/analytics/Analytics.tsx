'use client'

import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AuditRow } from '@/lib/analytics'
import styles from './analytics.module.css'

type Lang = 'en' | 'fr'

const CLASS_LABEL: Record<string, { en: string; fr: string }> = {
  SERVICE: { en: 'Service', fr: 'Service' },
  EFFICIENCY: { en: 'Efficiency', fr: 'Efficacité' },
  PRODUCT: { en: 'Product', fr: 'Produit' },
  CLEANLINESS: { en: 'Cleanliness', fr: 'Propreté' },
  EMOTIONAL_INTELLIGENCE: { en: 'Emotional intelligence', fr: 'Intelligence émotionnelle' },
  SALES_OPPORTUNITY: { en: 'Sales opportunity', fr: 'Opportunité de vente' },
}

const color = (p: number | null) => (p == null ? 'var(--color-sand)' : p >= 85 ? '#4A9C7B' : p >= 70 ? '#C8A45A' : p >= 50 ? '#D4882A' : '#C0503A')
const avg = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
const fmt = (p: number | null) => (p == null ? '—' : `${Math.round(p)}%`)
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

const PERIODS = [
  { key: '3', en: 'Last 3 months', fr: '3 derniers mois' },
  { key: '6', en: 'Last 6 months', fr: '6 derniers mois' },
  { key: '12', en: 'Last 12 months', fr: '12 derniers mois' },
  { key: 'all', en: 'All time', fr: 'Depuis le début' },
]

export default function Analytics({ rows, clients, lang, isAdmin }: { rows: AuditRow[]; clients: { id: string; name: string }[]; lang: Lang; isAdmin: boolean }) {
  const en = lang === 'en'
  const t = (a: string, b: string) => (en ? a : b)
  const [client, setClient] = useState('')
  const [property, setProperty] = useState('')
  const [period, setPeriod] = useState('12')

  const scoped = useMemo(() => rows.filter(r => (!client || r.clientId === client) && (!property || r.propertyId === property)), [rows, client, property])
  const properties = useMemo(() => {
    const m = new Map<string, string>()
    rows.filter(r => !client || r.clientId === client).forEach(r => m.set(r.propertyId, r.propertyName))
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [rows, client])

  const now = Date.now()
  const months = period === 'all' ? null : Number(period)
  const start = months ? new Date(new Date().setMonth(new Date().getMonth() - months)).getTime() : 0
  const prevStart = months ? new Date(new Date().setMonth(new Date().getMonth() - 2 * months)).getTime() : 0
  const inPeriod = scoped.filter(r => new Date(r.date).getTime() >= start && new Date(r.date).getTime() <= now)
  const previous = months ? scoped.filter(r => { const d = new Date(r.date).getTime(); return d >= prevStart && d < start }) : []

  const avgScore = avg(inPeriod.map(r => r.overall))
  const prevAvg = avg(previous.map(r => r.overall))
  const delta = avgScore != null && prevAvg != null ? avgScore - prevAvg : null

  // Monthly trend
  const trend = useMemo(() => {
    const m = new Map<string, (number | null)[]>()
    for (const r of inPeriod) { const k = r.date.slice(0, 7); m.set(k, [...(m.get(k) ?? []), r.overall]) }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({
      month: new Date(`${k}-01T00:00:00Z`).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      score: avg(v) == null ? null : Math.round(avg(v)!),
      audits: v.length,
    }))
  }, [inPeriod, en])

  // Property ranking (benchmark)
  const ranking = useMemo(() => {
    const m = new Map<string, AuditRow[]>()
    for (const r of inPeriod) m.set(r.propertyId, [...(m.get(r.propertyId) ?? []), r])
    return Array.from(m.values()).map(list => {
      const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date))
      const all = scoped.filter(r => r.propertyId === list[0].propertyId).sort((a, b) => b.date.localeCompare(a.date))
      const latest = sorted[0]
      const before = all[all.indexOf(latest) + 1]
      return {
        id: latest.propertyId, name: latest.propertyName, city: latest.city, audits: list.length,
        latest: latest.overall, latestDate: latest.date, average: avg(list.map(r => r.overall)),
        change: latest.overall != null && before?.overall != null ? latest.overall - before.overall : null,
        critical: list.reduce((n, r) => n + r.criticalBelow, 0),
      }
    }).sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
  }, [inPeriod, scoped])

  const classes = Object.keys(CLASS_LABEL).map(k => ({ k, pct: avg(inPeriod.map(r => r.classes[k] ?? null)) }))
  const domains = useMemo(() => {
    const m = new Map<string, { label: string; vals: (number | null)[] }>()
    for (const r of inPeriod) for (const d of r.domains) {
      const k = norm(d.en)
      const e = m.get(k) ?? { label: en ? d.en : d.fr, vals: [] }
      e.vals.push(d.pct); m.set(k, e)
    }
    return Array.from(m.values()).map(e => ({ label: e.label, pct: avg(e.vals), n: e.vals.length })).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101))
  }, [inPeriod, en])

  const recurring = useMemo(() => {
    const m = new Map<string, { text: string; critical: boolean; audits: number; props: Set<string> }>()
    for (const r of inPeriod) {
      const seen = new Set<string>()
      for (const b of r.below) {
        const k = norm(b.en || b.fr)
        if (seen.has(k)) continue
        seen.add(k)
        const e = m.get(k) ?? { text: en ? b.en : b.fr, critical: b.critical, audits: 0, props: new Set<string>() }
        e.audits++; e.props.add(r.propertyId); m.set(k, e)
      }
    }
    return Array.from(m.values()).filter(e => e.audits >= 2).sort((a, b) => b.audits - a.audits || Number(b.critical) - Number(a.critical)).slice(0, 15)
  }, [inPeriod, en])

  const fmtDate = (d: string) => (d ? new Date(d).toLocaleDateString(en ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '')
  const Bar = ({ label, pct, sub }: { label: string; pct: number | null; sub?: string }) => (
    <div className={styles.barRow}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}{sub && <span className={styles.muted}> {sub}</span>}</span>
      <div className={styles.barTrack}><div className={styles.barFill} style={{ width: `${pct ?? 0}%`, background: color(pct) }} /></div>
      <span className={styles.num} style={{ color: color(pct) }}>{fmt(pct)}</span>
    </div>
  )

  return (
    <div className={styles.page}>
      <div>
        <h1 className={styles.title}>{t('Analytics', 'Analyses')}</h1>
        <p className={styles.subtitle}>
          {isAdmin
            ? t('All finalized and published audits of your workspace: trends, property ranking and recurring issues.', 'Tous les audits finalisés et publiés de votre espace : tendances, classement des établissements et points récurrents.')
            : t('Published audits of the properties you follow: trends, ranking and recurring issues.', 'Audits publiés des établissements que vous suivez : tendances, classement et points récurrents.')}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>{t('No scored audit yet. Analytics appear as soon as a first audit is finalized.', "Aucun audit noté pour l'instant. Les analyses apparaissent dès qu'un premier audit est finalisé.")}</div>
      ) : (
        <>
          <div className={styles.filters}>
            {clients.length > 0 && (
              <select className={styles.select} value={client} onChange={e => { setClient(e.target.value); setProperty('') }} aria-label="Client">
                <option value="">{t('All clients', 'Tous les clients')}</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <select className={styles.select} value={property} onChange={e => setProperty(e.target.value)} aria-label={t('Property', 'Établissement')}>
              <option value="">{t('All properties', 'Tous les établissements')}</option>
              {properties.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <select className={styles.select} value={period} onChange={e => setPeriod(e.target.value)} aria-label={t('Period', 'Période')}>
              {PERIODS.map(p => <option key={p.key} value={p.key}>{en ? p.en : p.fr}</option>)}
            </select>
          </div>

          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('Average score', 'Score moyen')}</div>
              <div className={styles.kpiValue} style={{ color: color(avgScore) }}>{fmt(avgScore)}</div>
              <div className={styles.kpiSub}>
                {delta == null ? t('no earlier period to compare', 'pas de période précédente') : (
                  <span className={delta >= 0 ? styles.up : styles.down}>{delta >= 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))} pts {t('vs previous period', 'vs période précédente')}</span>
                )}
              </div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('Audits', 'Audits')}</div>
              <div className={styles.kpiValue}>{inPeriod.length}</div>
              <div className={styles.kpiSub}>{ranking.length} {t('properties', 'établissements')}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('Best property', 'Meilleur établissement')}</div>
              <div className={styles.kpiValue} style={{ fontSize: '1.25rem', marginTop: 10 }}>{ranking[0]?.name ?? '—'}</div>
              <div className={styles.kpiSub}>{ranking[0] ? `${fmt(ranking[0].average)} ${t('average', 'en moyenne')}` : ''}</div>
            </div>
            <div className={styles.kpi}>
              <div className={styles.kpiLabel}>{t('Critical failures', 'Points critiques non conformes')}</div>
              <div className={styles.kpiValue} style={{ color: inPeriod.some(r => r.criticalBelow) ? '#E8897E' : undefined }}>{inPeriod.reduce((n, r) => n + r.criticalBelow, 0)}</div>
              <div className={styles.kpiSub}>{t('across the period', 'sur la période')}</div>
            </div>
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t('Score trend', 'Évolution du score')}</h2>
            <p className={styles.panelHint}>{t('Average overall score of the audits of each month.', 'Score global moyen des audits de chaque mois.')}</p>
            {trend.length === 0 ? <p className={styles.muted}>{t('No audit in this period.', 'Aucun audit sur cette période.')}</p> : (
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                    <CartesianGrid stroke="#253549" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="#9B9488" fontSize={12} />
                    <YAxis domain={[0, 100]} stroke="#9B9488" fontSize={12} />
                    <Tooltip contentStyle={{ background: '#162236', border: '1px solid #253549', borderRadius: 8, color: '#F4F1EC' }}
                      formatter={(v: any, _n: any, p: any) => [`${v}% · ${p.payload.audits} audit${p.payload.audits > 1 ? 's' : ''}`, t('Score', 'Score')]} />
                    <Line type="monotone" dataKey="score" stroke="#C8A45A" strokeWidth={2.5} dot={{ r: 4, fill: '#C8A45A' }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t('Property ranking', 'Classement des établissements')}</h2>
            <p className={styles.panelHint}>{t('Average score over the period; change compares the latest audit with the one before.', "Score moyen sur la période ; l'évolution compare le dernier audit au précédent.")}</p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th><th>{t('Property', 'Établissement')}</th><th className={styles.num}>{t('Audits', 'Audits')}</th>
                    <th className={styles.num}>{t('Average', 'Moyenne')}</th><th className={styles.num}>{t('Latest', 'Dernier')}</th>
                    <th className={styles.num}>{t('Change', 'Évolution')}</th><th className={styles.num}>{t('Critical', 'Critiques')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((p, i) => (
                    <tr key={p.id}>
                      <td className={styles.muted}>{i + 1}</td>
                      <td>{p.name}{p.city && <span className={styles.muted}> · {p.city}</span>}</td>
                      <td className={styles.num}>{p.audits}</td>
                      <td className={styles.num} style={{ color: color(p.average), fontWeight: 600 }}>{fmt(p.average)}</td>
                      <td className={styles.num}>{fmt(p.latest)} <span className={styles.muted}>{fmtDate(p.latestDate)}</span></td>
                      <td className={styles.num}>{p.change == null ? <span className={styles.muted}>—</span> : <span className={p.change >= 0 ? styles.up : styles.down}>{p.change >= 0 ? '+' : ''}{Math.round(p.change)} pts</span>}</td>
                      <td className={styles.num} style={{ color: p.critical ? '#E8897E' : undefined }}>{p.critical}</td>
                    </tr>
                  ))}
                  {ranking.length > 1 && (
                    <tr>
                      <td />
                      <td className={styles.muted}>{t('Portfolio average', 'Moyenne du portefeuille')}</td>
                      <td className={styles.num}>{inPeriod.length}</td>
                      <td className={styles.num} style={{ color: color(avgScore), fontWeight: 600 }}>{fmt(avgScore)}</td>
                      <td colSpan={3} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.grid2}>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{t('By type of standard', 'Par type de standard')}</h2>
              <p className={styles.panelHint}>{t('Share of standards met, average over the period.', 'Part des standards conformes, moyenne sur la période.')}</p>
              <div className={styles.bars}>
                {classes.map(c => <Bar key={c.k} label={CLASS_LABEL[c.k][lang]} pct={c.pct} />)}
              </div>
            </div>
            <div className={styles.panel}>
              <h2 className={styles.panelTitle}>{t('By domain', 'Par domaine')}</h2>
              <p className={styles.panelHint}>{t('Weakest first.', 'Les plus faibles en premier.')}</p>
              <div className={styles.bars}>
                {domains.slice(0, 12).map(d => <Bar key={d.label} label={d.label} pct={d.pct} sub={`(${d.n})`} />)}
              </div>
            </div>
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t('Recurring issues', 'Points non conformes récurrents')}</h2>
            <p className={styles.panelHint}>{t('Standards failed in at least two audits of the period: the best candidates for training or process changes.', 'Standards non conformes dans au moins deux audits de la période : les meilleurs candidats pour une formation ou un changement de process.')}</p>
            {recurring.length === 0 ? <p className={styles.muted}>{t('No standard failed more than once in this period.', "Aucun standard n'a été non conforme plus d'une fois sur cette période.")}</p> : (
              <ul className={styles.fails}>
                {recurring.map((f, i) => (
                  <li key={i}>
                    <span className={styles.failCount}>×{f.audits}</span>
                    <span>
                      {f.text}{f.critical && <span className={styles.pill}>{t('critical', 'critique')}</span>}
                      <span className={styles.muted} style={{ display: 'block' }}>{f.props.size} {t(f.props.size > 1 ? 'properties' : 'property', f.props.size > 1 ? 'établissements' : 'établissement')}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
