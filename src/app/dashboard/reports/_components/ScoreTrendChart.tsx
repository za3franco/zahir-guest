'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

interface Campaign {
  id: string
  name: string
  publishedAt: string | null
  visitEnd: string | null
  overallPercent: number | null
  domainScores: { name_en: string; name_fr: string; score_percent: number | null }[]
}

interface Props {
  campaigns: Campaign[]
  lang: string
}

// Zahir palette for domain lines — muted so overall gold stands out
const DOMAIN_COLORS = [
  '#6B8FAD', '#7DAD9C', '#AD8B6B', '#9C7DAD', '#AD6B7D', '#7D9CAD',
]

const CustomTooltip = ({ active, payload, label, lang }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#162236',
      border: '1px solid #253549',
      borderRadius: 8,
      padding: '12px 16px',
      fontFamily: "'DM Sans', Arial, sans-serif",
      fontSize: 13,
      minWidth: 180,
    }}>
      <div style={{ color: '#9B9488', marginBottom: 8, fontSize: 11, letterSpacing: '0.04em' }}>{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span style={{ color: '#F4F1EC', fontWeight: 600 }}>
            {entry.value !== null ? `${entry.value}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function ScoreTrendChart({ campaigns, lang }: Props) {
  const t = (en: string, fr: string) => lang === 'en' ? en : fr

  // Sort oldest → newest for chart
  const sorted = [...campaigns].sort(
    (a, b) => new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime()
  )

  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const formatLabel = (c: Campaign) => {
    const d = c.visitEnd ?? c.publishedAt
    if (!d) return c.name
    return new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: '2-digit' })
  }

  // Gather all domain names from first campaign that has them
  const domainSample = sorted.find(c => c.domainScores.length > 0)?.domainScores ?? []

  const data = sorted.map(c => {
    const point: Record<string, any> = {
      label: formatLabel(c),
      [t('Overall', 'Global')]: c.overallPercent,
    }
    domainSample.forEach(d => {
      const domainName = lang === 'en' ? d.name_en : d.name_fr
      const match = c.domainScores.find(ds => ds.name_en === d.name_en)
      point[domainName] = match?.score_percent ?? null
    })
    return point
  })

  const overallKey = t('Overall', 'Global')

  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#253549" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9B9488', fontSize: 11, fontFamily: "'DM Sans', Arial, sans-serif" }}
            axisLine={{ stroke: '#253549' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: '#9B9488', fontSize: 11, fontFamily: "'DM Sans', Arial, sans-serif" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip content={<CustomTooltip lang={lang} />} />
          <Legend
            wrapperStyle={{ fontSize: 12, fontFamily: "'DM Sans', Arial, sans-serif", color: '#9B9488', paddingTop: 12 }}
          />
          {/* Reference lines at key thresholds */}
          <ReferenceLine y={85} stroke="#4A7C6B" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={70} stroke="#C8A45A" strokeDasharray="4 4" strokeOpacity={0.3} />

          {/* Domain lines first (background) */}
          {domainSample.map((d, i) => {
            const domainName = lang === 'en' ? d.name_en : d.name_fr
            return (
              <Line
                key={domainName}
                type="monotone"
                dataKey={domainName}
                stroke={DOMAIN_COLORS[i % DOMAIN_COLORS.length]}
                strokeWidth={1.5}
                dot={{ r: 3, fill: DOMAIN_COLORS[i % DOMAIN_COLORS.length], strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                strokeOpacity={0.7}
              />
            )
          })}

          {/* Overall line on top — gold, thicker */}
          <Line
            type="monotone"
            dataKey={overallKey}
            stroke="#C8A45A"
            strokeWidth={3}
            dot={{ r: 5, fill: '#C8A45A', strokeWidth: 2, stroke: '#0D1B2A' }}
            activeDot={{ r: 7, fill: '#E8C87A' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
