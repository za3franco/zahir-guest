# Pratiques techniques sur ce dépôt

Règles de travail de Claude sur Zahir Guest. Elles complètent `CLAUDE.md` (consignes générales) et `docs/TESTS.md` (méthode de test).

## Avant de coder
1. Lire `CLAUDE.md`, `docs/ZG6_BRIEF.md`, `docs/FEUILLE_DE_ROUTE.md`, ce fichier et `docs/TESTS.md`.
2. Auditer le code concerné, puis le schéma réel de la base (`information_schema`, contraintes, déclencheurs, droits des fonctions) : ne jamais supposer une colonne.
3. Pour un chantier large : plan écrit (architecture, risques, ce qui reste en ligne seulement, points à trancher), validé par Arnaud avant d'écrire du code.
4. Vérifier que la production et une version de test répondent avant de tester quoi que ce soit.

## Sécurité
- Le serveur utilise le rôle de service Supabase : le contrôle d'appartenance à l'espace et au rôle se fait dans chaque route API (`src/lib/auditAccess.ts`, `campaignRefs.ts`, `limits.ts`), jamais en supposant que l'interface filtre.
- L'identité vient d'un jeton dont la signature et l'expiration sont vérifiées (`requireUser`, `getClaims`). Ne jamais lire un identifiant dans un cookie ou un jeton sans vérification.
- Toute écriture d'audit refuse un audit soumis (409 `audit_closed`) et contrôle que la question ou la section appartient au questionnaire de l'audit.
- Les fonctions SQL appelées par le serveur (`zg_apply_*`) sont réservées au rôle de service : `revoke` à `public`, `anon`, `authenticated`.
- Service worker : jamais de cache pour `/api` (sauf les photos déjà vues en lecture), jamais de réponse redirigée ou non 200, pas de POST. Les données du téléphone sont effacées à la déconnexion.
- Aucune clé, secret, mot de passe ni adresse email personnelle dans le dépôt, les commits, les PR ou les notes de check-list. Les variables sensibles restent dans Vercel et ne sont jamais lues en clair.
- Relecture de sécurité avant de demander la fusion d'une PR qui touche l'authentification, le stockage de données, le cache ou les paiements.

## Base de données
- Migrations dans `sql/NNN_nom.sql`, **ajout seulement** (colonnes avec valeur par défaut, nouvelles fonctions) pour que l'ancien code continue de fonctionner avant et après.
- Appliquer une migration seulement avec l'accord explicite d'Arnaud, puis vérifier tout de suite par `execute_sql` (colonnes, droits, comportement d'une fonction dans une transaction annulée).
- Règle de conflit : la modification la plus récente (heure du téléphone, bornée à maintenant + 5 minutes) gagne, critère par critère.

## Code
- Next.js App Router, TypeScript. Ne pas ajouter de dépendance pour ce qu'une vingtaine de lignes font (le service worker est écrit à la main).
- Un seul moteur de synchronisation (`src/lib/offline/auditSync.ts`) : les écrans ne parlent pas directement aux routes d'envoi.
- Les textes de l'interface existent en français et en anglais ; garder les deux à jour et accorder singulier et pluriel.
- Build local avec des variables factices : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Lancer `tsc --noEmit` puis `next build` avant chaque push. Il n'y a pas de configuration ESLint.
- Les fonctions Vercel tournent en `fra1` (Francfort), à côté de la base `eu-central-1` (`vercel.json`).

## Livraison
- Une branche, une PR (ouverte avec l'outil GitHub ou l'API REST, GraphQL indisponible), mise à jour du brief et de la check-list avant de passer à la PR suivante.
- La description de la PR dit : ce qui change, les tests faits (et sur quoi), les risques acceptés.
- Une PR de code se teste sur sa version de test avant la fusion ; après la fusion, un test rapide en production avec l'espace de test.
- Fusion (squash) seulement avec l'accord explicite d'Arnaud ; les PR de documentation aussi, sauf accord donné d'avance pour une PR précise. Vérifier le SHA de tête (`expectedHeadSha`) avant de fusionner.
- Ne pas forcer l'historique d'une branche : si elle a été fusionnée, repartir de `main` et fusionner `main` dans la branche.
- Commits et PR se terminent par les lignes d'attribution demandées par la session.

## Production
- Toute modification de production (migration, fusion, variable Vercel, réglage de projet, Stripe en direct, activation d'un espace) demande l'accord d'Arnaud ; un accord donné d'avance ne vaut que pour ce qu'il énumère.
- Réglages de production déjà faits avec accord : protection Vercel des versions de test, fonctions en `fra1`, migration 014.
- Préférer un changement réversible (interrupteur par espace `offline_audit_enabled`, ajout de colonne) à un changement définitif.

## Au quotidien
- Réponses à Arnaud en français, le résultat d'abord, sans jargon ; un seul compte rendu en fin de lot : validé, échoué (avec la note), ce qui lui reste, message de lancement de la session suivante avec le modèle à choisir.
- Dire ce qui n'a pas été vérifié, et pourquoi. Ne jamais cocher un test non fait.
- En fin de session : brief à jour, check-list cochée, message de lancement donné (voir `docs/LANCEMENT_SESSIONS.md`).
