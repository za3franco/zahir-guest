# Tests Zahir Guest : méthode et statut

Dernière mise à jour : 14 nov. 2026 au soir (invitation vérifiée en production, Stripe public, rappel de fin de période). La check-list vivante d'Arnaud est l'artefact https://claude.ai/artifact/YPsqEFpS7z3wM2h8PynrrX (collection `checks`, un document par test avec `done` et `note`). Ce fichier explique comment on teste ; la check-list dit où on en est.

## Principe
Claude fait seul tout ce qui peut l'être. Arnaud ne garde que ce qui demande sa carte bancaire, son compte super admin ou son téléphone. On ne coche un test que s'il a été réellement vérifié, avec une note datée qui dit quoi, comment et ce qui n'a pas été vu.

## Ce que Claude fait seule
| Domaine | Comment |
| :- | :- |
| Pages, parcours, mobile | Navigateur Playwright (Chromium installé) sur www.zahirguest.com ou une version de test ; largeur 390 px pour un téléphone, mode hors ligne via `context.setOffline(true)` |
| Base de données | Outils Supabase (`execute_sql`, `apply_migration`) : lecture du schéma avant de coder, vérification après chaque écriture |
| Emails | Outil Gmail : lire l'email reçu par l'adresse de test (texte et liens), suivre les liens suivis par Brevo |
| Paiements Stripe | Création de la session de paiement par l'API de l'application, lecture de la page Stripe, code promo 100 % `ZAHIRTEST100` ; jamais de carte |
| Paiements YouCan Pay | Lancement du paiement en MAD, lecture du montant sur la page YouCan ; jamais de carte |
| Versions de test (PR) | Protégées par Vercel : obtenir un lien de partage avec `get_access_to_vercel_url`, ouvrir ce lien une fois dans le contexte du navigateur, puis naviguer |
| Déploiements, journaux | Outils Vercel (états de déploiement, variables d'environnement par nom) |

## Ce qui reste pour Arnaud (seulement ces lignes, une par test dans la check-list)
- Tout paiement réel (carte YouCan Pay, ou Stripe sans code promo), la réception du reçu et la vérification dans le tableau de bord YouCan.
- Les actions du compte super admin : « Open pilot » et « End pilot », créer un espace, page Ventes, onglet Cron Jobs de Vercel.
- Le téléphone : installation de l'appli sur l'écran d'accueil, test en mode avion dans un vrai audit, sous-sol, photos prises avec l'appareil.
- Les décisions : prix, règles, ouverture du mode hors ligne aux autres espaces.

## Accords donnés d'avance par Arnaud (13 nov. 2026, à répéter à chaque session)
Pour des tests : créer ou réutiliser un espace de test en production, le modifier par SQL (pilote, date de fin de période), annuler les abonnements Stripe de test, et en fin de test remettre `YOUCANPAY_TEST_AMOUNT_MAD` à 0 dans Vercel avec redéploiement. **Depuis le 14 nov. (méthode « avancer d'un trait »), les fusions sur `main` et les migrations « ajout seulement » n'ont plus besoin d'accord ; les suppressions de données, Stripe en direct, Vercel, domaine et emails à de vraies personnes en demandent toujours un** (voir `docs/PRATIQUES_TECHNIQUES.md`). Ne jamais saisir de coordonnées bancaires.

## Espaces de test en production
- « ZG TEST — Claude (ne pas utiliser) », id `c0000000-0000-4000-8000-00000000c1a0` : offre interne, mode hors ligne activé, sans facturation ni emails de suivi. Auditeur `zg-test-auditor@example.com` (adresse qui ne reçoit pas de mail), établissement « Hôtel Test ZG-6 », audit `c0000000-0000-4000-8000-00000000c1a3` (questionnaire Essentiel).
- « ZG TEST Découverte (Claude) », id `875eb2d6-9296-417c-8747-bd8b787356a3` : créé par le vrai formulaire d'inscription avec l'adresse de test configurée dans Vercel (`YOUCANPAY_TEST_EMAIL`, ne pas la recopier ici). Sert aux tests d'offres, de pilote, de paiements et de fin de période ; son état change d'un test à l'autre (pilote, prépayé MAD expiré) : le relire en base avant de s'en servir.
- Les mots de passe de test sont générés au début de chaque session, posés par SQL sur `auth.users` (hash bcrypt) et gardés uniquement dans le dossier temporaire de la session. Jamais dans le dépôt.
- Remettre un audit de test à zéro : supprimer ses réponses, notes émotionnelles et rapport, puis `status='assigned'`, `submitted_at=null` (les `DELETE` demandent une confirmation à Arnaud dans l'application Supabase).

## Pièges connus
- **Confirmation Supabase** : un `DELETE` fait apparaître une question de confirmation chez Arnaud ; sans réponse en 230 s l'outil échoue et se ferme pour le tour. Prévenir Arnaud avant, ou n'utiliser que `INSERT` / `UPDATE`.
- **Page Stripe Checkout** : instable sous automatisation. Le prix s'affiche dans la devise du visiteur (SGD depuis Singapour) avec un bouton EUR / SGD (`getByRole('button', { name: /EUR/ })` marche, pas le clic par texte) ; l'application du code promo a répondu « Something went wrong » à répétition. Ne jamais cliquer « Subscribe » si le total n'est pas à 0.
- **Hôtes réseau** : l'environnement cloud est en accès limité. Ajoutés pour les tests : `checkout.stripe.com`, `js.stripe.com`, `api.stripe.com`, `m.stripe.network`, `r.stripe.com`, `m.stripe.com`, `merchant-ui-api.stripe.com`, `b.stripecdn.com`, `checkout-cookies.stripe.com`, `youcanpay.com`, `pay.youcanpay.com`, `api.youcanpay.com`, `fnrafhbautactzhemmjb.supabase.co`, et le domaine de suivi des liens Brevo.
- **Journaux Vercel** : ils ne contiennent que ce que le code écrit avec `console` ; une tâche planifiée qui réussit sans rien écrire n'y laisse pas de trace.
- **Landing** : les sections se révèlent au défilement ; pour les photographier, utiliser `scrollIntoView` sur chaque `<section>` (un `window.scrollTo` ne suffit pas).
- **Prix de test YouCan** : n'agit que pour l'adresse de `YOUCANPAY_TEST_EMAIL` ; tant que `YOUCANPAY_TEST_AMOUNT_MAD` vaut 10, cet utilisateur paie 10 MAD au lieu du vrai prix.

## Statut au 14 nov. 2026
Légende : validé (Claude), partiel, bloqué, pour Arnaud.

### ZG-6 : sécurité, hors ligne, photos, appli
| Test | Statut |
| :- | :- |
| Faux jeton refusé, versions de test protégées, audit soumis figé | validé |
| Badge « Disponible hors ligne », réponses hors ligne, fermer puis rouvrir, soumission bloquée hors ligne | validé sur version de test et en production |
| Conflit entre deux appareils, questionnaire verrouillé | validé en production le 14 nov. (la modification la plus récente gagne, message affiché ; verrou 409 `structure_locked` avec un audit attribué, texte modifiable) |
| Photos hors ligne, envoi sans doublon, suppression hors ligne, limite de 4 par critère | validé (limite : la 5e photo est ignorée sans message) |
| Audit ouvert sans réseau, page « Hors ligne », déconnexion, interrupteur d'arrêt | validé |
| Test iPhone en mode avion (installation, audit, photos, synchronisation, soumission) | validé par Arnaud le 14 nov. ; ses remarques sont corrigées (PR n°26) |
| Android, test en sous-sol | pour Arnaud |

### Priorité 1 : emails de la Découverte
| Test | Statut |
| :- | :- |
| Un 2e audit refusé envoie l'email « quota atteint » avec le bouton « Passer à Hôtel » ; le bouton mène à la facturation | validé en production le 13 nov. |
| Le lien de désinscription fonctionne | validé : page de confirmation puis « Done », `nurture_unsubscribed_at` rempli |
| Emails J+2 et J+14 | non testés (dépendent de la tâche quotidienne et de l'âge de l'espace) |

### ZG-5
| Test | Statut |
| :- | :- |
| Découverte : inscription, bienvenue, questionnaires, pages verrouillées, 1er audit, 2e refusé, 2e établissement, 3e utilisateur, IA, rapport | validé (10 sur 10) |
| Pilote : fonctions Professional | validé (pilote ouvert par SQL) ; « Open pilot » et « End pilot » : pour Arnaud |
| YouCan : lancement, montant 10 MAD, fin de période | validé ; reçu et transaction YouCan : pour Arnaud (il faut payer) ; remise du prix de test à 0 : faite le 14 nov. (variable à 0, production redéployée) |
| Stripe : Hôtel mensuel en EUR, passage à Professional 7 établissements | bloqué (page de paiement, voir pièges) |
| Stripe : prix en USD | partiel : 89 $ affiché, paiement non fait |
| Landing, calculateur, devises, conditions d'utilisation | validé |
| Tâche quotidienne de rappels (`sa-cron`) | non vérifiable d'ici : voir l'onglet Cron Jobs de Vercel |

## Défauts relevés par les tests
Corrigés : note émotionnelle, retour en haut, section précédente, champs de connexion (PR n°26) ; « 1 properties », date passée de fin de période prépayée, bilans des tâches planifiées, conversion de devise Stripe (PR n°28) ; langue, nom Stripe, confirmation de changement d'offre (PR n°29 à 31). Restent :
- Messages d'erreur du serveur : traduits sur la branche `claude/bold-sagan-d8wich` (en attente de fusion). Restent en anglais : écran super admin et page `/auth/set-password`.
- Rappel de fin de période prépayée seulement sur la page Facturation, pas en haut du tableau de bord.
- 5e photo ignorée sans message.

## Ajouts du 14 nov. 2026 (PR n°26 à 31)
| Test | Statut |
| :- | :- |
| Langue FR / EN suivie partout (cookie `zg_lang`) malgré la langue du téléphone | validé sur version de test ; à confirmer par Arnaud sur son iPhone |
| Marque blanche : couleur principale, couleur du fond, couleurs du logo, aperçu | validé sur version de test (Playwright, 390 px) |
| Fenêtre de confirmation du changement d'offre (montée, descente, même niveau) | validé avec l'espace « ZG TEST Modale » (abonnement fictif) |
| Page Stripe : nom « Zahir Guest », 79,00 € sans choix de devise | à vérifier en production |
| Montée en gamme facturée tout de suite (carte enregistrée) | non testé de bout en bout : carte d'Arnaud requise |
| Mode hors ligne actif par défaut pour tous les espaces (migration 015) | validé en base (4 espaces sur 4) |
| Suppression d'un espace de test par le super admin | codé ; l'espace de Casa Nono à supprimer |
| Journaux des tâches planifiées (`[cron … ] done`) | à lire après l'exécution du 15 nov. |

## Messages d'erreur FR / EN (session du 14 nov., branche `claude/bold-sagan-d8wich`)
| Test | Statut |
| :- | :- |
| Catalogue : 47 messages, FR et EN présents, textes différents, variables identiques, `serverError` ne laisse pas passer le texte brut de la base | validé (script, hors dépôt) |
| `tsc --noEmit` et `next build` (variables factices) | validé |
| Routes publiques en HTTP réel : inscription et paiement public, avec navigateur en anglais et choix FR (le choix gagne) | validé |
| Parcours sur iPhone émulé (Chromium, 390 px, locale en-US) sur la version de test, compte auditeur de test : 17 erreurs d'API en français (choix FR) puis en anglais (bouton EN du menu), codes lus par le hors ligne intacts (`not_found`, `forbidden`, `invalid`, `unknown_standard`, `unknown_section`), erreur de connexion « FR / EN », « Pas de connexion » / « No connection » sur l'écran Profil sans réseau | validé, 37 / 37 |
| Non vérifiés ici : `audit_closed` en conditions réelles (il faudrait soumettre un audit : texte contrôlé par le catalogue seulement), carte refusée à la montée en gamme (carte requise), routes de l'administrateur (le compte de test est un auditeur ; leurs messages passent par le même helper), webhooks et tâches planifiées (volontairement en anglais) | non fait |
| Compte `zg-test-auditor` : mot de passe temporaire posé avec l'accord d'Arnaud, langue remise en français, mot de passe neutralisé en fin de test | fait |

## Écran super admin et `/auth/set-password` (14 nov., PR n°34, fusionnée et en ligne)
Méthode : build local avec variables factices, faux serveur Supabase local (auth, profil, données d'espaces) et réponses Stripe simulées, Playwright en profil iPhone 14 (Chromium, pas WebKit) réglé en anglais. Aucune donnée ni clé de production.
| Test | Statut |
| :- | :- |
| `/auth/set-password` : anglais d'emblée sur un iPhone anglais, langue enregistrée prioritaire, bascule FR / EN, erreurs (différents, trop faible, même mot de passe, réseau coupé, lien expiré), succès, champ 16 px (15 sur 15) | validé en local |
| Super admin FR et EN : vue d'ensemble, formulaire, fenêtres de confirmation, Ventes, bouton de langue enregistré dans le profil, aucun mot de l'autre langue, pas de défilement latéral (39 sur 39) | validé en local |
| Page `/auth/set-password` en production : « Définissez votre mot de passe » (navigateur français) / « Set your password » (navigateur anglais) | validé le 14 nov. après la fusion |
| Écran super admin avec les vraies données, compte super admin d'Arnaud, en production | pour Arnaud |
| Lien d'invitation réel reçu par email, ouvert sur un vrai iPhone | pour Arnaud |
| Piège : `innerText` renvoie les en-têtes de tableau en capitales (CSS), comparer sans tenir compte de la casse | |

## Email « mot de passe oublié » par Brevo (14 nov., point 1 ter, PR n°36 fusionnée et en ligne)
Méthode : build de production local (variables factices), faux Supabase local (tables `users` et `signup_attempts`, `generate_link`, `verify`, `user`), faux Brevo (appel intercepté et enregistré), Playwright en profil iPhone 14 réglé en anglais (Chromium). Aucune donnée ni clé de production ; deux comptes fictifs (un EN, un FR).
| Test | Statut |
| :- | :- |
| Compte existant et adresse inconnue : même réponse `{ ok: true }` 200, même durée (2,5 s) ; pas d'email pour l'adresse inconnue ni pour un motif `%@%` | validé en local |
| Email dans la langue du compte, pas celle de la page (EN pour le compte EN depuis une page FR, et l'inverse) ; aucun mot « Supabase » ; expéditeur Zahir Guest | validé en local |
| Lien sur www.zahirguest.com même avec un en-tête `Host` piégé ; jeton après le `#` | validé en local |
| Limites : 4ᵉ demande pour la même adresse dans l'heure sans email (réponse identique), 11ᵉ demande depuis la même IP refusée (429, message FR ou EN) | validé en local |
| Parcours iPhone anglais : page « Email sent », lien ouvert, page en anglais dès le HTML du serveur (même navigateur français), jeton échangé une fois puis retiré de l'adresse, champ 16 px, mot de passe enregistré, lien réutilisé → message clair et bouton « Get a new link », compte FR → email et page en français, adresse invalide → erreur en anglais, pas de défilement latéral (21 / 21) | validé en local |
| Un simple chargement du lien (antivirus de messagerie) ne consomme pas le jeton | validé en local |
| Lien d'invitation (ancien chemin, jetons dans le `#`) toujours accepté | validé en local |
| En production après la fusion : adresse invalide refusée, adresse inconnue → réponse normale, compteurs écrits, faux lien → message « already been used » sur iPhone anglais, pas d'erreur dans les journaux | validé le 14 nov. |
| Vrai email Brevo et vrai iPhone, en production après la fusion | pour Arnaud |

## Emails aux couleurs du client (14 nov., point 1 quater, branche `claude/zahir-guest-white-label-emails-qvvw8v`)
Méthode : `tsc --noEmit` et `next build` (variables factices). Banc d'essai hors dépôt : faux Supabase et faux Brevo en mémoire (le `fetch` est remplacé, aucun appel réel, aucune donnée ni clé de production), 8 espaces fictifs (Professional avec logo, couleur sombre, couleur claire, nom de marque piégé, Hôtel avec réglages gardés, Professional sans personnalisation, interne, lecture de marque en erreur) ; les 6 emails en français et en anglais ; rendu dans Chromium en profil iPhone 14 (390 px, `deviceScaleFactor` 2, WebKit non installé ici). Parcours HTTP du mot de passe oublié sur le build de production local avec un faux Supabase (serveur local) et un faux Brevo (préchargement qui enregistre l'appel).
| Test | Statut |
| :- | :- |
| 6 emails × FR / EN sans marque blanche (aucun espace, Hôtel avec réglages gardés, Professional sans personnalisation, lecture de marque en erreur, espace interne) : expéditeur Zahir Guest, couleur or, pas de logo client, pas de mention « Propulsé par », pas d'adresse de réponse | validé (script) |
| 6 emails × FR / EN avec marque blanche : expéditeur = marque (adresse inchangée), nom et logo https dans l'en-tête, couleur du client sur le bouton, mention « Propulsé par » / « Powered by » avec lien www.zahirguest.com, plus de logo ni de couleur Zahir Guest, liens seulement sur www.zahirguest.com, sujet avec la marque (invitation, mot de passe oublié, compte supprimé), jeton du mot de passe oublié intact après le `#` | validé (script) |
| Adresse de réponse : l'administrateur qui agit (mission, invitation, compte supprimé), le plus ancien administrateur (audit soumis, rapport), aucune pour le mot de passe oublié | validé (script) |
| Couleur sombre éclaircie, couleur claire : texte du bouton foncé | validé (script et rendu) |
| Nom de marque piégé (`"><img onerror>`, retour à la ligne, `Bcc:`, `<b>`) : texte inoffensif dans l'email, sujet et expéditeur sans retour à la ligne ni `< > " @ , ; :`, logo hors de notre stockage refusé | validé (script et rendu) |
| Textes saisis piégés (nom de personne, établissement, ville, campagne avec `<script>`, `<img onerror>`, `&`, `"`) : tout échappé, aussi sans marque blanche | validé (script) |
| URL de logo : refusés `http`, hôte voisin (`fake.supabase.test.evil.com`), identifiant dans l'URL, port, autre bucket, SVG, `..`, `javascript:`, `data:`, guillemet, valeur non texte ; acceptés png / jpg avec paramètres ignorés | validé (script, 14 cas) |
| Total du script | **632 / 632** |
| Rendu iPhone 390 px (32 emails : avec et sans marque blanche, FR et EN, couleurs extrêmes, nom piégé, textes piégés) : pas de défilement latéral, logo chargé (36 px), bouton lisible, pied de page « Propulsé par Zahir Guest » | validé |
| Parcours HTTP « mot de passe oublié » sur le build local : compte d'un espace en marque blanche (anglais) → email aux couleurs de l'espace, sujet « Reset your … password », jeton après `#` ; compte d'un espace Hôtel (français) → email Zahir Guest sans trace de la marque gardée ; adresse inconnue → aucun email ; les trois : `{ ok: true }` 200 en 2,51 à 2,54 s | validé en local |
| Limite du test HTTP : le faux Supabase est en `http`, donc le logo y est (volontairement) refusé ; le logo affiché est vérifié dans le banc d'essai (URL `https`) | |
| Vrai email Brevo reçu en production (outil Gmail), espace « ZG TEST — Claude » (logo, rouge) : invitation FR et EN envoyées par `/api/users/invite` ; expéditeur = marque, DKIM / SPF / DMARC passent, logo et nom, bouton rouge éclairci, « Propulsé par Zahir Guest », adresse de réponse = l'administrateur, lien Brevo → `/auth/set-password` ouvert en anglais | validé le 14 nov. au soir (Claude) |
| Vrai email ouvert sur un vrai iPhone (Gmail, Mail), espace Casa Nono (logo, orange) : invitation d'une personne, mission, FR et EN | pour Arnaud |
| Email d'un espace sans marque blanche (Découverte, Hôtel) en production | non refait (aucun tel espace en base) ; couvert par le banc d'essai (632 / 632) |
| Piège : une URL de logo doit avoir l'hôte exact de `NEXT_PUBLIC_SUPABASE_URL` et le chemin `/storage/v1/object/public/tenant-logos/` ; un logo téléversé par l'écran Marque est toujours de cette forme | |

## Paiement public Stripe, rappel de fin de période, message de photo (14 nov. au soir, PR n°40 à 42)
| Test | Statut |
| :- | :- |
| Page Stripe lue en production par la route publique (Hôtel, mensuel, EUR) : avant la PR n°40 « 116,64 $SG » (visiteur à Singapour) ; après : « Zahir Guest », « 79,00 € », aucun choix de devise | validé en production |
| Session de test créée sans paiement (adresse fictive `example.com`) ; l'outil Stripe n'offre pas de fermeture de session : elle expire d'elle-même sous 24 h | fait |
| Rappel de fin de période (PR n°42) sur la version de test, iPhone 390 px, espace de test réglé temporairement en prépayé puis remis à l'état d'origine : fin dans 5 jours (FR et EN), période terminée avec délai de grâce, création suspendue, pas de défilement latéral | validé |
| Message « Maximum 4 photos par standard » (PR n°41) | `tsc` et build seulement : la sélection multiple de fichiers n'a pas été jouée dans un navigateur (risque écrit dans la PR) |
| Tâches planifiées du 15 nov. | à lire le 15 nov. après 08:43 UTC |
| Piège : la page de login est `/login` (pas `/auth/login`) ; le palier « Hôtel » est `starter` dans le code et les appels d'API | |

## Espaces de test au 14 nov.
Voir `docs/ZG7_BRIEF.md` (tableau, comptes à supprimer). L'espace « ZG TEST Découverte (Claude) » cité plus haut n'existe plus.
