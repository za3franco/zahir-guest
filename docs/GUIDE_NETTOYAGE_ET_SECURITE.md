# Guide : nettoyage de la base et sécurité (établi le 16 nov. 2026)

Établi à partir de l'état réel de la base le 16 nov. (compteurs, identifiants et alertes Supabase lus ce jour-là) et de la liste de sécurité de la branche `claude/zen-ride-zm5m7b` (brief du 14 nov., jamais arrivée sur `main`). Les requêtes sont à coller dans Supabase → SQL Editor ; Supabase peut demander une confirmation avant une suppression : c'est normal quand on clique soi-même.

## Partie 1. À supprimer dans Supabase (SQL)

Ordre obligatoire : les campagnes d'abord (elles bloquent la suppression d'un établissement ou d'un questionnaire), leurs réponses, notes, photos et rapports partent avec elles.

### 1 A. Maintenant : le compte de connexion orphelin
Compte `auth.users` sans profil, créé le 30 mai, jamais connecté (domaine zahirguest.com).
```sql
delete from auth.users
where id = 'e8568c50-b3b3-4b39-bad4-73ebe81d0254'
  and not exists (select 1 from public.users u where u.id = auth.users.id);
```

### 1 B. Les données de démonstration « Palais Azur » (3 audits publiés, 0 réponse, 1 établissement, 1 client)
```sql
begin;
delete from campaigns  where id in ('a3000000-beef-beef-beef-000000000001','a3000000-beef-beef-beef-000000000002','a3000000-beef-beef-beef-000000000003');
delete from properties where id = 'a2000000-beef-beef-beef-000000000001';
delete from clients    where id = 'f2d4e108-55ef-4521-925a-f82d7ca03025';
commit;
```

### 1 C. Les essais évidents (noms « campagne test », « Hotel de reve », « Questionnaire test », demande de contact de test)
```sql
begin;
delete from campaigns where id in ('bdac9136-8e29-48ac-a0ab-3a672f917d3d','5bcbc6e4-9278-44b9-ba09-adf7b3738609');
delete from properties where id = '8f1d0bf4-5633-4b1c-b2b0-b99899aeba98';
delete from questionnaire_templates where id = '031a5b0d-3d26-480b-a639-1cc5788c53ca' and tenant_id = 'a0000000-0000-0000-0000-000000000001';
delete from contact_requests where id = 'e9033a9d-09a6-4a40-914c-13d2a19fa5a1' and status = 'test';
commit;
```
La photo de « campagne test 2 » : la ligne part avec la campagne, mais le fichier reste dans le stockage. Supabase → Storage → `audit-photos` → dossier `a0000000-0000-0000-0000-000000000001/5bcbc6e4-9278-44b9-ba09-adf7b3738609/` → supprimer le fichier `697e36be-5bfd-42bd-868a-2a5db2d06260.jpg`.

### 1 D. À confirmer par vous avant de coller (je ne peux pas dire si c'est réel)
« Es Saadi Palace Summer 2026 » (49 réponses, en relecture), « Riad Nono summer 26 visit 1 » (73 réponses) et les établissements « Riad Nono » et « Riad Mama Mia » (Casablanca). Ils ont tous été créés les 26 et 27 mai dans l'espace Za3fran. **Si ce sont de vrais audits ou de vrais clients, ne rien coller.**
```sql
begin;
delete from campaigns  where id in ('21609ea4-4e1c-4d69-a663-64794f998824','a8d6e9c5-b684-4101-a0e8-136adacbeb37');
delete from properties where id in ('957194e4-3c7c-461e-ac6d-0f4c915f462e','3940dc9d-c108-454b-880b-db17eaaee76a');
commit;
```
À garder dans tous les cas : le questionnaire « Standards Club Med 2025 » (996 standards, à votre nom), les questionnaires de la plateforme (Luxury, Essentiel), `admin_audit_log` (trace du super admin), `stripe_events`, `signup_attempts` (compteurs anti-abus qui expirent seuls).

### 1 E. À la fin du suivi J+2 / J+14 seulement (pas avant le 17 nov. après 09 h 30 UTC, quand le J+14 et la désinscription sont validés)
L'espace de test Découverte et son compte (aucun abonnement Stripe). Au choix : module super admin (bouton Delete), ou :
```sql
begin;
delete from auth.users where id in (select id from public.users where tenant_id = 'f69bf20b-c1e3-4017-80bb-9552bc7efe79');
delete from tenants where id = 'f69bf20b-c1e3-4017-80bb-9552bc7efe79';
commit;
```

### Vérification après tout (je la refais de mon côté sur demande)
```sql
select (select count(*) from campaigns) campagnes, (select count(*) from properties) etablissements,
       (select count(*) from clients) clients, (select count(*) from tenants) espaces,
       (select count(*) from auth.users au where not exists (select 1 from public.users u where u.id = au.id)) comptes_orphelins;
```
Attendu après 1 A à 1 E (D inclus) : 0 campagne, 0 établissement, 0 client, 1 espace, 0 compte orphelin.

## Partie 2. Sécurité

### Constaté le 16 nov. (lecture seule)
- Toutes les tables ont la sécurité par lignes (RLS) activée. Le bucket `audit-photos` est privé.
- 9 tables sans politique (`admin_audit_log`, `ai_usage`, `billing_payments`, `clients`, `contact_requests`, `help_usage`, `signup_attempts`, `stripe_events`, `user_access`) : voulu, seul le serveur y accède.
- **Production : Next.js 14.2.x.** La branche 14 a une faille critique et plusieurs graves, corrigées seulement en 15.5.x. Le correctif est la PR n°49 (brouillon, non fusionnée, un conflit avec `main`, jamais testée avec une connexion).
- Alertes Supabase : protection contre les mots de passe divulgués désactivée ; durée des liens (OTP) supérieure à une heure ; deux fonctions (`current_user_role`, `current_user_tenant_id`) appelables sans connexion ; chemin de recherche non figé sur 3 fonctions.
- Le bucket `audit-reports` est public et le code ne l'utilise pas (aucune référence).

### À faire par vous : guide détaillé (ordre conseillé, environ 1 h 30 en tout)
Les intitulés exacts des menus changent parfois chez ces services : si un intitulé diffère un peu, prenez le plus proche, ou dites-moi ce que vous voyez. Mots de passe : jamais dans le chat ni dans le dépôt. Pour chaque A2F, utilisez une application d'authentification (Google Authenticator, Authy, 1Password) et gardez les codes de secours hors de l'ordinateur.

**1. Activer l'A2F (double authentification) sur chaque compte : 20 min, le geste le plus utile**
- GitHub : photo de profil (en haut à droite) → Settings → Password and authentication → Two-factor authentication → Enable.
- Vercel : photo de profil → Settings (de votre compte) → Authentication → activer l'authentification à deux facteurs. Puis, dans l'équipe : Settings → Members, vérifier que chaque membre a le sien (sinon le leur demander).
- Supabase : avatar en bas à gauche → Account preferences → Security → Enable two-factor authentication.
- Brevo : nom du compte en haut à droite → Profil / Security → Two-factor authentication.
- Stripe : photo en haut à droite → Personal settings (Paramètres personnels) → Security → ajouter une application d'authentification ou une clé d'accès (passkey).
- YouCan Pay : espace vendeur → Paramètres du compte / Sécurité. Si vous ne trouvez pas l'option, écrivez-moi : ce sera à demander à leur support.

**2. GitHub : protéger `main` et activer les alertes : 15 min**
Ouvrez github.com/za3franco/zahir-guest → Settings.
- Branches (ou Rules → Rulesets) → Add branch ruleset / Add rule : nom « main », cible `main` → cocher « Require a pull request before merging » (mettre 0 approbation requise, vous êtes seul) et « Block force pushes ». Ne cochez rien d'autre. Mes fusions passent par des pull requests : elles continueront de marcher.
- Settings → General → section « Pull Requests » → cocher « Automatically delete head branches » : les branches fusionnées se suppriment seules.
- Settings → Code security (ou « Advanced Security ») : activer Dependabot alerts et Dependabot security updates ; activer Secret scanning et Push protection si l'option est proposée (selon l'offre GitHub, elle peut être payante pour un dépôt privé : ce n'est alors pas indispensable, le dépôt ne contient aucune clé, vérifié).
- Nettoyage : onglet Code → « branches » → corbeille à droite de chaque branche `claude/...` déjà fusionnée (une vingtaine). Gardez `main`.

**3. Vercel : pare-feu : 20 min**
vercel.com → équipe → projet « zahir-guest » → onglet Firewall.
- Custom Rules → Add rule : nom « Limite API » ; condition : « Request Path » « Starts with » `/api/` ; ET « Request Path » « Does not start with » `/api/webhooks` ET `/api/cron` (les robots de Stripe, YouCan et de Vercel ne doivent jamais être freinés) ; action : « Rate Limit » ; 300 requêtes par minute par adresse IP (large : la synchronisation hors ligne envoie des rafales). Choisissez d'abord « Log » si l'option existe, regardez quelques jours, puis passez à la limitation.
- Bot Management (ou « Bot Protection ») : mode « Log » d'abord, puis « Challenge » plus tard. Ne pas bloquer d'emblée : un auditeur sur son téléphone ne doit pas être gêné.
- Ne touchez pas à « Deployment Protection » : la protection des versions de test est déjà en place.

**4. Supabase : réglages de connexion : 10 min**
Adresse directe : https://supabase.com/dashboard/project/fnrafhbautactzhemmjb/auth/providers (cette page existe, confirmée dans leur documentation ; les libellés exacts des options ci-dessous n'ont pas pu être confirmés aujourd'hui).
- **Mots de passe divulgués** : dans les réglages de connexion par email ou la rubrique « Password security », cherchez « Prevent use of leaked passwords » (ou « Leaked password protection ») et activez. Si l'interrupteur est grisé ou demande l'offre Pro, c'est une limite de l'offre : laissez, l'alerte restera, sans gravité.
- **Durée des liens (« Email OTP Expiration »)** : actuellement plus d'une heure. Mon conseil : **ne rien changer**. Nos emails d'invitation promettent 24 heures et utilisent ce même réglage ; le lien est à usage unique et son jeton n'apparaît jamais dans l'adresse. Si vous préférez 1 heure (3600), dites-le-moi : je change aussi le texte des emails (« expire dans 1 heure ») avant que vous ne changiez le réglage.

**5. Brevo : 10 min**
- A2F (voir 1). Menu du compte → SMTP & API → Clés API : vérifier qu'une seule clé existe, celle de Zahir Guest. Si d'autres traînent, les supprimer (jamais celle de Zahir Guest : l'envoi des emails s'arrêterait).
- **Ne pas** limiter les « Authorised IPs » : Vercel n'a pas d'adresse fixe, tous nos emails seraient refusés. (Ce conseil de la liste du 14 nov. est retiré.)
- Domaine : Senders, Domains & Dedicated IPs → Domains → zahirguest.com : les états DKIM et DMARC doivent être verts (ils l'étaient le 14 nov.).

**6. Stripe : clé restreinte (le plus délicat, à faire en dernier, 30 min)**
Aujourd'hui, la clé complète est dans Vercel. Une clé « restreinte » limite les dégâts si elle fuit. Droits que le code utilise (relevé dans le code le 16 nov.) :
- Checkout Sessions : écriture ; Customer portal (Billing portal sessions) : écriture ; Subscriptions : écriture (modifier, annuler, lister) ; Customers : lecture ; PaymentMethods : lecture ; Prices : lecture ; Invoices : lecture ; Coupons : lecture.
Étapes : Stripe → Developers (Développeurs) → API keys → « Create restricted key » → nommer « Zahir Guest serveur » → régler chaque ressource ci-dessus (tout le reste sur « None ») → créer, copier la valeur.
Puis Vercel → projet → Settings → Environment Variables → `STRIPE_SECRET_KEY` : remplacer la valeur (type « Sensitive »), redéployer. **Prévenez-moi avant** : je teste la facturation et la page Ventes juste après et, si un droit manque (page Ventes vide, annulation refusée), vous ajoutez le droit manquant. Gardez l'ancienne clé active tant que tout n'est pas vérifié, puis supprimez-la (API keys → Roll / Delete).
- Radar : Stripe → Radar → Rules : laisser les règles par défaut activées. Notifications : Settings → Notifications → activer les alertes de paiement échoué et de litige.

### Fait par Claude le 16 nov. avec l'accord d'Arnaud (points 6 à 9 : voir `docs/ZG7_BRIEF.md`, « Fait le 16 nov. (après-midi, UTC) ») ; le texte d'origine est conservé ci-dessous
6. **Migration 017** (`sql/017_security_definer_hardening.sql`, sur la branche de la PR n°49) : les deux fonctions ne sont plus appelables sans connexion, chemin de recherche figé. Elle ne change rien pour les personnes connectées. Je l'applique et je vérifie en base, ou vous la collez :
```sql
alter function public.current_user_role() set search_path = public, pg_temp;
alter function public.current_user_tenant_id() set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;
revoke execute on function public.current_user_role() from public, anon;
revoke execute on function public.current_user_tenant_id() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.current_user_tenant_id() to authenticated, service_role;
```
7. **Bucket `audit-reports`** : le rendre privé (inutilisé par le code, vérifié par recherche). `tenant-logos` reste public (les logos des emails).
```sql
update storage.buckets set public = false where id = 'audit-reports';
```
8. **PR n°49 : Next.js 15.5.29, en-têtes de sécurité (CSP, HSTS), limite d'export de la bibliothèque.** La plus importante. À reprendre sur `main` (un conflit à résoudre), tester sur une version de test Vercel avec un compte de test (connexion, tableau de bord, audit et photos, rapports, facturation, super admin), puis fusionner. Retour arrière : déploiement précédent.
9. **Conditions d'utilisation** (interdiction de copie et d'extraction automatique, commit `efd395d` de la même branche) : le texte juridique est à valider par vous avant fusion.
