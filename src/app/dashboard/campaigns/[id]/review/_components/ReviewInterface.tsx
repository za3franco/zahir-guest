'use client'

import { useState } from 'react'
import type { User } from '@/types'
import styles from './ReviewInterface.module.css'
import ScoreDashboard from './ScoreDashboard'
import ResponsesView from './ResponsesView'
import ExecutiveSummaryEditor from './ExecutiveSummaryEditor'
import GenerateReportButton from './GenerateReportButton'

const T = {
  back: { en: '← Reports', fr: '← Rapports' },
  title: { en: 'Audit Review', fr: "Révision de l'audit" },
  tabs: {
    scores: { en: 'Scores', fr: 'Scores' },
    responses: { en: 'Responses', fr: 'Réponses' },
    summary: { en: 'Executive Summary', fr: 'Synthèse' },
  },
  meta: {
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    submitted: { en: 'Submitted', fr: 'Soumis le' },
    published: { en: 'Published', fr: 'Publié le' },
    template: { en: 'Template', fr: 'Modèle' },
  },
  noReport: { en: 'No scores available yet.', fr: 'Aucun score disponible.' },
}

interface Props {
  campaign: any
  report: any
  domains: any[]
  sections: any[]
  standards: any[]
  responses: any[]
  user: User
}

export default function ReviewInterface({
  campaign, report, domains, sections, standards, responses, user,
}: Props) {
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const [activeTab, setActiveTab] = useState<'scores' | 'responses' | 'summary'>('scores')
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const isPM = user.role === 'property_manager' || user.role === 'department_manager'
  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'

  const scores = report?.report_json ?? null
  const propertyName = campaign.property?.name ?? '—'
  const auditorName = campaign.auditor?.name ?? '—'
  const templateName = campaign.template?.name ?? '—'

  const submittedAt = campaign.submitted_at
    ? new Date(campaign.submitted_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const publishedAt = campaign.published_at
    ? new Date(campaign.published_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className={styles.page}>
      {/* Top nav */}
      <div className={styles.topNav}>
        <a href="/dashboard/campaigns" className={styles.backLink}>
          {t(T.back)}
        </a>
        {report && (
          <GenerateReportButton
            reportId={report.id}
            hasHtml={!!report.report_html}
            lang={lang}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <p className={styles.headerLabel}>{t(T.title)}</p>
          <h1 className={styles.campaignName}>{campaign.name}</h1>
        </div>
        {scores?.overall_percent != null && (
          <div className={styles.overallScore}>
            <span className={styles.overallScoreValue}>{scores.overall_percent}%</span>
            <span className={styles.overallScoreLabel}>
              {lang === 'en' ? 'Overall score' : 'Score global'}
            </span>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>{t(T.meta.property)}</span>
          <span className={styles.metaValue}>{propertyName}</span>
        </div>
        {!isPM && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t(T.meta.auditor)}</span>
            <span className={styles.metaValue}>{auditorName}</span>
          </div>
        )}
        {!isPM && submittedAt && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t(T.meta.submitted)}</span>
            <span className={styles.metaValue}>{submittedAt}</span>
          </div>
        )}
        {isPM && publishedAt && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t(T.meta.published)}</span>
            <span className={styles.metaValue}>{publishedAt}</span>
          </div>
        )}
        {!isPM && (
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>{t(T.meta.template)}</span>
            <span className={styles.metaValue}>{templateName}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['scores', 'responses', 'summary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
          >
            {t(T.tabs[tab])}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'scores' && (
          scores
            ? <ScoreDashboard scores={scores} lang={lang} />
            : <p className={styles.noData}>{t(T.noReport)}</p>
        )}
        {activeTab === 'responses' && (
          <ResponsesView
            domains={domains}
            sections={sections}
            standards={standards}
            responses={responses}
            lang={lang}
          />
        )}
        {activeTab === 'summary' && (
          <ExecutiveSummaryEditor
            campaignId={campaign.id}
            existingSummary={report?.executive_summary ?? ''}
            lang={lang}
            readOnly={isPM}
          />
        )}
      </div>
    </div>
  )
}
