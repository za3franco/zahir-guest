// Product vignettes of the landing page, drawn in code with the app's own look (« Maison » direction), so they stay
// sharp and always match the interface. Fictitious demo data, labelled as such on the page.
import type { Lang } from '@/lib/landingContent'
import { ZIcon, ZahirMark } from '@/components/icons/ZahirIcons'
import styles from './vignettes.module.css'

const tx = (lang: Lang, en: string, fr: string) => (lang === 'en' ? en : fr)

/** The auditor's phone during a visit: one section, three standards, big answer buttons. */
export function PhoneAudit({ lang }: { lang: Lang }) {
  const rows = [
    { ref: '4.1', t: tx(lang, 'Greeted at the table within a minute.', "Accueil à table en moins d'une minute."), a: 0 },
    { ref: '4.2', t: tx(lang, 'Dish of the day suggested without being asked.', 'Suggestion du jour proposée sans demande.'), a: 1 },
    { ref: '4.3', t: tx(lang, 'Water served on arrival.', "Eau servie dès l'installation."), a: -1 },
  ]
  const opts = [tx(lang, 'Met', 'Conforme'), tx(lang, 'Not met', 'Non conforme'), 'N/A']
  return (
    <div className={styles.phone} role="img" aria-label={tx(lang, 'Audit screen on a phone, Restaurant section', "Écran d'audit sur téléphone, section Restaurant")}>
      <div className={styles.phoneScreen}>
        <div className={styles.phHead}>
          <span className={styles.phBack}>← {tx(lang, 'Sections', 'Sections')}</span>
          <span className={styles.mono}>{tx(lang, 'SAVED · OFFLINE OK', 'ENREGISTRÉ · HORS LIGNE OK')}</span>
        </div>
        <p className={styles.phKicker}>Palais Azur · {tx(lang, 'visit', 'visite')} 04</p>
        <p className={styles.phTitle}>{tx(lang, 'Restaurant', 'Restaurant')}</p>
        <div className={styles.phProgress} aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => <span key={i} className={i < 3 ? styles.pDone : i === 3 ? styles.pNow : ''} />)}
        </div>
        <p className={styles.phMeta}>{tx(lang, 'Section 4 of 9', 'Section 4 sur 9')}</p>
        {rows.map(r => (
          <div key={r.ref} className={styles.phRow}>
            <span className={styles.mono}>{r.ref}</span>
            <p>{r.t}</p>
            <div className={styles.phOpts}>
              {opts.map((o, i) => (
                <span key={o} className={i === r.a ? (i === 1 ? styles.optBad : styles.optOn) : ''}>{o}</span>
              ))}
            </div>
          </div>
        ))}
        <div className={styles.phFoot}>
          <span>{tx(lang, 'Previous', 'Précédent')}</span>
          <span className={styles.phNext}>{tx(lang, 'Next section →', 'Section suivante →')}</span>
        </div>
      </div>
    </div>
  )
}

const DOMAINS = [
  { en: 'Front office', fr: 'Réception', v: 86.0 },
  { en: 'Rooms', fr: 'Chambres', v: 91.5 },
  { en: 'Restaurant', fr: 'Restauration', v: 78.2 },
  { en: 'Bar', fr: 'Bar', v: 80.0 },
  { en: 'Departure', fr: 'Départ', v: 85.0 },
]

const num = (lang: Lang, v: number) => v.toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** The summary page of a report: overall score as a seal, domain bars, one finding. */
export function ReportSheet({ lang }: { lang: Lang }) {
  return (
    <div className={styles.sheet} role="img" aria-label={tx(lang, 'Summary page of a sample report', "Page de synthèse d'un rapport d'exemple")}>
      <div className={styles.sheetHead}>
        <span className={styles.sheetBrand}><ZahirMark size={22} /> Zahir Guest</span>
        <span className={styles.mono}>{tx(lang, 'VISIT OF 14.11', 'VISITE DU 14.11')}</span>
      </div>
      <div className={styles.sheetTop}>
        <div>
          <p className={styles.sheetKicker}>{tx(lang, 'Mystery guest audit report', "Rapport d'audit client mystère")}</p>
          <p className={styles.sheetTitle}>Palais Azur</p>
          <p className={styles.sheetSub}>Marrakech · {tx(lang, 'Essential questionnaire', 'Questionnaire Essentiel')}</p>
        </div>
        <span className="zg-seal" aria-hidden="true">
          <span>Score</span>
          <b>{num(lang, 84.2)}</b>
          <span>/ 100</span>
        </span>
      </div>
      <div className={styles.bars}>
        {DOMAINS.map(d => (
          <div key={d.en} className={styles.bar}>
            <span>{lang === 'en' ? d.en : d.fr}</span>
            <span className={styles.track}><span style={{ width: `${d.v}%` }} /></span>
            <span className={styles.mono}>{num(lang, d.v)}</span>
          </div>
        ))}
      </div>
      <div className={styles.finding}>
        <span className="zg-constat">{tx(lang, 'Finding 07', 'Constat 07')}</span>
        <p>{tx(lang, 'Turndown not done at 21:30. No chocolate on the pillow.', "Couverture du soir non effectuée à 21:30. Chocolat absent de l'oreiller.")}</p>
      </div>
    </div>
  )
}

const PORTFOLIO = [
  { n: 'Palais Azur · Marrakech', s: 84.2, d: +3.1, w: { en: 'Restaurant', fr: 'Restauration' } },
  { n: 'Riad Nour · Fès', s: 79.6, d: -1.8, w: { en: 'Front office', fr: 'Réception' } },
  { n: 'Hôtel Atlas · Agadir', s: 88.0, d: +0.4, w: { en: 'Bar', fr: 'Bar' } },
  { n: 'Dar Salam · Rabat', s: 72.5, d: -4.2, w: { en: 'Rooms', fr: 'Chambres' } },
]

/** The management view in a browser frame: what to do now, then the portfolio. */
export function PortfolioBrowser({ lang }: { lang: Lang }) {
  const nav: { icon: 'ledger' | 'curve' | 'seal' | 'calendar' | 'notebook' | 'facade'; l: string; on?: boolean }[] = [
    { icon: 'ledger', l: tx(lang, 'Dashboard', 'Tableau de bord'), on: true },
    { icon: 'curve', l: tx(lang, 'Analytics', 'Analyses') },
    { icon: 'seal', l: tx(lang, 'Reports', 'Rapports') },
    { icon: 'calendar', l: tx(lang, 'Campaigns', 'Campagnes') },
    { icon: 'notebook', l: 'Questionnaires' },
    { icon: 'facade', l: tx(lang, 'Properties', 'Établissements') },
  ]
  return (
    <div className={styles.browser} role="img" aria-label={tx(lang, 'Management dashboard of a hotel portfolio', "Tableau de bord de direction d'un portefeuille d'hôtels")}>
      <div className={styles.browserBar} aria-hidden="true"><span className={styles.mono}>zahirguest.com/dashboard</span></div>
      <div className={styles.app}>
        <div className={styles.appNav}>
          <span className={styles.appBrand}><ZahirMark size={20} /> Zahir Guest</span>
          <span className={styles.appGroup}>{tx(lang, 'Follow', 'Suivre')}</span>
          {nav.slice(0, 3).map(n => <span key={n.l} className={n.on ? styles.appOn : ''}><ZIcon name={n.icon} size={16} />{n.l}</span>)}
          <span className={styles.appGroup}>{tx(lang, 'Prepare', 'Préparer')}</span>
          {nav.slice(3).map(n => <span key={n.l}><ZIcon name={n.icon} size={16} />{n.l}</span>)}
        </div>
        <div className={styles.appMain}>
          <p className={styles.appKicker}>{tx(lang, 'November · 4 properties', 'Novembre · 4 établissements')}</p>
          <p className={styles.appTitle}>{tx(lang, 'To do now', 'À faire maintenant')}</p>
          <div className={styles.todo}>
            <div><b>{tx(lang, '2 reports to publish', '2 rapports à publier')}</b><span>{tx(lang, 'Review →', 'Relire →')}</span></div>
            <div><b>{tx(lang, '1 visit without auditor', '1 visite sans auditeur')}</b><span>{tx(lang, 'Assign →', 'Assigner →')}</span></div>
          </div>
          <table className={styles.table}>
            <thead><tr><th>{tx(lang, 'Property', 'Établissement')}</th><th>Score</th><th>{tx(lang, 'Change', 'Écart')}</th><th>{tx(lang, 'Weakest', 'Plus faible')}</th></tr></thead>
            <tbody>
              {PORTFOLIO.map(r => (
                <tr key={r.n}>
                  <td>{r.n}</td>
                  <td className={styles.score}>{num(lang, r.s)}</td>
                  <td className={`${styles.mono} ${r.d < 0 ? styles.down : styles.up}`}>{r.d > 0 ? '+' : '−'}{num(lang, Math.abs(r.d))}</td>
                  <td>{lang === 'en' ? r.w.en : r.w.fr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/** The cover page of a report, as the PDF prints it. */
export function ReportCover({ lang }: { lang: Lang }) {
  return (
    <div className={styles.cover} role="img" aria-label={tx(lang, 'Cover page of a sample report', "Couverture d'un rapport d'exemple")}>
      <span className={styles.sheetBrand}><ZahirMark size={22} /> Zahir Guest</span>
      <div className={styles.coverMid}>
        <p className={styles.sheetKicker}>{tx(lang, 'Mystery guest audit report', "Rapport d'audit client mystère")}</p>
        <p className={styles.coverTitle}>Palais Azur</p>
        <p className={styles.sheetSub}>Marrakech, Maroc</p>
        <div className={styles.coverScore}>
          <span className="zg-seal" aria-hidden="true"><span>Score</span><b>{num(lang, 84.2)}</b><span>/ 100</span></span>
          <p>{tx(lang, '63 standards evaluated', '63 standards évalués')}<br />{tx(lang, '54 met · 7 not met · 2 N/A', '54 conformes · 7 non conformes · 2 N/A')}</p>
        </div>
      </div>
      <div className={styles.coverFoot}>
        <span>{tx(lang, 'Visit of 14 November', 'Visite du 14 novembre')}</span>
        <span className={styles.mono}>zahirguest.com</span>
      </div>
    </div>
  )
}
