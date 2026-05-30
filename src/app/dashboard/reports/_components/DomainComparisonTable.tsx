'use client'

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

const SCORE_COLOR = (pct: number | null) => {
  if (pct === null) return '#9B9488'
  if (pct >= 85) return '#4A7C6B'
  if (pct >= 70) return '#C8A45A'
  if (pct >= 50) return '#D4882A'
  return '#C0503A'
}

const SCORE_BG = (pct: number | null) => {
  if (pct === null) return 'transparent'
  if (pct >= 85) return 'rgba(74,124,107,0.12)'
  if (pct >= 70) return 'rgba(200,164,90,0.12)'
  if (pct >= 50) return 'rgba(212,136,42,0.12)'
  return 'rgba(192,80,58,0.12)'
}

// Show delta between two scores
const Delta = ({ current, previous }: { current: number | null; previous: number | null }) => {
  if (current === null || previous === null) return null
  const diff = Math.round((current - previous) * 10) / 10
  if (diff === 0) return <span style={{ color: '#9B9488', fontSize: 11 }}>—</span>
  const color = diff > 0 ? '#4A7C6B' : '#C0503A'
  const arrow = diff > 0 ? '▲' : '▼'
  return (
    <span style={{ color, fontSize: 11, marginLeft: 4 }}>
      {arrow} {Math.abs(diff)}
    </span>
  )
}

export default function DomainComparisonTable({ campaigns, lang }: Props) {
  const t = (en: string, fr: string) => lang === 'en' ? en : fr

  // Sort oldest → newest
  const sorted = [...campaigns].sort(
    (a, b) => new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime()
  )

  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const formatShort = (d: string | null) => {
    const date = d ?? null
    if (!date) return '—'
    return new Date(date).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: '2-digit' })
  }

  // Gather all domain keys from first campaign with domains
  const domainSample = sorted.find(c => c.domainScores.length > 0)?.domainScores ?? []

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr>
            <th style={{
              padding: '8px 12px', textAlign: 'left',
              fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: '#9B9488',
              background: '#162236', borderBottom: '1px solid #253549',
              whiteSpace: 'nowrap', minWidth: 140,
            }}>
              {t('Domain', 'Domaine')}
            </th>
            {sorted.map((c, i) => (
              <th key={c.id} style={{
                padding: '8px 12px', textAlign: 'center',
                fontSize: '0.6875rem', fontWeight: 600,
                color: '#9B9488', background: '#162236',
                borderBottom: '1px solid #253549', whiteSpace: 'nowrap',
              }}>
                {formatShort(c.visitEnd ?? c.publishedAt)}
                {i === sorted.length - 1 && (
                  <span style={{ display: 'block', color: '#C8A45A', fontSize: 10, marginTop: 2 }}>
                    {t('Latest', 'Dernier')}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Overall row */}
          <tr style={{ background: 'rgba(200,164,90,0.04)' }}>
            <td style={{
              padding: '10px 12px', color: '#C8A45A',
              fontWeight: 600, borderBottom: '1px solid #253549',
              fontSize: '0.8125rem',
            }}>
              {t('Overall', 'Score global')}
            </td>
            {sorted.map((c, i) => (
              <td key={c.id} style={{
                padding: '10px 12px', textAlign: 'center',
                borderBottom: '1px solid #253549',
              }}>
                <span style={{
                  display: 'inline-block',
                  background: SCORE_BG(c.overallPercent),
                  color: SCORE_COLOR(c.overallPercent),
                  fontWeight: 700, fontSize: '0.875rem',
                  padding: '3px 10px', borderRadius: 4,
                }}>
                  {c.overallPercent !== null ? `${c.overallPercent}%` : '—'}
                </span>
                {i > 0 && <Delta current={c.overallPercent} previous={sorted[i - 1].overallPercent} />}
              </td>
            ))}
          </tr>

          {/* Domain rows */}
          {domainSample.map((domain, rowIdx) => {
            const domainKey = domain.name_en
            const domainLabel = lang === 'en' ? domain.name_en : domain.name_fr
            return (
              <tr key={domainKey} style={{ background: rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                <td style={{
                  padding: '8px 12px', color: '#F4F1EC',
                  borderBottom: '1px solid #253549', fontSize: '0.8125rem',
                }}>
                  {domainLabel}
                </td>
                {sorted.map((c, i) => {
                  const match = c.domainScores.find(d => d.name_en === domainKey)
                  const pct = match?.score_percent ?? null
                  const prevMatch = i > 0 ? sorted[i - 1].domainScores.find(d => d.name_en === domainKey) : null
                  const prevPct = prevMatch?.score_percent ?? null
                  return (
                    <td key={c.id} style={{
                      padding: '8px 12px', textAlign: 'center',
                      borderBottom: '1px solid #253549',
                      color: SCORE_COLOR(pct), fontWeight: 500,
                    }}>
                      {pct !== null ? `${pct}%` : '—'}
                      {i > 0 && <Delta current={pct} previous={prevPct} />}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
