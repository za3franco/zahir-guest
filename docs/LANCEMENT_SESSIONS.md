# Lancer et enchaîner les sessions

Pour Arnaud : tout se fait sur claude.ai/code, dans le navigateur. Les sessions ne se voient pas entre elles : ce qui les relie, c'est le dépôt (`CLAUDE.md` et `docs/`).

## Réglages au lancement
Sous la zone de saisie : environnement **Zahir Guest**, dépôt **za3franco/zahir-guest**, branche **main**, puis le modèle et l'effort (voir ci-dessous).

## Quel modèle
| Travail | Modèle | Effort |
| :- | :- | :- |
| Construire une étape de la feuille de route : stockage local, synchronisation, photos, service worker, paiement, liaison de comptes ; plan d'architecture ; relecture de sécurité | `claude-opus-5-5` | High |
| Tests, documentation, petits ajustements d'interface, emails, suivi après mise en ligne, correction d'un bug identifié | `claude-sonnet-5-5` | Medium |

## Changer de modèle sans changer de conversation
Taper dans la session : `/model claude-opus-5-5` ou `/model claude-sonnet-5-5`. Cela sert quand on passe d'un travail de construction à des tests, ou l'inverse.

## Quand changer de conversation
Une session par étape de la feuille de route (une PR, ou un lot de tests). Changer de conversation :
- quand une PR est fusionnée et que le brief est à jour : c'est la frontière naturelle ;
- quand la session devient longue : elle compacte son historique, répète des questions déjà tranchées ou oublie une décision ;
- quand on change de sujet (par exemple du mode hors ligne au suivi des emails).

## Procédure de passage
1. Dire à la session en cours : « Mets à jour le brief et la check-list, vérifie que tout est fusionné, puis donne-moi le message de lancement de la session suivante. »
2. Ouvrir une **nouvelle session** depuis claude.ai/code (bouton de nouvelle session), avec les réglages ci-dessus. Dans la même session, `/clear` efface le contexte en gardant le dépôt et l'environnement ; si la commande n'est pas proposée, passer par une nouvelle session.
3. Coller le message de lancement.

## Messages de lancement
Le contexte est dans `CLAUDE.md` : un message court suffit.

Modèle général :
> On continue Zahir Guest. Lis `CLAUDE.md` puis `docs/ZG6_BRIEF.md` (ou le brief le plus récent dans `docs/`). Vérifie que tu joins www.zahirguest.com et dis-moi le résultat. Ensuite : [ÉTAPE]. Respecte les règles du dépôt, notamment aucun changement en production sans mon accord explicite.

Remplacer `[ÉTAPE]` par la ligne correspondante de `docs/FEUILLE_DE_ROUTE.md` (chaque étape y a sa phrase prête à coller).

## Accords d'avance (à répéter à chaque session si besoin)
Pour des tests : créer ou réutiliser l'espace de test en production, le modifier par SQL (pilote, date de fin de période), annuler les abonnements Stripe de test, et en fin de test remettre le prix de test YouCan à 0 dans Vercel avec redéploiement. Les migrations et les fusions de PR demandent toujours un accord explicite.
