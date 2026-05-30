export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { requireUser } from '@/lib/auth'
import styles from './properties.module.css'
import PropertiesClient from './_components/PropertiesClient'

const T = {
  title: { en: 'Properties', fr: 'Établissements' },
  new: { en: 'New property', fr: 'Nouvel établissement' },
  archived: { en: 'View archived', fr: 'Voir les archivés' },
  backToActive: { en: '← Active properties', fr: '← Établissements actifs' },
  archivedTitle: { en: 'Archived properties', fr: 'Établissements archivés' },
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

  const labels = {
    searchPlaceholder: lang === 'en' ? 'Search by name or city…' : 'Rechercher par nom ou ville…',
    clearLabel: lang === 'en' ? 'Clear' : 'Effacer',
    allCategories: lang === 'en' ? 'All categories' : 'Toutes catégories',
    empty: lang === 'en' ? 'No properties found.' : 'Aucun établissement trouvé.',
    emptyArchived: lang === 'en' ? 'No archived properties.' : 'Aucun établissement archivé.',
    editLabel: lang === 'en' ? 'Edit' : 'Modifier',
    archiveLabel: lang === 'en' ? 'Archive' : 'Archiver',
    restoreLabel: lang === 'en' ? 'Restore' : 'Restaurer',
    colName: lang === 'en' ? 'Property' : 'Établissement',
    colCity: lang === 'en' ? 'City' : 'Ville',
    colCategory: lang === 'en' ? 'Category' : 'Catégorie',
    colActions: lang === 'en' ? 'Actions' : 'Actions',
  }

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

      <PropertiesClient
        properties={properties ?? []}
        showArchived={showArchived}
        lang={lang}
        labels={labels}
      />
    </div>
  )
}
