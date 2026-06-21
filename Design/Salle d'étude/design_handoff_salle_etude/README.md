# Handoff : Salle d'étude (StudyWithCompany)

## Overview
Écran d'une **salle d'étude vidéo en groupe** ("study with company"). L'utilisateur rejoint une salle thématique (ici *test 3 — Géographie*) pour travailler en présence d'autres participants, avec caméra (micro verrouillé), un lecteur de musique d'ambiance, un minuteur Pomodoro, une liste de participants et un chat de salle. C'est l'écran **en-salle** (pendant la session), pas la page d'accueil.

## About the Design Files
Les fichiers de ce package sont des **références de design réalisées en HTML** — un prototype qui montre l'apparence et le comportement voulus, **pas du code de production à copier tel quel**. La tâche est de **recréer ce design dans l'environnement existant du codebase cible** (React, Vue, Svelte, etc.) en suivant ses patterns et sa librairie de composants. Si aucun environnement n'existe encore, choisir le framework le plus adapté et y implémenter le design.

> ⚠️ `Salle d'étude.dc.html` est un « Design Component » : la logique vit dans une classe `Component extends DCLogic` et le template utilise une mini-syntaxe `{{ }}` + `<sc-for>`/`<sc-if>`. `support.js` est le runtime de prévisualisation. **Ne pas porter ce runtime** — il sert seulement à ouvrir le HTML dans un navigateur pour référence. Recréer l'UI et la logique nativement dans le codebase cible.

## Fidelity
**Haute fidélité (hifi).** Couleurs, typographie, espacements et interactions sont finaux. Recréer l'UI au pixel près en utilisant les composants/tokens du codebase cible. Les polices (Bricolage Grotesque, Public Sans) sont chargées via Google Fonts.

---

## Screens / Views

### Salle d'étude (écran unique)
**Purpose** : permettre à l'utilisateur de travailler en visio de groupe focalisée. Tout est sur un seul écran ; aucune navigation interne hors « Quitter » / « ← retour ».

**Layout global** : pleine hauteur `100vh`, `display:flex; flex-direction:column; overflow:hidden`.
- **Header** (hauteur auto, `flex:none`) : barre supérieure translucide.
- **Body** (`flex:1; display:flex`) :
  - **Main / scène vidéo** (`flex:1`, position relative) : grille des tuiles + dock flottant.
  - **Aside / panneau latéral** (`flex:none; width:340px`) : participants + chat.

#### Header (barre supérieure)
`display:flex; align-items:center; gap:18px; padding:11px 20px;` fond `rgba(255,255,255,.82)` + `backdrop-filter:blur(10px)`, bordure basse `1px #e7edf2`.
De gauche à droite :
1. **Bouton retour** `←` : carré 34×34, radius 9px, bordure `#e7edf2`, fond `#ffffff`, icône flèche gauche `#5c6675`.
2. **Identité de salle** : point de présence vert 8px (animation `pulse` 2.4s), titre `test 3` (Bricolage Grotesque, 18px, 600, `#19222e`) + sous-titre matière `Géographie` (12px, 500, `#5c6675`).
3. **Objectif** (séparé par une barre verticale `1px #e7edf2`, `padding-left:16px`) : label `OBJECTIF` (12px, 700, uppercase, letter-spacing .06em, `#2f7dc4`) + valeur `test 3` (16px, 600, `#19222e`).
4. **Lecteur de musique** (`margin:0 auto`, centré) : pilule `border-radius:999px`, fond `#ffffff`, bordure `#e7edf2`, `padding:5px 7px 5px 12px`, ombre `0 2px 8px rgba(20,30,45,.05)`. Contient : icône note `#2f7dc4`, titre piste `Good Night Lofi Cozy` (11.5px, 600, ellipsis, max-width 110px), bouton précédent (23×23), **bouton play/pause** (30×30, rond, fond `#2f7dc4`, glyphe blanc — ❚❚ en lecture / ▶ en pause), bouton suivant (23×23), séparateur, icône volume + **slider volume** (`<input type=range>`, piste 4px `#e6dcc8`→adapter, pouce 13px `#2f7dc4`, largeur 54px).
5. **Pomodoro** : conteneur `border-radius:11px`, fond `#ffffff`, bordure `#e7edf2`, `padding:5px 7px 5px 11px`. Icône horloge `#2f7dc4`, état `FOCUS`/`PAUSE` (10.5px, 700, uppercase ; vert `#3f9d6a` si en cours, sinon `#5c6675`), temps `MM:SS` (Bricolage Grotesque, 14.5px, 600, tabular-nums). Deux chips **25/5** et **50/10** (11.5px, 700, radius 7px ; actif = fond `#2f7dc4` texte blanc, inactif = fond `#eef3f8` texte `#5c6675`).
6. **Chips de statut** : « Caméra recommandée » (icône caméra) et « Micro verrouillé » (icône micro barré), 12.5px 500 `#5c6675` ; bouton **Supprimer** (rouge `#b03a3a`, icône corbeille).

#### Scène vidéo (main)
- **Grille des tuiles** : `display:grid; grid-template-columns:repeat(3,1fr); grid-auto-rows:1fr; gap:14px; padding:18px;` → 9 participants en 3×3.
- **Tuile participant** : `border-radius:16px; position:relative; display:flex; align-items:center; justify-content:center;` fond = **dégradé de couleur plein** `linear-gradient(150deg, c1, c2)` propre à chaque personne (voir Design Tokens → palette participants). Ombre `0 12px 30px rgba(20,30,45,.12)`. La tuile de l'utilisateur courant a en plus un anneau `0 0 0 2px #2f7dc4`.
  - **Initiales** (2 lettres) centrées : Bricolage Grotesque, 42px, 700, `rgba(255,255,255,.96)`, uppercase, letter-spacing .02em, `text-shadow:0 1px 6px rgba(20,30,45,.18)`.
  - **Point de présence** vert en haut-gauche : 9×9 rond `#46d784`, halo `0 0 0 2px rgba(255,255,255,.35)`, position `top:13px; left:13px`.
  - **Étiquette nom** en bas-gauche : `left:13px; bottom:13px`, texte blanc 12.5px 600 sur pastille `rgba(10,16,24,.42)` + `backdrop-filter:blur(4px)`, `padding:4px 10px`, radius 8px.
- **Dock de contrôle flottant** : centré bas (`left:50%; bottom:20px; transform:translateX(-50%)`), `display:flex; gap:9px; padding:8px 9px;` fond `#ffffff`, bordure `#e7edf2`, radius 14px, ombre `0 16px 40px rgba(20,30,45,.18)`. Trois boutons (12.5px, 600, radius 10px, padding `9px 13–15px`) :
  - **Caméra** (toggle) : OFF = texte `Caméra coupée`, couleur `#2f7dc4`, fond `#e3eef8` ; ON = `Caméra activée`, texte blanc, fond `#2f7dc4`. Icône caméra barrée.
  - **Micro verrouillé** : désactivé (`cursor:not-allowed`), `#5c6675` sur `#eef3f8`, icône micro barré.
  - **Quitter** : texte blanc sur `#b8473f`, icône téléphone raccroché, ombre `0 6px 16px rgba(184,71,63,.32)`.

#### Panneau latéral (aside, 340px)
Fond `#ffffff`, bordure gauche `1px #e7edf2`.
- **En-tête Participants** : `padding:18px 20px 6px`. Ligne titre 11.5px 700 uppercase letter-spacing .07em `#5c6675` : icône groupe + texte `Participants (9)` + **chevron bas** poussé à droite (`margin-left:auto`, stroke 2.4) suggérant un menu déroulant ouvert.
- **Liste participants** (visible : 2 lignes) : chaque ligne `display:flex; align-items:center; gap:11px; padding:9px 10px; border-radius:11px`. Ligne de l'utilisateur courant : fond `#eef3f8`. Avatar rond 32px (initiale, dégradé), nom 14.5px 600 `#19222e` (suffixe « (vous) » en 500 `#5c6675`). Pour les autres : deux boutons icône 32×32 radius 8px à droite — **message privé** (icône bulle, `#5c6675` sur `#eef3f8`) puis **appeler** (icône téléphone, `#2f7dc4` sur `#e3eef8`).
- **Indicateur de scroll** : 5 petits points (5×5) centrés sous la liste (`padding:6px 0 8px`), le premier `#2f7dc4` (actif), les autres `#c4d2e0` — suggère le défilement horizontal vers les autres participants.
- **Séparateur** : trait `1px #e7edf2`, `margin:0 20px`.
- **Chat** : titre `CHAT` (11.5px 700 uppercase `#5c6675`, `padding:16px 20px 10px`). Zone messages `flex:1; overflow-y:auto; padding:0 20px 12px; gap:12px`.
  - **État vide** : centré, icône bulle `#c4d2e0`, texte `Soit le premier à dire bonjour !` (14px, 1.5, `#5c6675`, max-width 200px).
  - **Bulle message** : colonne, alignée à droite si « mienne » sinon à gauche. Libellé auteur 11.5px 700 (mien = `#2f7dc4`, autre = `#7a9cbd`), bulle 14px line-height 1.45, padding `9px 13px`, radius 13px (coin haut côté auteur à 4px) ; mienne = fond `#2f7dc4` texte blanc, autre = fond `#eef3f8` texte `#19222e`, max-width 240px.
  - **Saisie** : `border-top:1px #e7edf2; padding:12px 16px`. Champ dans une boîte `#eef3f8` bordure `#e7edf2` radius 12px : input texte transparent (14px `#19222e`, placeholder `Écrire un message…` `#97a1ad`) + **bouton envoyer** 36×36 radius 9px fond `#2f7dc4` icône avion, ombre teintée.

---

## Interactions & Behavior
- **Play/Pause musique** : bascule l'icône ❚❚ ↔ ▶ (état `playing`). Glyphe ajusté (taille/letter-spacing) selon l'état.
- **Volume** : slider 0–100 lié à l'état `volume` (défaut 65).
- **Pomodoro** :
  - Bouton temps : démarre/met en pause le décompte (état `timerRunning`). L'état affiché passe `PAUSE` ↔ `FOCUS`.
  - Décompte : `setInterval` 1s, décrémente `secs` jusqu'à 0 puis s'arrête.
  - Chips **25/5** / **50/10** : changent le mode et réinitialisent le temps (25:00 ou 50:00), arrêtent le timer. (Seules les durées de focus sont implémentées dans le proto ; la phase de pause 5/10 min est à brancher si nécessaire.)
- **Caméra** (dock) : toggle `camOn`, change libellé/couleur du bouton. (Pas de flux vidéo réel — placeholder coloré.)
- **Quitter** / **← retour** : handlers `onLeave` vides dans le proto → à câbler sur la navigation réelle (sortie de salle).
- **Chat** : saisie + Entrée (ou bouton envoyer) ajoute un message à droite (auteur « Anatole »). Trim ; ignore si vide. L'état vide disparaît dès le 1er message.
- **Micro** : verrouillé par design (non interactif) — `cursor:not-allowed`.
- **Animations** : point de présence header `@keyframes pulse` (opacity+scale, 2.4s infinite). Transitions de couleur sur hover à ajouter selon le design system cible.

## State Management
| State | Type | Défaut | Rôle |
|---|---|---|---|
| `playing` | bool | `true` | lecture musique |
| `volume` | int 0–100 | `65` | volume musique |
| `camOn` | bool | `false` | caméra locale |
| `timerRunning` | bool | `false` | Pomodoro actif |
| `mode` | `'25/5'\|'50/10'` | `'25/5'` | preset Pomodoro |
| `secs` | int (s) | `1500` | temps restant |
| `draft` | string | `''` | message en cours |
| `messages` | array `{who,text,mine}` | `[]` | historique chat |

Données à fournir par le backend dans une vraie implémentation : roster des participants (id, nom, initiales, couleur, présence, état caméra), métadonnées de salle (nom, matière, objectif), piste musicale courante, flux de chat temps réel.

## Design Tokens
**Thème : « Lumière du jour »** (clair, bleu ciel).
| Token | Valeur |
|---|---|
| Fond page | `#f9fbfc` |
| Surface / cartes | `#ffffff` |
| Surface douce | `#eef3f8` |
| Accent (primaire) | `#2f7dc4` |
| Accent doux (fond) | `#e3eef8` |
| Encre / texte | `#19222e` |
| Texte secondaire | `#5c6675` |
| Texte tertiaire / placeholder | `#97a1ad` |
| Bordure | `#e7edf2` |
| Bordure douce / inactif | `#c4d2e0` |
| Vert présence | `#3f9d6a` (point header) / `#46d784` (tuile) |
| Rouge (Quitter) | `#b8473f` · (Supprimer) `#b03a3a` |
| Ombres | `rgba(20,30,45,.05 / .12 / .16 / .18)` |

**Palette participants** (dégradé `linear-gradient(150deg, c1, c2)`) :
`#3f8fd0→#2563a6` (bleu, vous) · `#56a86f→#3a7d52` (vert) · `#8fb4d6→#6f96bd` (bleu clair) · `#c98fb0→#a86a92` (rose) · `#7fb8af→#5e978e` (sarcelle) · `#cbb066→#a88f47` (or) · `#9b8fd0→#736aa8` (violet) · `#d69a7a→#b8765a` (terracotta) · `#6f8fcf→#4f6fac` (indigo).

**Typographie** :
- Titres / chiffres : **Bricolage Grotesque** (500/600/700).
- Corps / UI : **Public Sans** (400/500/600/700).
- Échelle utilisée : 11.5 / 12 / 12.5 / 13 / 14 / 14.5 / 16 / 18 / 42px.

**Rayons** : 7 / 8 / 9 / 10 / 11 / 12 / 13 / 14 / 16 / 999px.
**Espacements** : multiples de ~4px (gap 4/6/7/9/11/14/18px ; padding 5–20px).

## Assets
- **Icônes** : toutes en SVG inline, style « feather/lucide » (stroke 2, round). Remplacer par la librairie d'icônes du codebase (Lucide recommandé) : flèche retour, note de musique, play/pause/prev/next, volume, horloge, caméra (+ barrée), micro barré, corbeille, groupe, chevron-bas, bulle de message, téléphone, avion d'envoi, téléphone raccroché.
- **Polices** : Google Fonts — Bricolage Grotesque + Public Sans.
- **Pas d'images bitmap** : les tuiles vidéo sont des placeholders à dégradé ; brancher le vrai flux vidéo (`<video>`) à la place, avec fallback initiales+couleur quand caméra coupée.

## Files
- `Salle d'étude.dc.html` — le prototype complet (template + logique dans une classe `Component`). **Référence visuelle et comportementale.**
- `support.js` — runtime de prévisualisation (ne pas porter).
- `screenshots/full-page.png` — vue complète, chat vide.
- `screenshots/chat-active.png` — vue avec messages dans le chat.
