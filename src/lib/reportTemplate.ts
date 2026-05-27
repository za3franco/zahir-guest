/**
 * ZAHIR GUEST — HTML REPORT TEMPLATE
 * Generates a full bilingual branded report from scored data
 * Print-optimised: clean page breaks, no orphans, proper A4 layout
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
  if (percent === null) return 'N/A'
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
  const fontSize = size > 100 ? '22px' : size > 60 ? '14px' : '11px'

  return `<div style="position:relative;width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center;">
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

  /* ── RESET ── */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── VARIABLES ── */
  :root {
    --deep-ink: #0D1B2A;
    --gold: #C8A45A;
    --ivory: #F4F1EC;
    --sand: #9B9488;
    --sage: #4A7C6B;
    --amber: #D4882A;
    --terracotta: #C0503A;
    --border-light: #e8e4de;
    --border-dark: #253549;
    --text-primary: #1a1a2e;
    --text-secondary: #5a5a6a;
  }

  /* ── BASE ── */
  html, body {
    font-family: 'DM Sans', -apple-system, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: var(--text-primary);
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── SCREEN: show print button ── */
  @media screen {
    .print-fab {
      position: fixed;
      bottom: 32px;
      right: 32px;
      background: var(--gold);
      color: var(--deep-ink);
      border: none;
      border-radius: 50px;
      padding: 14px 28px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(200,164,90,0.4);
      z-index: 9999;
      letter-spacing: 0.02em;
    }
    .print-fab:hover { opacity: 0.9; }

    body { background: #f5f2ed; }

    .cover { margin: 0 auto; max-width: 794px; }
    .page { margin: 16px auto; max-width: 794px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  }

  /* ── PRINT ── */
  @media print {
    @page {
      size: A4;
      margin: 0;
    }
    @page :first { margin: 0; }

    html, body {
      width: 210mm;
      height: 297mm;
    }

    .print-fab { display: none !important; }

    .cover {
      width: 210mm;
      height: 297mm;
      page-break-after: always;
      page-break-inside: avoid;
    }

    .page {
      width: 210mm;
      min-height: 297mm;
      page-break-after: always;
      page-break-inside: avoid;
      box-shadow: none !important;
      margin: 0 !important;
    }

    .page:last-child { page-break-after: avoid; }

    .domain-page { page-break-before: always; }

    .section-block {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .below-item {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .appendix-section {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .appendix-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Prevent orphaned headings */
    h1, h2, h3, .section-row-name, .appendix-domain {
      page-break-after: avoid;
      break-after: avoid;
    }
  }

  /* ── COVER ── */
  .cover {
    background: var(--deep-ink);
    height: 297mm;
    display: flex;
    flex-direction: column;
    padding: 56px 60px;
    position: relative;
    overflow: hidden;
  }

  .cover-decoration-1 {
    position: absolute;
    top: -180px; right: -180px;
    width: 520px; height: 520px;
    border-radius: 50%;
    border: 1px solid rgba(200,164,90,0.07);
    pointer-events: none;
  }

  .cover-decoration-2 {
    position: absolute;
    top: -80px; right: -80px;
    width: 320px; height: 320px;
    border-radius: 50%;
    border: 1px solid rgba(200,164,90,0.12);
    pointer-events: none;
  }

  .cover-decoration-3 {
    position: absolute;
    bottom: 60px; left: -120px;
    width: 360px; height: 360px;
    border-radius: 50%;
    border: 1px solid rgba(200,164,90,0.05);
    pointer-events: none;
  }

  .cover-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
  }

  .cover-brand-text { display: flex; flex-direction: column; gap: 2px; }

  .cover-brand-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 17pt;
    font-weight: 400;
    color: var(--ivory);
    letter-spacing: 0.06em;
    line-height: 1;
  }

  .cover-brand-tenant {
    font-size: 7.5pt;
    color: var(--sand);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .cover-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px 0;
    position: relative;
    z-index: 1;
  }

  .cover-audit-label {
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 18px;
  }

  .cover-property-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 38pt;
    font-weight: 300;
    color: var(--ivory);
    line-height: 1.05;
    margin-bottom: 10px;
  }

  .cover-location {
    font-size: 12pt;
    color: var(--sand);
    margin-bottom: 8px;
  }

  .cover-tier {
    font-size: 8.5pt;
    color: var(--gold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 44px;
    opacity: 0.8;
  }

  .cover-score-block {
    display: flex;
    align-items: center;
    gap: 28px;
    padding: 28px 32px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(200,164,90,0.18);
    border-radius: 10px;
    max-width: 460px;
  }

  .cover-score-info { flex: 1; }

  .cover-score-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--sand);
    margin-bottom: 8px;
  }

  .cover-score-stats {
    font-size: 9.5pt;
    color: var(--sand);
    line-height: 1.9;
  }

  .cover-score-emotional {
    font-size: 10pt;
    color: var(--gold);
    margin-top: 8px;
  }

  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 22px;
    position: relative;
    z-index: 1;
  }

  .cover-footer-col {
    font-size: 8.5pt;
    color: var(--sand);
    line-height: 1.9;
  }

  .cover-footer-col strong { color: var(--ivory); }
  .cover-footer-col .accent { color: var(--gold); }

  /* ── PAGE LAYOUT ── */
  .page {
    background: #ffffff;
    padding: 44px 52px 52px;
    position: relative;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--border-light);
    padding-bottom: 12px;
    margin-bottom: 28px;
  }

  .page-header-brand {
    font-family: 'Cormorant Garamond', serif;
    font-size: 10pt;
    color: var(--sand);
    letter-spacing: 0.06em;
  }

  .page-header-right {
    font-size: 8pt;
    color: var(--sand);
    text-align: right;
    line-height: 1.5;
  }

  /* ── SECTION HEADINGS ── */
  .section-kicker {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 4px;
  }

  .section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24pt;
    font-weight: 400;
    color: var(--text-primary);
    margin-bottom: 4px;
    line-height: 1.1;
  }

  .section-rule {
    width: 36px;
    height: 2px;
    background: var(--gold);
    margin: 10px 0 24px;
  }

  /* ── EXECUTIVE SUMMARY ── */
  .summary-body {
    font-size: 10.5pt;
    line-height: 1.95;
    color: var(--text-primary);
    white-space: pre-wrap;
  }

  /* ── SCORE DASHBOARD ── */
  .domain-score-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-bottom: 32px;
  }

  .domain-score-card {
    border: 1px solid var(--border-light);
    border-radius: 8px;
    padding: 18px 14px;
    text-align: center;
    background: #fdfcfa;
  }

  .domain-score-card-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 11pt;
    color: var(--text-primary);
    margin-top: 10px;
    margin-bottom: 3px;
    line-height: 1.2;
  }

  .domain-score-card-sub {
    font-size: 7.5pt;
    color: var(--sand);
  }

  /* ── CLASSIFICATION TABLE ── */
  .classification-section-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 14pt;
    color: var(--text-primary);
    margin-bottom: 14px;
    padding-top: 8px;
    border-top: 1px solid var(--border-light);
  }

  .class-table { width: 100%; border-collapse: collapse; }

  .class-table td { padding: 7px 0; vertical-align: middle; }

  .class-label-cell { width: 180px; }

  .class-label-en { font-size: 8.5pt; color: var(--text-primary); display: block; }
  .class-label-fr { font-size: 7.5pt; color: var(--sand); display: block; }

  .class-bar-cell { padding: 0 14px !important; }

  .class-bar-bg {
    background: #f0ede8;
    border-radius: 3px;
    height: 7px;
    overflow: hidden;
  }

  .class-bar-fill { height: 100%; border-radius: 3px; }

  .class-pct {
    font-size: 8.5pt;
    font-weight: 600;
    width: 44px;
    text-align: right;
  }

  .class-count {
    font-size: 7.5pt;
    color: var(--sand);
    width: 52px;
    text-align: right;
  }

  /* ── DOMAIN PAGE HEADER ── */
  .domain-header-bar {
    background: var(--deep-ink);
    margin: -44px -52px 28px;
    padding: 36px 52px 32px;
  }

  .domain-header-kicker {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--gold);
    font-weight: 600;
    margin-bottom: 8px;
  }

  .domain-header-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 26pt;
    font-weight: 300;
    color: var(--ivory);
    line-height: 1.1;
    margin-bottom: 10px;
  }

  .domain-header-score {
    font-size: 13pt;
    font-weight: 600;
  }

  /* ── SECTION ROWS ── */
  .section-block {
    padding: 14px 0;
    border-bottom: 1px solid #f2efe9;
  }

  .section-block:last-child { border-bottom: none; }

  .section-meta-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
  }

  .section-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 12.5pt;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .section-name-fr {
    font-size: 9pt;
    color: var(--sand);
    display: block;
    margin-top: 1px;
  }

  .section-stats-row {
    font-size: 7.5pt;
    color: var(--sand);
    margin-top: 3px;
  }

  .section-score-col {
    text-align: right;
    flex-shrink: 0;
  }

  .section-score-pct {
    font-size: 15pt;
    font-weight: 700;
    line-height: 1;
    display: block;
  }

  .section-emotional {
    font-size: 7.5pt;
    color: var(--sand);
    margin-top: 3px;
  }

  /* ── BELOW STANDARDS ── */
  .below-list { margin-top: 10px; }

  .below-item {
    padding: 10px 14px;
    border-left: 3px solid var(--amber);
    margin-bottom: 6px;
    background: #fdf9f4;
    border-radius: 0 5px 5px 0;
  }

  .below-item-critical {
    border-left-color: var(--terracotta) !important;
    background: #fdf5f3 !important;
  }

  .below-classification {
    font-size: 7pt;
    color: var(--gold);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 3px;
    font-weight: 600;
  }

  .below-classification-critical {
    color: var(--terracotta) !important;
  }

  .below-q-en {
    font-size: 8.5pt;
    color: var(--text-primary);
    line-height: 1.45;
    margin-bottom: 2px;
  }

  .below-q-fr {
    font-size: 7.5pt;
    color: var(--sand);
    line-height: 1.4;
    margin-bottom: 3px;
  }

  .below-note {
    font-size: 7.5pt;
    color: var(--text-secondary);
    font-style: italic;
  }

  /* ── APPENDIX ── */
  .appendix-domain {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13pt;
    color: var(--text-primary);
    margin-bottom: 6px;
    padding-bottom: 5px;
    border-bottom: 1px solid var(--border-light);
    margin-top: 16px;
  }

  .appendix-domain:first-child { margin-top: 0; }

  .appendix-section-name {
    font-size: 8.5pt;
    font-weight: 600;
    color: var(--text-primary);
    margin: 10px 0 5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .appendix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.5pt;
    margin-bottom: 4px;
  }

  .appendix-table th {
    background: #f5f2ed;
    padding: 5px 7px;
    text-align: left;
    font-weight: 600;
    color: var(--sand);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 6.5pt;
    border-bottom: 1px solid var(--border-light);
  }

  .appendix-table td {
    padding: 5px 7px;
    border-bottom: 1px solid #f5f2ed;
    vertical-align: top;
    color: var(--text-primary);
    line-height: 1.4;
  }

  .appendix-table tr:last-child td { border-bottom: none; }
  .appendix-table tr:nth-child(even) td { background: #fdfcfa; }

  .r-meet { color: #4A7C6B; font-weight: 700; letter-spacing: 0.04em; }
  .r-below { color: #D4882A; font-weight: 700; letter-spacing: 0.04em; }
  .r-na { color: #9B9488; font-weight: 700; }
  .r-none { color: #c8c4be; }
</style>
</head>
<body>

<!-- Print button (screen only) -->
<button class="print-fab" onclick="window.print()">
  ↓ Save as PDF
</button>

<!-- ══ COVER ══════════════════════════════════════════════ -->
<div class="cover">
  <div class="cover-decoration-1"></div>
  <div class="cover-decoration-2"></div>
  <div class="cover-decoration-3"></div>

  <div class="cover-brand">
    <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="3" fill="#C8A45A"/>
      <circle cx="20" cy="20" r="7" stroke="#C8A45A" stroke-width="1" stroke-opacity="0.5" fill="none"/>
      <circle cx="20" cy="20" r="13" stroke="#C8A45A" stroke-width="0.5" stroke-opacity="0.25" fill="none"/>
      <line x1="20" y1="4" x2="20" y2="10" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="20" y1="30" x2="20" y2="36" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="4" y1="20" x2="10" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
      <line x1="30" y1="20" x2="36" y2="20" stroke="#C8A45A" stroke-width="1.5" stroke-opacity="0.6" stroke-linecap="round"/>
    </svg>
    <div class="cover-brand-text">
      <div class="cover-brand-name">Zahir Guest</div>
      <div class="cover-brand-tenant">${tenantName}</div>
    </div>
  </div>

  <div class="cover-main">
    <div class="cover-audit-label">Mystery Guest Audit Report · Rapport d'Audit Mystère</div>
    <div class="cover-property-name">${propertyName}</div>
    <div class="cover-location">${[propertyCity, propertyCountry].filter(Boolean).join(', ')}</div>
    ${templateTier ? `<div class="cover-tier">${templateName}</div>` : ''}

    <div class="cover-score-block">
      ${circleProgress(overallPercent, 110, 7)}
      <div class="cover-score-info">
        <div class="cover-score-label">Overall Score · Score Global</div>
        <div class="cover-score-stats">
          ${scores.total_meet} meet · ${scores.total_below} below · ${scores.total_na} N/A<br>
          ${scores.total_standards} standards evaluated
        </div>
        ${avgEmotional && emotionalLabel ? `
        <div class="cover-score-emotional">★ ${avgEmotional} — ${emotionalLabel.en} / ${emotionalLabel.fr}</div>` : ''}
      </div>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-footer-col">
      <strong>${propertyName}</strong><br>
      ${templateName}<br>
      ${auditorName ? `Auditor · Auditeur: ${auditorName}` : ''}
    </div>
    <div class="cover-footer-col" style="text-align:right;">
      ${auditDate}<br>
      ${auditDateEn}<br>
      <span class="accent">zahirguest.com</span>
    </div>
  </div>
</div>

${executiveSummary ? `
<!-- ══ EXECUTIVE SUMMARY ══════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">Zahir Guest</span>
    <div class="page-header-right">${propertyName}<br>${auditDateEn}</div>
  </div>
  <div class="section-kicker">Executive Summary · Synthèse Exécutive</div>
  <div class="section-title">Overview</div>
  <div class="section-rule"></div>
  <div class="summary-body">${executiveSummary.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</div>` : ''}

<!-- ══ SCORE DASHBOARD ════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">Zahir Guest</span>
    <div class="page-header-right">${propertyName}<br>${auditDateEn}</div>
  </div>
  <div class="section-kicker">Score Dashboard · Tableau de Bord</div>
  <div class="section-title">Results at a Glance</div>
  <div class="section-rule"></div>

  <div class="domain-score-grid">
    ${(scores.domains ?? []).map((domain: any) => `
    <div class="domain-score-card">
      ${circleProgress(domain.score_percent, 72, 5)}
      <div class="domain-score-card-name">${domain.name_en}<br><span style="font-size:8pt;color:#9B9488;">${domain.name_fr}</span></div>
      <div class="domain-score-card-sub">${domain.sections?.length ?? 0} sections</div>
    </div>`).join('')}
  </div>

  <div class="classification-section-title">Performance by Classification · Par Classification</div>
  <table class="class-table">
    ${Object.entries(scores.classification_breakdown ?? {}).map(([key, value]: [string, any]) => {
      if (!value || value.total === 0) return ''
      const label = CLASSIFICATION_LABELS[key]
      const pct = value.meet_percent
      const color = scoreColor(pct)
      return `<tr>
        <td class="class-label-cell">
          <span class="class-label-en">${label?.en ?? key}</span>
          <span class="class-label-fr">${label?.fr ?? key}</span>
        </td>
        <td class="class-bar-cell">
          <div class="class-bar-bg">
            <div class="class-bar-fill" style="width:${pct ?? 0}%;background:${color};"></div>
          </div>
        </td>
        <td class="class-pct" style="color:${color};">${pct !== null ? `${pct}%` : 'N/A'}</td>
        <td class="class-count">${value.meet ?? 0}/${value.scored ?? 0}</td>
      </tr>`
    }).join('')}
  </table>
</div>

<!-- ══ DOMAIN SECTIONS ════════════════════════════════════ -->
${(scores.domains ?? []).map((domain: any) => `
<div class="page domain-page">
  <div class="page-header" style="margin-top:0;">
    <span class="page-header-brand">Zahir Guest</span>
    <div class="page-header-right">${propertyName}<br>${auditDateEn}</div>
  </div>
  <div class="domain-header-bar">
    <div class="domain-header-kicker">Domain · Domaine</div>
    <div class="domain-header-name">${domain.name_en} / ${domain.name_fr}</div>
    <div class="domain-header-score" style="color:${scoreColor(domain.score_percent)};">
      ${domain.score_percent !== null ? `${domain.score_percent}%` : 'N/A'} — ${scoreLabel(domain.score_percent, 'en')} / ${scoreLabel(domain.score_percent, 'fr')}
    </div>
  </div>

  ${(domain.sections ?? []).map((section: any) => {
    const belowStandards = (section.standards ?? []).filter((s: any) => s.response === 'below')
    const emotLabel = section.emotional_rating ? EMOTIONAL_LABELS[section.emotional_rating] : null
    return `
  <div class="section-block">
    <div class="section-meta-row">
      <div>
        <div class="section-name">
          ${section.name_en}
          <span class="section-name-fr">${section.name_fr}</span>
        </div>
        <div class="section-stats-row">
          ${section.meet ?? 0} meet · ${section.below ?? 0} below · ${section.na ?? 0} N/A · ${section.scored ?? 0} scored
        </div>
      </div>
      <div class="section-score-col">
        <span class="section-score-pct" style="color:${scoreColor(section.score_percent)};">
          ${section.score_percent !== null ? `${section.score_percent}%` : 'N/A'}
        </span>
        ${emotLabel ? `<div class="section-emotional">★ ${section.emotional_rating} ${emotLabel.en} / ${emotLabel.fr}</div>` : ''}
      </div>
    </div>
    ${belowStandards.length > 0 ? `
    <div class="below-list">
      ${belowStandards.map((std: any) => `
      <div class="below-item ${std.is_critical ? 'below-item-critical' : ''}">
        <div class="below-classification ${std.is_critical ? 'below-classification-critical' : ''}">
          ${std.is_critical ? '⚑ CRITICAL · CRITIQUE — ' : ''}${std.performance_classification}
        </div>
        <div class="below-q-en">${(std.question_en ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        <div class="below-q-fr">${(std.question_fr ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
        ${std.auditor_note ? `<div class="below-note">"${std.auditor_note.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}"</div>` : ''}
      </div>`).join('')}
    </div>` : ''}
  </div>`
  }).join('')}
</div>`).join('')}

<!-- ══ APPENDIX ════════════════════════════════════════════ -->
<div class="page">
  <div class="page-header">
    <span class="page-header-brand">Zahir Guest</span>
    <div class="page-header-right">${propertyName}<br>${auditDateEn}</div>
  </div>
  <div class="section-kicker">Appendix · Annexe</div>
  <div class="section-title">Full Scorecard</div>
  <div class="section-rule"></div>

  ${(scores.domains ?? []).map((domain: any) => `
  <div class="appendix-section">
    <div class="appendix-domain">${domain.name_en} / ${domain.name_fr}</div>
    ${(domain.sections ?? []).map((section: any) => `
    <div class="appendix-section-name">${section.name_en} / ${section.name_fr}</div>
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
          return `<tr>
            <td>${qEn}<br><span style="color:#9B9488;font-size:7pt;">${qFr}</span></td>
            <td style="color:#9B9488;font-size:7pt;">${std.performance_classification ?? ''}</td>
            <td class="${rClass}">${rLabel}</td>
            <td style="color:#9B9488;font-style:italic;">${note}</td>
          </tr>`
        }).join('')}
      </tbody>
    </table>`).join('')}
  </div>`).join('')}
</div>

</body>
</html>`
}
