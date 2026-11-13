// Legal documents (FR + EN). DRAFT v0.1, modelled on common B2B SaaS terms and privacy policies.
// Facts about the product (processors, data, cookies) match the current build; legal choices
// (governing law, retention, liability cap) are in src/lib/legal.ts or flagged in the hand-over notes.

import { LEGAL } from '@/lib/legal'

export type Lang = 'en' | 'fr'
export interface Section { h: string; p: string[] }
export interface LegalDoc { title: string; intro: string; sections: Section[] }

const identity = (lang: Lang) => {
  const parts = [LEGAL.publisher, LEGAL.legalForm, LEGAL.address, LEGAL.registration && (lang === 'en' ? `Registration: ${LEGAL.registration}` : `Immatriculation : ${LEGAL.registration}`), LEGAL.vat && (lang === 'en' ? `Tax ID: ${LEGAL.vat}` : `Identifiant fiscal : ${LEGAL.vat}`)].filter(Boolean)
  return parts.join(' — ')
}

export const PRIVACY: Record<Lang, LegalDoc> = {
  fr: {
    title: 'Politique de confidentialité',
    intro: `Zahir Guest est une plateforme d'audit client mystère éditée par ${LEGAL.publisher}. Cette politique explique quelles données nous traitons, pourquoi, avec qui nous les partageons et quels sont vos droits.`,
    sections: [
      { h: '1. Qui est responsable de vos données ?', p: [
        `L'éditeur est : ${identity('fr')}. Contact : ${LEGAL.email}.`,
        "Nous agissons en tant que responsable de traitement pour les données de compte et de facturation. Pour le contenu que vos équipes saisissent dans la plateforme (établissements, audits, réponses, notes, photos, rapports), vous êtes responsable de traitement et nous agissons comme sous-traitant, pour votre compte et sur vos instructions. Un accord de traitement des données est disponible sur demande.",
      ] },
      { h: '2. Quelles données traitons-nous ?', p: [
        "Données de compte : nom, adresse email, rôle, langue préférée, date de dernière connexion, nom de votre société.",
        "Contenu de la plateforme : établissements, campagnes, réponses d'audit, observations, notes émotionnelles, photos, rapports et synthèses, ainsi que les logos et noms de marque que vous téléversez.",
        "Facturation : forfait, statut d'abonnement et identifiants Stripe. Les données de carte bancaire sont traitées par Stripe et ne passent jamais par nos serveurs.",
        "Support et suggestions : les messages que vous nous envoyez, et les échanges avec l'assistant intégré.",
        "Données techniques : journaux de sécurité et d'erreur strictement nécessaires au fonctionnement et à la protection du service.",
      ] },
      { h: '3. Pourquoi et sur quelle base ?', p: [
        "Fournir le service et gérer votre compte (exécution du contrat) ; facturer et gérer votre abonnement (contrat et obligations légales) ; assurer la sécurité, prévenir les abus et améliorer le produit (intérêt légitime) ; répondre à vos demandes de support (contrat et intérêt légitime).",
        "Nous ne vendons pas vos données et ne les utilisons pas à des fins publicitaires.",
      ] },
      { h: '4. Avec qui les partageons-nous ?', p: [
        "Nous faisons appel à des prestataires techniques (sous-traitants ultérieurs), uniquement pour fournir le service :",
        "Supabase (base de données, authentification et stockage des fichiers, région UE – Francfort) ; Vercel (hébergement de l'application) ; Stripe (paiements et facturation) ; Brevo (envoi des emails transactionnels, France) ; Anthropic (traitement des questions posées à l'assistant intégré) ; Cloudflare (DNS).",
        "Certains de ces prestataires peuvent traiter des données hors de l'Union européenne et du Maroc ; dans ce cas, nous nous appuyons sur les garanties contractuelles qu'ils proposent (clauses contractuelles types ou mécanismes équivalents).",
      ] },
      { h: "5. L'assistant intégré (IA)", p: [
        "Les questions que vous posez à l'assistant sont transmises à Anthropic pour générer une réponse, avec les guides d'aide de la plateforme. N'y saisissez pas de données sensibles ou d'informations personnelles inutiles. Les réponses peuvent contenir des erreurs. Vous pouvez à tout moment contacter l'équipe support à la place.",
      ] },
      { h: '6. Cookies et traceurs', p: [
        "Nous utilisons uniquement des cookies strictement nécessaires : cookies de session d'authentification (pour vous maintenir connecté) et, pour les administrateurs de la plateforme, un cookie de session technique lié au support. Nous n'utilisons ni cookies publicitaires, ni outils de mesure d'audience tiers. Aucun bandeau de consentement n'est donc requis à ce jour.",
      ] },
      { h: '7. Combien de temps conservons-nous les données ?', p: [
        "Pendant la durée de votre contrat. À la fin du contrat, nous supprimons ou anonymisons les données de votre espace sur demande et, en tout état de cause, au plus tard " + LEGAL.deletionDays + " jours après la résiliation, sauf obligation légale de conservation (par exemple pour la facturation).",
      ] },
      { h: '8. Sécurité', p: [
        "Les données de chaque client sont isolées par des règles d'accès au niveau de la base de données. Les connexions sont chiffrées (HTTPS), les photos sont stockées dans un espace privé et ne sont accessibles qu'aux personnes autorisées. Aucun système n'étant infaillible, nous vous informerons en cas de violation de données affectant vos informations, conformément à la loi applicable.",
      ] },
      { h: '9. Vos droits', p: [
        "Vous pouvez demander l'accès, la rectification, la suppression, la limitation ou la portabilité de vos données, et vous opposer à certains traitements, conformément à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel et, lorsqu'il s'applique, au Règlement général sur la protection des données (RGPD).",
        `Pour exercer vos droits, écrivez à ${LEGAL.email}. Vous pouvez aussi saisir l'autorité de protection des données de votre pays (au Maroc : la CNDP ; dans l'Union européenne : l'autorité de contrôle de votre lieu de résidence).`,
        "Si vous utilisez Zahir Guest au sein d'une organisation cliente, adressez d'abord votre demande à l'administrateur de votre organisation, qui est responsable de traitement pour les données de l'espace.",
      ] },
      { h: '10. Photos et personnes', p: [
        "Les photos d'audit doivent se limiter aux lieux, produits et services évalués. Il est demandé aux auditeurs d'éviter de photographier des personnes identifiables. Les clients restent responsables du respect de la réglementation applicable à leurs audits.",
      ] },
      { h: '11. Modifications', p: [
        "Nous pouvons mettre à jour cette politique ; la date de dernière mise à jour figure ci-dessous. En cas de changement important, nous vous en informerons.",
        `Dernière mise à jour : ${LEGAL.updated.fr}.`,
      ] },
    ],
  },
  en: {
    title: 'Privacy policy',
    intro: `Zahir Guest is a mystery guest audit platform published by ${LEGAL.publisher}. This policy explains what data we process, why, who we share it with and what your rights are.`,
    sections: [
      { h: '1. Who is responsible for your data?', p: [
        `The publisher is: ${identity('en')}. Contact: ${LEGAL.email}.`,
        'We act as data controller for account and billing data. For the content your teams enter in the platform (properties, audits, answers, notes, photos, reports), you are the controller and we act as processor, on your behalf and on your instructions. A data processing agreement is available on request.',
      ] },
      { h: '2. What data do we process?', p: [
        'Account data: name, email address, role, preferred language, last sign-in date, your company name.',
        'Platform content: properties, campaigns, audit answers, observations, emotional ratings, photos, reports and summaries, plus the logos and brand names you upload.',
        'Billing: plan, subscription status and Stripe identifiers. Card details are handled by Stripe and never pass through our servers.',
        'Support and suggestions: the messages you send us and your conversations with the built-in assistant.',
        'Technical data: security and error logs strictly necessary to run and protect the service.',
      ] },
      { h: '3. Why, and on what basis?', p: [
        'To provide the service and manage your account (performance of the contract); to invoice and manage your subscription (contract and legal obligations); to ensure security, prevent abuse and improve the product (legitimate interest); to answer your support requests (contract and legitimate interest).',
        'We do not sell your data and do not use it for advertising.',
      ] },
      { h: '4. Who do we share it with?', p: [
        'We use technical service providers (sub-processors), only to deliver the service:',
        'Supabase (database, authentication and file storage, EU region – Frankfurt); Vercel (application hosting); Stripe (payments and billing); Brevo (transactional email, France); Anthropic (processing of questions asked to the built-in assistant); Cloudflare (DNS).',
        'Some of these providers may process data outside the European Union and Morocco; in that case we rely on the contractual safeguards they provide (standard contractual clauses or equivalent mechanisms).',
      ] },
      { h: '5. The built-in assistant (AI)', p: [
        'Questions you ask the assistant are sent to Anthropic to generate an answer, together with the platform help guides. Do not enter sensitive data or unnecessary personal information. Answers may contain mistakes. You can contact the support team instead at any time.',
      ] },
      { h: '6. Cookies and trackers', p: [
        'We only use strictly necessary cookies: authentication session cookies (to keep you signed in) and, for platform administrators, a technical session cookie linked to support. We use no advertising cookies and no third-party analytics. No consent banner is therefore required at this time.',
      ] },
      { h: '7. How long do we keep data?', p: [
        'For the duration of your contract. When the contract ends, we delete or anonymise your workspace data on request and, in any case, no later than ' + LEGAL.deletionDays + ' days after termination, unless the law requires us to keep it (for example for invoicing).',
      ] },
      { h: '8. Security', p: [
        "Each customer's data is isolated by database-level access rules. Connections are encrypted (HTTPS), photos are stored in a private space and are only accessible to authorised people. As no system is infallible, we will notify you of any data breach affecting your information as required by applicable law.",
      ] },
      { h: '9. Your rights', p: [
        'You may request access, rectification, deletion, restriction or portability of your data, and object to certain processing, under Moroccan Law No. 09-08 on the protection of individuals with regard to the processing of personal data and, where it applies, the General Data Protection Regulation (GDPR).',
        `To exercise your rights, write to ${LEGAL.email}. You may also contact the data protection authority of your country (in Morocco: the CNDP; in the European Union: the supervisory authority of your place of residence).`,
        'If you use Zahir Guest within a customer organisation, please first send your request to your organisation\'s administrator, who is the controller for the workspace data.',
      ] },
      { h: '10. Photos and people', p: [
        'Audit photos should be limited to the places, products and services being assessed. Auditors are asked to avoid photographing identifiable people. Customers remain responsible for complying with the rules that apply to their audits.',
      ] },
      { h: '11. Changes', p: [
        'We may update this policy; the date of the last update is shown below. We will let you know of any material change.',
        `Last updated: ${LEGAL.updated.en}.`,
      ] },
    ],
  },
}

export const TERMS: Record<Lang, LegalDoc> = {
  fr: {
    title: "Conditions générales d'utilisation et de vente",
    intro: `Les présentes conditions régissent l'utilisation de Zahir Guest, service en ligne édité par ${LEGAL.publisher} (« nous »), par toute organisation cliente (« vous »). En créant un compte, vous acceptez ces conditions.`,
    sections: [
      { h: '1. Le service', p: [
        "Zahir Guest est une plateforme en ligne (SaaS) de gestion d'audits client mystère : établissements, campagnes, audits sur mobile, calcul de scores, rapports et portail de consultation. Le service est destiné à un usage professionnel.",
      ] },
      { h: '2. Compte et utilisateurs', p: [
        "Vous devez fournir des informations exactes et protéger vos identifiants. Vous êtes responsable des actions réalisées depuis votre espace et des utilisateurs que vous invitez, dont vous garantissez qu'ils sont autorisés à utiliser le service pour votre compte.",
        "Le service est réservé aux personnes majeures agissant à titre professionnel.",
      ] },
      { h: '3. Offre gratuite et pilote', p: [
        "Les nouveaux espaces démarrent avec l'offre Découverte, gratuite et sans carte bancaire, dont les limites sont indiquées sur le site et dans la page Facturation. Nous pouvons ouvrir, sur demande, un pilote temporaire d'une offre payante ; à son terme, ou à la fin d'un abonnement, l'espace revient à l'offre Découverte et vos données sont conservées.",
      ] },
      { h: '4. Forfaits, prix et paiement', p: [
        "Les forfaits, leurs limites et leurs prix en euros sont ceux affichés sur le site et dans la page Facturation. Les taxes applicables peuvent s'ajouter selon votre situation. Le paiement est traité par Stripe.",
        "L'abonnement est mensuel ou annuel et se renouvelle automatiquement à chaque échéance jusqu'à résiliation. Nous pouvons modifier nos prix pour les périodes futures, moyennant un préavis raisonnable par email.",
        "Les limites du forfait (établissements, utilisateurs, audits) sont appliquées automatiquement. Vous pouvez changer de forfait à tout moment depuis la page Facturation.",
      ] },
      { h: '5. Résiliation', p: [
        "Vous pouvez résilier à tout moment depuis le portail de facturation. La résiliation prend effet à la fin de la période déjà payée ; aucune période commencée n'est remboursée, sauf disposition légale impérative contraire.",
        "Nous pouvons suspendre ou résilier votre accès en cas de non-paiement, d'usage contraire aux présentes conditions ou de risque pour la sécurité du service, après avoir tenté de vous en informer lorsque c'est possible.",
      ] },
      { h: '6. Vos données et votre contenu', p: [
        "Vous restez propriétaire de vos données et de votre contenu (audits, notes, photos, rapports, logos). Vous nous accordez le droit de les héberger et de les traiter uniquement pour fournir le service. Le traitement des données personnelles est décrit dans notre politique de confidentialité.",
        "Vous garantissez disposer des droits nécessaires sur les contenus que vous téléversez (notamment votre logo et votre nom de marque) et vous engagez à mener vos audits dans le respect des lois applicables, y compris les règles relatives à la vie privée et à l'image des personnes.",
      ] },
      { h: '7. Usage acceptable', p: [
        "Il est interdit d'utiliser le service de manière illégale, de tenter d'accéder aux données d'autres clients, de perturber le fonctionnement de la plateforme, de contourner les limites de votre forfait, ou de téléverser des contenus illicites, diffamatoires ou portant atteinte aux droits de tiers.",
      ] },
      { h: '8. Propriété intellectuelle', p: [
        "Zahir Guest, son logiciel, sa marque, ses modèles de questionnaires fournis et sa documentation restent notre propriété. Nous vous concédons un droit d'utilisation personnel, non exclusif et non transférable pendant la durée de votre abonnement. Les rapports que vous générez à partir de vos audits sont à vous.",
      ] },
      { h: '9. Disponibilité et évolution du service', p: [
        "Nous mettons en œuvre des moyens raisonnables pour assurer un service continu et sécurisé, mais nous ne garantissons pas une disponibilité ininterrompue. Des opérations de maintenance ou des incidents chez nos prestataires peuvent entraîner des interruptions. Le service évolue : nous pouvons ajouter, modifier ou retirer des fonctionnalités.",
        "Nous vous recommandons de conserver une copie de vos rapports importants (export PDF).",
      ] },
      { h: '10. Assistant IA', p: [
        "L'assistant intégré fournit une aide à l'utilisation à partir de nos guides. Ses réponses sont données à titre indicatif et peuvent être inexactes ; elles ne constituent ni un conseil juridique, ni un conseil financier.",
      ] },
      { h: '11. Responsabilité', p: [
        "Dans la mesure permise par la loi, notre responsabilité est limitée aux dommages directs et prévisibles et ne saurait excéder les sommes que vous avez payées pour le service au cours des douze (12) mois précédant le fait générateur. Nous ne sommes pas responsables des dommages indirects (perte de chiffre d'affaires, de clientèle ou d'image) ni du contenu des audits, qui relève de votre responsabilité et de celle de vos auditeurs.",
        "Aucune stipulation des présentes ne limite une responsabilité qui ne peut l'être en vertu de la loi.",
      ] },
      { h: '12. Modifications des conditions', p: [
        "Nous pouvons modifier ces conditions. Les modifications importantes vous seront notifiées à l'avance par email ou dans l'application ; la poursuite de l'utilisation du service après la date d'entrée en vigueur vaut acceptation.",
      ] },
      { h: '13. Droit applicable et litiges', p: [
        `Les présentes conditions sont régies par le ${LEGAL.governingLaw.fr}. À défaut de règlement amiable, tout litige relève de la compétence des ${LEGAL.courts.fr}.`,
      ] },
      { h: '14. Contact et mentions légales', p: [
        `Éditeur : ${identity('fr')}. Directeur de la publication : ${LEGAL.directorOfPublication}. Contact : ${LEGAL.email}. Hébergement : ${LEGAL.host}.`,
        `Dernière mise à jour : ${LEGAL.updated.fr}.`,
      ] },
    ],
  },
  en: {
    title: 'Terms of use and sale',
    intro: `These terms govern the use of Zahir Guest, an online service published by ${LEGAL.publisher} ("we"), by any customer organisation ("you"). By creating an account, you accept these terms.`,
    sections: [
      { h: '1. The service', p: [
        'Zahir Guest is an online platform (SaaS) for managing mystery guest audits: properties, campaigns, mobile audits, score calculation, reports and a viewing portal. The service is intended for professional use.',
      ] },
      { h: '2. Account and users', p: [
        'You must provide accurate information and protect your credentials. You are responsible for actions taken from your workspace and for the users you invite, who you warrant are authorised to use the service on your behalf.',
        'The service is reserved for adults acting in a professional capacity.',
      ] },
      { h: '3. Free plan and pilot', p: [
        'New workspaces start on the Discovery plan, free and with no credit card, whose limits are shown on the website and on the Billing page. On request we may open a temporary pilot of a paid plan; when it ends, or when a subscription ends, the workspace returns to the Discovery plan and your data is kept.',
      ] },
      { h: '4. Plans, prices and payment', p: [
        'Plans, their limits and their euro prices are those shown on the website and on the Billing page. Applicable taxes may be added depending on your situation. Payment is processed by Stripe.',
        'The subscription is monthly or annual and renews automatically at each term until cancelled. We may change our prices for future periods, with reasonable notice by email.',
        'Plan limits (properties, users, audits) are enforced automatically. You can change plan at any time from the Billing page.',
      ] },
      { h: '5. Cancellation', p: [
        'You may cancel at any time from the billing portal. Cancellation takes effect at the end of the period already paid; no started period is refunded, unless mandatory law provides otherwise.',
        'We may suspend or terminate your access in case of non-payment, use contrary to these terms or risk to the security of the service, after trying to inform you where possible.',
      ] },
      { h: '6. Your data and content', p: [
        'You remain the owner of your data and content (audits, notes, photos, reports, logos). You grant us the right to host and process them solely to provide the service. The processing of personal data is described in our privacy policy.',
        'You warrant that you hold the necessary rights over the content you upload (in particular your logo and brand name) and undertake to carry out your audits in compliance with applicable laws, including rules on privacy and on the image of individuals.',
      ] },
      { h: '7. Acceptable use', p: [
        'You must not use the service unlawfully, attempt to access other customers\' data, disrupt the platform, bypass your plan limits, or upload unlawful or defamatory content or content that infringes third-party rights.',
      ] },
      { h: '8. Intellectual property', p: [
        'Zahir Guest, its software, brand, supplied questionnaire templates and documentation remain our property. We grant you a personal, non-exclusive, non-transferable right of use for the duration of your subscription. Reports you generate from your audits are yours.',
      ] },
      { h: '9. Availability and changes to the service', p: [
        'We use reasonable means to provide a continuous and secure service, but we do not guarantee uninterrupted availability. Maintenance or incidents at our providers may cause interruptions. The service evolves: we may add, change or remove features.',
        'We recommend keeping a copy of your important reports (PDF export).',
      ] },
      { h: '10. AI assistant', p: [
        'The built-in assistant provides usage help based on our guides. Its answers are indicative and may be inaccurate; they are neither legal nor financial advice.',
      ] },
      { h: '11. Liability', p: [
        'To the extent permitted by law, our liability is limited to direct and foreseeable damages and shall not exceed the amounts you paid for the service in the twelve (12) months preceding the event giving rise to liability. We are not liable for indirect damages (loss of revenue, customers or reputation) nor for the content of audits, which is your responsibility and that of your auditors.',
        'Nothing in these terms limits liability that cannot be limited by law.',
      ] },
      { h: '12. Changes to these terms', p: [
        'We may change these terms. Material changes will be notified to you in advance by email or in the app; continued use of the service after the effective date constitutes acceptance.',
      ] },
      { h: '13. Governing law and disputes', p: [
        `These terms are governed by ${LEGAL.governingLaw.en}. Failing an amicable settlement, any dispute falls under the jurisdiction of ${LEGAL.courts.en}.`,
      ] },
      { h: '14. Contact and legal notice', p: [
        `Publisher: ${identity('en')}. Director of publication: ${LEGAL.directorOfPublication}. Contact: ${LEGAL.email}. Hosting: ${LEGAL.host}.`,
        `Last updated: ${LEGAL.updated.en}.`,
      ] },
    ],
  },
}
