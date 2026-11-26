# Zahir Guest — charte graphique « Maison »

Validée par Arnaud le 26 nov. 2026 (direction A « Maison », avec des accents de la direction B « Carnet d'inspecteur »). Elle remplace l'ancienne identité bleu nuit et or (`#0D1B2A` / `#C8A45A`). Même famille que Za3fran.io : fond ivoire, encre, cuivre utilisé avec parcimonie, grands titres serif, filets fins plutôt que des cartes, angles droits, vraies photos.

Source de vérité dans le code : `src/app/globals.css` (jetons), `src/components/icons/ZahirIcons.tsx` (pictogrammes et logo), `src/lib/brandColors.ts` (marque blanche), `src/lib/emailLayout.ts` (emails), `src/lib/reportTemplate.ts` (rapport PDF).

## 1. Couleurs

| Rôle | Nom | Hex | Jeton CSS (nom historique) |
| :- | :- | :- | :- |
| Fond de page | Ivoire | `#F7F4EE` | `--color-deep-ink` |
| Panneaux, menu, champs (fond) | Lin | `#EFEADF` | `--color-midnight-navy` |
| Cartes | Coquille | `#FBF9F4` | `--color-slate-navy` |
| Papier (champs, rapport, fiches) | Papier | `#FFFDF8` | `--color-paper` |
| Sections alternées (site) | Sable clair | `#EDE7DB` | — |
| Texte principal, boutons pleins | Encre | `#14161B` | `--color-ivory` |
| Texte courant secondaire | Graphite | `#2A2C31` | — |
| Texte discret | Pierre | `#5E5A52` | `--color-sand` |
| Accent (surtitres, liens, état actif) | Cuivre | `#8A5A18` | `--color-gold` |
| Accent au survol | Cuivre profond | `#6E4510` | `--color-warm-brass` |
| Filet fort | — | `#C9C0B0` | `--color-line-strong` |
| Filet | — | `#D8D2C6` | `--color-border` |
| Filet léger | — | `#E4DDD0` | `--color-border-subtle` |
| Conforme / hausse | Sauge | `#2E5E4A` | `--color-sage` |
| Attention | Ambre | `#8F5410` | `--color-amber` |
| **Non-conformité uniquement** | Sang de bœuf | `#8A2E22` | `--color-oxblood` (= `--color-terracotta`) |

Règles :
- Le cuivre sert aux surtitres, aux liens et aux petits détails (le point du pictogramme). Jamais en grand aplat, sauf le bouton des emails.
- Le sang de bœuf est réservé aux non-conformités, constats, standards critiques et baisses de score. Rien d'autre.
- Les noms de jetons historiques (`--color-deep-ink`, `--color-ivory`…) sont gardés pour que tous les écrans suivent ; **seul leur rôle compte** : `deep-ink` = fond, `ivory` = texte.
- Contraste : texte au moins 4,5:1 sur l'ivoire. Le cuivre `#8A5A18` sur ivoire passe ; l'ancien or `#C8A45A` ne passe pas, ne pas le réutiliser.

## 2. Typographie

| Usage | Police | Détails |
| :- | :- | :- |
| Titres, grands chiffres, scores | Cormorant Garamond | graisse 500 (600 pour les petits titres) ; jamais 300 |
| Texte et interface | DM Sans | 400 / 500 |
| Références, heures, codes, numéros de standard | DM Mono | `--font-mono`, classes `.zg-ref`, `.zg-constat` |

- Surtitres : DM Sans 12–13 px, capitales, espacement 0,14 em, cuivre (`.zg-kicker`).
- Chiffres alignés : `font-variant-numeric: tabular-nums` (`.zg-num`).
- Champs de saisie : 16 px minimum (pas de zoom sur iPhone).

## 3. Formes et mise en page

- Angles droits : `--radius-sm: 0`, `--radius-md` et `--radius-lg: 2px`. Seuls les points et pastilles restent ronds.
- Filets fins plutôt que cartes ombrées : listes, tableaux et sections séparés par des lignes `#C9C0B0` / `#D8D2C6`. Un tableau commence par un filet encre.
- Boutons : plein encre (texte ivoire), survol cuivre ; secondaire = contour encre. Hauteur minimale 44 px (52 px pour les actions principales et l'audit).
- Pas de halos dégradés, pas de grilles décoratives, pas d'emojis. Le fond « papier ligné » (lignes horizontales tous les 32 px) est réservé aux pages d'accès (connexion, inscription, mot de passe).

## 4. Accents « Carnet d'inspecteur »

À n'utiliser qu'aux endroits prévus :
- **Numéros de standard** façon formulaire : `4.1`, `4.2` (section.standard) en DM Mono.
- **Écran d'audit en carnet ligné** : standards séparés par des filets, barre de réponse Conforme / Non conforme / N/A d'un seul tenant ; Conforme actif = encre, Non conforme actif = sang de bœuf, N/A actif = pierre.
- **Constat** : étiquette `.zg-constat` (DM Mono, capitales, contour sang de bœuf), ex. « CONSTAT 07 ».
- **Sceau du score** : `.zg-seal` (cercle cuivre légèrement incliné, score en Cormorant), sur le rapport d'exemple et la couverture.
- **Heure et lieu d'une observation** : « VISITE 04 · 19:42 · RESTAURANT » en DM Mono.

## 5. Logo et pictogrammes

- **Logo** : une arche (la porte de la maison) avec un trou de serrure, le point cuivre là où se pose l'œil. Composant `ZahirMark`. Wordmark : « Zahir » en encre, « Guest » en cuivre (Cormorant 600).
- **Pictogrammes** (`ZIcon`) : objets du métier dessinés sur une grille de 32, trait fin à extrémités carrées, couleur du texte, **un seul point cuivre** par pictogramme.
  - Navigation : registre (tableau de bord), calendrier (campagnes), serrure sous l'arche (audit), carnet (questionnaires), courbe sur règle (analyses), carte de visite (clients), façade à arche (établissements), document scellé (rapports), badge nominatif (équipe), ticket (facturation), tampon (marque), sonnette (aide), clé (plateforme), porte (déconnexion).
  - Métier : sonnette (réception), clé à pampille (chambres), cloche (restauration), appareil photo (preuve), fanion (non-conformité), enveloppe.
  - **Types d'établissement** (`PropertyTypeIcon`) : hôtel, riad, resort, maison d'hôtes, appartement, autre (pavillon).
- Icônes de l'appli installable : logo encre sur fond ivoire (`public/icons/`, `src/app/apple-icon.png`).

## 6. Navigation de l'application

Menu regroupé par moment : **Suivre** (tableau de bord, analyses, rapports), **Préparer** (campagnes, questionnaires, établissements), **Visiter** (audits), **Administrer** (clients, équipe, marque, facturation, plateforme), puis Aide. Élément actif : fond ivoire, filet cuivre à gauche.

## 7. Marque blanche

- « Couleur principale » du client : remplace le cuivre ; assombrie automatiquement jusqu'à être lisible sur l'ivoire (`readableAccent`).
- « Couleur du fond » : teinte le fond clair (le thème reste clair) ; préréglages Ivoire, Pierre, Sauge, Rosé, Lavande, Brume. Les anciennes valeurs par défaut (`#0D1B2A`, `#C8A45A`) donnent le thème standard.

## 8. Supports

- **Site** : ivoire, sections alternées sable clair, photo réelle en ouverture, deux portes (hôtels / sociétés d'audit), écrans de l'app dessinés en code avec données fictives marquées « Données de démonstration ».
- **Emails** : fond ivoire, carte papier `#FFFDF8` avec filet, titre en Cormorant, bouton cuivre à texte blanc, logo arche.
- **Rapport PDF** : couverture ivoire (plus de bleu nuit), titres Cormorant, accents cuivre, pages de domaine sur lin `#EFEADF` avec filet encre.
- **Paiement Stripe** : bouton `#8A5A18`.

## 9. Ton

Précis, posé, professionnel de l'hôtellerie. Pas de jargon de start-up, pas de familiarités (« les gens »). Orienté expérience client et qualité de service. Faits seulement : aucun client, témoignage ou chiffre inventé ; les exemples sont fictifs et le disent.
