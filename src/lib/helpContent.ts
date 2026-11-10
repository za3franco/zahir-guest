// Help centre articles (EN + FR). Used by /dashboard/help AND as the knowledge base of the AI coach,
// so keep them factual and in sync with the product. `roles` limits who sees an article.

export type Lang = 'en' | 'fr'
export type HelpRole = 'admin' | 'auditor' | 'manager'

export interface HelpArticle {
  id: string
  roles: HelpRole[]
  title: Record<Lang, string>
  body: Record<Lang, string>
}

export function helpRoleFor(role: string): HelpRole {
  if (role === 'auditor') return 'auditor'
  if (role === 'property_manager' || role === 'department_manager') return 'manager'
  return 'admin'
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'getting-started',
    roles: ['admin'],
    title: { en: 'Getting started: your first audit in 3 steps', fr: 'Démarrer : votre premier audit en 3 étapes' },
    body: {
      en: '1) Properties: add the hotel or restaurant you want to audit (Properties > New property). 2) Users: invite an auditor by email (Users > Invite). They receive a link to set their password. 3) Campaigns: create a campaign (Campaigns > New), choose the property, the questionnaire template, the auditor and the visit window. The auditor is notified by email and finds the audit under "My Audits".',
      fr: "1) Établissements : ajoutez l'hôtel ou le restaurant à auditer (Établissements > Nouvel établissement). 2) Utilisateurs : invitez un auditeur par email (Utilisateurs > Inviter). Il reçoit un lien pour définir son mot de passe. 3) Campagnes : créez une campagne (Campagnes > Nouvelle), choisissez l'établissement, le modèle de questionnaire, l'auditeur et la fenêtre de visite. L'auditeur est prévenu par email et retrouve l'audit dans « Mes audits ».",
    },
  },
  {
    id: 'properties',
    roles: ['admin'],
    title: { en: 'Managing properties', fr: 'Gérer les établissements' },
    body: {
      en: 'Properties are the establishments you audit. Each has a category, city, contact details, an optional property manager (who can see its published reports) and extended details (phone, website, rooms, region, GM, official star rating). You can edit or archive a property at any time. The number of properties is limited by your plan (see Billing).',
      fr: "Les établissements sont les lieux que vous auditez. Chacun a une catégorie, une ville, des contacts, un directeur d'établissement optionnel (qui voit ses rapports publiés) et des informations détaillées (téléphone, site web, chambres, région, directeur général, classement officiel). Vous pouvez modifier ou archiver un établissement à tout moment. Le nombre d'établissements dépend de votre forfait (voir Facturation).",
    },
  },
  {
    id: 'users-roles',
    roles: ['admin'],
    title: { en: 'Users and roles', fr: 'Utilisateurs et rôles' },
    body: {
      en: 'Roles: Admin (full access to your workspace), Auditor (performs audits on mobile), Property Manager and Department Manager (see the published reports and score trends of their properties). Invite people from Users > Invite: they get an email with a link to set their password (valid 24 hours). You can change a user\'s role, name or language, or remove them from Users. The number of users depends on your plan.',
      fr: "Rôles : Administrateur (accès complet à votre espace), Auditeur (réalise les audits sur mobile), Directeur d'établissement et Chef de département (voient les rapports publiés et l'évolution des scores de leurs établissements). Invitez depuis Utilisateurs > Inviter : la personne reçoit un email avec un lien pour définir son mot de passe (valable 24 h). Vous pouvez modifier le rôle, le nom ou la langue d'un utilisateur, ou le retirer, depuis Utilisateurs. Le nombre d'utilisateurs dépend de votre forfait.",
    },
  },
  {
    id: 'campaign-flow',
    roles: ['admin'],
    title: { en: 'Campaign statuses: from assigned to published', fr: 'Statuts d\'une campagne : de assignée à publiée' },
    body: {
      en: 'A campaign moves through: Assigned (auditor notified) > In Progress (auditor started) > Submitted (auditor sent the audit) > Under Review (you check scores and answers) > Finalized (review complete, report ready) > Published (the property manager can see the report). Open a campaign from Campaigns to change its status. Admins can also move a campaign backward, for example to unpublish a report (Published > Finalized) so it can be corrected.',
      fr: "Une campagne passe par : Assignée (auditeur prévenu) > En cours (l'auditeur a commencé) > Soumise (l'auditeur a envoyé l'audit) > En révision (vous vérifiez scores et réponses) > Finalisée (révision terminée, rapport prêt) > Publiée (le directeur voit le rapport). Ouvrez une campagne depuis Campagnes pour changer son statut. Un administrateur peut aussi revenir en arrière, par exemple dépublier un rapport (Publiée > Finalisée) pour le corriger.",
    },
  },
  {
    id: 'review-report',
    roles: ['admin'],
    title: { en: 'Reviewing an audit and generating the report', fr: 'Réviser un audit et générer le rapport' },
    body: {
      en: 'Once an audit is Submitted, open the campaign and use Review: the Scores tab shows section, domain and overall scores; Responses lets you check each answer and note; Executive Summary is where you write your synthesis. Generate the report, preview it, then publish. To get a PDF, open the report and use "Save as PDF" (your browser\'s print dialog). On Professional and Enterprise plans, reports use your logo, name and brand colour (Branding page).',
      fr: "Une fois l'audit Soumis, ouvrez la campagne puis Réviser : l'onglet Scores montre les scores par section, domaine et global ; Réponses permet de contrôler chaque réponse et chaque note ; Synthèse exécutive est l'endroit où rédiger votre synthèse. Générez le rapport, prévisualisez-le, puis publiez. Pour obtenir un PDF, ouvrez le rapport et utilisez « Save as PDF » (impression du navigateur). Avec les forfaits Professional et Enterprise, les rapports reprennent votre logo, votre nom et votre couleur (page Marque).",
    },
  },
  {
    id: 'branding',
    roles: ['admin'],
    title: { en: 'White-label branding', fr: 'Marque blanche' },
    body: {
      en: 'On the Professional and Enterprise plans, the Branding page lets you set your brand name, accent colour and logo (PNG, JPG or WebP, 1 MB max). They appear in the sidebar, on report covers and as the sender name of notification emails. During the free trial this feature is locked.',
      fr: "Avec les forfaits Professional et Enterprise, la page Marque permet de définir votre nom de marque, votre couleur d'accent et votre logo (PNG, JPG ou WebP, 1 Mo max). Ils apparaissent dans la barre latérale, sur la couverture des rapports et comme nom d'expéditeur des emails de notification. Pendant l'essai gratuit, cette fonction est verrouillée.",
    },
  },
  {
    id: 'billing',
    roles: ['admin'],
    title: { en: 'Plans, trial and billing', fr: 'Forfaits, essai et facturation' },
    body: {
      en: 'New workspaces get a 14-day free trial without a card. The Billing page shows your plan, usage against its limits and lets you choose or change plan (monthly or annual). "Manage billing" opens the secure Stripe portal to update your card, download invoices or cancel. Starter: 3 properties, 5 users, 20 audits per month. Professional: 15 properties, 15 users, unlimited audits, white-label. Enterprise: unlimited, from €599/month. When a limit is reached you are asked to upgrade. When the trial ends you must choose a plan to continue.',
      fr: "Les nouveaux espaces bénéficient de 14 jours d'essai gratuit sans carte. La page Facturation montre votre forfait, votre utilisation par rapport aux limites, et permet de choisir ou changer de forfait (mensuel ou annuel). « Gérer la facturation » ouvre le portail Stripe sécurisé pour changer de carte, télécharger les factures ou résilier. Starter : 3 établissements, 5 utilisateurs, 20 audits par mois. Professional : 15 établissements, 15 utilisateurs, audits illimités, marque blanche. Enterprise : illimité, à partir de 599 €/mois. Quand une limite est atteinte, on vous propose de changer de forfait. À la fin de l'essai, vous devez choisir un forfait pour continuer.",
    },
  },
  {
    id: 'password',
    roles: ['admin', 'auditor', 'manager'],
    title: { en: 'Password, language and profile', fr: 'Mot de passe, langue et profil' },
    body: {
      en: 'Forgot your password? On the sign-in page choose "Forgot password?" and you will receive a reset link by email. To change your password or your language, open your name at the bottom of the sidebar (Profile). The language switch (FR | EN) is also at the bottom of the sidebar. For security you are signed out after a period of inactivity (8 hours for admins, 2 hours for auditors).',
      fr: "Mot de passe oublié ? Sur la page de connexion, choisissez « Mot de passe oublié ? » : vous recevrez un lien de réinitialisation par email. Pour changer votre mot de passe ou votre langue, ouvrez votre nom en bas de la barre latérale (Profil). Le sélecteur de langue (FR | EN) est aussi en bas de la barre latérale. Par sécurité, vous êtes déconnecté après une période d'inactivité (8 heures pour les administrateurs, 2 heures pour les auditeurs).",
    },
  },
  {
    id: 'auditor-start',
    roles: ['auditor'],
    title: { en: 'Doing an audit on your phone', fr: 'Réaliser un audit sur votre téléphone' },
    body: {
      en: 'Open "My Audits": your assigned campaigns are listed with their visit window. Open one and answer each standard: Meet, Below or N/A. You can add a note to any standard. Each section also has an emotional rating from 1 to 5 (Pampered, Delighted, Content, Disappointed, Frustrated). Your progress is saved as you go. When everything is complete, use Submit: the admin is notified and reviews your audit.',
      fr: "Ouvrez « Mes audits » : vos campagnes assignées sont listées avec leur fenêtre de visite. Ouvrez-en une et répondez à chaque standard : Conforme, Non conforme ou N/A. Vous pouvez ajouter une note à chaque standard. Chaque section a aussi une note émotionnelle de 1 à 5 (Choyé, Ravi, Satisfait, Déçu, Frustré). Votre progression est enregistrée au fur et à mesure. Quand tout est complété, utilisez Soumettre : l'administrateur est prévenu et révise votre audit.",
    },
  },
  {
    id: 'auditor-tips',
    roles: ['auditor'],
    title: { en: 'Tips for reliable audits', fr: 'Conseils pour des audits fiables' },
    body: {
      en: 'Answer during or right after the visit while details are fresh. Note precisely what was below standard (who, where, when): it makes the report much more convincing. Use notes to explain the context, not to repeat the question. Keep your visit discreet: you are a guest, not an inspector. If a standard does not apply to the property, choose N/A rather than leaving it blank.',
      fr: "Répondez pendant ou juste après la visite, tant que les détails sont frais. Notez précisément ce qui était en dessous du standard (qui, où, quand) : le rapport n'en est que plus convaincant. Utilisez les notes pour expliquer le contexte, pas pour répéter la question. Restez discret : vous êtes un client, pas un inspecteur. Si un standard ne s'applique pas à l'établissement, choisissez N/A plutôt que de le laisser vide.",
    },
  },
  {
    id: 'manager-reports',
    roles: ['manager'],
    title: { en: 'Reading your reports and score trends', fr: 'Lire vos rapports et l\'évolution des scores' },
    body: {
      en: 'Your Dashboard shows the published reports for your properties. Use the date filter to narrow the period. The trend chart shows how your overall score evolves audit after audit, and the domain table compares each domain (front office, housekeeping, food & beverage...) with the previous audit, with the difference highlighted. Open a report to read the detailed findings and use "Save as PDF" to keep a copy.',
      fr: "Votre tableau de bord montre les rapports publiés de vos établissements. Utilisez le filtre de dates pour restreindre la période. Le graphique d'évolution montre votre score global d'audit en audit, et le tableau par domaine compare chaque domaine (réception, hébergement, restauration...) avec l'audit précédent, avec l'écart mis en évidence. Ouvrez un rapport pour lire les constats détaillés et utilisez « Save as PDF » pour en garder une copie.",
    },
  },
  {
    id: 'scoring',
    roles: ['admin', 'auditor', 'manager'],
    title: { en: 'How scores are calculated', fr: 'Comment les scores sont calculés' },
    body: {
      en: 'Each standard is Meet, Below or N/A. A section score is Meet divided by (total standards minus N/A), as a percentage. Section scores roll up into domain scores and then the overall score. Standards are also classified (efficiency, service, sales opportunity, emotional intelligence, cleanliness, product), which gives a breakdown of where the gaps are.',
      fr: "Chaque standard est Conforme, Non conforme ou N/A. Le score d'une section est le nombre de Conformes divisé par (total des standards moins les N/A), en pourcentage. Les scores de sections remontent en scores de domaines puis en score global. Les standards sont aussi classés (efficacité, service, opportunité de vente, intelligence émotionnelle, propreté, produit), ce qui donne une répartition des écarts.",
    },
  },
  {
    id: 'support',
    roles: ['admin', 'auditor', 'manager'],
    title: { en: 'Getting help and sending suggestions', fr: 'Obtenir de l\'aide et envoyer des suggestions' },
    body: {
      en: 'Ask the assistant (button at the bottom right) for a quick answer. If it cannot solve your problem you can send your question to our support team from the same window or from the Help page; we reply by email. To propose an improvement or a new feature, use "Suggest a feature" in the sidebar.',
      fr: "Posez votre question à l'assistant (bouton en bas à droite) pour une réponse rapide. S'il ne résout pas votre problème, vous pouvez envoyer votre question à notre équipe support depuis la même fenêtre ou depuis la page Aide ; nous répondons par email. Pour proposer une amélioration ou une nouvelle fonctionnalité, utilisez « Suggérer une fonctionnalité » dans la barre latérale.",
    },
  },
]

export function articlesFor(role: string): HelpArticle[] {
  const r = helpRoleFor(role)
  return HELP_ARTICLES.filter(a => a.roles.includes(r))
}
