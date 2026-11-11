export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { CLIENT_TYPE_LABELS, type ClientRow } from '@/lib/clients'
import { loadClientStats } from '@/lib/clientStats'
import styles from './clients.module.css'

const T = {
  title: { en: 'Clients', fr: 'Clients' },
  subtitle: {
    en: 'Hotel groups, hotels and programmes you audit, with their properties, the people who see their reports and their contract.',
    fr: 'Les groupes, hôtels et programmes que vous auditez, avec leurs établissements, les personnes qui voient leurs rapports et leur contrat.',
  },
  new: { en: 'New client', fr: 'Nouveau client' },
  archived: { en: 'View archived', fr: 'Voir les archivés' },
  active: { en: '← Active clients', fr: '← Clients actifs' },
  empty: {
    en: 'No client yet. Create one, then attach its properties and give its managers access to their reports.',
    fr: "Aucun client pour l'instant. Créez-en un, rattachez-y ses établissements puis donnez à ses responsables l'accès à leurs rapports.",
  },
  emptyArchived: { en: 'No archived client.', fr: 'Aucun client archivé.' },
  properties: { en: 'properties', fr: 'établissements' },
  people: { en: 'people with access', fr: 'personnes avec accès' },
  audits: { en: 'audits done', fr: 'audits réalisés' },
  contract: { en: 'Contract', fr: 'Contrat' },
  ends: { en: 'ends', fr: 'fin le' },
  ended: { en: 'ended', fr: 'terminé le' },
}

export default async function ClientsPage({ searchParams }: { searchParams: { archived?: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (k: { en: string; fr: string }) => k[lang]
  const showArchived = searchParams.archived === '1'
  const fmt = (d: string) => new Date(d).toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  const today = new Date().toISOString().slice(0, 10)

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await supabase.from('clients').select('*').eq('tenant_id', user.tenant_id).eq('is_archived', showArchived).order('name')
  const clients = (data ?? []) as ClientRow[]
  const stats = await loadClientStats(supabase, user.tenant_id, clients)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
        <div className={styles.headerActions}>
          {showArchived ? (
            <a href="/dashboard/clients" className="btn btn-ghost btn-sm">{t(T.active)}</a>
          ) : (
            <>
              <a href="/dashboard/clients?archived=1" className="btn btn-ghost btn-sm">{t(T.archived)}</a>
              <a href="/dashboard/clients/new" className="btn btn-primary btn-sm">+ {t(T.new)}</a>
            </>
          )}
        </div>
      </div>

      {!clients.length ? (
        <div className={styles.empty}>{showArchived ? t(T.emptyArchived) : t(T.empty)}</div>
      ) : (
        <div className={styles.cards}>
          {clients.map(c => {
            const s = stats.get(c.id)
            const planned = c.audits_planned ?? 0
            const pct = planned ? Math.min(100, Math.round(((s?.auditsDone ?? 0) / planned) * 100)) : 0
            const ended = c.contract_end && c.contract_end < today
            return (
              <a key={c.id} href={`/dashboard/clients/${c.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <h2 className={styles.cardName}>{c.name}</h2>
                  <span className={styles.typePill}>{CLIENT_TYPE_LABELS[c.type]?.[lang] ?? c.type}</span>
                </div>
                <div className={styles.stats}>
                  <span><strong>{s?.properties ?? 0}</strong>{t(T.properties)}</span>
                  <span><strong>{s?.users ?? 0}</strong>{t(T.people)}</span>
                  <span><strong>{s?.auditsDone ?? 0}{planned ? ` / ${planned}` : ''}</strong>{t(T.audits)}</span>
                </div>
                {planned > 0 && (
                  <div className={styles.progress} aria-hidden="true"><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                )}
                {(c.contract_end || c.contract_value_eur != null) && (
                  <div className={styles.progressLabel}>
                    <span>{t(T.contract)}{c.contract_value_eur != null ? ` · €${Number(c.contract_value_eur).toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR')}` : ''}</span>
                    {c.contract_end && <span className={ended ? styles.warn : undefined}>{ended ? t(T.ended) : t(T.ends)} {fmt(c.contract_end)}</span>}
                  </div>
                )}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}
