// Landing page copy (EN + FR). Single source for the page, the FAQ rich result and llms.txt.
// Only factual product claims here: no invented customers, testimonials or statistics.

import { PLAN_DISPLAY } from '@/lib/plans'

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
        { t: "Cabinets d'audit mystère", d: "Gérez plusieurs clients, plusieurs auditeurs et livrez des rapports à votre marque." },
        { t: 'Groupes hôteliers', d: "Auditez vos propres établissements avec une méthode homogène et comparez-les entre eux." },
        { t: 'Programmes institutionnels', d: "Suivez des centaines d'établissements dans le cadre de programmes de visite mystère et de classification." },
      ],
    },
    features: {
      title: "De la visite sur le terrain au rapport, un seul outil",
      sub: "Tout ce qu'il faut pour mener des audits mystère sérieux, sans tableurs ni documents Word.",
      items: [
        { t: 'Audit sur mobile', d: "Vos auditeurs répondent standard par standard (Conforme / Non conforme / N/A), ajoutent leurs observations, directement depuis leur téléphone." },
        { t: 'Questionnaire 5 étoiles inclus', d: "Un modèle de référence de plus de 300 standards couvre l'accueil, l'hébergement, la restauration, les espaces et le spa. Adaptable à chaque catégorie." },
        { t: 'Scores automatiques', d: "Du standard à la section, puis au domaine et au score global : calculés instantanément, avec la répartition par type de standard et une note émotionnelle." },
        { t: 'Rapports PDF en marque blanche', d: "Un rapport structuré avec tableau de bord visuel et annexes détaillées, à votre logo et à vos couleurs. Formule Professional et Enterprise." },
        { t: 'Portail pour les directeurs', d: "Chaque directeur d'établissement consulte ses rapports publiés, l'évolution de ses scores et la comparaison par domaine." },
        { t: 'Équipes et rôles', d: "Administrateurs, auditeurs, directeurs d'établissement : chacun voit uniquement ce qui le concerne. Données isolées par client." },
      ],
    },
    how: {
      title: 'Comment ça marche',
      steps: [
        { t: 'Configurez', d: "Ajoutez vos établissements et invitez vos auditeurs. Créez votre première campagne en quelques clics." },
        { t: 'Auditez', d: "L'auditeur reçoit sa mission, réalise la visite et remplit l'audit sur son téléphone." },
        { t: 'Publiez', d: "Relisez, ajoutez votre synthèse, générez le rapport et publiez-le : le directeur y accède aussitôt." },
      ],
    },
    preview: { label: 'Exemple de rapport', score: 'Score global', domains: ['Réception', 'Hébergement', 'Restauration', 'Espaces'], caption: 'Exemple illustratif' },
    pricing: {
      title: 'Des tarifs simples, par nombre d’établissements',
      sub: "Commencez par 14 jours gratuits, sans carte. Changez ou annulez quand vous voulez.",
      monthly: '/mois',
      annualNote: (annual: number, perMonth: number) => `ou ${perMonth} €/mois facturés ${annual.toLocaleString('fr-FR')} €/an`,
      popular: 'Le plus choisi',
      cta: "Essai gratuit",
      enterpriseCta: 'Parler à un expert',
      enterpriseNote: 'À partir de',
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
        { t: 'Mystery audit firms', d: 'Manage several clients and auditors, and deliver reports under your own brand.' },
        { t: 'Hotel groups', d: 'Audit your own properties with one consistent method and benchmark them against each other.' },
        { t: 'Institutional programmes', d: 'Track hundreds of establishments within mystery visit and classification programmes.' },
      ],
    },
    features: {
      title: 'From the field visit to the report, one tool',
      sub: 'Everything you need to run serious mystery guest audits, without spreadsheets or Word documents.',
      items: [
        { t: 'Mobile audits', d: 'Auditors answer standard by standard (Meet / Below / N/A), add their observations, straight from their phone.' },
        { t: '5-star questionnaire included', d: 'A reference template of 300+ standards covers arrival, rooms, food & beverage, public areas and spa. Adaptable to each category.' },
        { t: 'Automatic scoring', d: 'From standard to section, domain and overall score: calculated instantly, with a breakdown by standard type and an emotional rating.' },
        { t: 'White-label PDF reports', d: 'A structured report with a visual scorecard and detailed appendices, in your logo and colours. Professional and Enterprise plans.' },
        { t: 'Property manager portal', d: 'Each property manager sees their published reports, score history and domain-by-domain comparison.' },
        { t: 'Teams and roles', d: 'Admins, auditors, property managers: everyone sees only what concerns them. Data is isolated per customer.' },
      ],
    },
    how: {
      title: 'How it works',
      steps: [
        { t: 'Set up', d: 'Add your properties and invite your auditors. Create your first campaign in a few clicks.' },
        { t: 'Audit', d: 'The auditor receives the assignment, makes the visit and fills in the audit on their phone.' },
        { t: 'Publish', d: 'Review, add your executive summary, generate the report and publish it: the property manager has access right away.' },
      ],
    },
    preview: { label: 'Sample report', score: 'Overall score', domains: ['Front office', 'Housekeeping', 'Food & Beverage', 'Public areas'], caption: 'Illustrative example' },
    pricing: {
      title: 'Simple pricing, by number of properties',
      sub: 'Start with 14 days free, no card needed. Change or cancel any time.',
      monthly: '/month',
      annualNote: (annual: number, perMonth: number) => `or €${perMonth}/month billed €${annual.toLocaleString('en-GB')}/year`,
      popular: 'Most popular',
      cta: 'Free trial',
      enterpriseCta: 'Talk to an expert',
      enterpriseNote: 'From',
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
    { q: "Combien coûte Zahir Guest ?", a: "Starter à 89 €/mois (3 établissements), Professional à 249 €/mois (15 établissements, audits illimités, rapports en marque blanche) et Enterprise à partir de 599 €/mois (illimité). L'abonnement annuel est moins cher que 12 mensualités." },
    { q: "Puis-je utiliser mon propre logo et mes couleurs ?", a: "Oui, avec les formules Professional et Enterprise : votre logo, votre nom et votre couleur apparaissent dans l'application, sur les rapports et comme nom d'expéditeur des emails." },
    { q: "Les audits fonctionnent-ils sur téléphone ?", a: "Oui. L'interface d'audit est pensée pour le mobile : réponse standard par standard, observations et notation émotionnelle, depuis iPhone ou Android." },
    { q: "Puis-je adapter le questionnaire ?", a: "Le modèle 5 étoiles inclus peut être simplifié pour les autres catégories. Des modèles personnalisés sont proposés avec la formule Enterprise." },
    { q: "Mes données sont-elles isolées de celles des autres clients ?", a: "Oui. Chaque client dispose de son propre espace, et les règles d'accès de la base de données empêchent tout accès croisé entre clients." },
    { q: "Le produit est-il disponible en français et en anglais ?", a: "Oui, l'application, les rapports et les emails sont disponibles en français et en anglais, avec une langue choisie par utilisateur." },
    { q: "Comment résilier ?", a: "Depuis la page Facturation, en un clic, via le portail client sécurisé. L'abonnement reste actif jusqu'à la fin de la période payée." },
  ],
  en: [
    { q: 'What is a mystery guest audit?', a: 'A mystery guest (or mystery shopper) audit sends an auditor who behaves like an ordinary guest to assess the real quality of service against defined standards. Zahir Guest runs the whole process: assignments, mobile audit, scoring and reports.' },
    { q: 'Who is Zahir Guest for?', a: 'Mystery audit firms, hotel and restaurant groups auditing their own properties, and institutional classification or quality-control programmes.' },
    { q: 'How does the free trial work?', a: 'You create your workspace in two minutes, with no credit card, and have 14 days to try the product. At the end of the trial you choose a plan to continue.' },
    { q: 'How much does Zahir Guest cost?', a: 'Starter at €89/month (3 properties), Professional at €249/month (15 properties, unlimited audits, white-label reports) and Enterprise from €599/month (unlimited). Annual billing costs less than twelve monthly payments.' },
    { q: 'Can I use my own logo and colours?', a: 'Yes, on the Professional and Enterprise plans: your logo, name and colour appear in the app, on reports and as the sender name of emails.' },
    { q: 'Do audits work on a phone?', a: 'Yes. The audit interface is designed for mobile: answer standard by standard, add notes and an emotional rating, from iPhone or Android.' },
    { q: 'Can I adapt the questionnaire?', a: 'The included 5-star template can be simplified for other categories. Custom templates are offered with the Enterprise plan.' },
    { q: 'Is my data isolated from other customers?', a: 'Yes. Each customer has their own workspace, and database access rules prevent any cross-customer access.' },
    { q: 'Is the product available in English and French?', a: 'Yes, the app, reports and emails are available in English and French, with a language chosen per user.' },
    { q: 'How do I cancel?', a: 'From the Billing page, in one click, through the secure customer portal. The subscription stays active until the end of the paid period.' },
  ],
}

export const PLAN_COPY = (lang: Lang) =>
  PLAN_DISPLAY.map(p => ({
    ...p,
    features: lang === 'en' ? p.featuresEn : p.featuresFr,
  }))
