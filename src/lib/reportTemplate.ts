/**
 * ZAHIR GUEST — HTML REPORT TEMPLATE v3
 * - Domain pages: visual section scorecard (no below list)
 * - Color-coded score pills + classification breakdown dots
 * - Appendix header fixed (no negative margins)
 * - Orphaned page header fixed with fully inline styles
 */

const CLASSIFICATION_LABELS: Record<string, { en: string; fr: string; short: string }> = {
  EFFICIENCY: { en: 'Efficiency', fr: 'Efficacité', short: 'EFF' },
  SERVICE: { en: 'Service', fr: 'Service', short: 'SVC' },
  SALES_OPPORTUNITY: { en: 'Sales', fr: 'Vente', short: 'SAL' },
  EMOTIONAL_INTELLIGENCE: { en: 'Emotional Int.', fr: 'Int. Émotionnelle', short: 'EI' },
  CLEANLINESS: { en: 'Cleanliness', fr: 'Propreté', short: 'CLN' },
  PRODUCT: { en: 'Product', fr: 'Produit', short: 'PRD' },
}

const EMOTIONAL_LABELS: Record<number, { en: string; fr: string }> = {
  5: { en: 'Pampered', fr: 'Choyé(e)' },
  4: { en: 'Delighted', fr: 'Ravi(e)' },
  3: { en: 'Content', fr: 'Satisfait(e)' },
  2: { en: 'Disappointed', fr: 'Déçu(e)' },
  1: { en: 'Frustrated', fr: 'Frustré(e)' },
}

function scoreColor(percent: number | null): string {
  if (percent === null) return '#9B9488'
  if (percent >= 85) return '#4A7C6B'
  if (percent >= 70) return '#C8A45A'
  if (percent >= 50) return '#D4882A'
  return '#C0503A'
}

function scoreBg(percent: number | null): string {
  if (percent === null) return 'rgba(155,148,136,0.1)'
  if (percent >= 85) return 'rgba(74,124,107,0.12)'
  if (percent >= 70) return 'rgba(200,164,90,0.12)'
  if (percent >= 50) return 'rgba(212,136,42,0.12)'
  return 'rgba(192,80,58,0.12)'
}

function scoreLabel(percent: number | null, lang: 'en' | 'fr'): string {
  if (percent === null) return 'N/A'
  if (percent >= 85) return lang === 'en' ? 'Excellent' : 'Excellent'
  if (percent >= 70) return lang === 'en' ? 'Good' : 'Bien'
  if (percent >= 50) return lang === 'en' ? 'Needs work' : 'À améliorer'
  return lang === 'en' ? 'Critical' : 'Critique'
}

function circleProgress(percent: number | null, size: number, strokeWidth: number): string {
  const r = (size / 2) - strokeWidth
  const circumference = 2 * Math.PI * r
  const offset = percent !== null ? circumference * (1 - percent / 100) : circumference
  const color = scoreColor(percent)
  const cx = size / 2
  const cy = size / 2
  const displayValue = percent !== null ? `${percent}%` : 'N/A'
  const fontSize = size > 100 ? '22px' : size > 60 ? '14px' : '11px'

  return `<div style="position:relative;width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position:absolute;top:0;left:0;transform:rotate(-90deg);">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e8e4de" stroke-width="${strokeWidth}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${circumference.toFixed(2)}"
        stroke-dashoffset="${offset.toFixed(2)}"
      />
    </svg>
    <div style="position:relative;z-index:1;text-align:center;line-height:1.1;">
      <div style="font-size:${fontSize};font-weight:700;color:${color};">${displayValue}</div>
    </div>
  </div>`
}

// Inline page header — avoids all CSS class rendering issues in print
function pageHeader(propertyName: string, dateEn: string): string {
  return `<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e8e4de;padding-bottom:10px;margin-bottom:24px;font-family:'DM Sans',Arial,sans-serif;">
    <span style="font-family:'Cormorant Garamond',serif;font-size:10pt;color:#9B9488;letter-spacing:0.06em;">Zahir Guest</span>
    <div style="font-size:8pt;color:#9B9488;text-align:right;line-height:1.5;">${propertyName}<br>${dateEn}</div>
  </div>`
}

// Classification breakdown for a section — mini colored pills
function classBreakdown(standards: any[]): string {
  const counts: Record<string, { below: number; total: number }> = {}
  for (const std of standards) {
    if (!std.performance_classification) continue
    if (!counts[std.performance_classification]) counts[std.performance_classification] = { below: 0, total: 0 }
    if (std.response === 'meet' || std.response === 'below') counts[std.performance_classification].total++
    if (std.response === 'below') counts[std.performance_classification].below++
  }

  const pills = Object.entries(counts)
    .filter(([, v]) => v.total > 0)
    .map(([key, v]) => {
      const pct = v.total > 0 ? Math.round((v.below / v.total) * 100) : 0
      const label = CLASSIFICATION_LABELS[key]?.short ?? key
      // Color based on failure rate: red if >50% fail, amber if >20%, green if low
      const bg = pct > 50 ? 'rgba(192,80,58,0.15)' : pct > 20 ? 'rgba(212,136,42,0.15)' : 'rgba(74,124,107,0.12)'
      const color = pct > 50 ? '#C0503A' : pct > 20 ? '#D4882A' : '#4A7C6B'
      const dot = pct > 50 ? '●' : pct > 20 ? '◑' : '○'
      return `<span style="display:inline-flex;align-items:center;gap:3px;background:${bg};border-radius:3px;padding:2px 5px;font-size:6.5pt;color:${color};font-weight:600;margin-right:3px;">${dot} ${label} ${v.below}/${v.total}</span>`
    })

  return pills.join('')
}

interface ReportData {
  campaign: any
  report: any
  scores: any
  tenantName: string
  logoUrl?: string | null
}

export function generateReportHtml(data: ReportData): string {
  const { campaign, report, scores, tenantName } = data
  const propertyName = campaign.property?.name ?? ''
  const propertyCity = campaign.property?.city ?? ''
  const propertyCountry = campaign.property?.country ?? ''
  const auditorName = campaign.auditor?.name ?? ''
  const templateName = campaign.template?.name ?? ''
  const templateTier = campaign.template?.tier ?? ''
  const auditDate = campaign.submitted_at
    ? new Date(campaign.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const auditDateEn = campaign.submitted_at
    ? new Date(campaign.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const executiveSummary = report.executive_summary ?? ''
  const overallPercent = scores.overall_percent
  const avgEmotional = scores.average_emotional_rating
  const emotionalLabel = avgEmotional ? EMOTIONAL_LABELS[Math.round(avgEmotional)] : null

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${propertyName} — Zahir Guest Audit Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    font-family: 'DM Sans', -apple-system, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1a1a2e;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @media screen {
    .print-fab {
      position: fixed; bottom: 32px; right: 32px;
      background: #C8A45A; color: #0D1B2A; border: none;
      border-radius: 50px; padding: 14px 28px;
      font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
      cursor: pointer; box-shadow: 0 4px 20px rgba(200,164,90,0.4);
      z-index: 9999; letter-spacing: 0.02em;
    }
    .print-fab:hover { opacity: 0.9; }
    body { background: #f5f2ed; }
    .cover, .page { margin: 0 auto; max-width: 794px; }
    .page { box-shadow: 0 2px 12px rgba(0,0,0,0.08); margin-bottom: 16px; }
  }

  @media print {
    @page { size: A4; margin: 0; }
    html, body { width: 210mm; }
    .print-fab { display: none !important; }
    .cover { width: 210mm; height: 297mm; page-break-after: always; page-break-inside: avoid; }
    .page { width: 210mm; page-break-after: always; box-shadow: none !important; margin: 0 !important; }
    .page:last-child { page-break-after: avoid; }
    .domain-page { page-break-before: always; }
    .section-row { page-break-inside: avoid; break-inside: avoid; }
    .appendix-group { page-break-inside: avoid; break-inside: avoid; }
    .appendix-table tbody tr { page-break-inside: avoid; break-inside: avoid; }
    .appendix-section-header { page-break-after: avoid; break-after: avoid; }
    p { orphans: 3; widows: 3; }
  }

  /* COVER */
  .cover {
    background: #0D1B2A;
    height: 297mm;
    display: flex;
    flex-direction: column;
    padding: 56px 60px;
    position: relative;
    overflow: hidden;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* PAGE */
  .page { background: #ffffff; padding: 40px 52px 48px; position: relative; }

  /* SUMMARY */
  .summary-body { font-size: 10.5pt; line-height: 1.95; color: #1a1a2e; white-space: pre-wrap; }

  /* SCORE DASHBOARD */
  .domain-score-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 28px; }
  .domain-score-card { border: 1px solid #e8e4de; border-radius: 8px; padding: 18px 14px; text-align: center; background: #fdfcfa; }

  /* CLASSIFICATION TABLE */
  .class-table { width: 100%; border-collapse: collapse; }
  .class-table td { padding: 6px 0; vertical-align: middle; }
  .class-label-cell { width: 180px; }
  .class-bar-bg { background: #f0ede8; border-radius: 3px; height: 7px; overflow: hidden; }
  .class-bar-fill { height: 100%; border-radius: 3px; }

  /* DOMAIN SECTION SCORECARD */
  .domain-cover {
    background: #0D1B2A;
    padding: 32px 52px 28px;
    margin: -40px -52px 28px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .section-scorecard { width: 100%; border-collapse: collapse; }

  .section-scorecard th {
    font-size: 7pt;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9B9488;
    font-weight: 600;
    padding: 6px 8px;
    border-bottom: 1px solid #e8e4de;
    text-align: left;
  }

  .section-scorecard td {
    padding: 10px 8px;
    border-bottom: 1px solid #f5f2ed;
    vertical-align: middle;
  }

  .section-scorecard tr:last-child td { border-bottom: none; }

  .score-pill {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: 700;
    white-space: nowrap;
  }

  .emotional-star { font-size: 8pt; color: #C8A45A; white-space: nowrap; }

  /* APPENDIX */
  .appendix-group { margin-bottom: 16px; }

  .appendix-domain-header {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13pt;
    color: #1a1a2e;
    padding-bottom: 5px;
    border-bottom: 2px solid #C8A45A;
    margin-bottom: 8px;
    margin-top: 16px;
  }

  .appendix-domain-header:first-child { margin-top: 0; }

  .appendix-section-header {
    font-size: 7.5pt;
    font-weight: 600;
    color: #1a1a2e;
    margin: 8px 0 3px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #f5f2ed;
    padding: 4px 7px;
    border-radius: 3px;
  }

  .appendix-table { width: 100%; border-collapse: collapse; font-size: 7.5pt; margin-bottom: 2px; }

  .appendix-table th {
    background: #fdfcfa;
    padding: 4px 7px;
    text-align: left;
    font-weight: 600;
    color: #9B9488;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 6.5pt;
    border-bottom: 1px solid #e8e4de;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .appendix-table td {
    padding: 4px 7px;
    border-bottom: 1px solid #f5f2ed;
    vertical-align: top;
    color: #1a1a2e;
    line-height: 1.4;
  }

  .appendix-table tr:last-child td { border-bottom: none; }

  .r-meet { color: #4A7C6B; font-weight: 700; font-size: 7pt; }
  .r-below { color: #D4882A; font-weight: 700; font-size: 7pt; }
  .r-na { color: #9B9488; font-weight: 700; font-size: 7pt; }
  .r-none { color: #c8c4be; font-size: 7pt; }
</style>
</head>
<body>

<button class="print-fab" onclick="window.print()">↓ Save as PDF</button>

<!-- ══ COVER ══ -->
<div class="cover">
  <div style="position:absolute;top:-180px;right:-180px;width:520px;height:520px;border-radius:50%;border:1px solid rgba(200,164,90,0.07);pointer-events:none;"></div>
  <div style="position:absolute;top:-80px;right:-80px;width:320px;height:320px;border-radius:50%;border:1px solid rgba(200,164,90,0.12);pointer-events:none;"></div>
  <div style="position:absolute;bottom:60px;left:-120px;width:360px;height:360px;border-radius:50%;border:1px solid rgba(200,164,90,0.05);pointer-events:none;"></div>

  <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
      <circle cx="20" cy="20" r="7" stroke="#C8A45A" stroke-width="1" stroke-opacity="0.5" fill="none"/>
      <circle cx="20" cy="20" r="13" stroke="#C8A45A" stroke-width="0.5" stroke-opacity="0.25" fill="none"/>
      <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
    </svg>
    <div>
      <div style="font-family:'Cormorant Garamond',serif;font-size:17pt;font-weight:400;color:#F4F1EC;letter-spacing:0.06em;line-height:1;">${tenantName ? 'Zahir Guest' : 'Zahir Guest'}</div>
      <div style="font-size:7.5pt;color:#9B9488;letter-spacing:0.12em;text-transform:uppercase;margin-top:2px;">${tenantName}</div>
    </div>
  </div>

  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:48px 0;position:relative;z-index:1;">
    <div style="font-size:8pt;text-transform:uppercase;letter-spacing:0.14em;color:#C8A45A;font-weight:600;margin-bottom:18px;">Mystery Guest Audit Report · Rapport d'Audit Mystère</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:38pt;font-weight:300;color:#F4F1EC;line-height:1.05;margin-bottom:10px;">${propertyName}</div>
    <div style="font-size:12pt;color:#9B9488;margin-bottom:8px;">${[propertyCity, propertyCountry].filter(Boolean).join(', ')}</div>
    ${templateTier ? `<div style="font-size:8.5pt;color:#C8A45A;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:44px;opacity:0.8;">${templateName}</div>` : '<div style="margin-bottom:44px;"></div>'}

    <div style="display:flex;align-items:center;gap:28px;padding:28px 32px;background:rgba(255,255,255,0.04);border:1px solid rgba(200,164,90,0.18);border-radius:10px;max-width:460px;">
      ${circleProgress(overallPercent, 110, 7)}
      <div style="flex:1;">
        <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.1em;color:#9B9488;margin-bottom:8px;display:block;">Overall Score · Score Global</div>
        <div style="font-size:9.5pt;color:#9B9488;line-height:1.9;">
          ${scores.total_meet} meet · ${scores.total_below} below · ${scores.total_na} N/A<br>
          ${scores.total_standards} standards evaluated
        </div>
        ${avgEmotional && emotionalLabel ? `<div style="font-size:10pt;color:#C8A45A;margin-top:8px;">★ ${avgEmotional} — ${emotionalLabel.en} / ${emotionalLabel.fr}</div>` : ''}
      </div>
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;border-top:1px solid rgba(255,255,255,0.08);padding-top:22px;position:relative;z-index:1;">
    <div style="font-size:8.5pt;color:#9B9488;line-height:1.9;">
      <strong style="color:#F4F1EC;">${propertyName}</strong><br>
      ${templateName}<br>
      ${auditorName ? `Auditor · Auditeur: ${auditorName}` : ''}
    </div>
    <div style="font-size:8.5pt;color:#9B9488;text-align:right;line-height:1.9;">
      ${auditDate}<br>${auditDateEn}<br>
      <span style="color:#C8A45A;">zahirguest.com</span>
    </div>
  </div>
</div>

${executiveSummary ? `
<!-- ══ EXECUTIVE SUMMARY ══ -->
<div class="page">
  ${pageHeader(propertyName, auditDateEn)}
  <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#C8A45A;font-weight:600;margin-bottom:4px;">Executive Summary · Synthèse Exécutive</div>
  <div style="font-family:'Cormorant Garamond',serif;font-size:24pt;font-weight:400;color:#1a1a2e;margin-bottom:4px;line-height:1.1;">Overview</div>
  <div style="width:36px;height:2px;background:#C8A45A;margin:10px 0 24px;"></div>
  <div class="summary-body">${executiveSummary.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</div>` : ''}

<!-- ══ SCORE DASHBOARD ══ -->
<div class="page">
  ${pageHeader(propertyName, auditDateEn)}
  <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#C8A45A;font-weight:600;margin-bottom:4px;">Score Dashboard · Tableau de Bord</div>
  <div style="font-family:'Cormorant Garamond',serif;font-size:24pt;font-weight:400;color:#1a1a2e;margin-bottom:4px;line-height:1.1;">Results at a Glance</div>
  <div style="width:36px;height:2px;background:#C8A45A;margin:10px 0 24px;"></div>

  <div class="domain-score-grid">
    ${(scores.domains ?? []).map((domain: any) => `
    <div class="domain-score-card">
      ${circleProgress(domain.score_percent, 68, 5)}
      <div style="font-family:'Cormorant Garamond',serif;font-size:11pt;color:#1a1a2e;margin-top:10px;margin-bottom:3px;line-height:1.2;">${domain.name_en}<br><span style="font-size:8pt;color:#9B9488;">${domain.name_fr}</span></div>
      <div style="font-size:7.5pt;color:#9B9488;">${domain.sections?.length ?? 0} sections</div>
    </div>`).join('')}
  </div>

  <div style="font-family:'Cormorant Garamond',serif;font-size:14pt;color:#1a1a2e;margin-bottom:12px;padding-top:6px;border-top:1px solid #e8e4de;">
    Performance by Classification · Par Classification
  </div>
  <table class="class-table">
    ${Object.entries(scores.classification_breakdown ?? {}).map(([key, value]: [string, any]) => {
      if (!value || value.total === 0) return ''
      const label = CLASSIFICATION_LABELS[key]
      const pct = value.meet_percent
      const color = scoreColor(pct)
      return `<tr>
        <td class="class-label-cell">
          <span style="font-size:8.5pt;color:#1a1a2e;display:block;">${label?.en ?? key}</span>
          <span style="font-size:7.5pt;color:#9B9488;display:block;">${label?.fr ?? key}</span>
        </td>
        <td style="padding:0 14px !important;">
          <div class="class-bar-bg"><div class="class-bar-fill" style="width:${pct ?? 0}%;background:${color};"></div></div>
        </td>
        <td style="font-size:8.5pt;font-weight:600;width:44px;text-align:right;color:${color};">${pct !== null ? `${pct}%` : 'N/A'}</td>
        <td style="font-size:7.5pt;color:#9B9488;width:52px;text-align:right;">${value.meet ?? 0}/${value.scored ?? 0}</td>
      </tr>`
    }).join('')}
  </table>
</div>

<!-- ══ DOMAIN SECTION SCORECARDS ══ -->
${(scores.domains ?? []).map((domain: any) => {
  const domainScore = domain.score_percent
  const domainColor = scoreColor(domainScore)

  return `
<div class="page domain-page">
  <!-- Domain cover band — fully inline, no negative margins -->
  <div class="domain-cover">
    <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.14em;color:#C8A45A;font-weight:600;margin-bottom:6px;">Domain · Domaine</div>
    <div style="font-family:'Cormorant Garamond',serif;font-size:22pt;font-weight:300;color:#F4F1EC;line-height:1.1;margin-bottom:8px;">${domain.name_en} / ${domain.name_fr}</div>
    <div style="font-size:12pt;font-weight:600;color:${domainColor};">
      ${domainScore !== null ? `${domainScore}%` : 'N/A'} — ${scoreLabel(domainScore, 'en')} / ${scoreLabel(domainScore, 'fr')}
    </div>
  </div>

  <!-- Section scorecard table -->
  <table class="section-scorecard">
    <thead>
      <tr>
        <th style="width:30%;">Section</th>
        <th style="width:14%;text-align:center;">Score</th>
        <th style="width:18%;">Counts</th>
        <th style="width:14%;text-align:center;">Emotional</th>
        <th style="width:24%;">Classification breakdown</th>
      </tr>
    </thead>
    <tbody>
      ${(domain.sections ?? []).map((section: any) => {
        const pct = section.score_percent
        const color = scoreColor(pct)
        const bg = scoreBg(pct)
        const label = scoreLabel(pct, 'en')
        const emotLabel = section.emotional_rating ? EMOTIONAL_LABELS[section.emotional_rating] : null
        const sEn = (section.name_en ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        const sFr = (section.name_fr ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        const breakdown = classBreakdown(section.standards ?? [])

        return `
      <tr class="section-row">
        <td>
          <div style="font-size:9pt;font-weight:500;color:#1a1a2e;line-height:1.3;">${sEn}</div>
          <div style="font-size:7.5pt;color:#9B9488;line-height:1.3;">${sFr}</div>
        </td>
        <td style="text-align:center;">
          <span class="score-pill" style="background:${bg};color:${color};">
            ${pct !== null ? `${pct}%` : 'N/A'}
          </span>
          <div style="font-size:6.5pt;color:${color};margin-top:2px;">${label}</div>
        </td>
        <td>
          <div style="font-size:7.5pt;color:#1a1a2e;line-height:1.7;">
            <span style="color:#4A7C6B;font-weight:600;">${section.meet ?? 0} ✓</span> &nbsp;
            <span style="color:#D4882A;font-weight:600;">${section.below ?? 0} ✗</span> &nbsp;
            <span style="color:#9B9488;">${section.na ?? 0} N/A</span>
          </div>
          <div style="font-size:6.5pt;color:#9B9488;">${section.scored ?? 0} scored</div>
        </td>
        <td style="text-align:center;">
          ${section.emotional_rating ? `
          <div class="emotional-star">★ ${section.emotional_rating}</div>
          <div style="font-size:6.5pt;color:#9B9488;line-height:1.3;">${emotLabel?.en ?? ''}<br>${emotLabel?.fr ?? ''}</div>
          ` : '<div style="font-size:7pt;color:#c8c4be;">—</div>'}
        </td>
        <td>
          <div style="line-height:1.8;">${breakdown || '<span style="font-size:7pt;color:#c8c4be;">No scored standards</span>'}</div>
        </td>
      </tr>`
      }).join('')}
    </tbody>
  </table>
</div>`
}).join('')}

<!-- ══ APPENDIX DOMAIN PAGES ══ -->
${(scores.domains ?? []).map((domain: any, domainIndex: number) => `
<div class="page domain-page">
  ${pageHeader(propertyName, auditDateEn)}
  ${domainIndex === 0 ? `
  <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#C8A45A;font-weight:600;margin-bottom:2px;">Appendix · Annexe</div>
  <div style="font-family:'Cormorant Garamond',serif;font-size:20pt;font-weight:300;color:#1a1a2e;line-height:1.1;margin-bottom:6px;">Full Scorecard</div>
  <div style="width:36px;height:2px;background:#C8A45A;margin-bottom:16px;"></div>
  ` : ''}
  <div style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.12em;color:#C8A45A;font-weight:600;margin-bottom:2px;">Appendix · ${domain.name_en}</div>
  <div style="font-family:'Cormorant Garamond',serif;font-size:16pt;font-weight:400;color:#1a1a2e;margin-bottom:6px;padding-bottom:6px;border-bottom:2px solid #C8A45A;">${domain.name_en} / ${domain.name_fr}</div>

  ${(domain.sections ?? []).map((section: any) => {
    const sEn = (section.name_en ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const sFr = (section.name_fr ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    return `
  <div class="appendix-section-header">${sEn} / ${sFr}</div>
  <table class="appendix-table">
    <thead>
      <tr>
        <th style="width:58%;">Standard (EN / FR)</th>
        <th style="width:13%;">Classification</th>
        <th style="width:9%;">Result</th>
        <th style="width:20%;">Auditor note</th>
      </tr>
    </thead>
    <tbody>
      ${(section.standards ?? []).map((std: any) => {
        const rClass = std.response === 'meet' ? 'r-meet' : std.response === 'below' ? 'r-below' : std.response === 'na' ? 'r-na' : 'r-none'
        const rLabel = std.response === 'meet' ? 'MEET' : std.response === 'below' ? 'BELOW' : std.response === 'na' ? 'N/A' : '—'
        const qEn = (std.question_en ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        const qFr = (std.question_fr ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        const note = (std.auditor_note ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        const rowBg = std.response === 'below' ? 'background:#fffaf5;' : std.response === 'meet' ? 'background:#f9fcfa;' : ''
        return `<tr style="${rowBg}">
          <td>${qEn}<br><span style="color:#9B9488;font-size:7pt;">${qFr}</span></td>
          <td style="color:#9B9488;font-size:7pt;">${std.performance_classification ?? ''}</td>
          <td class="${rClass}">${rLabel}</td>
          <td style="color:#9B9488;font-style:italic;">${note}</td>
        </tr>`
      }).join('')}
    </tbody>
  </table>`
  }).join('')}
</div>`).join('')}

</body>
</html>`
}
