/**
 * ZAHIR GUEST — HTML REPORT TEMPLATE
 * Generates a full bilingual branded report from scored data
 */

const CLASSIFICATION_LABELS: Record<string, { en: string; fr: string }> = {
  EFFICIENCY: { en: 'Efficiency', fr: 'Efficacité' },
  SERVICE: { en: 'Service', fr: 'Service' },
  SALES_OPPORTUNITY: { en: 'Sales Opportunity', fr: 'Opportunité Commerciale' },
  EMOTIONAL_INTELLIGENCE: { en: 'Emotional Intelligence', fr: 'Intelligence Émotionnelle' },
  CLEANLINESS: { en: 'Cleanliness', fr: 'Propreté' },
  PRODUCT: { en: 'Product', fr: 'Produit' },
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

function scoreLabel(percent: number | null, lang: 'en' | 'fr'): string {
  if (percent === null) return lang === 'en' ? 'N/A' : 'N/A'
  if (percent >= 85) return lang === 'en' ? 'Excellent' : 'Excellent'
  if (percent >= 70) return lang === 'en' ? 'Good' : 'Bien'
  if (percent >= 50) return lang === 'en' ? 'Needs improvement' : 'À améliorer'
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

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#253549" stroke-width="${strokeWidth}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${offset}"
      />
    </svg>
    <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
      <div style="font-size:${size > 100 ? '24px' : '16px'};font-weight:700;color:${color};line-height:1;">${displayValue}</div>
    </div>
  `
}

interface ReportData {
  campaign: any
  report: any
  scores: any
  tenantName: string
  logoUrl?: string | null
}

export function generateReportHtml(data: ReportData): string {
  const { campaign, report, scores, tenantName, logoUrl } = data
  const propertyName = campaign.property?.name ?? ''
  const propertyCity = campaign.property?.city ?? ''
  const propertyCountry = campaign.property?.country ?? ''
  const auditorName = campaign.auditor?.name ?? ''
  const templateName = campaign.template?.name ?? ''
  const auditDate = campaign.submitted_at
    ? new Date(campaign.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const auditDateEn = campaign.submitted_at
    ? new Date(campaign.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''
  const executiveSummary = report.executive_summary ?? ''
  const overallPercent = scores.overall_percent
  const avgEmotional = scores.average_emotional_rating
  const emotionalLabel = avgEmotional
    ? EMOTIONAL_LABELS[Math.round(avgEmotional)]
    : null

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${propertyName} — Zahir Guest Audit Report</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --deep-ink: #0D1B2A;
    --midnight: #162236;
    --slate: #1E2F45;
    --gold: #C8A45A;
    --brass: #E8C87A;
    --ivory: #F4F1EC;
    --sand: #9B9488;
    --sage: #4A7C6B;
    --amber: #D4882A;
    --terracotta: #C0503A;
    --border: #253549;
  }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    color: #1a1a1a;
    font-size: 10pt;
    line-height: 1.6;
  }

  /* ── COVER PAGE ── */
  .cover {
    background: var(--deep-ink);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 60px;
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }

  .cover::before {
    content: '';
    position: absolute;
    top: -200px;
    right: -200px;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    border: 1px solid rgba(200,164,90,0.08);
  }

  .cover::after {
    content: '';
    position: absolute;
    top: -100px;
    right: -100px;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    border: 1px solid rgba(200,164,90,0.12);
  }

  .cover-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: auto;
  }

  .cover-brand-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 18pt;
    font-weight: 400;
    color: var(--ivory);
    letter-spacing: 0.05em;
  }

  .cover-brand-tenant {
    font-size: 9pt;
    color: var(--sand);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  .cover-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 0;
  }

  .cover-label {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 16px;
  }

  .cover-property {
    font-family: 'Cormorant Garamond', serif;
    font-size: 42pt;
    font-weight: 300;
    color: var(--ivory);
    line-height: 1.1;
    margin-bottom: 12px;
  }

  .cover-location {
    font-size: 13pt;
    color: var(--sand);
    margin-bottom: 48px;
  }

  .cover-score-block {
    display: flex;
    align-items: center;
    gap: 32px;
    padding: 32px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,164,90,0.2);
    border-radius: 12px;
    max-width: 480px;
  }

  .cover-score-ring {
    position: relative;
    flex-shrink: 0;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cover-score-details {
    flex: 1;
  }

  .cover-score-label {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sand);
    margin-bottom: 8px;
  }

  .cover-score-stats {
    font-size: 10pt;
    color: var(--sand);
    line-height: 1.8;
  }

  .cover-score-emotional {
    font-size: 11pt;
    color: var(--gold);
    margin-top: 8px;
  }

  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid var(--border);
    padding-top: 24px;
  }

  .cover-footer-left {
    font-size: 9pt;
    color: var(--sand);
    line-height: 1.8;
  }

  .cover-footer-right {
    font-size: 9pt;
    color: var(--sand);
    text-align: right;
    line-height: 1.8;
  }

  /* ── CONTENT PAGES ── */
  .page {
    padding: 48px 56px;
    page-break-after: always;
  }

  .page:last-child {
    page-break-after: avoid;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e0dbd4;
    padding-bottom: 16px;
    margin-bottom: 32px;
  }

  .page-header-brand {
    font-family: 'Cormorant Garamond', serif;
    font-size: 11pt;
    color: #9B9488;
    letter-spacing: 0.05em;
  }

  .page-header-property {
    font-size: 9pt;
    color: #9B9488;
  }

  /* ── SECTION HEADINGS ── */
  .section-heading {
    font-family: 'Cormorant Garamond', serif;
    font-size: 22pt;
    font-weight: 400;
    color: #0D1B2A;
    margin-bottom: 8px;
  }

  .section-subheading {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 4px;
  }

  .section-divider {
    width: 40px;
    height: 2px;
    background: var(--gold);
    margin: 12px 0 28px;
  }

  /* ── EXECUTIVE SUMMARY ── */
  .summary-text {
    font-size: 11pt;
    line-height: 1.9;
    color: #2a2a2a;
    white-space: pre-wrap;
  }

  /* ── SCORE DASHBOARD ── */
  .score-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-bottom: 32px;
  }

  .score-card {
    border: 1px solid #e0dbd4;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
  }

  .score-card-ring {
    position: relative;
    width: 80px;
    height: 80px;
    margin: 0 auto 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .score-card-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 12pt;
    color: #0D1B2A;
    margin-bottom: 4px;
  }

  .score-card-sections {
    font-size: 8pt;
    color: #9B9488;
  }

  /* ── CLASSIFICATION BARS ── */
  .classification-table {
    width: 100%;
    border-collapse: collapse;
  }

  .classification-table td {
    padding: 8px 0;
    vertical-align: middle;
  }

  .classification-name {
    font-size: 9pt;
    color: #2a2a2a;
    width: 200px;
  }

  .classification-bar-cell {
    padding: 0 16px !important;
  }

  .classification-bar-bg {
    background: #f0ede8;
    border-radius: 4px;
    height: 8px;
    overflow: hidden;
  }

  .classification-bar-fill {
    height: 100%;
    border-radius: 4px;
  }

  .classification-pct {
    font-size: 9pt;
    font-weight: 600;
    width: 48px;
    text-align: right;
  }

  .classification-count {
    font-size: 8pt;
    color: #9B9488;
    width: 60px;
    text-align: right;
  }

  /* ── DOMAIN SECTIONS ── */
  .domain-page-header {
    background: var(--deep-ink);
    color: var(--ivory);
    padding: 40px 56px;
    margin: -48px -56px 32px;
  }

  .domain-label {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 8px;
  }

  .domain-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28pt;
    font-weight: 300;
    color: var(--ivory);
    margin-bottom: 4px;
  }

  .domain-score-inline {
    font-size: 14pt;
    font-weight: 600;
    margin-top: 12px;
  }

  .section-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #f0ede8;
    gap: 16px;
  }

  .section-row-left {
    flex: 1;
  }

  .section-row-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13pt;
    color: #0D1B2A;
    margin-bottom: 4px;
  }

  .section-row-stats {
    font-size: 8pt;
    color: #9B9488;
  }

  .section-row-right {
    text-align: right;
    flex-shrink: 0;
  }

  .section-score-value {
    font-size: 16pt;
    font-weight: 700;
    line-height: 1;
  }

  .section-emotional {
    font-size: 8pt;
    color: #9B9488;
    margin-top: 4px;
  }

  /* ── BELOW STANDARDS ── */
  .below-list {
    margin-top: 16px;
  }

  .below-item {
    padding: 12px 16px;
    border-left: 3px solid var(--amber);
    margin-bottom: 8px;
    background: #fdf9f4;
    border-radius: 0 6px 6px 0;
  }

  .below-item-critical {
    border-left-color: var(--terracotta) !important;
    background: #fdf5f3 !important;
  }

  .below-question {
    font-size: 9pt;
    color: #2a2a2a;
    line-height: 1.5;
    margin-bottom: 4px;
  }

  .below-note {
    font-size: 8pt;
    color: #9B9488;
    font-style: italic;
  }

  .below-meta {
    font-size: 7.5pt;
    color: #C8A45A;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  /* ── APPENDIX ── */
  .appendix-section {
    margin-bottom: 24px;
    page-break-inside: avoid;
  }

  .appendix-domain {
    font-family: 'Cormorant Garamond', serif;
    font-size: 14pt;
    color: #0D1B2A;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e0dbd4;
  }

  .appendix-section-name {
    font-size: 10pt;
    font-weight: 600;
    color: #2a2a2a;
    margin: 12px 0 6px;
  }

  .appendix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8pt;
  }

  .appendix-table th {
    background: #f5f2ed;
    padding: 6px 8px;
    text-align: left;
    font-weight: 600;
    color: #9B9488;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 7pt;
  }

  .appendix-table td {
    padding: 6px 8px;
    border-bottom: 1px solid #f0ede8;
    vertical-align: top;
    color: #2a2a2a;
  }

  .appendix-table tr:last-child td {
    border-bottom: none;
  }

  .badge-meet { color: #4A7C6B; font-weight: 700; font-size: 7pt; letter-spacing: 0.04em; }
  .badge-below { color: #D4882A; font-weight: 700; font-size: 7pt; letter-spacing: 0.04em; }
  .badge-na { color: #9B9488; font-weight: 700; font-size: 7pt; }
  .badge-unanswered { color: #c0bbb5; font-size: 7pt; }

  /* ── PRINT ── */
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { page-break-after: always; }
    .no-break { page-break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- ══════════════════════════════════════════════════════
     COVER PAGE
══════════════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-brand">
    <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
      <circle cx="20" cy="20" r="7" stroke="#C8A45A" stroke-width="1" stroke-opacity="0.5" fill="none"/>
      <circle cx="20" cy="20" r="13" stroke="#C8A45A" stroke-width="0.5" stroke-opacity="0.25" fill="none"/>
      <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
    </svg>
    <div>
      <div class="cover-brand-name">Zahir Guest</div>
      <div class="cover-brand-tenant">${tenantName}</div>
    </div>
  </div>

  <div class="cover-main">
    <div class="cover-label">Mystery Guest Audit Report · Rapport d'Audit Mystère</div>
    <div class="cover-property">${propertyName}</div>
    <div class="cover-location">${[propertyCity, propertyCountry].filter(Boolean).join(', ')}</div>

    <div class="cover-score-block">
      <div class="cover-score-ring">
        ${circleProgress(overallPercent, 120, 8)}
      </div>
      <div class="cover-score-details">
        <div class="cover-score-label">Overall Score · Score Global</div>
        <div class="cover-score-stats">
          ${scores.total_meet} meet · ${scores.total_below} below · ${scores.total_na} N/A<br>
          ${scores.total_standards} standards evaluated
        </div>
        ${avgEmotional && emotionalLabel ? `
        <div class="cover-score-emotional">
          ★ ${avgEmotional} — ${emotionalLabel.en} / ${emotionalLabel.fr}
        </div>` : ''}
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-left">
      <strong style="color:#F4F1EC;">${propertyName}</strong><br>
      ${templateName}<br>
      ${auditorName ? `Auditor: ${auditorName}` : ''}
    </div>
    <div class="cover-footer-right">
      ${auditDate}<br>
      ${auditDateEn}<br>
      <span style="color:#C8A45A;">zahirguest.com</span>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     EXECUTIVE SUMMARY
══════════════════════════════════════════════════════ -->
${executiveSummary ? `
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">Zahir Guest</span>
    <span class="page-header-property">${propertyName}</span>
  </div>
  <div class="section-subheading">Executive Summary · Synthèse Exécutive</div>
  <div class="section-heading">Overview</div>
  <div class="section-divider"></div>
  <div class="summary-text">${executiveSummary.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</div>` : ''}

<!-- ══════════════════════════════════════════════════════
     SCORE DASHBOARD
══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">Zahir Guest</span>
    <span class="page-header-property">${propertyName}</span>
  </div>
  <div class="section-subheading">Score Dashboard · Tableau de Bord</div>
  <div class="section-heading">Results at a Glance</div>
  <div class="section-divider"></div>

  <div class="score-grid">
    ${scores.domains?.map((domain: any) => `
    <div class="score-card">
      <div class="score-card-ring">
        ${circleProgress(domain.score_percent, 80, 6)}
      </div>
      <div class="score-card-name">${domain.name_en}<br><span style="font-size:9pt;color:#9B9488;">${domain.name_fr}</span></div>
      <div class="score-card-sections">${domain.sections?.length} sections</div>
    </div>`).join('')}
  </div>

  <!-- Classification breakdown -->
  <div style="margin-top:32px;">
    <div style="font-family:'Cormorant Garamond',serif;font-size:15pt;color:#0D1B2A;margin-bottom:16px;">
      Performance by Classification · Par Classification
    </div>
    <table class="classification-table">
      ${Object.entries(scores.classification_breakdown ?? {}).map(([key, value]: [string, any]) => {
        if (value.total === 0) return ''
        const label = CLASSIFICATION_LABELS[key]
        const pct = value.meet_percent
        const color = scoreColor(pct)
        return `
        <tr>
          <td class="classification-name">${label?.en ?? key}<br><span style="font-size:8pt;color:#9B9488;">${label?.fr ?? key}</span></td>
          <td class="classification-bar-cell">
            <div class="classification-bar-bg">
              <div class="classification-bar-fill" style="width:${pct ?? 0}%;background:${color};"></div>
            </div>
          </td>
          <td class="classification-pct" style="color:${color};">${pct !== null ? `${pct}%` : 'N/A'}</td>
          <td class="classification-count">${value.meet}/${value.scored}</td>
        </tr>`
      }).join('')}
    </table>
  </div>
</div>

<!-- ══════════════════════════════════════════════════════
     DOMAIN SECTIONS
══════════════════════════════════════════════════════ -->
${scores.domains?.map((domain: any) => `
<div class="page">
  <div class="domain-page-header">
    <div class="domain-label">Domain · Domaine</div>
    <div class="domain-title">${domain.name_en} / ${domain.name_fr}</div>
    <div class="domain-score-inline" style="color:${scoreColor(domain.score_percent)};">
      ${domain.score_percent !== null ? `${domain.score_percent}%` : 'N/A'} — ${scoreLabel(domain.score_percent, 'en')} / ${scoreLabel(domain.score_percent, 'fr')}
    </div>
  </div>

  ${domain.sections?.map((section: any) => {
    const belowStandards = section.standards?.filter((s: any) => s.response === 'below') ?? []
    const emotLabel = section.emotional_rating ? EMOTIONAL_LABELS[section.emotional_rating] : null
    return `
    <div class="no-break">
      <div class="section-row">
        <div class="section-row-left">
          <div class="section-row-name">${section.name_en} / ${section.name_fr}</div>
          <div class="section-row-stats">
            ${section.meet} meet · ${section.below} below · ${section.na} N/A · ${section.scored} scored
          </div>
        </div>
        <div class="section-row-right">
          <div class="section-score-value" style="color:${scoreColor(section.score_percent)};">
            ${section.score_percent !== null ? `${section.score_percent}%` : 'N/A'}
          </div>
          ${emotLabel ? `<div class="section-emotional">★ ${section.emotional_rating} ${emotLabel.en} / ${emotLabel.fr}</div>` : ''}
        </div>
      </div>

      ${belowStandards.length > 0 ? `
      <div class="below-list">
        ${belowStandards.map((std: any) => `
        <div class="below-item ${std.is_critical ? 'below-item-critical' : ''}">
          <div class="below-meta">${std.is_critical ? '⚑ CRITICAL · CRITIQUE — ' : ''}${std.performance_classification}</div>
          <div class="below-question">${std.question_en}<br><span style="color:#9B9488;">${std.question_fr}</span></div>
          ${std.auditor_note ? `<div class="below-note">"${std.auditor_note}"</div>` : ''}
        </div>`).join('')}
      </div>` : ''}
    </div>`
  }).join('')}
</div>`).join('')}

<!-- ══════════════════════════════════════════════════════
     APPENDIX — FULL SCORECARD
══════════════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">Zahir Guest</span>
    <span class="page-header-property">${propertyName}</span>
  </div>
  <div class="section-subheading">Appendix · Annexe</div>
  <div class="section-heading">Full Scorecard</div>
  <div class="section-divider"></div>

  ${scores.domains?.map((domain: any) => `
  <div class="appendix-section">
    <div class="appendix-domain">${domain.name_en} / ${domain.name_fr}</div>
    ${domain.sections?.map((section: any) => `
    <div class="appendix-section-name">${section.name_en} / ${section.name_fr}</div>
    <table class="appendix-table">
      <thead>
        <tr>
          <th style="width:60%;">Standard</th>
          <th style="width:12%;">Classification</th>
          <th style="width:10%;">Response</th>
          <th style="width:18%;">Note</th>
        </tr>
      </thead>
      <tbody>
        ${section.standards?.map((std: any) => {
          const responseClass = std.response === 'meet' ? 'badge-meet' :
            std.response === 'below' ? 'badge-below' :
            std.response === 'na' ? 'badge-na' : 'badge-unanswered'
          const responseLabel = std.response === 'meet' ? 'MEET' :
            std.response === 'below' ? 'BELOW' :
            std.response === 'na' ? 'N/A' : '—'
          return `
          <tr>
            <td>${std.question_en}<br><span style="color:#9B9488;font-size:7.5pt;">${std.question_fr}</span></td>
            <td style="font-size:7.5pt;color:#9B9488;">${std.performance_classification}</td>
            <td class="${responseClass}">${responseLabel}</td>
            <td style="color:#9B9488;font-style:italic;">${std.auditor_note ?? ''}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`).join('')}
  </div>`).join('')}
</div>

</body>
</html>`
}
