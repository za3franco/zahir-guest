# Tests Zahir Guest : méthode et statut

Dernière mise à jour : 14 nov. 2026. La check-list vivante d'Arnaud est l'artefact https://claude.ai/artifact/YPsqEFpS7z3wM2h8PynrrX (collection `checks`, un document par test avec `done` et `note`). Ce fichier explique comment on teste ; la check-list dit où on en est.

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
| Conflit entre deux appareils, questionnaire verrouillé | validé sur version de test (conflit) et par lecture du code (verrou) ; à rejouer en production |
| Photos hors ligne, envoi sans doublon, suppression hors ligne | validé ; limite de 4 par critère : à rejouer |
| Audit ouvert sans réseau, page « Hors ligne », déconnexion, interrupteur d'arrêt | validé |
| Installer l'appli (iPhone, Android), test en sous-sol | pour Arnaud |

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

## Défauts relevés par les tests (non corrigés)
- Message de limite « 1 properties » : pluriel mal accordé (`src/lib/limits.ts`).
- Fin de période prépayée : à J+9 le texte indique encore « creation pauses on 11 November » (date passée), et le rappel n'est que sur la page Facturation, pas en haut du tableau de bord.
- Stripe affiche le prix converti dans la devise du visiteur (adaptive pricing) : à décider si on le garde pour des clients en EUR ou USD.
- Les tâches planifiées n'écrivent rien dans les journaux : ajouter une ligne `console.log` de fin d'exécution permettrait de les vérifier.
