export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import styles from './properties.module.css'

const T = {
  title: { en: 'Properties', fr: 'Établissements' },
  new: { en: 'New property', fr: 'Nouvel établissement' },
  archived: { en: 'View archived', fr: 'Voir les archivés' },
  backToActive: { en: '← Active properties', fr: '← Établissements actifs' },
  archivedTitle: { en: 'Archived properties', fr: 'Établissements archivés' },
  empty: { en: 'No properties yet.', fr: 'Aucun établissement.' },
  emptyArchived: { en: 'No archived properties.', fr: 'Aucun établissement archivé.' },
  cols: {
    name: { en: 'Property', fr: 'Établissement' },
    city: { en: 'City', fr: 'Ville' },
    category: { en: 'Category', fr: 'Catégorie' },
    actions: { en: 'Actions', fr: 'Actions' },
  },
  edit: { en: 'Edit', fr: 'Modifier' },
  archive: { en: 'Archive', fr: 'Archiver' },
  restore: { en: 'Restore', fr: 'Restaurer' },
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

  const { data: properties } = await supabaseAdmin
    .from('properties')
    .select('id, name, city, country, category, type')
    .eq('tenant_id', user.tenant_id)
    .eq('is_archived', showArchived)
    .order('name')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {showArchived ? t(T.archivedTitle) : t(T.title)}
        </h1>
        <div className={styles.headerActions}>
          {showArchived ? (
            <a href="/dashboard/properties" className="btn btn-ghost btn-sm">
              {t(T.backToActive)}
            </a>
          ) : (
            <>
              <a href="/dashboard/properties?archived=1" className="btn btn-ghost btn-sm">
                {t(T.archived)}
              </a>
              <a href="/dashboard/properties/new" className="btn btn-primary btn-sm">
                + {t(T.new)}
              </a>
            </>
          )}
        </div>
      </div>

      {/* Desktop table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t(T.cols.name)}</th>
              <th>{t(T.cols.city)}</th>
              <th>{t(T.cols.category)}</th>
              <th>{t(T.cols.actions)}</th>
            </tr>
          </thead>
          <tbody>
            {!properties?.length ? (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  {showArchived ? t(T.emptyArchived) : t(T.empty)}
                </td>
              </tr>
            ) : properties.map((p: any) => (
              <tr key={p.id}>
                <td>
                  <a href={`/dashboard/properties/${p.id}`} className={styles.tableLink}>
                    {p.name}
                  </a>
                </td>
                <td className={styles.muted}>{[p.city, p.country].filter(Boolean).join(', ') || '—'}</td>
                <td className={styles.muted}>{p.category || '—'}</td>
                <td>
                  <div className={styles.rowActions}>
                    <a href={`/dashboard/properties/${p.id}/edit`} className="btn btn-ghost btn-sm">
                      {t(T.edit)}
                    </a>
                    <form action={`/api/properties/${p.id}/archive`} method="POST">
                      <button type="submit" className="btn btn-ghost btn-sm">
                        {showArchived ? t(T.restore) : t(T.archive)}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {!properties?.length ? (
          <p className={styles.empty}>{showArchived ? t(T.emptyArchived) : t(T.empty)}</p>
        ) : properties.map((p: any) => (
          <div key={p.id} className={styles.mobileCard}>
            <a href={`/dashboard/properties/${p.id}`} className={styles.mobileCardLink}>
              <div className={styles.mobileCardName}>{p.name}</div>
              <div className={styles.mobileCardMeta}>
                {[p.city, p.country, p.category].filter(Boolean).join(' · ') || '—'}
              </div>
            </a>
            <div className={styles.mobileCardActions}>
              <a href={`/dashboard/properties/${p.id}/edit`} className="btn btn-ghost btn-sm">
                {t(T.edit)}
              </a>
              <form action={`/api/properties/${p.id}/archive`} method="POST">
                <button type="submit" className="btn btn-ghost btn-sm">
                  {showArchived ? t(T.restore) : t(T.archive)}
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
