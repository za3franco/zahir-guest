# Zahir Guest — ZG-6 brief (mis à jour le 13 nov. 2026)

À lire en premier au début d'une session ZG. Les documents détaillés ZG-5 (statut, grille tarifaire) restent dans le projet claude.ai « Zahir Guest App ».

## Où on en est
ZG-5 est en ligne : grille v2 (Hôtel 79 €, Professional 249 €, Enterprise dès 1 490 €), EUR / USD via Stripe, MAD via YouCan Pay ; offre gratuite **Découverte** (1 établissement, 2 utilisateurs, 1 audit par trimestre, questionnaire Essentiel de 63 standards) ; pilote Professional de 14 jours ouvert par le super admin ; correctifs RLS (migration 011). Seul espace existant : l'espace interne Za3fran.

Tests d'Arnaud : check-list partagée https://claude.ai/artifact/YPsqEFpS7z3wM2h8PynrrX (collection `checks`, un document par test avec `done` et `note`). Après le test YouCan à 10 MAD, remettre `YOUCANPAY_TEST_AMOUNT_MAD` à 0 dans Vercel et redéployer.

## Priorités ZG-6

### 1. Emails d'accompagnement de la Découverte — FAIT (PR n°16, en production le 13 nov.)
- Migration `sql/013_free_nurture_emails.sql` appliquée : `tenants.nurture_emails_sent` (jsonb), `tenants.nurture_unsubscribed_at`.
- Emails J+2 (premier audit), J+14 (offre Hôtel), quota trimestriel atteint : `src/lib/nurtureEmails.ts`.
- Tâche quotidienne `/api/cron/free-nurture` (08:43 UTC) ; désinscription `/api/email/unsubscribe` (lien signé avec `CRON_SECRET`).
- Boutons « Passer à Hôtel » : page Questionnaires verrouillée, Nouvelle campagne (bandeau + erreur 402) → `/dashboard/billing#plans`.
- Reste à vérifier : un parcours réel avec un espace Découverte de test (quota atteint → email immédiat).

### 2. Mode hors ligne de l'audit (gros chantier) — PROCHAINE ÉTAPE
Objectif : les auditeurs perdent le réseau dans les sous-sols et les couloirs d'hôtels.
- Enregistrer les réponses, notes et photos sur le téléphone, synchroniser au retour du réseau.
- Points à trancher avant de coder : file d'attente locale (IndexedDB), reprise des envois de photos, conflits (un audit modifié depuis deux appareils), indicateur de synchronisation visible, expiration de session hors ligne.
- Faire d'abord un plan (architecture, risques, ce qui reste en ligne seulement), le soumettre à Arnaud, puis construire.

### 3. Paiement à l'audit (crédits) — après
Hypothèse non testée (≈ 9 € par audit publié au-delà du volume inclus, pour les opérateurs du programme Ministère et les cabinets). À lancer seulement quand des cabinets s'inscrivent.

### 4. Plus tard
Domaine personnalisé par client (Enterprise), liaison de compte Za3fran.io ↔ Zahir Guest.

## Références techniques
- Dépôt `za3franco/zahir-guest` ; site www.zahirguest.com ; Next.js (App Router), Supabase, Vercel, Stripe, Brevo.
- Supabase : projet `fnrafhbautactzhemmjb`. Vercel : projet `prj_qbLa1WSUk6QOHlG8vrrzAhSAb23z`, équipe `team_mCxAzBP02S8BF3JQddNa47eQ`. Stripe : compte `acct_1TVT2jIqDwcwTTU9` (live, partagé avec Za3fran.io).
- Le serveur utilise toujours le rôle de service Supabase ; les sessions navigateur ne servent qu'à l'authentification. Garder les contrôles d'appartenance à l'espace dans les routes API (`src/lib/campaignRefs.ts`, `src/lib/limits.ts`).
- Droits des offres : `effectivePlan()` dans `src/lib/plans.ts` (internal, free, pilot, paid, suspended).
- Build local : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (valeurs factices suffisantes pour compiler).
- PR : ouvrir avec l'API REST (`gh api repos/za3franco/zahir-guest/pulls`), GraphQL indisponible.
- Tests en ligne : l'environnement cloud « Zahir Guest » autorise zahirguest.com et *.vercel.app ; à défaut, l'outil Vercel `web_fetch_vercel_url` lit la production et les versions de test des PR.
- Livraison : branche + PR, migrations dans `sql/NNN_*.sql`, vérification par `execute_sql` juste après `apply_migration`.

## Règles de sécurité
- Toute modification de production (Stripe en direct, migration Supabase, fusion, variable d'environnement Vercel) demande l'accord explicite d'Arnaud dans la conversation.
- Les clés YouCan Pay sont dans Vercel (clé privée « sensitive ») : ne jamais les répéter ni les afficher.
- L'adresse e-mail d'Arnaud est privée ; l'adresse du compte de test est dans le projet claude.ai.
