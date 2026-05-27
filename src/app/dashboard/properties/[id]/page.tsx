export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import { notFound } from 'next/navigation'
import type { Property, Campaign } from '@/types'
import { STATUS_LABELS } from '@/types'
import styles from './property.module.css'

const T = {
  backToProperties: { en: '← Properties', fr: '← Établissements' },
  edit: { en: 'Edit', fr: 'Modifier' },
  archive: { en: 'Archive', fr: 'Archiver' },
  restore: { en: 'Restore', fr: 'Restaurer' },
  sections: {
    details: { en: 'Property details', fr: "Détails de l'établissement" },
    campaigns: { en: 'Audit campaigns', fr: "Campagnes d'audit" },
  },
  fields: {
    category: { en: 'Category', fr: 'Catégorie' },
    type: { en: 'Type', fr: 'Type' },
    city: { en: 'City', fr: 'Ville' },
    country: { en: 'Country', fr: 'Pays' },
    contact: { en: 'Contact', fr: 'Contact' },
    manager: { en: 'Property manager', fr: 'Directeur' },
    added: { en: 'Added', fr: 'Ajouté le' },
  },
  noCampaigns: { en: 'No campaigns for this property yet.', fr: 'Aucune campagne pour cet établissement.' },
  createCampaign: { en: '+ Create campaign', fr: '+ Créer une campagne' },
  archivedNotice: { en: 'This property is archived.', fr: 'Cet établissement est archivé.' },
  cols: {
    campaign: { en: 'Campaign', fr: 'Campagne' },
    auditor: { en: 'Auditor', fr: 'Auditeur' },
    status: { en: 'Status', fr: 'Statut' },
    date: { en: 'Date', fr: 'Date' },
  },
}

const CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  '5_star': { en: '5 Stars', fr: '5 Étoiles' },
  '4_star': { en: '4 Stars', fr: '4 Étoiles' },
  '3_star': { en: '3 Stars', fr: '3 Étoiles' },
  '2_star': { en: '2 Stars', fr: '2 Étoiles' },
  '1_star': { en: '1 Star', fr: '1 Étoile' },
  unrated: { en: 'Unrated', fr: 'Non classé' },
}

const TYPE_LABELS: Record<string, { en: string; fr: string }> = {
  hotel: { en: 'Hotel', fr: 'Hôtel' },
  riad: { en: 'Riad', fr: 'Riad' },
  resort: { en: 'Resort', fr: 'Resort' },
  guesthouse: { en: 'Guesthouse', fr: "Maison d'hôtes" },
  apartment: { en: 'Apartment', fr: 'Appartement' },
  other: { en: 'Other', fr: 'Autre' },
}

const PROPERTY_TYPE_ICONS: Record<string, string> = {
  hotel: '🏨', riad: '🏯', resort: '🌴', guesthouse: '🏠', apartment: '🏢', other: '🏛️',
}

export default async function PropertyDetailPage({
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

  const { data: property } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', user.tenant_id)
    .single()

  if (!property) notFound()

  const { data: campaigns } = await supabaseAdmin
    .from('campaigns')
    .select('*, auditor:users!campaigns_auditor_user_id_fkey(name)')
    .eq('property_id', params.id)
    .eq('tenant_id', user.tenant_id)
    .order('created_at', { ascending: false })

  const { data: manager } = property.property_manager_user_id
    ? await supabaseAdmin
        .from('users')
        .select('name, email')
        .eq('id', property.property_manager_user_id)
        .single()
    : { data: null }

  const p = property as Property
  const campaignList = (campaigns ?? []) as unknown as Campaign[]

  return (
    <div className={styles.page}>
      <div className={styles.topNav}>
        <a href="/dashboard/properties" className={styles.backLink}>{t(T.backToProperties)}</a>
        <div className={styles.topActions}>
          <a href={`/dashboard/properties/${p.id}/edit`} className="btn btn-ghost btn-sm">
            {t(T.edit)}
          </a>
          <form action={`/api/properties/${p.id}/archive`} method="POST" style={{ display: 'inline' }}>
            <input type="hidden" name="archived" value={p.is_archived ? '0' : '1'} />
            <button type="submit" className="btn btn-ghost btn-sm">
              {p.is_archived ? t(T.restore) : t(T.archive)}
            </button>
          </form>
        </div>
      </div>

      <div className={styles.propertyHeader}>
        <div className={styles.propertyIconLarge}>
          {PROPERTY_TYPE_ICONS[p.type] ?? '🏨'}
        </div>
        <div>
          <h1 className={styles.propertyName}>{p.name}</h1>
          <div className={styles.propertyMeta}>
            <span className="badge badge-gold">
              {t(CATEGORY_LABELS[p.category] ?? { en: p.category, fr: p.category })}
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaText}>
              {t(TYPE_LABELS[p.type] ?? { en: p.type, fr: p.type })}
            </span>
            {p.city && (
              <>
                <span className={styles.metaDot}>·</span>
                <span className={styles.metaText}>{p.city}, {p.country}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {p.is_archived && (
        <div className={styles.archivedNotice}>
          {t(T.archivedNotice)}
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>{t(T.sections.details)}</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.category)}</dt>
              <dd>{t(CATEGORY_LABELS[p.category] ?? { en: p.category, fr: p.category })}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.type)}</dt>
              <dd>{t(TYPE_LABELS[p.type] ?? { en: p.type, fr: p.type })}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.city)}</dt>
              <dd>{p.city ?? '—'}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>{t(T.fields.country)}</dt>
              <dd>{p.country}</dd>
            </div>
            {p.contact_name && (
              <div className={styles.detailRow}>
                <dt>{t(T.fields.contact)}</dt>
                <dd>
                  {p.contact_name}
                  {p.contact_email && <><br /><span className={styles.email}>{p.contact_email}</span></>}
                </dd>
              </div>
            )}
            {manager && (
              <div className={styles.detailRow}>
                <dt>{t(T.fields.manager)}</dt>
                <dd>{manager.name}</dd>
              </div>
            )}
            <div className={styles.detailRow}>
              <dt>{t(T.fields.added)}</dt>
              <dd>
                {new Date(p.created_at).toLocaleDateString(dateLocale, {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>

        <div className={styles.campaignsSection}>
          <div className={styles.campaignsSectionHeader}>
            <h2 className={styles.cardTitle}>{t(T.sections.campaigns)}</h2>
            <a href={`/dashboard/campaigns/new?property_id=${p.id}`} className="btn btn-primary btn-sm">
              {t(T.createCampaign)}
            </a>
          </div>

          {campaignList.length === 0 ? (
            <div className={styles.emptyCampaigns}>
              <p>{t(T.noCampaigns)}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>{t(T.cols.campaign)}</th>
                    <th>{t(T.cols.auditor)}</th>
                    <th>{t(T.cols.status)}</th>
                    <th>{t(T.cols.date)}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignList.map(c => {
                    const s = STATUS_LABELS[c.status]
                    const colorClass = {
                      '#9B9488': 'badge-sand',
                      '#C8A45A': 'badge-gold',
                      '#E8C87A': 'badge-gold',
                      '#D4882A': 'badge-amber',
                      '#4A7C6B': 'badge-sage',
                    }[s?.color ?? ''] ?? 'badge-sand'
                    return (
                      <tr key={c.id}>
                        <td>
                          <a href={`/campaigns/${c.id}`} className={styles.campaignLink}>
                            {c.name}
                          </a>
                        </td>
                        <td className={styles.metaCell}>
                          {(c.auditor as any)?.name ?? '—'}
                        </td>
                        <td>
                          <span className={`badge ${colorClass}`}>
                            {lang === 'en' ? s?.en : s?.fr}
                          </span>
                        </td>
                        <td className={styles.metaCell}>
                          {new Date(c.created_at).toLocaleDateString(dateLocale, {
                            day: 'numeric', month: 'short',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
