# Tests Zahir Guest : méthode et statut

Dernière mise à jour : 14 nov. 2026 (après les rejeux en production et le test iPhone d'Arnaud). La check-list vivante d'Arnaud est l'artefact https://claude.ai/artifact/YPsqEFpS7z3wM2h8PynrrX (collection `checks`, un document par test avec `done` et `note`). Ce fichier explique comment on teste ; la check-list dit où on en est.

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

## Ce qui reste pour Arnaud
- Tout paiement réel (carte YouCan Pay, ou Stripe sans code promo), la réception du reçu et la vérification dans le tableau de bord YouCan.
- Les actions du compte super admin : « Open pilot » et « End pilot », créer un espace, page Ventes, onglet Cron Jobs de Vercel.
- Le téléphone : installation de l'appli sur l'écran d'accueil, test en mode avion dans un vrai audit, sous-sol, photos prises avec l'appareil.
- Les décisions : prix, règles, ouverture du mode hors ligne aux autres espaces.

## Accords donnés d'avance par Arnaud (13 nov. 2026, à répéter à chaque session)
Pour des tests : créer ou réutiliser un espace de test en production, le modifier par SQL (pilote, date de fin de période), annuler les abonnements Stripe de test, et en fin de test remettre `YOUCANPAY_TEST_AMOUNT_MAD` à 0 dans Vercel avec redéploiement. **Les migrations et les fusions de PR demandent toujours un accord explicite.** Ne jamais saisir de coordonnées bancaires.

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

## Écran super admin et `/auth/set-password` (14 nov., branche `claude/ecstatic-noether-glrn1q`)
Méthode : build local avec variables factices, faux serveur Supabase local (auth, profil, données d'espaces) et réponses Stripe simulées, Playwright en profil iPhone 14 (Chromium, pas WebKit) réglé en anglais. Aucune donnée ni clé de production.
| Test | Statut |
| :- | :- |
| `/auth/set-password` : anglais d'emblée sur un iPhone anglais, langue enregistrée prioritaire, bascule FR / EN, erreurs (différents, trop faible, même mot de passe, réseau coupé, lien expiré), succès, champ 16 px (15 sur 15) | validé en local |
| Super admin FR et EN : vue d'ensemble, formulaire, fenêtres de confirmation, Ventes, bouton de langue enregistré dans le profil, aucun mot de l'autre langue, pas de défilement latéral (39 sur 39) | validé en local |
| Mêmes écrans avec les vraies données, sur la version de test, compte super admin d'Arnaud | pour Arnaud |
| Lien d'invitation réel reçu par email, ouvert sur un vrai iPhone | pour Arnaud |
| Piège : `innerText` renvoie les en-têtes de tableau en capitales (CSS), comparer sans tenir compte de la casse | |

## Espaces de test au 14 nov.
Voir `docs/ZG7_BRIEF.md` (tableau, comptes à supprimer). L'espace « ZG TEST Découverte (Claude) » cité plus haut n'existe plus.
