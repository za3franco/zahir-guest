export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { notFound, redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole, ROLE_LABELS } from '@/lib/access'
import { CLIENT_TYPE_LABELS, type ClientRow } from '@/lib/clients'
import { loadClientStats } from '@/lib/clientStats'
import { STATUS_LABELS } from '@/types'
import { ArchiveClientButton, ClientPropertiesManager } from '../_components/ClientActions'
import styles from '../clients.module.css'

const T = {
  back: { en: '← Clients', fr: '← Clients' },
  edit: { en: 'Edit', fr: 'Modifier' },
  addProperty: { en: '+ New property', fr: '+ Nouvel établissement' },
  campaigns: { en: 'Campaigns', fr: 'Campagnes' },
  archivedNotice: { en: 'This client is archived.', fr: 'Ce client est archivé.' },
  contact: { en: 'Contact', fr: 'Contact' },
  contract: { en: 'Contract', fr: 'Contrat' },
  ref: { en: 'Reference', fr: 'Référence' },
  value: { en: 'Value (excl. tax)', fr: 'Montant (HT)' },
  period: { en: 'Period', fr: 'Période' },
  daysLeft: { en: 'days left', fr: 'jours restants' },
  ended: { en: 'Contract ended', fr: 'Contrat terminé' },
  notStarted: { en: 'Not started yet', fr: 'Pas encore commencé' },
  audits: { en: 'Audits', fr: 'Audits' },
  done: { en: 'done', fr: 'réalisés' },
  ongoing: { en: 'in progress', fr: 'en cours' },
  remaining: { en: 'still to do', fr: 'restant à réaliser' },
  lastReport: { en: 'Last report published', fr: 'Dernier rapport publié' },
  notes: { en: 'Notes', fr: 'Notes' },
  properties: { en: 'Properties', fr: 'Établissements' },
  people: { en: 'People who see the reports', fr: 'Personnes qui voient les rapports' },
  peopleHint: {
    en: 'Access is given from each user’s page (Users → Edit → Access).',
    fr: "L'accès se donne depuis la fiche de chaque utilisateur (Utilisateurs → Modifier → Accès).",
  },
  noPeople: { en: 'Nobody has access yet.', fr: "Personne n'a encore accès." },
  wholeClient: { en: 'all properties', fr: 'tous les établissements' },
  invite: { en: '+ Invite a manager', fr: '+ Inviter un responsable' },
  recent: { en: 'Recent campaigns', fr: 'Campagnes récentes' },
  noCampaign: { en: 'No campaign yet.', fr: 'Aucune campagne.' },
  seeAll: { en: 'See all →', fr: 'Tout voir →' },
  none: { en: '—', fr: '—' },
}

export default async function ClientPage({ params }: { params: { id: string } }) {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (k: { en: string; fr: string }) => k[lang]
  const locale = lang === 'en' ? 'en-GB' : 'fr-FR'
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : t(T.none))

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await supabase.from('clients').select('*').eq('id', params.id).eq('tenant_id', user.tenant_id).maybeSingle()
  if (!data) notFound()
  const client = data as ClientRow

  const [{ data: allProps }, { data: access }, { data: otherClients }, stats] = await Promise.all([
    supabase.from('properties').select('id, name, city, client_id').eq('tenant_id', user.tenant_id).eq('is_archived', false).order('name'),
    supabase.from('user_access').select('user_id, client_id, property_id').eq('tenant_id', user.tenant_id),
    supabase.from('clients').select('id, name').eq('tenant_id', user.tenant_id),
    loadClientStats(supabase, user.tenant_id, [client]),
  ])
  const s = stats.get(client.id)
  const clientName = new Map((otherClients ?? []).map((c: any) => [c.id, c.name]))
  const linked = (allProps ?? []).filter((p: any) => p.client_id === client.id)
  const available = (allProps ?? [])
    .filter((p: any) => p.client_id !== client.id)
    .map((p: any) => ({ id: p.id, name: p.name, city: p.city, clientName: p.client_id ? clientName.get(p.client_id) ?? null : null }))
  const linkedIds = linked.map((p: any) => p.id)

  // People with access: whole client, or one or more of its properties
  const perUser = new Map<string, { whole: boolean; props: string[] }>()
  for (const a of access ?? []) {
    if (a.client_id === client.id) perUser.set(a.user_id, { whole: true, props: perUser.get(a.user_id)?.props ?? [] })
    else if (a.property_id && linkedIds.includes(a.property_id)) {
      const cur = perUser.get(a.user_id) ?? { whole: false, props: [] }
      cur.props.push(a.property_id)
      perUser.set(a.user_id, cur)
    }
  }
  const userIds = Array.from(perUser.keys())
  const { data: people } = userIds.length
    ? await supabase.from('users').select('id, name, email, role').eq('tenant_id', user.tenant_id).in('id', userIds).order('name')
    : { data: [] as any[] }
  const propName = new Map(linked.map((p: any) => [p.id, p.name]))

  const { data: campaigns } = linkedIds.length
    ? await supabase.from('campaigns').select('id, name, status, created_at, property:properties(name)').eq('tenant_id', user.tenant_id).in('property_id', linkedIds).order('created_at', { ascending: false }).limit(8)
    : { data: [] as any[] }

  // Contract timing
  const today = new Date().toISOString().slice(0, 10)
  let timing: string | null = null
  if (client.contract_end && client.contract_end < today) timing = t(T.ended)
  else if (client.contract_start && client.contract_start > today) timing = t(T.notStarted)
  else if (client.contract_end) {
    const days = Math.ceil((new Date(client.contract_end).getTime() - Date.now()) / 86400_000)
    timing = `${days} ${t(T.daysLeft)}`
  }
  const planned = client.audits_planned ?? 0
  const pct = planned ? Math.min(100, Math.round(((s?.auditsDone ?? 0) / planned) * 100)) : 0

  return (
    <div className={styles.page}>
      <a href="/dashboard/clients" className={styles.backLink}>{t(T.back)}</a>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{client.name}</h1>
          <p className={styles.subtitle}>{CLIENT_TYPE_LABELS[client.type]?.[lang]}</p>
        </div>
        <div className={styles.headerActions}>
          <a href={`/dashboard/campaigns?client=${client.id}`} className="btn btn-ghost btn-sm">{t(T.campaigns)}</a>
          <a href={`/dashboard/clients/${client.id}/edit`} className="btn btn-ghost btn-sm">{t(T.edit)}</a>
          <ArchiveClientButton clientId={client.id} archived={client.is_archived} lang={lang} />
        </div>
      </div>
      {client.is_archived && <div className={styles.archived}>{t(T.archivedNotice)}</div>}

      <div className={styles.grid}>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{t(T.contract)}</h2>
            <dl className={styles.dl}>
              {client.contract_ref && <div><dt>{t(T.ref)}</dt><dd>{client.contract_ref}</dd></div>}
              {client.contract_value_eur != null && <div><dt>{t(T.value)}</dt><dd>€{Number(client.contract_value_eur).toLocaleString(locale)}</dd></div>}
              {(client.contract_start || client.contract_end) && (
                <div><dt>{t(T.period)}</dt><dd>{fmt(client.contract_start)} → {fmt(client.contract_end)}{timing && <><br /><span className={client.contract_end && client.contract_end < today ? styles.warn : styles.muted}>{timing}</span></>}</dd></div>
              )}
              <div>
                <dt>{t(T.audits)}</dt>
                <dd>
                  {s?.auditsDone ?? 0}{planned ? ` / ${planned}` : ''} {t(T.done)} · {s?.auditsInProgress ?? 0} {t(T.ongoing)}
                  {planned > 0 && (
                    <>
                      <div className={styles.progress} style={{ marginTop: 8 }} aria-hidden="true"><div className={styles.progressFill} style={{ width: `${pct}%` }} /></div>
                      <span className={styles.muted}>{Math.max(0, planned - (s?.auditsDone ?? 0))} {t(T.remaining)}</span>
                    </>
                  )}
                </dd>
              </div>
              <div><dt>{t(T.lastReport)}</dt><dd>{fmt(s?.lastPublishedAt ?? null)}</dd></div>
            </dl>
          </section>

          {(client.contact_name || client.contact_email || client.contact_phone) && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>{t(T.contact)}</h2>
              <dl className={styles.dl}>
                <div><dd>
                  {client.contact_name}
                  {client.contact_email && <><br /><a href={`mailto:${client.contact_email}`} style={{ color: 'var(--color-gold)' }}>{client.contact_email}</a></>}
                  {client.contact_phone && <><br /><a href={`tel:${client.contact_phone}`} style={{ color: 'var(--color-gold)' }}>{client.contact_phone}</a></>}
                </dd></div>
              </dl>
            </section>
          )}

          {client.notes && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>{t(T.notes)}</h2>
              <dl className={styles.dl}><div><dd>{client.notes}</dd></div></dl>
            </section>
          )}
        </div>

        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <span>{t(T.properties)} ({linked.length})</span>
              <a href={`/dashboard/properties/new?client=${client.id}`} className="btn btn-ghost btn-sm">{t(T.addProperty)}</a>
            </h2>
            <ClientPropertiesManager clientId={client.id} linked={linked} available={available} lang={lang} styles={styles} />
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <span>{t(T.people)} ({(people ?? []).length})</span>
              <a href="/dashboard/users/invite" className="btn btn-ghost btn-sm">{t(T.invite)}</a>
            </h2>
            {(people ?? []).length ? (
              <ul className={styles.list}>
                {(people ?? []).map((p: any) => {
                  const a = perUser.get(p.id)!
                  return (
                    <li key={p.id}>
                      <span>
                        <a href={`/dashboard/users/${p.id}/edit`}>{p.name}</a>
                        <span className={styles.muted}> · {ROLE_LABELS[p.role]?.[lang] ?? p.role}</span>
                      </span>
                      <span className={styles.muted}>{a.whole ? t(T.wholeClient) : a.props.map(id => propName.get(id)).filter(Boolean).join(', ')}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className={styles.muted}>{t(T.noPeople)}</p>
            )}
            <p className={styles.muted} style={{ marginTop: 12 }}>{t(T.peopleHint)}</p>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>
              <span>{t(T.recent)}</span>
              {(campaigns ?? []).length > 0 && <a href={`/dashboard/campaigns?client=${client.id}`} className="btn btn-ghost btn-sm">{t(T.seeAll)}</a>}
            </h2>
            {(campaigns ?? []).length ? (
              <ul className={styles.list}>
                {(campaigns ?? []).map((c: any) => {
                  const st = STATUS_LABELS[c.status as keyof typeof STATUS_LABELS]
                  return (
                    <li key={c.id}>
                      <span><a href={`/dashboard/campaigns/${c.id}`}>{c.name}</a><span className={styles.muted}> · {c.property?.name}</span></span>
                      <span className={styles.muted}>{lang === 'en' ? st?.en : st?.fr}</span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className={styles.muted}>{t(T.noCampaign)}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
