'use client'

import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import styles from './tour.module.css'

type Lang = 'en' | 'fr'
interface Step { target?: string; title: Record<Lang, string>; text: Record<Lang, string> }

const WELCOME: Step = {
  title: { en: 'Welcome to Zahir Guest', fr: 'Bienvenue sur Zahir Guest' },
  text: {
    en: 'Here is a 1-minute tour of where everything is. You can skip it and replay it any time from the Help centre.',
    fr: "Voici une visite d'une minute pour savoir où se trouve chaque chose. Vous pouvez la passer et la revoir à tout moment depuis le Centre d'aide.",
  },
}
const HELP: Step = {
  target: '/dashboard/help',
  title: { en: 'Help centre and assistant', fr: "Centre d'aide et assistant" },
  text: {
    en: 'Guides for every task. The Help button at the bottom right opens an assistant that answers your questions, and can pass you to our team.',
    fr: "Des guides pour chaque tâche. Le bouton Aide en bas à droite ouvre un assistant qui répond à vos questions, et peut vous mettre en relation avec notre équipe.",
  },
}
const FEEDBACK: Step = {
  target: 'feedback',
  title: { en: 'Suggest a feature', fr: 'Suggérer une fonctionnalité' },
  text: {
    en: 'An idea or a missing feature? Tell us here. Every suggestion is read.',
    fr: 'Une idée ou une fonctionnalité manquante ? Dites-le nous ici. Chaque suggestion est lue.',
  },
}
const DONE: Step = {
  title: { en: "You're all set", fr: "C'est tout bon" },
  text: { en: 'Enjoy Zahir Guest. The Help button is always one click away.', fr: "Bonne utilisation de Zahir Guest. Le bouton Aide est toujours à portée de clic." },
}

const STEPS: Record<string, Step[]> = {
  admin: [
    WELCOME,
    { target: '/dashboard', title: { en: 'Dashboard', fr: 'Tableau de bord' }, text: { en: 'Your overview: campaigns in progress, recent audits and properties at a glance.', fr: "Votre vue d'ensemble : campagnes en cours, audits récents et établissements en un coup d'œil." } },
    { target: '/dashboard/campaigns', title: { en: 'Campaigns', fr: 'Campagnes' }, text: { en: 'Create audits, assign them to auditors, then review, finalize and publish the reports.', fr: 'Créez des audits, assignez-les aux auditeurs, puis révisez, finalisez et publiez les rapports.' } },
    { target: '/dashboard/properties', title: { en: 'Properties', fr: 'Établissements' }, text: { en: 'The hotels and restaurants you audit. Start by adding your first one.', fr: 'Les hôtels et restaurants que vous auditez. Commencez par ajouter le premier.' } },
    { target: '/dashboard/users', title: { en: 'Users', fr: 'Utilisateurs' }, text: { en: 'Invite auditors and property managers by email and manage their roles.', fr: 'Invitez des auditeurs et des directeurs par email et gérez leurs rôles.' } },
    { target: '/dashboard/billing', title: { en: 'Billing', fr: 'Facturation' }, text: { en: 'Your plan, trial, usage against limits, and the secure customer portal.', fr: 'Votre forfait, votre essai, votre utilisation par rapport aux limites et le portail client sécurisé.' } },
    { target: '/dashboard/branding', title: { en: 'Branding', fr: 'Marque' }, text: { en: 'Your logo, name and colour on the app, reports and emails (Professional and Enterprise).', fr: "Votre logo, votre nom et votre couleur sur l'application, les rapports et les emails (Professional et Enterprise)." } },
    HELP, FEEDBACK, DONE,
  ],
  auditor: [
    WELCOME,
    { target: '/dashboard', title: { en: 'My Audits', fr: 'Mes audits' }, text: { en: 'Your assigned audits are listed here. Open one to answer standard by standard, then submit.', fr: 'Vos audits assignés sont listés ici. Ouvrez-en un pour répondre standard par standard, puis soumettez.' } },
    HELP, FEEDBACK, DONE,
  ],
  manager: [
    WELCOME,
    { target: '/dashboard/reports', title: { en: 'Your dashboard', fr: 'Votre tableau de bord' }, text: { en: 'Published reports for your properties, score trends and domain-by-domain comparison.', fr: 'Les rapports publiés de vos établissements, l\'évolution des scores et la comparaison par domaine.' } },
    HELP, FEEDBACK, DONE,
  ],
}

const NEXT = { en: 'Next', fr: 'Suivant' }
const BACK = { en: 'Back', fr: 'Retour' }
const SKIP = { en: 'Skip tour', fr: 'Passer la visite' }
const FINISH = { en: 'Finish', fr: 'Terminer' }

function findTarget(sel?: string): HTMLElement | null {
  if (!sel) return null
  const els = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${sel}"]`))
  // visible, on-screen element only (the mobile drawer is off-canvas while closed)
  return els.find(el => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && r.left >= 0 && r.right <= window.innerWidth
  }) ?? null
}

export default function ProductTour({ lang, group, autoStart }: { lang: Lang; group: 'admin' | 'auditor' | 'manager'; autoStart: boolean }) {
  const steps = STEPS[group]
  const [active, setActive] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (autoStart) setActive(true)
    const start = () => { setI(0); setActive(true) }
    window.addEventListener('zg-start-tour', start)
    return () => window.removeEventListener('zg-start-tour', start)
  }, [autoStart])

  const measure = useCallback(() => {
    const el = findTarget(steps[i]?.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [i, steps])

  useLayoutEffect(() => {
    if (!active) return
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, measure])

  const finish = useCallback(() => {
    setActive(false)
    fetch('/api/user/tour', { method: 'POST' }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, finish])

  if (!active) return null
  const step = steps[i]
  const last = i === steps.length - 1

  // Popover to the right of the highlighted menu item; centred when there is no visible target
  const pop: React.CSSProperties = rect
    ? { top: Math.max(12, Math.min(rect.top - 8, window.innerHeight - 230)), left: Math.min(rect.right + 18, window.innerWidth - 340) }
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label={step.title[lang]}>
      {rect ? (
        <div className={styles.spot} style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8 }} />
      ) : (
        <div className={styles.dim} />
      )}
      <div className={styles.pop} style={pop}>
        <div className={styles.count}>{i + 1} / {steps.length}</div>
        <h3 className={styles.title}>{step.title[lang]}</h3>
        <p className={styles.text}>{step.text[lang]}</p>
        <div className={styles.actions}>
          {!last ? <button type="button" className={styles.skip} onClick={finish}>{SKIP[lang]}</button> : <span />}
          <div className={styles.nav}>
            {i > 0 && <button type="button" className={styles.back} onClick={() => setI(i - 1)}>{BACK[lang]}</button>}
            <button type="button" className={styles.next} onClick={() => (last ? finish() : setI(i + 1))}>{last ? FINISH[lang] : NEXT[lang]}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
