# Feuille de route Zahir Guest (à partir du 13 nov. 2026)

Chaque étape donne : l'objectif, le modèle conseillé, ce que fait la session, ce qu'Arnaud doit faire lui-même, et la phrase à ajouter au message de lancement (voir `docs/LANCEMENT_SESSIONS.md`). Le détail technique du mode hors ligne (décisions, découpage) est dans `docs/ZG6_BRIEF.md`.

## En cours : mode hors ligne de l'audit
Plan validé le 13 nov. PR 0 (sécurité et sauvegarde) fusionnée. Reste trois PR, une session chacune.

### PR 1 — stockage local, file d'envoi, synchronisation
- Modèle : Opus 5.5, High.
- La session : IndexedDB (copie de l'audit, file d'envoi en série), route `/api/audit/[id]/sync`, colonne `client_updated_at` (migration 014), conflits (la modification la plus récente gagne, avec message), indicateur de synchronisation visible, blocage de la modification de structure d'un questionnaire utilisé par une campagne en cours. Tests avec le navigateur Playwright en mode hors ligne.
- Arnaud : donner l'accord pour la migration 014, puis pour la fusion.
- À ajouter au lancement : « Construis la PR 1 du mode hors ligne telle que décrite dans le brief. »

### PR 2 — photos hors ligne
- Modèle : Opus 5.5, High.
- La session : photos gardées sur le téléphone, envoi repris après une coupure, limites de taille, nettoyage des photos envoyées.
- Arnaud : accord pour la fusion.
- À ajouter au lancement : « Construis la PR 2 du mode hors ligne (photos). »

### PR 3 — service worker, manifeste, session, activation par espace
- Modèle : Opus 5.5, High. Relecture de sécurité avant de fusionner (jamais de cache pour `/api`, effacement des données locales à la déconnexion, expiration de session hors ligne).
- La session : service worker écrit à la main, manifeste, alerte après 3 jours sans synchronisation, données gardées 14 jours, activation d'abord pour l'espace Za3fran seul.
- Arnaud : **test réel sur ton iPhone**, en mode avion, dans un vrai audit (ouvrir avec du réseau, couper le réseau, répondre, prendre une photo, rétablir le réseau, vérifier que tout remonte). C'est le seul test que la session ne peut pas faire à ta place. Puis accord pour activer l'option pour les clients.
- À ajouter au lancement : « Construis la PR 3 du mode hors ligne, puis fais une relecture de sécurité complète avant de me demander la fusion. »

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
