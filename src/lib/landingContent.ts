// Landing page copy (EN + FR). Single source for the page, the FAQ rich result and llms.txt.
// Only factual product claims here: no invented customers, testimonials or statistics.

export type Lang = 'en' | 'fr'
export interface Faq { q: string; a: string }

export const COPY = {
  fr: {
    metaTitle: "Zahir Guest — Logiciel d'audit mystère pour l'hôtellerie",
    metaDescription:
      "Plateforme d'audit client mystère pour hôtels, cabinets d'audit et programmes de classification : audits sur mobile, scores automatiques, rapports PDF en marque blanche et portail pour les directeurs d'établissement. Offre Découverte gratuite.",
    nav: { features: 'Fonctionnalités', how: 'Comment ça marche', pricing: 'Tarifs', faq: 'FAQ', login: 'Connexion', dashboard: 'Mon espace', cta: 'Essayer gratuitement', menu: 'Menu', hotels: 'Pour les hôtels', firms: "Pour les sociétés d'audit", example: "Rapport d'exemple" },
    hero: {
      eyebrow: 'Audit client mystère · hôtellerie et restauration',
      title: 'Révélez ce qui ne peut plus être ignoré.',
      sub: "Vos auditeurs notent la visite sur leur téléphone. Le score se calcule seul, le rapport part à votre marque, et chaque directeur voit ce qui le concerne.",
      cta: 'Commencer gratuitement',
      cta2: 'Réserver une démo',
      note: 'Offre Découverte gratuite · sans carte bancaire · FR / EN',
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
      sub: "L'interface de Zahir Guest, avec des données de démonstration.",
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
      sub: "Vous payez pour les établissements que vous suivez, pas pour le nombre de personnes qui travaillent dessus. Commencez gratuitement avec l'offre Découverte, sans carte.",
    },
    faqTitle: 'Questions fréquentes',
    finalCta: { title: "Prêt à voir ce que vos clients voient ?", sub: "Créez votre espace en deux minutes. Aucune carte bancaire requise.", cta: 'Commencer gratuitement', cta2: 'Réserver une démo' },
    footer: { tagline: 'Ce qui est révélé ne peut plus être ignoré.', product: 'Produit', contact: 'Contact', by: 'Un produit Za3fran Consulting', rights: 'Tous droits réservés.' },
  },
  en: {
    metaTitle: 'Zahir Guest — Mystery guest audit software for hospitality',
    metaDescription:
      'Mystery guest audit platform for hotels, audit firms and classification programmes: mobile audits, automatic scoring, white-label PDF reports and a portal for property managers. Free Discovery plan.',
    nav: { features: 'Features', how: 'How it works', pricing: 'Pricing', faq: 'FAQ', login: 'Sign in', dashboard: 'My workspace', cta: 'Try it free', menu: 'Menu', hotels: 'For hotels', firms: 'For audit firms', example: 'Sample report' },
    hero: {
      eyebrow: 'Mystery guest audit platform',
      title: 'Reveal what cannot be unseen.',
      sub: 'Zahir Guest turns every mystery visit into a board-ready report: mobile audits, automatic scoring, PDF reports in your own brand, and score tracking over time for every property.',
      cta: 'Start for free',
      cta2: 'Book a demo',
      note: 'Free Discovery plan · no credit card · EN / FR',
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
      sub: 'The Zahir Guest interface, with demonstration data.',
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
      sub: 'You pay for the properties you track, not for the number of people working on them. Start free on the Discovery plan, no card needed.',
    },
    faqTitle: 'Frequently asked questions',
    finalCta: { title: 'Ready to see what your guests see?', sub: 'Create your workspace in two minutes. No credit card required.', cta: 'Start for free', cta2: 'Book a demo' },
    footer: { tagline: 'Reveal what cannot be unseen.', product: 'Product', contact: 'Contact', by: 'A Za3fran Consulting product', rights: 'All rights reserved.' },
  },
} as const

export const FAQS: Record<Lang, Faq[]> = {
  fr: [
    { q: "Qu'est-ce qu'un audit client mystère ?", a: "Un audit mystère (ou visite mystère) consiste à envoyer un auditeur qui se comporte comme un client ordinaire pour évaluer la qualité réelle du service, par rapport à des standards définis. Zahir Guest organise cette démarche de bout en bout : missions, audit sur mobile, scores et rapports." },
    { q: "À qui s'adresse Zahir Guest ?", a: "Aux cabinets d'audit mystère, aux groupes hôteliers et restaurateurs qui auditent leurs propres établissements, et aux programmes institutionnels de classification ou de contrôle qualité." },
    { q: "Peut-on essayer Zahir Guest gratuitement ?", a: "Oui. L'offre Découverte est gratuite, sans carte bancaire et sans limite de durée : 1 établissement, 2 utilisateurs, 1 audit par trimestre avec le questionnaire Essentiel (environ 60 standards) et un rapport avec score. Vous passez à l'offre Hôtel ou Professional depuis Facturation quand vous voulez, sans perdre vos données. Pour un groupe hôtelier ou un cabinet d'audit, nous ouvrons un pilote Professional de 14 jours après une démo." },
    { q: "Combien coûte Zahir Guest ?", a: "Hôtel à 79 €/mois pour un établissement. Professional à 249 €/mois avec 5 établissements inclus, puis 39 € par établissement supplémentaire jusqu'à 15, avec utilisateurs et audits illimités et rapports en marque blanche. Enterprise à partir de 1 490 €/mois pour 20 établissements et plus, sur devis au-delà ; au-delà de 100 établissements, parlons-en directement. En annuel, deux mois sont offerts. Les prix sont aussi proposés en dollars et, au Maroc, en dirhams." },
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
    { q: 'Can I try Zahir Guest for free?', a: 'Yes. The Discovery plan is free, with no credit card and no time limit: 1 property, 2 users, 1 audit per quarter with the Essential questionnaire (about 60 standards) and a scored report. Upgrade to the Hotel or Professional plan from Billing whenever you like, without losing your data. For hotel groups and audit firms, we open a 14-day Professional pilot after a demo.' },
    { q: 'How much does Zahir Guest cost?', a: 'Hotel at €79/month for one property. Professional at €249/month with 5 properties included, then €39 per extra property up to 15, with unlimited users and audits and white-label reports. Enterprise from €1,490/month for 20 properties and more, on quote beyond that; above 100 properties, let us talk directly. Annual billing gives two months free. Prices are also offered in US dollars and, in Morocco, in dirhams.' },
    { q: 'Can I pay in Moroccan dirhams?', a: 'Yes. In Morocco you pay by card in dirhams through YouCan Pay, for a quarter or a year in advance. We send a reminder before each period ends.' },
    { q: 'Can I use my own logo and colours?', a: 'Yes, on the Professional and Enterprise plans: your logo, name and colour appear in the app, on reports and as the sender name of emails.' },
    { q: 'Do audits work on a phone?', a: 'Yes. The audit interface is designed for mobile: answer standard by standard, add notes, photos and an emotional rating, from iPhone or Android.' },
    { q: 'Can I adapt the questionnaire?', a: 'Yes. Start from the Zahir Guest standards (570+ questions) and keep the sections you need, import your own checklist from Excel, Word or PDF (AI turns it into audit questions), then edit every question in the editor.' },
    { q: 'Is my data isolated from other customers?', a: 'Yes. Each customer has their own workspace, and database access rules prevent any cross-customer access.' },
    { q: 'Is the product available in English and French?', a: 'Yes, the app, reports and emails are available in English and French, with a language chosen per user.' },
    { q: 'How do I cancel?', a: 'From the Billing page, in one click, through the secure customer portal. The subscription stays active until the end of the paid period. In dirhams, simply do not renew.' },
  ],
}

// « Maison » landing (26 Nov 2026): the sections added by the redesign. Facts only; demo names are fictitious.
export const MAISON = {
  fr: {
    heroCta: "Voir un rapport d'exemple",
    heroCta2: 'Commencer gratuitement',
    heroAlt: "Un auditeur prend des notes à une table de restaurant d'hôtel",
    note: { label: 'VISITE 04 · 19:42 · RESTAURANT', text: "« Accueil en moins d'une minute. Carte présentée sans recommandation du jour. »", tag: "Exemple d'observation" },
    doors: [
      { id: 'hotels', kicker: 'Vous dirigez un ou plusieurs hôtels', title: "Voyez votre établissement avec les yeux d'un client qui ne prévient pas.", d: "Vos standards, vos visites, un rapport par établissement et l'évolution de vos scores mois après mois.", points: ['Bibliothèque de plus de 570 standards hôteliers', 'Un portail pour chaque directeur', 'Offre Hôtel dès 79 € par mois'], cta: 'Commencer gratuitement', href: 'signup' },
      { id: 'firms', kicker: 'Vous vendez des audits mystère', title: 'Livrez vos clients sous votre marque.', d: 'Plusieurs clients, plusieurs auditeurs et établissements dans un seul espace, des rapports à votre logo et à vos couleurs.', points: ['Marque blanche : logo, couleurs, emails', 'Portail client et accès par établissement', 'Prix par établissement actif'], cta: 'Réserver une démo', href: 'contact' },
    ],
    times: {
      kicker: 'Comment ça marche',
      title: 'Une visite, trois temps.',
      items: [
        { when: 'AVANT', t: 'Préparer', d: "Choisissez vos standards dans la bibliothèque ou composez les vôtres. Planifiez la campagne, assignez l'auditeur." },
        { when: 'PENDANT', t: 'Observer', d: "L'auditeur suit la visite sur son téléphone, section par section : conforme ou non, une observation, une photo. Hors connexion, rien ne se perd." },
        { when: 'APRÈS', t: 'Révéler', d: 'Score global et par domaine, synthèse, annexe photos. Vous publiez : chaque directeur reçoit ce qui le concerne, en français ou en anglais.' },
      ],
    },
    example: {
      kicker: "Rapport d'exemple (fictif)",
      title: 'Ce que votre direction reçoit.',
      d: "Palais Azur est un hôtel inventé. Voici la synthèse d'un rapport Zahir Guest : score global, scores par domaine et constats. Le PDF complet ajoute la synthèse rédigée, l'annexe détaillée et les photos.",
      cta: 'Commencer gratuitement',
    },
    founders: {
      kicker: 'Une maison Za3fran',
      title: "Conçu par des professionnels de l'expérience client.",
      d: "Zahir Guest est né chez Za3fran, cabinet de conseil en hôtellerie et restauration fondé à Casablanca en 2015. Nous l'utilisons pour nos propres programmes de visite mystère.",
      people: [
        { name: 'Sarah Blaizeau', role: 'Expérience client et visites mystère', photo: '/landing/sarah.webp', d: "Formée à l'ESH Paris, elle a travaillé à la réception, aux réservations et aux banquets à Londres, Paris, Casablanca et Brisbane. Depuis 2015, elle mesure l'expérience client pour les établissements accompagnés par Za3fran." },
        { name: 'Arnaud Hébrard', role: 'Qualité opérationnelle et standards de service', photo: '/landing/arnaud.webp', d: "Plus de 20 ans en restauration et en hôtellerie : opérations F&B de groupes hôteliers internationaux, ouvertures et pilotage de plusieurs sites au Maroc, en Afrique, en Australie et aux Caraïbes. Il a conçu Zahir Guest pour suivre la qualité de service établissement par établissement." },
      ],
      link: 'Découvrir Za3fran',
    },
    featuresKicker: 'Fonctionnalités',
  },
  en: {
    heroCta: 'See a sample report',
    heroCta2: 'Start for free',
    heroAlt: 'An auditor takes notes at a hotel restaurant table',
    note: { label: 'VISIT 04 · 19:42 · RESTAURANT', text: '“Greeted within a minute. Menu presented with no recommendation of the day.”', tag: 'Sample observation' },
    doors: [
      { id: 'hotels', kicker: 'You run one or more hotels', title: 'See your property through the eyes of a guest who gives no warning.', d: 'Your standards, your visits, one report per property and how your scores move month after month.', points: ['A library of 570+ hotel standards', 'A portal for every general manager', 'Hotel plan from €79 a month'], cta: 'Start for free', href: 'signup' },
      { id: 'firms', kicker: 'You sell mystery audits', title: 'Deliver your clients under your own brand.', d: 'Several clients, auditors and properties in one workspace, with reports in your logo and colours.', points: ['White label: logo, colours, emails', 'Client portal and access per property', 'Priced per active property'], cta: 'Book a demo', href: 'contact' },
    ],
    times: {
      kicker: 'How it works',
      title: 'One visit, three moments.',
      items: [
        { when: 'BEFORE', t: 'Prepare', d: 'Pick your standards from the library or build your own. Plan the campaign, assign the auditor.' },
        { when: 'DURING', t: 'Observe', d: 'The auditor follows the visit on a phone, section by section: met or not, a note, a photo. Offline, nothing is lost.' },
        { when: 'AFTER', t: 'Reveal', d: 'Overall and domain scores, summary, photo appendix. You publish: each manager receives what concerns them, in English or French.' },
      ],
    },
    example: {
      kicker: 'Sample report (fictitious)',
      title: 'What your management receives.',
      d: 'Palais Azur is an invented hotel. Here is the summary of a Zahir Guest report: overall score, domain scores and findings. The full PDF adds the written summary, the detailed appendix and the photos.',
      cta: 'Start for free',
    },
    founders: {
      kicker: 'A Za3fran house',
      title: 'Built by guest experience professionals.',
      d: 'Zahir Guest was born at Za3fran, a hospitality and restaurant consultancy founded in Casablanca in 2015. We use it for our own mystery visit programmes.',
      people: [
        { name: 'Sarah Blaizeau', role: 'Guest experience and mystery visits', photo: '/landing/sarah.webp', d: 'Trained at ESH Paris, she worked in front office, reservations and banqueting in London, Paris, Casablanca and Brisbane. Since 2015 she has measured the guest experience for the venues Za3fran works with.' },
        { name: 'Arnaud Hébrard', role: 'Operational quality and service standards', photo: '/landing/arnaud.webp', d: 'More than 20 years in restaurants and hotels: F&B operations for international hotel groups, openings and multi-site management in Morocco, Africa, Australia and the Caribbean. He designed Zahir Guest to follow service quality property by property.' },
      ],
      link: 'Discover Za3fran',
    },
    featuresKicker: 'Features',
  },
} as const
