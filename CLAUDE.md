# Zahir Guest — consignes pour chaque session

Zahir Guest est une plateforme SaaS d'audit « client mystère » pour l'hôtellerie (MENA et Afrique francophone), construite par Arnaud Hébrard (Za3fran Consulting). Next.js (App Router), Supabase, Vercel, Stripe, YouCan Pay, Brevo. Réponds à Arnaud en français : le résultat d'abord, simplement, sans jargon inutile.

## À lire au début de chaque session
1. `docs/ZG6_BRIEF.md` : l'état du projet, ce qui est fait, ce qui reste.
2. `docs/FEUILLE_DE_ROUTE.md` : les prochaines étapes, avec pour chacune le modèle conseillé et ce qu'Arnaud doit faire.
3. `docs/TESTS.md` et `docs/PRATIQUES_TECHNIQUES.md` (s'ils existent) : comment tester et les règles de travail.
4. `docs/LANCEMENT_SESSIONS.md` : quand et comment changer de conversation.

## Règles
- Toute modification de production (migration Supabase, fusion d'une PR, variable d'environnement Vercel, Stripe en direct) demande l'accord explicite d'Arnaud dans la conversation. Un accord donné d'avance ne vaut que pour les actions qu'il énumère.
- Ne jamais écrire dans le dépôt, ni afficher, une clé, un secret ou une adresse email personnelle. Les clés YouCan Pay et Stripe restent dans Vercel.
- Ne jamais saisir de coordonnées bancaires.
- Avant de coder : auditer le code et le schéma réel de la base. Après chaque migration : vérifier par `execute_sql`.
- Livraison : une branche, une PR ouverte avec l'API REST (`gh api repos/za3franco/zahir-guest/pulls`, GraphQL est indisponible), migrations dans `sql/NNN_nom.sql`.
- Tester soi-même tout ce qui peut l'être (navigateur Playwright, Supabase, Vercel, Stripe, Gmail) et ne laisser à Arnaud que ce qui demande sa carte, son compte super admin ou son téléphone.

## Fin de session (toujours)
Mettre à jour `docs/ZG6_BRIEF.md` (ou le brief suivant), cocher la check-list partagée, puis donner à Arnaud en une phrase le message de lancement de la session suivante avec le modèle à choisir (voir `docs/LANCEMENT_SESSIONS.md`).
