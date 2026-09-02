export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import { STATUS_LABELS } from '@/types'
import styles from './campaign.module.css'
import CampaignStatusActions from './_components/CampaignStatusActions'
import DeleteCampaignButton from './_components/DeleteCampaignButton'

const T = {
  back: { en: '← Campaigns', fr: '← Campagnes' },
  edit: { en: 'Edit', fr: 'Modifier' },
  sections: { details: { en: 'Campaign details', fr: 'Détails de la campagne' } },
  fields: {
    property: { en: 'Property', fr: 'Établissement' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    template: { en: 'Questionnaire', fr: 'Questionnaire' },
    visitStart: { en: 'Visit from', fr: 'Visite du' },
    visitEnd: { en: 'Visit until', fr: 'Visite au' },
    created: { en: 'Created', fr: 'Créée le' },
    submitted: { en: 'Submitted', fr: 'Soumise le' },
    published: { en: 'Published', fr: 'Publiée le' },
    adminNotes: { en: 'Admin notes', fr: 'Notes administrateur' },
  },
  notAssigned: { en: 'Not assigned', fr: 'Non assigné' },
  noDate: { en: 'Not set', fr: 'Non définie' },
  statusFlow: {
    assigned: { en: 'Waiting for auditor to begin', fr: "En attente de l'auditeur" },
    in_progress: { en: 'Audit in progress', fr: 'Audit en cours' },
    submitted: { en: 'Submitted — ready for review', fr: 'Soumis — prêt pour révision' },
    under_review: { en: 'Under review by admin', fr: 'En cours de révision' },
    finalized: { en: 'Finalized — ready to publish', fr: 'Finalisé — prêt à publier' },
    published: { en: 'Published', fr: 'Publié' },
  },
}

const EDITABLE_STATUSES = ['assigned']

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await requireUser()
  const isPM = user.role === 'property_manager' || user.role === 'department_manager'

  // PM: redirect straight to review page
  if (isPM) {
    redirect(`/dashboard/campaigns/${params.id}/review`)
  }

  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const dateLocale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const isAdmin = user.role === 'tenant_admin' || user.role === 'super_admin'

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
  const formatDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })
    : t(T.noDate)

  const canEdit = EDITABLE_STATUSES.includes(campaign.status)

  return (
    <div className={styles.page}>
      <div className={styles.topNav}>
        <a href="/dashboard/campaigns" className={styles.backLink}>{t(T.back)}</a>
        <div className={styles.topActions}>
          {canEdit && (
            <a href={`/dashboard/campaigns/${campaign.id}/edit`} className="btn btn-ghost btn-sm">
              {t(T.edit)}
            </a>
          )}
          {isAdmin && (
            <DeleteCampaignButton campaignId={campaign.id} status={campaign.status} lang={lang} />
          )}
        </div>
      </div>

      <div className={styles.campaignHeader}>
        <div>
          <h1 className={styles.campaignName}>{campaign.name}</h1>
          <div className={styles.campaignMeta}>
            <span className="badge badge-sand">{lang === 'en' ? s?.en : s?.fr}</span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>
              {t(T.statusFlow[campaign.status as keyof typeof T.statusFlow] ?? { en: campaign.status, fr: campaign.status })}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
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
            {campaign.admin_notes && (
              <div className={styles.detailRow}>
                <dt>{t(T.fields.adminNotes)}</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{campaign.admin_notes}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className={styles.actionsPanel}>
          <CampaignStatusActions
            campaignId={campaign.id}
            status={campaign.status}
            auditorId={(campaign.auditor as any)?.id ?? null}
            lang={lang}
          />
        </div>
      </div>
    </div>
  )
}
