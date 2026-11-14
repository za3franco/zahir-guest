# Feuille de route Zahir Guest (à partir du 13 nov. 2026)

> **Méthode depuis le 14 nov. : « avancer d'un trait »** (voir `CLAUDE.md` et `docs/PRATIQUES_TECHNIQUES.md`) : Claude enchaîne les étapes ci-dessous, fusionne sur `main` quand tout passe, et ne s'arrête que pour une décision, un blocage ou une conversation lourde. Les étapes « Plus tard » demandent les décisions d'Arnaud : Claude prépare le plan et s'arrête là.

Chaque étape donne : l'objectif, le modèle conseillé, ce que fait la session, ce qu'Arnaud doit faire lui-même, et la phrase à ajouter au message de lancement (voir `docs/LANCEMENT_SESSIONS.md`). L'état courant est dans `docs/ZG7_BRIEF.md` ; le détail du mode hors ligne est archivé dans `docs/ZG6_BRIEF.md`.

## Terminé : mode hors ligne de l'audit (PR 0 à 3, en production depuis le 13 nov., actif pour tous les espaces depuis le 14 nov.)
Détail et décisions : `docs/ZG6_BRIEF.md` (archive). Reste seulement le test Android et le test en sous-sol, pour Arnaud.

## En cours : ZG-7, finitions et vérifications (voir `docs/ZG7_BRIEF.md`)
### 1. Messages d'erreur du serveur en français et en anglais : FAIT sur la branche `claude/bold-sagan-d8wich` (testé, PR à ouvrir et fusion à décider par Arnaud)
- Suite décidée le 14 nov. : traduire l'écran super admin et la page `/auth/set-password` (Sonnet 5.5, High), PR séparée.
- Modèle : Sonnet 5.5, High (travail large, mécanique, avec tests).
- La session : lister les environ 45 routes `src/app/api/**` qui renvoient des erreurs en anglais seulement, un helper commun selon la langue de l'utilisateur, traduction, parcours de test FR / EN. Ne pas casser les codes d'erreur que l'interface hors ligne traduit (`audit_closed`, `structure_locked`…).
- Arnaud : dire s'il veut aussi l'écran super admin traduit ; accord pour la fusion.
- À ajouter au lancement : « Traduis en français et en anglais tous les messages d'erreur du serveur, avec un plan court d'abord. »

### 1 bis à 1 ter. Super admin et `/auth/set-password` traduits (PR n°34), email « mot de passe oublié » par Brevo dans la langue du compte (PR n°36) : FAITS et en production

### 1 quater. Emails aux couleurs du client (marque blanche, niveau 1) : FAIT, en production (PR n°39, 14 nov.)
- Les 6 emails envoyés aux équipes d'un espace en marque blanche (mission, audit soumis, rapport, invitation, compte supprimé, mot de passe oublié) prennent le nom, le logo et la couleur de l'espace, avec « Propulsé par Zahir Guest » en pied de page ; un seul gabarit (`src/lib/emailLayout.ts`) ; testé avec un faux Brevo et rendu sur iPhone émulé. Détail : `docs/ZG7_BRIEF.md`, point 1 quater.
- Test de l'invitation en production par Claude : validé le 14 nov. au soir. Reste : Arnaud sur son iPhone dans l'espace Casa Nono (facultatif).
- Jeton des liens d'invitation et de bienvenue hors de l'adresse (après le `#`, comme le mot de passe oublié) : FAIT et en production (PR n°44, 14 nov.). Reste à vérifier le clic sur le lien de l'email en production (voir `docs/ZG7_BRIEF.md`).

### 2. Vérifications en production : page Stripe vérifiée (PR n°40, 14 nov.) ; tâches planifiées à lire le 15 nov.
- Modèle : Sonnet 5.5, High (enchaînée avec les étapes 3 et 4 dans la même session). Page de paiement Stripe (« Zahir Guest », 79,00 € sans choix de devise), journaux des tâches planifiées (`[cron … ] done`), montée Hôtel vers Professional avec une vraie carte.
- Arnaud : la carte pour la montée en gamme ; Android et sous-sol.

### 3. Nettoyage des espaces et comptes de test : liste donnée à Arnaud le 14 nov. (voir brief)
- Modèle : Sonnet 5.5, High. Liste dans `docs/ZG7_BRIEF.md`. Arnaud supprime lui-même dans le module super admin (décision du 14 nov. : pas de `DELETE` SQL) ; Claude vérifie ensuite en base.

## Après la mise en ligne des emails (priorité 1)
- Modèle : Sonnet 5.5, Medium. À faire une semaine après la première inscription Découverte, et au plus tard le 20 nov. si aucun espace n'est inscrit : demander de vérifier dans les journaux Vercel que `/api/cron/free-nurture` répond 200 chaque jour, combien d'emails sont partis, s'il y a eu des désinscriptions, et ce que dit le tableau « Ventes » (conversion inscription vers payant sur 90 jours).
- À ajouter au lancement : « Fais le suivi des emails d'accompagnement de la Découverte : journaux de la tâche quotidienne, envois, désinscriptions, conversion. »

## Plus tard
### Paiement à l'audit (crédits)
- Ne démarrer que lorsque des cabinets s'inscrivent. Hypothèse non testée : environ 9 € par audit publié au-delà du volume inclus, pour les opérateurs du programme Ministère et les cabinets.
- Modèle : Opus 5.5, High (c'est du paiement). Commencer par un plan à valider : modèle de données des crédits, Stripe et YouCan Pay, ce qui se passe à zéro crédit.
- Arnaud : décider du prix et des règles avant de lancer.

### Domaine personnalisé par client (Enterprise)
- Comprend le niveau 2 de la marque blanche des emails : envoi depuis l'adresse du client (domaine authentifié dans Brevo, enregistrements DNS chez le client) et liens sur son domaine. À lancer sur une vraie demande Enterprise.
- Modèle : Opus 5.5, High. Commencer par un plan : ajout du domaine côté Vercel, vérification DNS, certificat, lien avec l'espace du client.
- Arnaud : accord pour toute modification de domaine ou de DNS.

### Liaison de compte Za3fran.io ↔ Zahir Guest
- Modèle : Opus 5.5, High (touche à l'authentification). Plan d'abord, avec les risques d'accès croisés entre les deux produits.
- Arnaud : décider de ce que la liaison doit permettre.

## Tests qui restent toujours pour Arnaud
Paiement YouCan avec sa carte, actions du super admin (ouvrir et terminer un pilote, créer un espace, page Ventes), contrôle sur un vrai iPhone. Voir `docs/TESTS.md` pour le détail.
