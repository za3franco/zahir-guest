# Feuille de route Zahir Guest (à partir du 13 nov. 2026)

Chaque étape donne : l'objectif, le modèle conseillé, ce que fait la session, ce qu'Arnaud doit faire lui-même, et la phrase à ajouter au message de lancement (voir `docs/LANCEMENT_SESSIONS.md`). L'état courant est dans `docs/ZG7_BRIEF.md` ; le détail du mode hors ligne est archivé dans `docs/ZG6_BRIEF.md`.

## Terminé : mode hors ligne de l'audit (PR 0 à 3, en production depuis le 13 nov., actif pour tous les espaces depuis le 14 nov.)
Détail et décisions : `docs/ZG6_BRIEF.md` (archive). Reste seulement le test Android et le test en sous-sol, pour Arnaud.

## En cours : ZG-7, finitions et vérifications (voir `docs/ZG7_BRIEF.md`)
### 1. Messages d'erreur du serveur en français et en anglais
- Modèle : Sonnet 5.5, High (travail large, mécanique, avec tests).
- La session : lister les environ 45 routes `src/app/api/**` qui renvoient des erreurs en anglais seulement, un helper commun selon la langue de l'utilisateur, traduction, parcours de test FR / EN. Ne pas casser les codes d'erreur que l'interface hors ligne traduit (`audit_closed`, `structure_locked`…).
- Arnaud : dire s'il veut aussi l'écran super admin traduit ; accord pour la fusion.
- À ajouter au lancement : « Traduis en français et en anglais tous les messages d'erreur du serveur, avec un plan court d'abord. »

### 2. Vérifications en production
- Modèle : Sonnet 5.5, Medium. Page de paiement Stripe (« Zahir Guest », 79,00 € sans choix de devise), journaux des tâches planifiées (`[cron … ] done`), montée Hôtel vers Professional avec une vraie carte.
- Arnaud : la carte pour la montée en gamme ; Android et sous-sol.

### 3. Nettoyage des espaces et comptes de test
- Modèle : Sonnet 5.5, Medium. Liste dans `docs/ZG7_BRIEF.md`. Arnaud confirme les suppressions (confirmation Supabase) ou les fait dans le tableau de bord.

## Après la mise en ligne des emails (priorité 1)
- Modèle : Sonnet 5.5, Medium. À faire une semaine après la première inscription Découverte, et au plus tard le 20 nov. si aucun espace n'est inscrit : demander de vérifier dans les journaux Vercel que `/api/cron/free-nurture` répond 200 chaque jour, combien d'emails sont partis, s'il y a eu des désinscriptions, et ce que dit le tableau « Ventes » (conversion inscription vers payant sur 90 jours).
- À ajouter au lancement : « Fais le suivi des emails d'accompagnement de la Découverte : journaux de la tâche quotidienne, envois, désinscriptions, conversion. »

## Plus tard
### Paiement à l'audit (crédits)
- Ne démarrer que lorsque des cabinets s'inscrivent. Hypothèse non testée : environ 9 € par audit publié au-delà du volume inclus, pour les opérateurs du programme Ministère et les cabinets.
- Modèle : Opus 5.5, High (c'est du paiement). Commencer par un plan à valider : modèle de données des crédits, Stripe et YouCan Pay, ce qui se passe à zéro crédit.
- Arnaud : décider du prix et des règles avant de lancer.

### Domaine personnalisé par client (Enterprise)
- Modèle : Opus 5.5, High. Commencer par un plan : ajout du domaine côté Vercel, vérification DNS, certificat, lien avec l'espace du client.
- Arnaud : accord pour toute modification de domaine ou de DNS.

### Liaison de compte Za3fran.io ↔ Zahir Guest
- Modèle : Opus 5.5, High (touche à l'authentification). Plan d'abord, avec les risques d'accès croisés entre les deux produits.
- Arnaud : décider de ce que la liaison doit permettre.

## Tests qui restent toujours pour Arnaud
Paiement YouCan avec sa carte, actions du super admin (ouvrir et terminer un pilote, créer un espace, page Ventes), contrôle sur un vrai iPhone. Voir `docs/TESTS.md` pour le détail.
