export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import { STATUS_LABELS } from '@/types'
import styles from './campaign.module.css'

const T = {
  back: { en: '← Campaigns', fr: '← Campagnes' },
  edit: { en: 'Edit', fr: 'Modifier' },
  sections: {
    details: { en: 'Campaign details', fr: 'Détails de la campagne' },
    timeline: { en: 'Timeline', fr: 'Chronologie' },
  },
  fields: {
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    template: { en: 'Questionnaire', fr: 'Questionnaire' },
    status: { en: 'Status', fr: 'Statut' },
    visitStart: { en: 'Visit from', fr: 'Visite du' },
    visitEnd: { en: 'Visit until', fr: 'Visite au' },
    created: { en: 'Created', fr: 'Créée le' },
    submitted: { en: 'Submitted', fr: 'Soumise le' },
    published: { en: 'Published', fr: 'Publiée le' },
    adminNotes: { en: 'Admin notes', fr: 'Notes administrateur' },
  },
  notAssigned: { en: 'Not assigned', fr: 'Non assigné' },
  noDate: { en: 'Not set', fr: 'Non définie' },
  actions: {
    startReview: { en: 'Start review', fr: 'Commencer la révision' },
    finalize: { en: 'Finalize', fr: 'Finaliser' },
    publish: { en: 'Publish report', fr: 'Publier le rapport' },
    viewAudit: { en: 'View audit responses', fr: 'Voir les réponses' },
  },
  statusFlow: {
    assigned: { en: 'Waiting for auditor to begin', fr: 'En attente de l\'auditeur' },
    in_progress: { en: 'Audit in progress', fr: 'Audit en cours' },
    submitted: { en: 'Submitted — ready for review', fr: 'Soumis — prêt pour révision' },
    under_review: { en: 'Under review by admin', fr: 'En cours de révision' },
    finalized: { en: 'Finalized — ready to publish', fr: 'Finalisé — prêt à publier' },
    published: { en: 'Published', fr: 'Publié' },
  },
}

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: campaign } = await supabaseAdmin
    .from('campaigns')
    .select(`
      *,
      property:properties(id, name, city, category),
      auditor:users!campaigns_auditor_user_id_fkey(id, name, email),
      template:questionnaire_templates(id, name, tier)
    `)
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!campaign) notFound()

  const s = STATUS_LABELS[campaign.status as keyof typeof STATUS_LABELS]
  const colorClass = {
    '#9B9488': 'badge-sand',
    '#C8A45A': 'badge-gold',
    '#E8C87A': 'badge-gold',
    '#D4882A': 'badge-amber',
    '#4A7C6B': 'badge-sage',
  }[s?.color ?? ''] ?? 'badge-sand'

  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : t(T.noDate)

  return (
    <div className={styles.page}>
      <div className={styles.topNav}>
        <a href="/dashboard/campaigns" className={styles.backLink}>{t(T.back)}</a>
        <div className={styles.topActions}>
          <a href={`/dashboard/campaigns/${campaign.id}/edit`} className="btn btn-ghost btn-sm">
            {t(T.edit)}
          </a>
        </div>
      </div>

      <div className={styles.campaignHeader}>
        <div>
          <h1 className={styles.campaignName}>{campaign.name}</h1>
          <div className={styles.campaignMeta}>
            <span className={`badge ${colorClass}`}>
              {lang === 'en' ? s?.en : s?.fr}
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>
              {t(T.statusFlow[campaign.status as keyof typeof T.statusFlow] ?? { en: campaign.status, fr: campaign.status })}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Details card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t(T.sections.details)}</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.property)}</dt>
              <dd>
                {(campaign.property as any)?.name ?? '—'}
                {(campaign.property as any)?.city && (
                  <span className={styles.detailSub}> · {(campaign.property as any).city}</span>
                )}
              </dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.auditor)}</dt>
              <dd>{(campaign.auditor as any)?.name ?? t(T.notAssigned)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.template)}</dt>
              <dd>{(campaign.template as any)?.name ?? '—'}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.visitStart)}</dt>
              <dd>{formatDate(campaign.visit_window_start)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.visitEnd)}</dt>
              <dd>{formatDate(campaign.visit_window_end)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.created)}</dt>
              <dd>{formatDate(campaign.created_at)}</dd>
            </div>
            {campaign.submitted_at && (
              <div className={styles.detailRow}>
                <dt>{t(T.fields.submitted)}</dt>
                <dd>{formatDate(campaign.submitted_at)}</dd>
              </div>
            )}
            {campaign.published_at && (
              <div className={styles.detailRow}>
                <dt>{t(T.fields.published)}</dt>
                <dd>{formatDate(campaign.published_at)}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions panel */}
        <div className={styles.actionsPanel}>
          <CampaignStatusActions
            campaignId={campaign.id}
            status={campaign.status}
            auditorId={(campaign.auditor as any)?.id ?? null}
            lang={lang}
          />

          {campaign.admin_notes && (
            <div className={styles.notesCard}>
              <h3 className={styles.notesTitle}>{t(T.fields.adminNotes)}</h3>
              <p className={styles.notesText}>{campaign.admin_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
