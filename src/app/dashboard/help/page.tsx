export const dynamic = 'force-dynamic'

import { requireUser } from '@/lib/auth'
import { articlesFor } from '@/lib/helpContent'
import { SUPPORT_EMAIL } from '@/lib/site'
import SupportForm from '@/components/help/SupportForm'
import ReplayTourLink from './ReplayTourLink'
import styles from './help.module.css'

const T = {
  title: { en: 'Help centre', fr: "Centre d'aide" },
  intro: {
    en: 'Guides for getting the most out of Zahir Guest. For a quick answer, use the Help button at the bottom right: the assistant knows these guides.',
    fr: "Des guides pour tirer le meilleur de Zahir Guest. Pour une réponse rapide, utilisez le bouton Aide en bas à droite : l'assistant connaît ces guides.",
  },
  guides: { en: 'Guides', fr: 'Guides' },
  tour: { en: 'Replay the guided tour', fr: 'Revoir la visite guidée' },
  contactTitle: { en: 'Contact support', fr: 'Contacter le support' },
  contactText: {
    en: 'Could not find your answer? Write to us and we will reply by email.',
    fr: "Vous n'avez pas trouvé votre réponse ? Écrivez-nous, nous vous répondrons par email.",
  },
  or: { en: 'You can also email', fr: 'Vous pouvez aussi écrire à' },
  suggestTitle: { en: 'Suggest a feature', fr: 'Suggérer une fonctionnalité' },
  suggestText: {
    en: 'Have an idea to improve Zahir Guest? Use "Suggest a feature" in the sidebar: every suggestion is read.',
    fr: "Une idée pour améliorer Zahir Guest ? Utilisez « Suggérer une fonctionnalité » dans la barre latérale : chaque suggestion est lue.",
  },
}

export default async function HelpPage() {
  const user = await requireUser()
  const lang = user.default_language === 'en' ? 'en' : 'fr'
  const t = (k: { en: string; fr: string }) => k[lang]
  const articles = articlesFor(user.role)

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t(T.title)}</h1>
      <p className={styles.intro}>{t(T.intro)}</p>
      <ReplayTourLink label={t(T.tour)} />

      <h2 className={styles.h2}>{t(T.guides)}</h2>
      <div className={styles.list}>
        {articles.map((a, i) => (
          <details key={a.id} className={styles.article} open={i === 0}>
            <summary>{a.title[lang]}</summary>
            <p>{a.body[lang]}</p>
          </details>
        ))}
      </div>

      <section className={styles.card}>
        <h2 className={styles.h2}>{t(T.contactTitle)}</h2>
        <p className={styles.muted}>{t(T.contactText)}</p>
        <SupportForm lang={lang} />
        <p className={styles.muted}>{t(T.or)} <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.h2}>{t(T.suggestTitle)}</h2>
        <p className={styles.muted}>{t(T.suggestText)}</p>
      </section>
    </div>
  )
}
