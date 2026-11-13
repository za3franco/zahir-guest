export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import { hasFullLibrary } from '@/lib/limits'
import { ESSENTIAL_TEMPLATE_ID } from '@/lib/plans'
import QuestionnaireActions from './_components/QuestionnaireActions'
import styles from './questionnaires.module.css'

const T = {
  title: { en: 'Questionnaires', fr: 'Questionnaires' },
  subtitle: {
    en: 'The audit questionnaires you can use in campaigns: Zahir Guest standards and your own.',
    fr: "Les questionnaires d'audit utilisables dans vos campagnes : ceux de Zahir Guest et les vôtres.",
  },
  create: { en: 'New questionnaire', fr: 'Nouveau questionnaire' },
  mine: { en: 'Your questionnaires', fr: 'Vos questionnaires' },
  platform: { en: 'Zahir Guest standards', fr: 'Standards Zahir Guest' },
  emptyMine: {
    en: 'No questionnaire of your own yet. Click “New questionnaire”: pick the departments to audit from our standards, or convert your own standards with AI.',
    fr: "Aucun questionnaire à vous pour l'instant. Cliquez sur « Nouveau questionnaire » : choisissez les services à auditer dans nos standards, ou convertissez vos propres standards avec l'IA.",
  },
  questions: { en: 'questions', fr: 'questions' },
  edit: { en: 'Edit', fr: 'Modifier' },
  exportCsv: { en: 'Export CSV', fr: 'Exporter en CSV' },
  archived: { en: 'archived', fr: 'archivé' },
  included: { en: 'Included in your plan', fr: 'Inclus dans votre offre' },
  locked: { en: 'Hotel plan and above', fr: "À partir de l'offre Hôtel" },
  lockedIntro: {
    en: 'The Discovery plan uses the Essential questionnaire (about 60 key standards). The full library, your own questionnaires and imports are unlocked from the Hotel plan.',
    fr: "L'offre Découverte utilise le questionnaire Essentiel (environ 60 standards clés). La bibliothèque complète, vos propres questionnaires et l'import se débloquent à partir de l'offre Hôtel.",
  },
  sections: { en: 'sections', fr: 'sections' },
  unlock: { en: 'Upgrade to Hotel', fr: 'Passer à Hôtel' },
}

export default async function QuestionnairesPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (k: { en: string; fr: string }) => k[lang]

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const full = await hasFullLibrary(user.tenant_id)
  const { data: templates } = await db
    .from('questionnaire_templates')
    .select('id, name, tenant_id, is_active, created_at')
    .or(`tenant_id.eq.${user.tenant_id},tenant_id.is.null`)
    .order('created_at', { ascending: false })

  const ids = (templates ?? []).map(x => x.id)
  const counts = new Map<string, number>()
  if (ids.length) {
    const { data: domains } = await db.from('template_domains').select('id, template_id').in('template_id', ids)
    const domainTpl = new Map((domains ?? []).map(d => [d.id, d.template_id]))
    const { data: sections } = await db.from('template_sections').select('id, domain_id').in('domain_id', Array.from(domainTpl.keys()))
    const sectionTpl = new Map((sections ?? []).map(s => [s.id, domainTpl.get(s.domain_id)!]))
    const secIds = Array.from(sectionTpl.keys())
    for (let i = 0; i < secIds.length; i += 200) {
      const { data: stds } = await db.from('template_standards').select('section_id').in('section_id', secIds.slice(i, i + 200))
      for (const s of stds ?? []) {
        const tid = sectionTpl.get(s.section_id)
        if (tid) counts.set(tid, (counts.get(tid) ?? 0) + 1)
      }
    }
  }

  const mine = (templates ?? []).filter(x => x.tenant_id === user.tenant_id)
  const platform = (templates ?? []).filter(x => !x.tenant_id)

  // Locked view (free plan): the outline of the full library — domains, sections, counts — without the questions.
  let outline: { name: string; sections: { name: string; n: number }[] }[] = []
  if (!full) {
    const lib = platform.find(x => x.id !== ESSENTIAL_TEMPLATE_ID)
    if (lib) {
      const { data: ds } = await db.from('template_domains').select('id, name_en, name_fr, display_order').eq('template_id', lib.id).order('display_order')
      const { data: ss } = await db.from('template_sections').select('id, domain_id, name_en, name_fr, display_order').in('domain_id', (ds ?? []).map(d => d.id)).order('display_order')
      const perSection = new Map<string, number>()
      const sIds = (ss ?? []).map(x => x.id)
      for (let i = 0; i < sIds.length; i += 200) {
        const { data: st } = await db.from('template_standards').select('section_id').in('section_id', sIds.slice(i, i + 200))
        for (const r of st ?? []) perSection.set(r.section_id, (perSection.get(r.section_id) ?? 0) + 1)
      }
      outline = (ds ?? []).map(d => ({
        name: lang === 'en' ? d.name_en : d.name_fr,
        sections: (ss ?? []).filter(x => x.domain_id === d.id).map(x => ({ name: lang === 'en' ? x.name_en : x.name_fr, n: perSection.get(x.id) ?? 0 })),
      }))
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
        {full ? (
          <div className={styles.actions}>
            <a href="/dashboard/questionnaires/new" className="btn btn-primary btn-sm">+ {t(T.create)}</a>
          </div>
        ) : (
          <div className={styles.actions}>
            <a href="/dashboard/billing#plans" className="btn btn-primary btn-sm">{t(T.unlock)} →</a>
          </div>
        )}
      </div>

      {!full && (
        <>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>{t(T.platform)}</h2>
            <p className={styles.empty}>{t(T.lockedIntro)}</p>
            <ul className={styles.list}>
              {platform.filter(x => x.id === ESSENTIAL_TEMPLATE_ID).map(x => (
                <li key={x.id}>
                  <div>
                    <span className={styles.name}>{x.name}</span>
                    <span className={styles.pill}>{t(T.included)}</span>
                    <div className={styles.muted}>{counts.get(x.id) ?? 0} {t(T.questions)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          {outline.length > 0 && (
            <div className={`${styles.panel} ${styles.lockedPanel}`}>
              <div className={styles.lockedHead}>
                <div>
                  <h2 className={styles.panelTitle}>
                    {platform.find(x => x.id !== ESSENTIAL_TEMPLATE_ID)?.name}
                  </h2>
                  <div className={styles.muted}>
                    {outline.reduce((n, d) => n + d.sections.reduce((m, x) => m + x.n, 0), 0)} {t(T.questions)} · {outline.reduce((n, d) => n + d.sections.length, 0)} {t(T.sections)} · <span aria-hidden="true">🔒</span> {t(T.locked)}
                  </div>
                </div>
                <a href="/dashboard/billing#plans" className="btn btn-primary btn-sm">{t(T.unlock)}</a>
              </div>
              <div className={styles.outline}>
                {outline.map(d => (
                  <div key={d.name}>
                    <h3 className={styles.outlineDomain}>{d.name}</h3>
                    <ul>
                      {d.sections.map(x => <li key={x.name}><span>{x.name}</span><span className={styles.muted}>{x.n}</span></li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {full && (
      <>
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>{t(T.mine)}</h2>
        {mine.length === 0 ? (
          <p className={styles.empty}>{t(T.emptyMine)}</p>
        ) : (
          <ul className={styles.list}>
            {mine.map(x => (
              <li key={x.id}>
                <div>
                  <span className={styles.name}>{x.name}</span>
                  {!x.is_active && <span className={styles.pill}>{t(T.archived)}</span>}
                  <div className={styles.muted}>{counts.get(x.id) ?? 0} {t(T.questions)}</div>
                </div>
                <div className={styles.actions}>
                  <a href={`/dashboard/questionnaires/${x.id}/edit`} className="btn btn-ghost btn-sm">{t(T.edit)}</a>
                  <a href={`/api/questionnaires/${x.id}/export`} className="btn btn-ghost btn-sm">{t(T.exportCsv)}</a>
                  <QuestionnaireActions id={x.id} name={x.name} active={x.is_active} lang={lang} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>{t(T.platform)}</h2>
        <ul className={styles.list}>
          {platform.map(x => (
            <li key={x.id}>
              <div>
                <span className={styles.name}>{x.name}</span>
                <div className={styles.muted}>{counts.get(x.id) ?? 0} {t(T.questions)}</div>
              </div>
              <div className={styles.actions}>
                <a href={`/api/questionnaires/${x.id}/export`} className="btn btn-ghost btn-sm">{t(T.exportCsv)}</a>
              </div>
            </li>
          ))}
        </ul>
      </div>
      </>
      )}
    </div>
  )
}
