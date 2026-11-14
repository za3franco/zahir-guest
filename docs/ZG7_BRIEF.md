# Zahir Guest — brief ZG-7 (mis à jour le 14 nov. 2026, fin de la session « email mot de passe oublié » ; prochaine étape : emails aux couleurs du client)

> À lire en premier au début d'une session ZG, avec `CLAUDE.md`. Remplace `docs/ZG6_BRIEF.md`, gardé comme archive détaillée du mode hors ligne. Ne jamais y écrire d'adresse email personnelle, de clé ou de mot de passe.

## Où on en est
**La phase ZG-6 est terminée et en production.** Elle comprenait les emails d'accompagnement de la Découverte, le mode hors ligne de l'audit (stockage local, synchronisation, photos, service worker, appli installable), la sécurité de l'authentification, et les retours des tests d'Arnaud (iPhone, Stripe, marque blanche, langue). **La phase suivante, ZG-7, est une phase de finitions et de vérifications** : traduire les messages d'erreur du serveur, vérifier en production ce qu'un navigateur automatique ne peut pas voir (paiements, tâches planifiées), nettoyer les espaces de test. Les phases d'après (crédits, domaine personnalisé, liaison Za3fran.io) sont dans `docs/FEUILLE_DE_ROUTE.md`.

### En production (dernier commit de code de `main` : `df0f609`, PR n°36 fusionnée le 14 nov. ; PR n°37 et suivantes : documentation)
- **ZG-5** : grille v2 (Hôtel 79 €, Professional 249 €, Enterprise dès 1 490 €), EUR / USD par Stripe, MAD par YouCan Pay, offre gratuite Découverte (1 établissement, 2 utilisateurs, 1 audit par trimestre, questionnaire Essentiel de 63 standards), pilote Professional de 14 jours, correctifs RLS.
- **PR n°16** : emails Découverte (J+2, J+14, quota atteint) et désinscription ; migration 013.
- **PR n°17** : `requireUser` vérifie la signature et l'expiration du jeton (`getClaims`) ; écritures d'audit refusées après soumission ; protection Vercel des versions de test.
- **PR n°19, 21, 23** : mode hors ligne (migration 014, route `/api/audit/[id]/sync`, IndexedDB, photos, service worker, manifeste, session). Fonctions Vercel en `fra1`. Détail et décisions : `docs/ZG6_BRIEF.md`.
- **PR n°26** : écran d'audit sur téléphone (note émotionnelle en lignes, retour en haut, « Section X/N », bouton « Précédente »), champs de connexion / inscription stylés.
- **PR n°28** : « 1 property » au singulier ; avis de fin de période prépayée sans date passée ; les tâches planifiées écrivent une ligne de bilan dans les journaux ; Stripe : pas de conversion automatique en devise locale.
- **PR n°29** : confirmation du changement d'offre ; bouton Delete pour les espaces de test du super admin ; migration 015 (mode hors ligne actif par défaut).
- **PR n°30** : la langue FR / EN choisie suit la personne (**correction du 14 nov. : le cookie `zg_lang` et `src/lib/lang.ts` cités ici n'existent pas dans `main`, la PR n°30 ne contient que la facturation ; la langue d'un utilisateur connecté est la colonne `users.default_language`, changée par le bouton FR / EN du menu**), nom « Zahir Guest » sur la page de paiement Stripe (`branding_settings`), confirmation du changement d'offre en fenêtre centrée (texte différent montée / descente).
- **PR n°31** : marque blanche : « Couleur principale », « Couleur du fond (thème) » (fond sombre teinté, `src/lib/brandColors.ts`), « Reprendre les couleurs de mon logo », aperçu ; montée en gamme facturée tout de suite sur la carte enregistrée (`always_invoice` + `error_if_incomplete`), descente en crédit sur la prochaine facture.
- **PR n°33** : messages d'erreur du serveur en français et en anglais (catalogue `src/lib/apiErrors.ts`, 45 routes).
- **PR n°34** : écran super admin et page `/auth/set-password` en français et en anglais (détail au point 1 bis).
- **PR n°36** : email « mot de passe oublié » envoyé par Brevo dans la langue du compte (détail au point 1 ter).
- **Documentation** : PR n°18, 24, 25, 27 (CLAUDE.md, feuille de route, tests, pratiques, brief).
- **Migrations appliquées** : 010 à 015 (dernière : 015, 14 nov.).

### Espaces existants (14 nov., sans données personnelles)
| Espace | Offre | Remarque |
| :- | :- | :- |
| Za3fran Consulting | interne | l'espace réel, jamais supprimable |
| ZG TEST — Claude (ne pas utiliser) | interne | mes audits de test ; supprimable depuis le super admin |
| ZG TEST Modale (Claude) | Professional (abonnement Stripe fictif) | test de la fenêtre de confirmation et de la marque blanche ; **à supprimer** |
| Grupo Casa Nono | Professional | espace de test d'Arnaud (nouveau, recréé le 14 nov.) ; **sa suppression par le module annule son abonnement Stripe** |

Comptes de test à supprimer : `zg-iphone@example.com` et `zg-modale@example.com` (adresses qui ne reçoivent pas de mail ; mots de passe jamais dans le dépôt).

## Priorités ZG-7 (dans l'ordre)
### 1. Messages d'erreur serveur en français et en anglais — FAIT et fusionné (PR n°33, `main` `18b01f4`)
- `src/lib/apiErrors.ts` : un catalogue unique (47 messages FR / EN), `apiError(lang, clé)`, `serverError(lang, erreur, contexte)` (le vrai message va dans les journaux, la personne voit un texte neutre traduit : plus de « duplicate key… » ni de texte brut de Stripe à l'écran), `langOf(user)`, `requestLang(request, body.lang)` pour les routes publiques (choix de la page, sinon langue du navigateur). Statuts HTTP et champs `code` conservés (`audit_closed`, `unknown_standard`, `unknown_section`, `not_found`, `forbidden`, `invalid`, `use_change`…) : le moteur hors ligne ne lit jamais le texte.
- 45 routes migrées. Restent en anglais volontairement : webhooks Stripe et YouCan Pay, tâches planifiées (lus par des robots). Les messages déjà bilingues (`msg(en, fr)`) sont laissés en place.
- Cas soignés : carte refusée lors d'une montée en gamme (message dédié) ; invitation d'un email déjà inscrit (409 clair).
- `src/lib/clientErrors.ts` : « Pas de connexion » traduit à la place du texte du navigateur (« Load failed » sur iPhone) ; erreurs Supabase Auth (mot de passe, connexion) traduites.
- **Reste hors périmètre** : 5 messages de réussite / états ; la page `/auth/forgot-password` (mot de passe oublié) est encore en anglais seulement.
- Tests : voir `docs/TESTS.md` (37 / 37, iPhone en anglais).

### 1 bis. Écran super admin et page `/auth/set-password` en français et en anglais — FAIT et fusionné (PR n°34, `main` `d75f0c6`, en ligne le 14 nov.)
- `src/lib/superadminText.ts` : tous les textes de l'écran super admin (FR / EN, une seule source ; `fr` est typé comme `en`, un oubli ne compile pas) et les formats de dates, montants (« 1 235 € » / « €1,235 ») et pourcentages. `src/app/superadmin/session.ts` charge le super admin une seule fois par requête. Langue = `users.default_language` ; bouton FR | EN dans l'en-tête (réutilise `/api/user/language`).
- Couvre : en-tête, onglets, vue d'ensemble, formulaire « Nouvel espace », actions et fenêtres de confirmation, page Ventes (tableaux, graphiques, notes). Les erreurs de chargement ne montrent plus le texte brut de Supabase / Stripe (il va dans les journaux). Les actions de ligne passent par un seul appel : un réseau coupé ne laisse plus un bouton bloqué.
- `/auth/set-password` : page serveur (`page.tsx`) qui démarre dans la langue du navigateur (en-tête `Accept-Language`, pas de flash de français sur un iPhone anglais), puis le formulaire (`SetPasswordForm.tsx`) adopte la langue enregistrée pour la personne invitée (`/api/user/me`), sauf si elle a cliqué FR / EN ; bouton FR | EN ; erreurs Supabase traduites (`authErrorText`), lien expiré expliqué ; champ à 16 px (l'iPhone ne zoome plus) et `autocomplete="new-password"`.
- Test : voir `docs/TESTS.md` (54 vérifications automatiques en local, profil iPhone réglé en anglais). Après la fusion : la page `/auth/set-password` répond bien en français et en anglais en production. **Reste pour Arnaud** : l'écran super admin avec ses vraies données (bouton FR | EN) et un vrai lien d'invitation ouvert sur son iPhone réglé en anglais. Retour arrière possible : déploiement précédent `18b01f4`.

### 1 ter. Email « mot de passe oublié » par Brevo, dans la langue de la personne — FAIT et fusionné (PR n°36, `main` `df0f609`, en ligne le 14 nov. ; option A choisie par Arnaud)
- Avant : `/auth/forgot-password` appelait `supabase.auth.resetPasswordForEmail` (email Supabase Auth en anglais, « powered by Supabase »).
- Maintenant : la page appelle `POST /api/auth/forgot-password` (`src/app/api/auth/forgot-password/route.ts`). Le serveur cherche le compte (`users.email`, en minuscules), crée le lien (`auth.admin.generateLink`, type `recovery`, on ne garde que `hashed_token`) et envoie l'email par Brevo (`sendPasswordResetEmail` dans `src/lib/accountEmails.ts`) dans la langue du compte (`users.default_language`), avec la mise en page des autres emails Zahir Guest.
- Lien envoyé : `https://www.zahirguest.com/auth/set-password?type=recovery&lang=xx#token_hash=…`. Le jeton est après le `#` : jamais envoyé à un serveur (absent des journaux Vercel), utilisé seulement par le script de la page (`verifyOtp`), donc un antivirus de messagerie qui ouvre le lien ne le consomme pas ; il est retiré de la barre d'adresse dès la lecture. Page en `referrer: no-referrer`. Le domaine vient de `NEXT_PUBLIC_APP_URL`, jamais de l'en-tête `Host`.
- Page `/auth/set-password` : titre « Choisissez un nouveau mot de passe » / « Choose a new password », langue prise dans le lien (pas de bascule), lien expiré ou déjà servi expliqué avec un bouton « Recevoir un nouveau lien ». Les liens d'invitation fonctionnent comme avant.
- Protection : même réponse (`{ ok: true }`, 200) et même durée minimale (2,5 s) que le compte existe ou non ; 10 demandes par heure et par adresse IP (429 explicite, ne dit rien sur les comptes) ; 3 emails par heure et par adresse email (au-delà : réponse identique, pas d'email). Compteurs dans la table existante `signup_attempts` (HMAC avec la clé serveur, jamais l'adresse ni l'IP en clair) : **aucune migration**.
- `/api/users/invite` enregistre désormais l'email en minuscules (comme l'inscription) ; les 7 comptes existants sont déjà en minuscules (vérifié le 14 nov.).
- Risques acceptés : le lien passe par le suivi des clics de Brevo (comme l'invitation) ; l'ancien point d'entrée Supabase (`/auth/v1/recover`) reste joignable par quelqu'un qui appelle l'API Supabase directement (il enverrait l'email Supabase standard) ; l'inscription dit toujours « un compte existe déjà » (choix d'origine, hors périmètre).
- Tests : voir `docs/TESTS.md` (21 / 21 sur iPhone émulé réglé en anglais, faux Supabase et faux Brevo en local). Contrôle en production après la fusion : adresse invalide refusée (FR), adresse inconnue → `{ ok: true }` en 3 s, compteurs écrits dans `signup_attempts`, faux lien → « This link has expired or has already been used » et jeton retiré de l'adresse, aucune erreur dans les journaux Vercel. Retour arrière possible : déploiement précédent `a6695e5`. **Reste pour Arnaud** : demander un lien depuis son iPhone (réglé en anglais) pour son compte, vérifier l'email reçu (expéditeur Zahir Guest, langue du compte), ouvrir le lien et changer le mot de passe.
- La page `/auth/forgot-password` reste volontairement bilingue (affichée avant de connaître la personne).

### 1 quater. Emails aux couleurs du client (marque blanche, niveau 1) — DÉCIDÉ par Arnaud le 14 nov., À FAIRE (prochaine session)
**Constat (audit du code le 14 nov.)** : la marque blanche (`src/lib/branding.ts`, offres avec `whiteLabel` : Professional, Enterprise, interne, pilote) habille l'application mais presque pas les emails.
- `src/lib/emailNotifications.ts` (mission d'audit attribuée, audit soumis, rapport disponible) : seul le **nom d'expéditeur** prend `brandName` (`sendEmail(…, tenantId)`) ; l'en-tête (`emailWrapper` : logo SVG et nom « Zahir Guest »), les couleurs or / bleu nuit et le pied de page « zahirguest.com » restent ceux de Zahir Guest ; pas d'adresse de réponse.
- Entièrement Zahir Guest : invitation (`src/app/api/users/invite/route.ts`, HTML écrit dans la route), renvoi d'invitation (`src/app/api/users/[id]/route.ts`, HTML dans la route), mot de passe oublié (`sendPasswordResetEmail` dans `src/lib/accountEmails.ts`).
- Restent Zahir Guest **volontairement** (emails de Zahir Guest à son client) : bienvenue, facturation (`billingEmails.ts`), Découverte (`nurtureEmails.ts`), suspension / réactivation (`accountEmails.ts`), support, retours.

**Décisions d'Arnaud** : faire le niveau 1 maintenant ; **garder une mention discrète « Propulsé par Zahir Guest » / « Powered by Zahir Guest »** dans le pied de page (il ne veut pas perdre la marque). Le niveau 2 (envoi depuis le domaine du client, liens sur son domaine : DNS chez le client, Brevo, Vercel) attend une vraie demande Enterprise : c'est l'étape « Domaine personnalisé » de la feuille de route.

**Périmètre du niveau 1** : les 6 emails envoyés aux équipes d'un espace en marque blanche (mission, audit soumis, rapport, invitation, renvoi d'invitation, mot de passe oublié) prennent le **nom, le logo et la couleur principale** de l'espace ; sans marque blanche (Découverte, Hôtel, ou marque blanche perdue après une descente d'offre), rien ne change. Pistes : un seul gabarit d'email partagé qui reçoit la marque (aujourd'hui trois copies : `emailWrapper`, `layout` d'`accountEmails.ts`, HTML des deux routes d'utilisateurs) ; adresse de réponse = un administrateur de l'espace pour les emails de l'espace (à proposer dans le plan) ; mot de passe oublié : marque de l'espace de la personne (le serveur la connaît par `users.tenant_id`), la page `/auth/forgot-password` reste Zahir Guest.

**Points de vigilance (à traiter dans le plan)** :
- `brandName` et autres textes du client échappés dans l'HTML et dans le sujet (injection) ; nom d'expéditeur sans caractères qui cassent l'en-tête.
- Logo : URL publique absolue en `https`, format lisible par les messageries (Gmail n'affiche pas le SVG : prévoir le nom en texte si le logo est en SVG ou absent), taille bornée ; vérifier en base où sont stockés les logos (`branding_config.logo_url`) et s'ils sont publics.
- Couleur : `readableAccent` (déjà utilisé) pour garder le bouton lisible ; fond : garder le bleu nuit (les couleurs de fond « thème » sont un chantier à part).
- Ne pas casser l'email « mot de passe oublié » (PR n°36 : jeton après `#`, même réponse et même durée que le compte existe ou non : chercher la marque ne doit pas changer la durée perçue, elle est déjà bornée à 2,5 s).
- Les liens restent sur www.zahirguest.com (niveau 2 pour changer).
- Modèle : `claude-sonnet-5-5`, effort High. Plan court d'abord, puis code, puis test : faux Brevo en local (méthode de la PR n°36 dans `docs/TESTS.md`), rendu des emails sur iPhone (390 px) avec et sans marque blanche, FR et EN. Aucune migration attendue.

### 2. Vérifications en production avec Arnaud
- Page de paiement Stripe : doit afficher « Zahir Guest », 79,00 € sans choix de devise (PR n°30, n°28).
- Montée Hôtel → Professional avec une vraie carte : prélèvement immédiat de la différence, facture visible dans Stripe (PR n°31). Non testé de bout en bout (les clés Stripe n'existent qu'en production).
- Tâches planifiées : lire les journaux Vercel (`[cron billing-reminders] done`, `[cron free-nurture] done`), première exécution attendue le 15 nov. (07:17 et 08:43 UTC).
- Test Android et test en sous-sol (Arnaud), voir `docs/TESTS.md`.

### 3. Nettoyage
Supprimer les espaces et comptes de test listés ci-dessus. Piège : un `DELETE` fait apparaître une confirmation Supabase chez Arnaud qui n'arrive pas (4 échecs le 14 nov.) ; solutions : Supabase → Authentication → Users → Delete user, ou le module super admin (espaces).

### 4. Finitions possibles (à décider avec Arnaud)
- Rappel de fin de période prépayée en haut du tableau de bord (aujourd'hui seulement sur la page Facturation).
- Thème clair pour la marque blanche : le fond reste sombre aujourd'hui (l'application est conçue sombre) ; un thème clair est un chantier plus lourd.
- Message quand une 5ᵉ photo est ignorée (aujourd'hui elle l'est sans message).

## Phases suivantes (détail dans `docs/FEUILLE_DE_ROUTE.md`)
- Suivi des emails de la Découverte (Sonnet) : une semaine après la première inscription, au plus tard le 20 nov.
- Paiement à l'audit, crédits (Opus) : seulement quand des cabinets s'inscrivent.
- Domaine personnalisé par client Enterprise (Opus), liaison de compte Za3fran.io (Opus).

## Tests
- Check-list partagée : https://claude.ai/artifact/YPsqEFpS7z3wM2h8PynrrX (collection `checks`). Méthode, accords d'avance, pièges, espaces de test : `docs/TESTS.md`.
- Validés par Claude : Découverte (10 sur 10), pilote, priorité 1 (emails), landing, YouCan (page, montant, fin de période), mode hors ligne (badge, réponses, conflit, photos, verrou, soumission, déconnexion), sécurité, corrections de l'écran d'audit, marque blanche (version de test), langue (version de test).
- Validés par Arnaud : test iPhone en mode avion (installation, audit, photos, synchronisation).
- Bloqués ou non faits : paiement Stripe de bout en bout par Claude (page instable sous automatisation), reçu et transaction YouCan (il faut payer), vérification des tâches planifiées, facturation immédiate avec carte.
- Pour Arnaud : paiements réels, actions du super admin, Android, sous-sol.

## Références techniques
- Dépôt `za3franco/zahir-guest` ; site www.zahirguest.com ; Next.js (App Router), Supabase, Vercel, Stripe, YouCan Pay, Brevo.
- Supabase : projet `fnrafhbautactzhemmjb` (région `eu-central-1`). Vercel : projet `prj_qbLa1WSUk6QOHlG8vrrzAhSAb23z`, équipe `team_mCxAzBP02S8BF3JQddNa47eQ`, fonctions en `fra1`. Stripe : compte `acct_1TVT2jIqDwcwTTU9` (live, partagé avec Za3fran.io ; la page de paiement force le nom « Zahir Guest »).
- Fichiers clés : `src/lib/auth.ts` (identité), `src/lib/auditAccess.ts` et `src/lib/auditSync.ts` (écritures d'audit), `src/lib/offline/*` (stockage local et synchronisation), `public/sw.js`, `src/lib/plans.ts` (droits des offres), `src/lib/limits.ts`, `src/lib/brandColors.ts` et `src/lib/branding.ts` (marque blanche), `src/lib/apiErrors.ts` et `src/lib/clientErrors.ts` (messages d'erreur FR / EN), `src/app/api/billing/*` (paiements), `src/app/dashboard/billing/BillingActions.tsx`.
- Build local : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` factices suffisent ; `tsc --noEmit` puis `next build` avant chaque push. Pas de configuration ESLint.
- Livraison : une PR par sujet. La branche de travail de la session est `claude/charming-mayer-b9lkq6` : après chaque fusion, la rebaser est impossible sans forcer, donc repartir de `main` puis fusionner l'ancienne branche avec `git merge -s ours` avant de pousser. Migrations dans `sql/NNN_*.sql`, vérification par `execute_sql` juste après `apply_migration`.
- Versions de test : protégées par Vercel (lien de partage avec `get_access_to_vercel_url`), sans clés Stripe ni YouCan : les paiements ne se testent qu'en production.
- Hôtes ajoutés à l'environnement cloud pour les tests : voir `docs/TESTS.md`.

## Règles de sécurité
Reprise de `CLAUDE.md`, plus :
- Toute modification de production (migration, fusion, variable Vercel, réglage de projet, Stripe en direct, activation d'un espace) demande l'accord explicite d'Arnaud dans la conversation ; un accord donné d'avance ne vaut que pour ce qu'il énumère (voir `docs/TESTS.md`).
- Annuler un abonnement Stripe de test est autorisé ; ne jamais saisir de coordonnées bancaires, même de test.
- **Vérifier avant d'affirmer** : ne jamais présenter un espace ou un client comme « réel » sans l'avoir établi (une erreur de ce type a été commise le 14 nov. : un espace de test d'Arnaud avait été pris pour un client).
- Ne jamais écrire dans le dépôt d'adresse email personnelle, de clé ou de mot de passe.

## Pour la prochaine session
- **Avant tout** : demander à Arnaud s'il a pu ouvrir le lien « mot de passe oublié » reçu sur son iPhone, changer son mot de passe et se reconnecter (l'email lui-même est validé : capture du 14 nov., anglais, expéditeur Zahir Guest) ; et le résultat de ses contrôles du super admin et du lien d'invitation ; corriger ce qu'il signale.
- **Travail** : point 1 quater (emails aux couleurs du client, niveau 1, avec la mention « Propulsé par Zahir Guest »). Ensuite seulement : priorités 2 et 3.
- **Modèle et effort conseillés** : `claude-sonnet-5-5`, effort High.
- **Message de lancement** (nouvelle session, environnement « Zahir Guest », dépôt `za3franco/zahir-guest`, branche `main`) :
  > On continue Zahir Guest. Lis `CLAUDE.md` puis `docs/ZG7_BRIEF.md`, `docs/FEUILLE_DE_ROUTE.md`, `docs/TESTS.md` et `docs/PRATIQUES_TECHNIQUES.md`. Vérifie que tu joins www.zahirguest.com et dis-moi le résultat. Ensuite : point 1 quater du brief ZG-7, emails aux couleurs du client (marque blanche, niveau 1) en gardant la mention « Propulsé par Zahir Guest ». Plan court d'abord avec les risques, puis code, relecture de sécurité et test des emails sur iPhone, avec et sans marque blanche, en français et en anglais. Aucun changement en production sans mon accord explicite.
- **Accords que doit donner Arnaud** : fusion de chaque PR ; ce qu'il veut parmi les finitions de la priorité 4 ; la suppression des espaces de test (confirmation Supabase).
