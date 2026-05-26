export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import type { Property } from '@/types'
import styles from './properties.module.css'

const T = {
  title: { en: 'Properties', fr: 'Établissements' },
  subtitle: { en: 'Manage your hotel properties and establishments.', fr: 'Gérez vos hôtels et établissements.' },
  addProperty: { en: '+ Add property', fr: '+ Ajouter un établissement' },
  empty: { en: 'No properties yet.', fr: "Aucun établissement pour l'instant." },
  emptyHint: { en: 'Add your first property to start creating audit campaigns.', fr: 'Ajoutez votre premier établissement pour commencer à créer des campagnes.' },
  archived: { en: 'Show archived', fr: 'Voir les archivés' },
  cols: {
    name: { en: 'Property', fr: 'Établissement' },
    category: { en: 'Category', fr: 'Catégorie' },
    type: { en: 'Type', fr: 'Type' },
    city: { en: 'City', fr: 'Ville' },
    contact: { en: 'Contact', fr: 'Contact' },
    actions: { en: 'Actions', fr: 'Actions' },
  },
  edit: { en: 'Edit', fr: 'Modifier' },
  archive: { en: 'Archive', fr: 'Archiver' },
  unarchive: { en: 'Restore', fr: 'Restaurer' },
  showingArchived: { en: 'Showing archived properties', fr: 'Affichage des établissements archivés' },
  backToActive: { en: '← Active properties', fr: '← Établissements actifs' },
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

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: { archived?: string }
}) {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (key: { en: string; fr: string }) => key[lang]
  const showArchived = searchParams.archived === '1'

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data } = await supabaseAdmin
    .from('properties')
    .select('*')
    .eq('tenant_id', user.tenant_id)
    .eq('is_archived', showArchived)
    .order('name')

  const properties: Property[] = (data ?? []) as Property[]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
        <a href="/dashboard/properties/new" className="btn btn-primary">
          {t(T.addProperty)}
        </a>
      </div>

      {showArchived && (
        <div className={styles.archivedBanner}>
          <span>{t(T.showingArchived)}</span>
          <a href="/properties" className={styles.archivedBack}>{t(T.backToActive)}</a>
        </div>
      )}

      {properties.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🏨</div>
          <p className={styles.emptyText}>{t(T.empty)}</p>
          <p className={styles.emptyHint}>{t(T.emptyHint)}</p>
          {!showArchived && (
            <a href="/dashboard/properties/new" className="btn btn-secondary">
              {t(T.addProperty)}
            </a>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t(T.cols.name)}</th>
                <th>{t(T.cols.category)}</th>
                <th>{t(T.cols.type)}</th>
                <th>{t(T.cols.city)}</th>
                <th>{t(T.cols.contact)}</th>
                <th>{t(T.cols.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {properties.map(p => (
                <tr key={p.id}>
                  <td>
                    <a href={`/properties/${p.id}`} className={styles.propertyName}>
                      <span className={styles.propertyIcon}>{PROPERTY_TYPE_ICONS[p.type] ?? '🏨'}</span>
                      {p.name}
                    </a>
                  </td>
                  <td>
                    <span className="badge badge-gold">
                      {t(CATEGORY_LABELS[p.category] ?? { en: p.category, fr: p.category })}
                    </span>
                  </td>
                  <td className={styles.meta}>
                    {t(TYPE_LABELS[p.type] ?? { en: p.type, fr: p.type })}
                  </td>
                  <td className={styles.meta}>{p.city ?? '—'}</td>
                  <td className={styles.meta}>
                    {p.contact_name
                      ? (
                        <span>
                          {p.contact_name}
                          {p.contact_email && <><br /><span className={styles.email}>{p.contact_email}</span></>}
                        </span>
                      )
                      : '—'}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <a href={`/properties/${p.id}/edit`} className="btn btn-ghost btn-sm">
                        {t(T.edit)}
                      </a>
                      <form action={`/api/properties/${p.id}/archive`} method="POST" style={{ display: 'inline' }}>
                        <input type="hidden" name="archived" value={showArchived ? '0' : '1'} />
                        <button type="submit" className="btn btn-ghost btn-sm">
                          {showArchived ? t(T.unarchive) : t(T.archive)}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showArchived && (
        <div className={styles.archivedLink}>
          <a href="/properties?archived=1" className={styles.archivedLinkText}>
            {t(T.archived)}
          </a>
        </div>
      )}
    </div>
  )
}
