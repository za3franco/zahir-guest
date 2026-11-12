// Landing page copy (EN + FR). Single source for the page, the FAQ rich result and llms.txt.
// Only factual product claims here: no invented customers, testimonials or statistics.

export type Lang = 'en' | 'fr'
export interface Faq { q: string; a: string }

export const COPY = {
  fr: {
    metaTitle: "Zahir Guest — Logiciel d'audit mystère pour l'hôtellerie",
    metaDescription:
      "Plateforme d'audit client mystère pour hôtels, cabinets d'audit et programmes de classification : audits sur mobile, scores automatiques, rapports PDF en marque blanche et portail pour les directeurs d'établissement. Essai gratuit 14 jours.",
    nav: { features: 'Fonctionnalités', how: 'Comment ça marche', pricing: 'Tarifs', faq: 'FAQ', login: 'Connexion', dashboard: 'Mon espace', cta: "Essai gratuit", menu: 'Menu' },
    hero: {
      eyebrow: "Plateforme d'audit client mystère",
      title: 'Révélez ce qui ne peut plus être ignoré.',
      sub: "Zahir Guest transforme chaque visite mystère en rapport prêt pour la direction : audit sur mobile, scores calculés automatiquement, rapports PDF à votre image et suivi dans le temps pour chaque établissement.",
      cta: "Démarrer l'essai gratuit",
      cta2: 'Réserver une démo',
      note: '14 jours gratuits · sans carte bancaire · FR / EN',
    },
    audience: {
      title: 'Conçu pour ceux qui mesurent la qualité de service',
      items: [
        { t: 'Hôtels indépendants', d: "Faites auditer votre hôtel ou votre riad par vos chefs de service avec des standards éprouvés, et suivez vos progrès mois après mois." },
        { t: "Cabinets d'audit mystère", d: "Gérez plusieurs clients, plusieurs auditeurs et livrez des rapports à votre marque." },
        { t: 'Groupes hôteliers', d: "Auditez vos propres établissements avec une méthode homogène et comparez-les entre eux." },
        { t: 'Programmes institutionnels', d: "Suivez des centaines d'établissements dans le cadre de programmes de visite mystère et de classification." },
      ],
    },
    features: {
      title: "De la visite sur le terrain au rapport, un seul outil",
      sub: "Tout ce qu'il faut pour mener des audits mystère sérieux, sans tableurs ni documents Word.",
      items: [
        { t: 'Audit sur mobile', d: "Vos auditeurs répondent standard par standard (Conforme / Non conforme / N/A), ajoutent des observations et des photos, directement depuis leur téléphone." },
        { t: 'Standards hôteliers inclus', d: "Une bibliothèque de plus de 570 standards couvre l'accueil, l'hébergement, la restauration, les espaces et le spa. Adaptable à chaque catégorie." },
        { t: 'Scores automatiques', d: "Du standard à la section, puis au domaine et au score global : calculés instantanément, avec la répartition par type de standard et une note émotionnelle." },
        { t: 'Rapports PDF en marque blanche', d: "Un rapport structuré avec tableau de bord visuel, annexes détaillées et photos à l'appui, à votre logo et à vos couleurs. Formule Professional et Enterprise." },
        { t: 'Portail pour les directeurs', d: "Chaque directeur d'établissement consulte ses rapports publiés, l'évolution de ses scores et la comparaison par domaine." },
        { t: 'Équipes et rôles', d: "Administrateurs, auditeurs, directeurs d'établissement : chacun voit uniquement ce qui le concerne. Données isolées par client." },
      ],
    },
    how: {
      title: 'Comment ça marche',
      steps: [
        { t: 'Configurez', d: "Ajoutez vos établissements et invitez vos auditeurs. Créez votre première campagne en quelques clics." },
        { t: 'Auditez', d: "L'auditeur reçoit sa mission, réalise la visite et remplit l'audit sur son téléphone, photos à l'appui." },
        { t: 'Publiez', d: "Relisez, ajoutez votre synthèse, générez le rapport et publiez-le : le directeur y accède aussitôt." },
      ],
    },
    tour: {
      eyebrow: 'Le produit',
      title: "Ce que vos équipes voient, écran par écran",
      sub: "De vraies captures de Zahir Guest, avec des données de démonstration.",
      caption: 'Données de démonstration',
      items: [
        { t: "L'audit se fait au téléphone, pendant la visite", d: "Une question à la fois, de grands boutons Conforme / Non conforme / N/A utilisables d'une main, des observations et des photos. Tout est enregistré au fur et à mesure.", points: ['Critères critiques signalés', 'Photos compressées sur le téléphone', 'Note émotionnelle par section'] },
        { t: 'Un rapport prêt pour la direction', d: "Score global, scores par domaine et par type de standard, synthèse rédigée (avec l'aide de l'IA si vous le souhaitez), annexe détaillée et photos. À votre logo avec la formule Professional.", points: ['PDF en un clic', 'Français et anglais', 'Publication aux directeurs concernés'] },
        { t: 'Le suivi de tout un portefeuille', d: "Évolution des scores, classement des établissements, points faibles par type de standard et non-conformités récurrentes : de quoi piloter un groupe ou un programme d'audit.", points: ['Filtres par client, établissement et période', 'Comparaison à la moyenne du portefeuille', 'Accès pour les directeurs et les clients'] },
      ],
    },
    preview: { label: 'Exemple de rapport', score: 'Score global', domains: ['Réception', 'Hébergement', 'Restauration', 'Espaces'], caption: 'Exemple illustratif' },
    pricing: {
      title: 'Un prix par établissement, rien de caché',
      sub: "Vous payez pour les établissements que vous suivez, pas pour le nombre de personnes qui travaillent dessus. 14 jours gratuits, sans carte.",
    },
    faqTitle: 'Questions fréquentes',
    finalCta: { title: "Prêt à voir ce que vos clients voient ?", sub: "Créez votre espace en deux minutes. Aucune carte bancaire requise.", cta: "Démarrer l'essai gratuit", cta2: 'Réserver une démo' },
    footer: { tagline: 'Ce qui est révélé ne peut plus être ignoré.', product: 'Produit', contact: 'Contact', by: 'Un produit Za3fran Consulting', rights: 'Tous droits réservés.' },
  },
  en: {
    metaTitle: 'Zahir Guest — Mystery guest audit software for hospitality',
    metaDescription:
      'Mystery guest audit platform for hotels, audit firms and classification programmes: mobile audits, automatic scoring, white-label PDF reports and a portal for property managers. 14-day free trial.',
    nav: { features: 'Features', how: 'How it works', pricing: 'Pricing', faq: 'FAQ', login: 'Sign in', dashboard: 'My workspace', cta: 'Free trial', menu: 'Menu' },
    hero: {
      eyebrow: 'Mystery guest audit platform',
      title: 'Reveal what cannot be unseen.',
      sub: 'Zahir Guest turns every mystery visit into a board-ready report: mobile audits, automatic scoring, PDF reports in your own brand, and score tracking over time for every property.',
      cta: 'Start your free trial',
      cta2: 'Book a demo',
      note: '14 days free · no credit card · EN / FR',
    },
    audience: {
      title: 'Built for people who measure service quality',
      items: [
        { t: 'Independent hotels', d: 'Have your hotel or riad audited by your heads of department against proven standards, and track progress month after month.' },
        { t: 'Mystery audit firms', d: 'Manage several clients and auditors, and deliver reports under your own brand.' },
        { t: 'Hotel groups', d: 'Audit your own properties with one consistent method and benchmark them against each other.' },
        { t: 'Institutional programmes', d: 'Track hundreds of establishments within mystery visit and classification programmes.' },
      ],
    },
    features: {
      title: 'From the field visit to the report, one tool',
      sub: 'Everything you need to run serious mystery guest audits, without spreadsheets or Word documents.',
      items: [
        { t: 'Mobile audits', d: 'Auditors answer standard by standard (Meet / Below / N/A), add observations and photos, straight from their phone.' },
        { t: 'Hospitality standards included', d: 'A library of 570+ standards covers arrival, rooms, food & beverage, public areas and spa. Adaptable to each category.' },
        { t: 'Automatic scoring', d: 'From standard to section, domain and overall score: calculated instantly, with a breakdown by standard type and an emotional rating.' },
        { t: 'White-label PDF reports', d: 'A structured report with a visual scorecard, detailed appendices and photo evidence, in your logo and colours. Professional and Enterprise plans.' },
        { t: 'Property manager portal', d: 'Each property manager sees their published reports, score history and domain-by-domain comparison.' },
        { t: 'Teams and roles', d: 'Admins, auditors, property managers: everyone sees only what concerns them. Data is isolated per customer.' },
      ],
    },
    how: {
      title: 'How it works',
      steps: [
        { t: 'Set up', d: 'Add your properties and invite your auditors. Create your first campaign in a few clicks.' },
        { t: 'Audit', d: 'The auditor receives the assignment, makes the visit and fills in the audit on their phone, photos included.' },
        { t: 'Publish', d: 'Review, add your executive summary, generate the report and publish it: the property manager has access right away.' },
      ],
    },
    tour: {
      eyebrow: 'The product',
      title: 'What your teams see, screen by screen',
      sub: 'Real Zahir Guest screens, with demonstration data.',
      caption: 'Demonstration data',
      items: [
        { t: 'The audit happens on the phone, during the visit', d: 'One question at a time, large one-handed Meet / Below / N/A buttons, observations and photos. Everything is saved as you go.', points: ['Critical standards flagged', 'Photos compressed on the phone', 'Emotional rating per section'] },
        { t: 'A report ready for the general manager', d: 'Overall score, scores by domain and by type of standard, a written summary (AI-assisted if you wish), a detailed appendix and photos. In your own brand on the Professional plan.', points: ['PDF in one click', 'English and French', 'Published to the right managers'] },
        { t: 'Track a whole portfolio', d: 'Score trends, property ranking, weak spots by type of standard and recurring failures: what you need to steer a hotel group or an audit programme.', points: ['Filters by client, property and period', 'Benchmark against the portfolio average', 'Access for managers and clients'] },
      ],
    },
    preview: { label: 'Sample report', score: 'Overall score', domains: ['Front office', 'Housekeeping', 'Food & Beverage', 'Public areas'], caption: 'Illustrative example' },
    pricing: {
      title: 'Priced per property, nothing hidden',
      sub: 'You pay for the properties you track, not for the number of people working on them. 14 days free, no card needed.',
    },
    faqTitle: 'Frequently asked questions',
    finalCta: { title: 'Ready to see what your guests see?', sub: 'Create your workspace in two minutes. No credit card required.', cta: 'Start your free trial', cta2: 'Book a demo' },
    footer: { tagline: 'Reveal what cannot be unseen.', product: 'Product', contact: 'Contact', by: 'A Za3fran Consulting product', rights: 'All rights reserved.' },
  },
} as const

export const FAQS: Record<Lang, Faq[]> = {
  fr: [
    { q: "Qu'est-ce qu'un audit client mystère ?", a: "Un audit mystère (ou visite mystère) consiste à envoyer un auditeur qui se comporte comme un client ordinaire pour évaluer la qualité réelle du service, par rapport à des standards définis. Zahir Guest organise cette démarche de bout en bout : missions, audit sur mobile, scores et rapports." },
    { q: "À qui s'adresse Zahir Guest ?", a: "Aux cabinets d'audit mystère, aux groupes hôteliers et restaurateurs qui auditent leurs propres établissements, et aux programmes institutionnels de classification ou de contrôle qualité." },
    { q: "Comment fonctionne l'essai gratuit ?", a: "Vous créez votre espace en deux minutes, sans carte bancaire, et disposez de 14 jours pour tester le produit. À la fin de l'essai, vous choisissez un forfait pour continuer." },
    { q: "Combien coûte Zahir Guest ?", a: "Hôtel à 79 €/mois pour un établissement. Professional à 249 €/mois avec 5 établissements inclus, puis 39 € par établissement supplémentaire jusqu'à 30, avec utilisateurs et audits illimités et rapports en marque blanche. Enterprise à partir de 1 490 €/mois pour 50 établissements et plus. En annuel, deux mois sont offerts. Les prix sont aussi proposés en dollars et, au Maroc, en dirhams." },
    { q: "Comment payer en dirhams ?", a: "Au Maroc, vous payez par carte en dirhams via YouCan Pay, pour un trimestre ou une année à l'avance. Nous vous envoyons un rappel avant la fin de chaque période." },
    { q: "Puis-je utiliser mon propre logo et mes couleurs ?", a: "Oui, avec les formules Professional et Enterprise : votre logo, votre nom et votre couleur apparaissent dans l'application, sur les rapports et comme nom d'expéditeur des emails." },
    { q: "Les audits fonctionnent-ils sur téléphone ?", a: "Oui. L'interface d'audit est pensée pour le mobile : réponse standard par standard, observations, photos et notation émotionnelle, depuis iPhone ou Android." },
    { q: "Puis-je adapter le questionnaire ?", a: "Oui. Partez des standards Zahir Guest (plus de 570 questions) en choisissant les sections utiles, importez votre propre grille depuis Excel, Word ou PDF (l'IA la convertit en questions d'audit), puis modifiez chaque question dans l'éditeur." },
    { q: "Mes données sont-elles isolées de celles des autres clients ?", a: "Oui. Chaque client dispose de son propre espace, et les règles d'accès de la base de données empêchent tout accès croisé entre clients." },
    { q: "Le produit est-il disponible en français et en anglais ?", a: "Oui, l'application, les rapports et les emails sont disponibles en français et en anglais, avec une langue choisie par utilisateur." },
    { q: "Comment résilier ?", a: "Depuis la page Facturation, en un clic, via le portail client sécurisé. L'abonnement reste actif jusqu'à la fin de la période payée. En dirhams, il suffit de ne pas renouveler." },
  ],
  en: [
    { q: 'What is a mystery guest audit?', a: 'A mystery guest (or mystery shopper) audit sends an auditor who behaves like an ordinary guest to assess the real quality of service against defined standards. Zahir Guest runs the whole process: assignments, mobile audit, scoring and reports.' },
    { q: 'Who is Zahir Guest for?', a: 'Mystery audit firms, hotel and restaurant groups auditing their own properties, and institutional classification or quality-control programmes.' },
    { q: 'How does the free trial work?', a: 'You create your workspace in two minutes, with no credit card, and have 14 days to try the product. At the end of the trial you choose a plan to continue.' },
    { q: 'How much does Zahir Guest cost?', a: 'Hotel at €79/month for one property. Professional at €249/month with 5 properties included, then €39 per extra property up to 30, with unlimited users and audits and white-label reports. Enterprise from €1,490/month for 50 properties and more. Annual billing gives two months free. Prices are also offered in US dollars and, in Morocco, in dirhams.' },
    { q: 'Can I pay in Moroccan dirhams?', a: 'Yes. In Morocco you pay by card in dirhams through YouCan Pay, for a quarter or a year in advance. We send a reminder before each period ends.' },
    { q: 'Can I use my own logo and colours?', a: 'Yes, on the Professional and Enterprise plans: your logo, name and colour appear in the app, on reports and as the sender name of emails.' },
    { q: 'Do audits work on a phone?', a: 'Yes. The audit interface is designed for mobile: answer standard by standard, add notes, photos and an emotional rating, from iPhone or Android.' },
    { q: 'Can I adapt the questionnaire?', a: 'Yes. Start from the Zahir Guest standards (570+ questions) and keep the sections you need, import your own checklist from Excel, Word or PDF (AI turns it into audit questions), then edit every question in the editor.' },
    { q: 'Is my data isolated from other customers?', a: 'Yes. Each customer has their own workspace, and database access rules prevent any cross-customer access.' },
    { q: 'Is the product available in English and French?', a: 'Yes, the app, reports and emails are available in English and French, with a language chosen per user.' },
    { q: 'How do I cancel?', a: 'From the Billing page, in one click, through the secure customer portal. The subscription stays active until the end of the paid period. In dirhams, simply do not renew.' },
  ],
}
