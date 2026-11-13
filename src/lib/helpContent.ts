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
  if (role === 'property_manager' || role === 'department_manager' || role === 'client_admin') return 'manager'
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
      en: 'Properties are the establishments you audit. Each has a category, city, contact details, an optional client it belongs to, and extended details (phone, website, rooms, region, GM, official star rating). You can edit or archive a property at any time. The number of properties is limited by your plan (see Billing).',
      fr: "Les établissements sont les lieux que vous auditez. Chacun a une catégorie, une ville, des contacts, un client de rattachement optionnel et des informations détaillées (téléphone, site web, chambres, région, directeur général, classement officiel). Vous pouvez modifier ou archiver un établissement à tout moment. Le nombre d'établissements dépend de votre forfait (voir Facturation).",
    },
  },
  {
    id: 'users-roles',
    roles: ['admin'],
    title: { en: 'Users and roles', fr: 'Utilisateurs et rôles' },
    body: {
      en: 'Roles: Admin (full access to your workspace), Auditor (performs audits on mobile), Client manager, Property manager and Department manager (see the published reports and score trends of the client or properties you give them access to). After inviting a manager, open their page (Users > Edit) and tick what they can see in "Access to reports": a whole client or individual properties. Invite people from Users > Invite: they get an email with a link to set their password (valid 24 hours). You can change a user\'s role, name or language, or remove them from Users. The number of users depends on your plan.',
      fr: "Rôles : Administrateur (accès complet à votre espace), Auditeur (réalise les audits sur mobile), Responsable client, Directeur d'établissement et Chef de département (voient les rapports publiés et l'évolution des scores du client ou des établissements auxquels vous leur donnez accès). Après avoir invité un responsable, ouvrez sa fiche (Utilisateurs > Modifier) et cochez ce qu'il voit dans « Accès aux rapports » : un client entier ou des établissements à l'unité. Invitez depuis Utilisateurs > Inviter : la personne reçoit un email avec un lien pour définir son mot de passe (valable 24 h). Vous pouvez modifier le rôle, le nom ou la langue d'un utilisateur, ou le retirer, depuis Utilisateurs. Le nombre d'utilisateurs dépend de votre forfait.",
    },
  },
  {
    id: 'clients',
    roles: ['admin'],
    title: { en: 'Clients, contracts and access', fr: 'Clients, contrats et accès' },
    body: {
      en: 'Clients (menu Clients) group the properties of one customer: a hotel group, an independent hotel or a programme. On a client page you see its properties, the people who can see its reports, its recent campaigns and its contract (reference, value, dates, audits planned vs done, days left). Attach properties from the client page or choose the client when creating a property. Give access from each user\'s page: a whole client (including properties added later) or individual properties. Client managers, property managers and department managers only ever see published reports. The Users list is grouped by client and can be filtered by role and client; the Campaigns list can be filtered by client. Contract figures are internal and never shown to the client.',
      fr: "Les clients (menu Clients) regroupent les établissements d'un même donneur d'ordre : un groupe hôtelier, un hôtel indépendant ou un programme. La fiche client montre ses établissements, les personnes qui voient ses rapports, ses campagnes récentes et son contrat (référence, montant, dates, audits prévus et réalisés, jours restants). Rattachez des établissements depuis la fiche client, ou choisissez le client en créant un établissement. Donnez les accès depuis la fiche de chaque utilisateur : un client entier (y compris ses futurs établissements) ou des établissements à l'unité. Les responsables client, directeurs d'établissement et chefs de département ne voient que les rapports publiés. La liste des utilisateurs est regroupée par client et filtrable par rôle et par client ; la liste des campagnes est filtrable par client. Les informations de contrat sont internes et ne sont jamais montrées au client.",
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
      en: 'Once an audit is Submitted, open the campaign and use Review: the Scores tab shows section, domain and overall scores; Responses lets you check each answer, note and photo; Executive Summary is where you write your synthesis. Generate the report, preview it, then publish. Photos appear as thumbnails under each standard in the report appendix. To get a PDF, open the report and use "Save as PDF" (your browser\'s print dialog). On Professional and Enterprise plans, reports use your logo, name and brand colour (Branding page).',
      fr: "Une fois l'audit Soumis, ouvrez la campagne puis Réviser : l'onglet Scores montre les scores par section, domaine et global ; Réponses permet de contrôler chaque réponse, chaque note et chaque photo ; Synthèse exécutive est l'endroit où rédiger votre synthèse. Générez le rapport, prévisualisez-le, puis publiez. Les photos apparaissent en vignettes sous chaque standard dans l'annexe du rapport. Pour obtenir un PDF, ouvrez le rapport et utilisez « Save as PDF » (impression du navigateur). Avec les forfaits Professional et Enterprise, les rapports reprennent votre logo, votre nom et votre couleur (page Marque).",
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
    title: { en: 'Plans and billing', fr: 'Forfaits et facturation' },
    body: {
      en: 'New workspaces start on the free Discovery plan: 1 property, 2 users, 1 audit per quarter with the Essential questionnaire. The Billing page shows your plan and usage against its limits and lets you choose or change plan. Hotel: 1 property (a 2nd as an option), 6 users, 6 audits per month, your own questionnaires. Professional: 5 properties included and up to 30, unlimited users and audits, white-label. Enterprise: on quote. In euros or dollars you pay monthly or yearly by card (Stripe); "Manage billing" opens the secure portal for your card, invoices and cancellation. In dirhams you prepay a quarter or a year through YouCan Pay. When a paid plan or a pilot ends, the workspace returns to the Discovery plan and your data is kept.',
      fr: "Les nouveaux espaces démarrent avec l'offre Découverte gratuite : 1 établissement, 2 utilisateurs, 1 audit par trimestre avec le questionnaire Essentiel. La page Facturation montre votre forfait et votre utilisation, et permet de choisir ou changer de forfait. Hôtel : 1 établissement (un 2e en option), 6 utilisateurs, 6 audits par mois, vos propres questionnaires. Professional : 5 établissements inclus et jusqu'à 30, utilisateurs et audits illimités, marque blanche. Enterprise : sur devis. En euros ou en dollars, vous payez par carte au mois ou à l'année (Stripe) ; « Gérer la facturation » ouvre le portail sécurisé pour la carte, les factures et la résiliation. En dirhams, vous prépayez un trimestre ou une année via YouCan Pay. À la fin d'un forfait payant ou d'un pilote, l'espace revient à l'offre Découverte et vos données sont conservées.",
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
      en: 'Open "My Audits": your assigned campaigns are listed with their visit window. Open one and answer each standard: Meet, Below or N/A. You can add a note and up to 4 photos to any standard (button "Add photo": take a picture or choose one from your gallery; photos are shrunk automatically). An audit holds up to 40 photos. Each section also has an emotional rating from 1 to 5 (Pampered, Delighted, Content, Disappointed, Frustrated). Your progress is saved as you go. When everything is complete, use Submit: the admin is notified and reviews your audit.',
      fr: "Ouvrez « Mes audits » : vos campagnes assignées sont listées avec leur fenêtre de visite. Ouvrez-en une et répondez à chaque standard : Conforme, Non conforme ou N/A. Vous pouvez ajouter une note et jusqu'à 4 photos à chaque standard (bouton « Ajouter une photo » : prenez une photo ou choisissez-en une dans votre galerie ; elles sont réduites automatiquement). Un audit peut contenir jusqu'à 40 photos. Chaque section a aussi une note émotionnelle de 1 à 5 (Choyé, Ravi, Satisfait, Déçu, Frustré). Votre progression est enregistrée au fur et à mesure. Quand tout est complété, utilisez Soumettre : l'administrateur est prévenu et révise votre audit.",
    },
  },
  {
    id: 'auditor-tips',
    roles: ['auditor'],
    title: { en: 'Tips for reliable audits', fr: 'Conseils pour des audits fiables' },
    body: {
      en: 'Answer during or right after the visit while details are fresh. Add a photo and note precisely what was below standard (who, where, when): it makes the report much more convincing. Use notes to explain the context, not to repeat the question. Keep your visit discreet: you are a guest, not an inspector. If a standard does not apply to the property, choose N/A rather than leaving it blank.',
      fr: "Répondez pendant ou juste après la visite, tant que les détails sont frais. Ajoutez une photo et notez précisément ce qui était en dessous du standard (qui, où, quand) : le rapport n'en est que plus convaincant. Utilisez les notes pour expliquer le contexte, pas pour répéter la question. Restez discret : vous êtes un client, pas un inspecteur. Si un standard ne s'applique pas à l'établissement, choisissez N/A plutôt que de le laisser vide.",
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
