export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isAdminRole } from '@/lib/access'
import QuestionnaireActions from './_components/QuestionnaireActions'
import styles from './questionnaires.module.css'

const T = {
  title: { en: 'Questionnaires', fr: 'Questionnaires' },
  subtitle: {
    en: 'The audit questionnaires you can use in campaigns: Zahir Guest standards and your own imported ones.',
    fr: "Les questionnaires d'audit utilisables dans vos campagnes : ceux de Zahir Guest et les vôtres, importés.",
  },
  import: { en: 'Import a questionnaire', fr: 'Importer un questionnaire' },
  mine: { en: 'Your questionnaires', fr: 'Vos questionnaires' },
  platform: { en: 'Zahir Guest standards', fr: 'Standards Zahir Guest' },
  emptyMine: {
    en: 'No imported questionnaire yet. Import a CSV file (exported from Excel) to audit with your own criteria.',
    fr: "Aucun questionnaire importé pour l'instant. Importez un fichier CSV (exporté depuis Excel) pour auditer avec vos propres critères.",
  },
  questions: { en: 'questions', fr: 'questions' },
  archived: { en: 'archived', fr: 'archivé' },
}

export default async function QuestionnairesPage() {
  const user = await requireUser()
  if (!isAdminRole(user.role)) redirect('/dashboard')
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (k: { en: string; fr: string }) => k[lang]

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{t(T.title)}</h1>
          <p className={styles.subtitle}>{t(T.subtitle)}</p>
        </div>
        <a href="/dashboard/questionnaires/import" className="btn btn-primary btn-sm">+ {t(T.import)}</a>
      </div>

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
                <QuestionnaireActions id={x.id} name={x.name} active={x.is_active} lang={lang} />
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
