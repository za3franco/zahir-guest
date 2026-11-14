# Zahir Guest — consignes pour chaque session

Zahir Guest est une plateforme SaaS d'audit « client mystère » pour l'hôtellerie (MENA et Afrique francophone), construite par Arnaud Hébrard (Za3fran Consulting). Next.js (App Router), Supabase, Vercel, Stripe, YouCan Pay, Brevo. Réponds à Arnaud en français : le résultat d'abord, simplement, sans jargon inutile.

## À lire au début de chaque session
1. `docs/ZG7_BRIEF.md` : l'état du projet, ce qui est fait, ce qui reste (le brief le plus récent ; `docs/ZG6_BRIEF.md` est l'archive du mode hors ligne).
2. `docs/FEUILLE_DE_ROUTE.md` : les prochaines étapes, avec pour chacune le modèle conseillé et ce qu'Arnaud doit faire.
3. `docs/TESTS.md` et `docs/PRATIQUES_TECHNIQUES.md` (s'ils existent) : comment tester et les règles de travail.
4. `docs/LANCEMENT_SESSIONS.md` : quand et comment changer de conversation.

## Méthode « avancer d'un trait » (validée par Arnaud le 14 nov. 2026)
Arnaud veut aller vite : Claude enchaîne les phases de la feuille de route sans demander, jusqu'au bout, et ne s'arrête que pour une décision, un blocage ou une conversation devenue lourde. Détail et garde-fous : `docs/PRATIQUES_TECHNIQUES.md`, section « Méthode ».
- **Sans demander** : coder, tester, ouvrir la PR, la **fusionner sur `main`** (squash, SHA de tête vérifié) quand tous les contrôles passent, vérifier la production après chaque fusion, mettre à jour brief et check-list à chaque fusion. Les migrations « ajout seulement » (nouvelle colonne avec valeur par défaut, nouvelle fonction) passent aussi sans demande, avec vérification par `execute_sql` juste après.
- **Toujours avec l'accord explicite d'Arnaud** (il est à chaque fois à demander dans la conversation) : migration qui supprime ou réécrit des données ; Stripe en direct qui débite ou rembourse un vrai client ; variable d'environnement Vercel, domaine, DNS ; suppression d'un espace ou d'un compte qui n'est pas un compte de test listé dans le brief ; email envoyé à une vraie personne autre qu'Arnaud ; retour arrière forcé ou réécriture de l'historique de `main`.
- **S'arrêter et faire un point** : une décision qui revient à Arnaud (prix, règles, périmètre) ; un blocage qu'on ne peut pas lever seule (accès, carte, téléphone, compte super admin) ; la conversation devient lourde (brief à jour, message de relance donné).
- **Si la production casse après une fusion** : d'abord revenir au déploiement précédent (promotion / retour arrière Vercel), puis prévenir Arnaud.

## Règles
- Ne jamais écrire dans le dépôt, ni afficher, une clé, un secret ou une adresse email personnelle. Les clés YouCan Pay et Stripe restent dans Vercel.
- Ne jamais saisir de coordonnées bancaires.
- Avant de coder : auditer le code et le schéma réel de la base. Après chaque migration : vérifier par `execute_sql`.
- Livraison : une branche par sujet, une PR (outil GitHub ou API REST, GraphQL est indisponible), migrations dans `sql/NNN_nom.sql`, fusion par Claude sur `main` selon la méthode ci-dessus.
- Tester soi-même tout ce qui peut l'être (navigateur Playwright, Supabase, Vercel, Stripe en lecture, Gmail) et ne laisser à Arnaud que ce qui demande sa carte, son compte super admin ou son téléphone (voir `docs/TESTS.md`).
- Vérifier avant d'affirmer : ne jamais présenter un espace ou un client comme « réel » sans l'avoir établi.

## Fin de session ou conversation lourde (toujours)
Mettre à jour `docs/ZG7_BRIEF.md` (ou le brief suivant), cocher la check-list partagée, puis donner à Arnaud en une phrase le message de lancement de la session suivante avec le modèle à choisir (voir `docs/LANCEMENT_SESSIONS.md`).
