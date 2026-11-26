// Every text of the super admin screen, in French and English, in one place (same idea as src/lib/apiErrors.ts for the server).
// `fr` is typed as `typeof en`: forgetting a text in one language is a build error.
// No server-only import here: client components (CreateTenantForm, TenantActions, SuperAdminLang) use it too.
import { FREE_NAME, PLAN_NAMES } from '@/lib/plans'

export type Lang = 'en' | 'fr'

/** Language of the signed-in super admin (their FR / EN choice, stored in users.default_language). */
export function saLang(user: { default_language?: string | null } | null | undefined): Lang {
  return user?.default_language === 'en' ? 'en' : 'fr'
}

const LOCALE: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR' }

/** 1234.5 → "1,235" (en) / "1 235" (fr) */
export const num = (n: number, lang: Lang, maxFractionDigits = 0) =>
  n.toLocaleString(LOCALE[lang], { maximumFractionDigits: maxFractionDigits })

/** Euros: "€1,235" in English, "1 235 €" in French. */
export const eur = (n: number, lang: Lang) => (lang === 'en' ? `€${num(n, lang)}` : `${num(n, lang)} €`)
export const eurCents = (cents: number, lang: Lang) => eur(cents / 100, lang)

export const pct = (n: number, lang: Lang) => `${(n * 100).toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 })}${lang === 'fr' ? ' %' : '%'}`

/** "14 Nov 2026" / "14 nov. 2026" */
export const day = (iso: string | number | null | undefined, lang: Lang) =>
  iso ? new Date(iso).toLocaleDateString(LOCALE[lang], { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

/** "2026-03" → "Mar 26" / "mars 26" */
export const monthLabel = (key: string, lang: Lang) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE[lang], { month: 'short', year: '2-digit', timeZone: 'UTC' })
}

export const dateTime = (ms: number, lang: Lang) => new Date(ms).toLocaleString(LOCALE[lang])

/** Plan name as built by the sales loader (English) → name in the screen's language. */
export function localPlan(name: string, lang: Lang): string {
  if (name === FREE_NAME.en) return FREE_NAME[lang]
  for (const t of Object.keys(PLAN_NAMES) as (keyof typeof PLAN_NAMES)[]) if (PLAN_NAMES[t].en === name) return PLAN_NAMES[t][lang]
  return name
}

const en = {
  // Header and tabs
  platform: 'Platform',
  backToDashboard: '← Dashboard',
  tabOverview: 'Overview',
  tabSales: 'Sales',
  language: 'Language',

  // Statuses and intervals (raw database values → text; unknown values are shown as they are)
  status: {
    active: 'active', trialing: 'trial', trial: 'trial', past_due: 'past due', unpaid: 'unpaid', canceled: 'cancelled',
    suspended: 'suspended', trial_expired: 'trial expired', incomplete: 'incomplete', incomplete_expired: 'incomplete (expired)', free: 'free',
  } as Record<string, string>,
  intervalMonth: 'monthly',
  intervalYear: 'annual',
  monthly: 'Monthly',
  annual: 'Annual',
  directContract: 'direct contract',
  internalPlan: 'Internal',
  cancelledEnds: 'cancelled — ends',
  ends: 'ends',

  // Overview
  overviewTitle: 'Platform overview',
  loadTenantsFailed: 'Could not load the workspaces. Please reload the page.',
  statMrr: 'MRR (estimated)',
  statMrrNote: (arr: string) => `ARR ≈ ${arr}`,
  statPaying: 'Paying customers',
  statPayingNote: (n: number) => `${n} customer${n === 1 ? '' : 's'} in total`,
  statPilots: 'Active pilots',
  statPilotsNote: (n: number) => `${n} ending within 3 days`,
  statNew: 'New (30 days)',
  statNewNote: 'signups + paid checkouts',
  statAudits: 'Audits this month',
  statAuditsNote: 'campaigns created, all workspaces',
  statIssues: 'Payment issues',
  statIssuesNote: 'past due / unpaid',
  workspaces: (n: number) => `Workspaces (${n})`,
  thWorkspace: 'Workspace', thPlan: 'Plan', thStatus: 'Status', thUsers: 'Users', thProperties: 'Properties',
  thAudits: 'Audits (month / total)', thCreated: 'Created', thTrialEnds: 'Trial ends / renews',
  overviewFootnote: "MRR is computed from each workspace's plan and billing interval (annual plans divided by 12), counting active and past-due subscriptions; direct contracts count their contract value (or the list price if none was entered). Stripe remains the source of truth for actual revenue.",

  // New workspace form
  newWorkspace: '+ New workspace',
  fCompany: 'Company / client name',
  fAdminName: 'Admin full name',
  fAdminEmail: 'Admin email',
  fLanguage: 'Language',
  fPlan: 'Plan',
  fBilling: 'Billing',
  modePilot: 'Pilot (plan features for N days, then free Discovery plan)',
  modeFree: 'Free Discovery plan',
  modeDirect: 'Direct contract (active now, billed outside Stripe)',
  fTrialDays: 'Trial length (days)',
  fContract: 'Contract value per month (€, optional)',
  fContractPlaceholder: 'e.g. 450',
  fSendEmail: 'Send the welcome email with the set-password link',
  noteDirect: 'Direct contract: the workspace is active immediately with the plan limits, has no trial and no Stripe checkout. Suspend it yourself if the contract ends.',
  noteFree: 'Discovery: same as a public sign-up (1 property, 2 users, 1 audit per quarter, Essential questionnaire).',
  notePilot: 'Pilot: the chosen plan for N days (usually Professional, 14 days). Afterwards the workspace falls back to the free Discovery plan unless the admin subscribes.',
  create: 'Create workspace',
  creating: 'Creating…',
  cancel: 'Cancel',
  createdEmailed: (name: string, email: string) => `Workspace "${name}" created. Welcome email sent to ${email}.`,
  createdNoEmailLink: (name: string) => `Workspace "${name}" created. No email was sent: send this set-password link yourself (valid 24 h):`,
  createdNoEmail: (name: string) => `Workspace "${name}" created. No email was sent.`,

  // Row actions
  viewAs: 'View as',
  offlineOn: 'Offline: on',
  offlineOff: 'Offline: off',
  offlineTitle: 'Offline audit mode',
  openPilot: 'Open pilot',
  endPilot: 'End pilot',
  suspend: 'Suspend',
  reactivate: 'Reactivate',
  delete: 'Delete',
  failed: 'Something went wrong. Please try again.',
  confirmSuspend: (name: string) => `Suspend ${name}? All its users will be locked out immediately.`,
  confirmReactivate: (name: string) => `Reactivate ${name}?`,
  confirmNotify: (reactivation: boolean) => `Email the workspace admins about this ${reactivation ? 'reactivation' : 'suspension'}?\n\nOK = send the email · Cancel = no email`,
  confirmEndPilot: (name: string) => `End the pilot of ${name} now? The workspace goes back to the free Discovery plan.`,
  promptPilot: (name: string) => `Open a Professional pilot for ${name}.\n\nNumber of days (1–30):`,
  confirmOfflineOff: (name: string) => `Switch OFF the offline audit mode for ${name}? Changes already on phones are still sent; phones stop keeping audits offline.`,
  confirmOfflineOn: (name: string) => `Switch ON the offline audit mode for ${name}? Auditors' phones will keep their audits (answers, notes, photos) until synchronised.`,
  promptDelete: (name: string) => `PERMANENTLY delete "${name}"?\n\nThis deletes its users, properties, campaigns, reports, photos and logo, and cancels any running Stripe subscription immediately (no refund). It cannot be undone.\n\nType the workspace name to confirm:`,
  nameMismatch: 'Name did not match: nothing deleted.',

  // Sales
  salesTitle: 'Sales',
  loadSalesFailed: 'Could not load the Stripe data. Please reload the page.',
  sMrr: 'MRR',
  sMrrNote: (stripe: string, youcan: string, direct: string, arr: string) => `Stripe ${stripe} + YouCan (MAD) ${youcan} + direct ${direct} · ARR ≈ ${arr}`,
  sCollected: 'Collected, last 30 days',
  sCollectedNote: (ytd: string, y12: string) => `${ytd} this year · ${y12} over 12 months (Stripe + YouCan, excl. tax)`,
  sPaying: 'Paying customers',
  sPayingNote: (stripe: number, youcan: number, direct: number, arpa: string) => `${stripe} Stripe + ${youcan} YouCan + ${direct} direct · avg ${arpa}/month (Stripe)`,
  sNewLost: 'New / lost this month',
  sNewLostNote: (newMrr: string, lostMrr: string, churn: string, last: string) => `+${newMrr} / −${lostMrr} MRR · churn ${churn} (last month ${last})`,
  sConversion: 'Sign-up → paid (90 days)',
  sConversionNote: (converted: number, cohort: number, running: number, ending: number) => `${converted} of ${cohort} sign-ups · ${running} pilots running, ${ending} ending within 7 days`,
  sIssues: 'Payment issues',
  sIssuesNote: (overdue: number, open: number, cents: string) => `${overdue} overdue subscriptions · ${open} open invoices (${cents})`,
  chartRevenue: 'Revenue collected per month',
  chartRevenueNote: 'Paid Zahir Guest invoices, after discounts, excluding tax.',
  chartMrr: 'MRR at the start of each month',
  chartMrrNote: 'Stripe subscriptions running on the 1st, at their current price (plan changes are not replayed). Direct contracts excluded.',
  renewals: (n: number) => `Renewals in the next 30 days (${n})`,
  renewsOn: 'Renews on',
  noRenewals: 'No renewal in the next 30 days.',
  cancellations: (n: number) => `Scheduled cancellations (${n})`,
  endsOn: 'Ends on',
  noCancellations: 'No subscription is set to end.',
  issues: (n: number) => `Payment issues (${n})`,
  periodEnds: 'Period ends',
  noIssues: 'No overdue subscription.',
  thCustomer: 'Customer', thBilling: 'Billing', thAmount: 'Amount', thMrr: 'MRR',
  monthByMonth: 'Month by month',
  thMonth: 'Month', thRevenue: 'Revenue', thMrrFirst: 'MRR on the 1st', thNew: 'New', thNewMrr: 'New MRR', thLost: 'Lost', thLostMrr: 'Lost MRR', thNet: 'Net MRR', thChurn: 'Churn',
  byPlan: 'By plan',
  byInterval: 'Monthly vs annual',
  thCustomers: 'Customers', thShare: 'Share',
  noPaying: 'No paying subscription yet.',
  directContracts: (n: number) => `Direct contracts (${n})`,
  thMonthlyValue: 'Monthly value', thSince: 'Since',
  listPrice: 'list price',
  allSubs: (n: number) => `All subscriptions (${n})`,
  thStarted: 'Started', thEnded: 'Ended',
  salesFootnote: 'Source: Stripe (live), Zahir Guest prices only — the Stripe account is shared with Za3fran. Amounts in euros, after recurring discounts, excluding tax.',
  salesRates: 'Amounts in USD and MAD are converted to EUR at fixed rates (1 $ = 0.90 €, 1 MAD = 0.10 €).',
  salesByCurrency: (list: string) => `Stripe MRR by currency: ${list}.`,
  salesUpdated: (when: string) => `Updated ${when} — reload the page to refresh.`,
}

const fr: typeof en = {
  platform: 'Plateforme',
  backToDashboard: '← Tableau de bord',
  tabOverview: "Vue d'ensemble",
  tabSales: 'Ventes',
  language: 'Langue',

  status: {
    active: 'actif', trialing: 'pilote', trial: 'pilote', past_due: 'en retard de paiement', unpaid: 'impayé', canceled: 'résilié',
    suspended: 'suspendu', trial_expired: 'pilote expiré', incomplete: 'incomplet', incomplete_expired: 'incomplet (expiré)', free: 'gratuit',
  },
  intervalMonth: 'mensuel',
  intervalYear: 'annuel',
  monthly: 'Mensuel',
  annual: 'Annuel',
  directContract: 'contrat direct',
  internalPlan: 'Interne',
  cancelledEnds: 'résilié — prend fin',
  ends: 'fin prévue',

  overviewTitle: "Vue d'ensemble de la plateforme",
  loadTenantsFailed: 'Impossible de charger les espaces. Rechargez la page.',
  statMrr: 'MRR (estimé)',
  statMrrNote: arr => `ARR ≈ ${arr}`,
  statPaying: 'Clients payants',
  statPayingNote: n => `${n} client${n > 1 ? 's' : ''} au total`,
  statPilots: 'Pilotes en cours',
  statPilotsNote: n => `${n} se terminant sous 3 jours`,
  statNew: 'Nouveaux (30 jours)',
  statNewNote: 'inscriptions + paiements',
  statAudits: 'Audits ce mois-ci',
  statAuditsNote: 'campagnes créées, tous espaces',
  statIssues: 'Problèmes de paiement',
  statIssuesNote: 'en retard / impayés',
  workspaces: n => `Espaces (${n})`,
  thWorkspace: 'Espace', thPlan: 'Offre', thStatus: 'Statut', thUsers: 'Utilisateurs', thProperties: 'Établissements',
  thAudits: 'Audits (mois / total)', thCreated: 'Créé le', thTrialEnds: 'Fin du pilote / renouvellement',
  overviewFootnote: "Le MRR est calculé d'après l'offre et la périodicité de chaque espace (offres annuelles divisées par 12), en comptant les abonnements actifs et en retard de paiement ; les contrats directs comptent leur valeur contractuelle (ou le prix catalogue si aucune n'a été saisie). Stripe reste la référence pour le chiffre d'affaires réel.",

  newWorkspace: '+ Nouvel espace',
  fCompany: 'Nom de la société / du client',
  fAdminName: "Nom complet de l'administrateur",
  fAdminEmail: "Email de l'administrateur",
  fLanguage: 'Langue',
  fPlan: 'Offre',
  fBilling: 'Facturation',
  modePilot: "Pilote (fonctions de l'offre pendant N jours, puis offre Découverte gratuite)",
  modeFree: 'Offre Découverte gratuite',
  modeDirect: 'Contrat direct (actif tout de suite, facturé hors Stripe)',
  fTrialDays: 'Durée du pilote (jours)',
  fContract: 'Valeur du contrat par mois (€, facultatif)',
  fContractPlaceholder: 'ex. 450',
  fSendEmail: "Envoyer l'email de bienvenue avec le lien pour définir le mot de passe",
  noteDirect: "Contrat direct : l'espace est actif tout de suite avec les limites de l'offre, sans pilote et sans paiement Stripe. Suspendez-le vous-même si le contrat prend fin.",
  noteFree: "Découverte : comme une inscription publique (1 établissement, 2 utilisateurs, 1 audit par trimestre, questionnaire Essentiel).",
  notePilot: "Pilote : l'offre choisie pendant N jours (en général Professionnel, 14 jours). Ensuite l'espace repasse à l'offre Découverte gratuite, sauf si l'administrateur s'abonne.",
  create: "Créer l'espace",
  creating: 'Création…',
  cancel: 'Annuler',
  createdEmailed: (name, email) => `Espace « ${name} » créé. Email de bienvenue envoyé à ${email}.`,
  createdNoEmailLink: name => `Espace « ${name} » créé. Aucun email envoyé : transmettez vous-même ce lien pour définir le mot de passe (valable 24 h) :`,
  createdNoEmail: name => `Espace « ${name} » créé. Aucun email envoyé.`,

  viewAs: 'Voir comme',
  offlineOn: 'Hors ligne : activé',
  offlineOff: 'Hors ligne : désactivé',
  offlineTitle: "Mode hors ligne de l'audit",
  openPilot: 'Ouvrir un pilote',
  endPilot: 'Terminer le pilote',
  suspend: 'Suspendre',
  reactivate: 'Réactiver',
  delete: 'Supprimer',
  failed: "Une erreur s'est produite. Veuillez réessayer.",
  confirmSuspend: name => `Suspendre ${name} ? Tous ses utilisateurs seront bloqués immédiatement.`,
  confirmReactivate: name => `Réactiver ${name} ?`,
  confirmNotify: reactivation => `Prévenir par email les administrateurs de l'espace de cette ${reactivation ? 'réactivation' : 'suspension'} ?\n\nOK = envoyer l'email · Annuler = pas d'email`,
  confirmEndPilot: name => `Terminer le pilote de ${name} maintenant ? L'espace repasse à l'offre Découverte gratuite.`,
  promptPilot: name => `Ouvrir un pilote Professionnel pour ${name}.\n\nNombre de jours (1–30) :`,
  confirmOfflineOff: name => `DÉSACTIVER le mode hors ligne de l'audit pour ${name} ? Les modifications déjà présentes sur les téléphones sont quand même envoyées ; les téléphones cessent de garder les audits hors ligne.`,
  confirmOfflineOn: name => `ACTIVER le mode hors ligne de l'audit pour ${name} ? Les téléphones des auditeurs garderont leurs audits (réponses, notes, photos) jusqu'à la synchronisation.`,
  promptDelete: name => `Supprimer DÉFINITIVEMENT « ${name} » ?\n\nCela supprime ses utilisateurs, établissements, campagnes, rapports, photos et logo, et annule tout abonnement Stripe en cours immédiatement (sans remboursement). Impossible à annuler.\n\nTapez le nom de l'espace pour confirmer :`,
  nameMismatch: "Le nom ne correspond pas : rien n'a été supprimé.",

  salesTitle: 'Ventes',
  loadSalesFailed: 'Impossible de charger les données Stripe. Rechargez la page.',
  sMrr: 'MRR',
  sMrrNote: (stripe, youcan, direct, arr) => `Stripe ${stripe} + YouCan (MAD) ${youcan} + direct ${direct} · ARR ≈ ${arr}`,
  sCollected: 'Encaissé, 30 derniers jours',
  sCollectedNote: (ytd, y12) => `${ytd} depuis janvier · ${y12} sur 12 mois (Stripe + YouCan, hors taxes)`,
  sPaying: 'Clients payants',
  sPayingNote: (stripe, youcan, direct, arpa) => `${stripe} Stripe + ${youcan} YouCan + ${direct} direct · moyenne ${arpa} / mois (Stripe)`,
  sNewLost: 'Nouveaux / perdus ce mois-ci',
  sNewLostNote: (newMrr, lostMrr, churn, last) => `+${newMrr} / −${lostMrr} de MRR · attrition ${churn} (mois dernier ${last})`,
  sConversion: 'Inscription → payant (90 jours)',
  sConversionNote: (converted, cohort, running, ending) => `${converted} inscription${converted > 1 ? 's' : ''} sur ${cohort} · ${running} pilote${running > 1 ? 's' : ''} en cours, ${ending} se terminant sous 7 jours`,
  sIssues: 'Problèmes de paiement',
  sIssuesNote: (overdue, open, cents) => `${overdue} abonnement${overdue > 1 ? 's' : ''} en retard · ${open} facture${open > 1 ? 's' : ''} ouverte${open > 1 ? 's' : ''} (${cents})`,
  chartRevenue: 'Chiffre encaissé par mois',
  chartRevenueNote: 'Factures Zahir Guest payées, après remises, hors taxes.',
  chartMrr: 'MRR au début de chaque mois',
  chartMrrNote: "Abonnements Stripe en cours au 1er du mois, à leur prix actuel (les changements d'offre ne sont pas rejoués). Contrats directs exclus.",
  renewals: n => `Renouvellements dans les 30 prochains jours (${n})`,
  renewsOn: 'Renouvelé le',
  noRenewals: 'Aucun renouvellement dans les 30 prochains jours.',
  cancellations: n => `Résiliations programmées (${n})`,
  endsOn: 'Fin le',
  noCancellations: "Aucun abonnement n'est programmé pour se terminer.",
  issues: n => `Problèmes de paiement (${n})`,
  periodEnds: 'Fin de période',
  noIssues: 'Aucun abonnement en retard.',
  thCustomer: 'Client', thBilling: 'Facturation', thAmount: 'Montant', thMrr: 'MRR',
  monthByMonth: 'Mois par mois',
  thMonth: 'Mois', thRevenue: 'Encaissé', thMrrFirst: 'MRR au 1er', thNew: 'Nouveaux', thNewMrr: 'MRR nouveau', thLost: 'Perdus', thLostMrr: 'MRR perdu', thNet: 'MRR net', thChurn: 'Attrition',
  byPlan: 'Par offre',
  byInterval: 'Mensuel ou annuel',
  thCustomers: 'Clients', thShare: 'Part',
  noPaying: 'Aucun abonnement payant pour le moment.',
  directContracts: n => `Contrats directs (${n})`,
  thMonthlyValue: 'Valeur mensuelle', thSince: 'Depuis',
  listPrice: 'prix catalogue',
  allSubs: n => `Tous les abonnements (${n})`,
  thStarted: 'Début', thEnded: 'Fin',
  salesFootnote: 'Source : Stripe (production), prix Zahir Guest uniquement — le compte Stripe est partagé avec Za3fran. Montants en euros, après remises récurrentes, hors taxes.',
  salesRates: 'Les montants en USD et en MAD sont convertis en EUR à taux fixes (1 $ = 0,90 €, 1 MAD = 0,10 €).',
  salesByCurrency: list => `MRR Stripe par devise : ${list}.`,
  salesUpdated: when => `Mis à jour le ${when} — rechargez la page pour actualiser.`,
}

export const SA: Record<Lang, typeof en> = { en, fr }
