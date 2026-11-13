# Zahir Guest — ZG-6 brief (mis à jour le 13 nov. 2026, après la PR n°19)

À lire en premier au début d'une session ZG. Les documents détaillés ZG-5 (statut, grille tarifaire) restent dans le projet claude.ai « Zahir Guest App ».

## Où on en est
ZG-5 est en ligne : grille v2 (Hôtel 79 €, Professional 249 €, Enterprise dès 1 490 €), EUR / USD via Stripe, MAD via YouCan Pay ; offre gratuite **Découverte** (1 établissement, 2 utilisateurs, 1 audit par trimestre, questionnaire Essentiel de 63 standards) ; pilote Professional de 14 jours ouvert par le super admin ; correctifs RLS (migration 011). Seul espace existant : l'espace interne Za3fran.

Tests d'Arnaud : check-list partagée https://claude.ai/artifact/YPsqEFpS7z3wM2h8PynrrX (collection `checks`, un document par test avec `done` et `note` ; sections ZG-5 et ZG-6, la liste des tests est dans le code de la page). À mettre à jour après chaque PR fusionnée, avec ce brief. Après le test YouCan à 10 MAD, remettre `YOUCANPAY_TEST_AMOUNT_MAD` à 0 dans Vercel et redéployer.

## Priorités ZG-6

### 1. Emails d'accompagnement de la Découverte — FAIT (PR n°16, en production le 13 nov.)
- Migration `sql/013_free_nurture_emails.sql` appliquée : `tenants.nurture_emails_sent` (jsonb), `tenants.nurture_unsubscribed_at`.
- Emails J+2 (premier audit), J+14 (offre Hôtel), quota trimestriel atteint : `src/lib/nurtureEmails.ts`.
- Tâche quotidienne `/api/cron/free-nurture` (08:43 UTC) ; désinscription `/api/email/unsubscribe` (lien signé avec `CRON_SECRET`).
- Boutons « Passer à Hôtel » : page Questionnaires verrouillée, Nouvelle campagne (bandeau + erreur 402) → `/dashboard/billing#plans`.
- Reste à vérifier : un parcours réel avec un espace Découverte de test (quota atteint → email immédiat).

### 2. Mode hors ligne de l'audit — EN COURS (PR 0 et PR 1 en production, PR 2 et PR 3 restantes)
Objectif : les auditeurs perdent le réseau dans les sous-sols et les couloirs d'hôtels ; réponses, notes et photos restent sur le téléphone et partent au retour du réseau.

**Décisions validées par Arnaud (13 nov.)**
1. Un audit ouvert une fois avec du réseau est disponible hors ligne (les audits listés sur le tableau de bord sont préparés automatiquement, PR 3).
2. Conflit entre deux appareils : la modification la plus récente (heure du téléphone) gagne, critère par critère, et l'auditeur est prévenu.
3. La structure d'un questionnaire utilisé par un audit attribué ou en cours ne peut plus changer (les textes restent modifiables).
4. Données locales gardées 14 jours ; alerte après 3 jours sans synchronisation ; une modification non envoyée n'est jamais effacée en silence.
5. Données locales effacées à la déconnexion, après avertissement s'il reste des envois (PR 3).
6. Activation par espace (`tenants.offline_audit_enabled`, bouton « Offline: on/off » du super admin) : Za3fran et l'espace de test seulement pour l'instant.

**Fait**
- PR 0 — n°17 : `requireUser` vérifie la signature et l'expiration du jeton (`getClaims`, clés ES256) ; écritures d'audit refusées après soumission (409 `audit_closed`) ; critère / section contrôlés contre le questionnaire ; soumission bloquée tant que tout n'est pas enregistré. Protection Vercel activée sur les versions de test (`*.vercel.app`, domaines personnalisés publics).
- PR 1 — n°19 : migration `sql/014_offline_audit.sql` appliquée (`offline_audit_enabled`, `client_updated_at`, `updated_by`, fonctions `zg_apply_audit_response` / `zg_apply_audit_rating` réservées au rôle de service) ; route `/api/audit/[id]/sync` (POST lot de modifications, GET état serveur) ; `src/lib/offline/store.ts` (IndexedDB, repli en mémoire si l'espace n'a pas le mode hors ligne) et `src/lib/offline/auditSync.ts` (file en série, relances, états hors ligne / reconnexion / audit fermé / réattribué, conflits) ; indicateur « ✓ Synchronisé / Synchronisation… / Hors ligne · N modifications sur le téléphone / action requise » ; fonctions Vercel déplacées en `fra1` (Francfort, à côté de la base : une synchronisation passe de 1,9 s à 0,8 s, toutes les pages en profitent).

**Reste**
- PR 2 : photos hors ligne (photo gardée sur le téléphone avec un identifiant créé sur place, envoi sans doublon, suppressions en file, limites 4 par critère / 40 par audit vérifiées sur le téléphone).
- PR 3 : service worker (HTML des pages d'audit, fichiers `/_next/static`, polices, photos déjà vues ; jamais `/api`), manifeste et icônes, préparation automatique des audits du tableau de bord, session (pas de déconnexion automatique hors ligne ou avec des envois en attente ; effacement à la déconnexion), interrupteur d'arrêt. Relecture de sécurité, puis **fusion à demander à Arnaud**.
- Après PR 3 : test réel d'Arnaud sur iPhone et Android (sous-sol), puis ouverture aux autres espaces.

**Pour tester** : espace « ZG TEST — Claude (ne pas utiliser) » (`c0000000-0000-4000-8000-00000000c1a0`, offre interne, sans facturation ni emails), auditeur `zg-test-auditor@example.com` (mot de passe à réinitialiser par SQL si besoin, adresse qui ne reçoit pas de mail), établissement « Hôtel Test ZG-6 », audit « Test ZG-6 — audit 1 » (`c0000000-0000-4000-8000-00000000c1a3`, questionnaire Essentiel). Remettre l'audit à zéro par SQL (réponses, notes, rapport, statut `assigned`) avant un nouveau test. Versions de test protégées : passer par l'outil Vercel `get_access_to_vercel_url` (lien de partage) avant d'ouvrir la page.

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
- Tests en ligne : l'environnement cloud « Zahir Guest » autorise zahirguest.com, *.vercel.app et `fnrafhbautactzhemmjb.supabase.co` (connexion depuis un navigateur de test) ; versions de test protégées par Vercel : lien de partage via `get_access_to_vercel_url`, ou lecture via `web_fetch_vercel_url`.
- Régions : base Supabase `eu-central-1`, fonctions Vercel `fra1` (`vercel.json`).
- Livraison : branche + PR, migrations dans `sql/NNN_*.sql`, vérification par `execute_sql` juste après `apply_migration`.

## Règles de sécurité
- Toute modification de production (Stripe en direct, migration Supabase, fusion, variable d'environnement Vercel) demande l'accord explicite d'Arnaud dans la conversation.
- Les clés YouCan Pay sont dans Vercel (clé privée « sensitive ») : ne jamais les répéter ni les afficher.
- L'adresse e-mail d'Arnaud est privée ; l'adresse du compte de test est dans le projet claude.ai.
