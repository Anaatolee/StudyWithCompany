# Handoff : Page « Créer une salle » — StudyWithCompany

## Overview
Formulaire de création d'une salle d'étude collaborative pour **StudyWithCompany**.
L'utilisateur y configure une salle : nom, description, objectif du jour, matière,
couleur d'identification, visibilité (publique/privée), nombre maximum de participants,
et un timer Pomodoro collectif optionnel avec choix du mode. Un bouton « Créer la salle »
valide le tout.

Le design suit la direction artistique **« Lumière du jour »** (thème clair) du système
StudyWithCompany.

## About the Design Files
Les fichiers de ce bundle sont des **références de design réalisées en HTML** — des
prototypes illustrant l'apparence et le comportement attendus, **pas du code de
production à copier tel quel**. Le fichier `.dc.html` utilise un petit runtime de
composant maison (`support.js`) : ne le portez pas, il ne sert qu'à faire tourner le
prototype.

La tâche consiste à **recréer ce design dans l'environnement du codebase cible**
(React, Vue, SwiftUI, etc.) en réutilisant ses patterns, sa librairie de composants et
son design system existants. Si aucun environnement n'existe encore, choisissez le
framework le plus adapté et implémentez-y le design. Le markup ci-dessous décrit la
structure ; reproduisez-la avec vos propres composants (Input, Textarea, Card, Switch,
Slider, ToggleGroup…).

## Fidelity
**High-fidelity (hifi).** Couleurs, typographie, espacements et états sont définitifs.
Reproduisez l'UI au pixel près avec les composants de votre codebase. Les valeurs exactes
sont listées dans **Design Tokens**.

---

## Screen : Créer une salle

**Purpose** : configurer puis créer une salle d'étude.
**Layout global** :
- Page pleine hauteur, fond `#f9fbfc`, texte `#19222e`.
- **Header** sticky en haut (`backdrop-filter: blur(10px)`, fond semi-transparent
  `#f9fbfc` à 82 %, bordure basse `1px #e7edf2`). Contenu centré, `max-width: 1180px`,
  padding `14px 24px`, en `flex` espacé (`space-between`).
- **Colonne de formulaire** centrée, `max-width: 720px`, padding vertical fluide
  `clamp(36px,5vw,56px)` en haut / `clamp(56px,7vw,88px)` en bas, padding horizontal `24px`.
- Le formulaire est une pile verticale de **cartes** (sections) séparées par `22px`.

### Header
- **Logo** : carré `34×34`, `border-radius: 9px`, fond `#2f7dc4`, icône « livre ouvert »
  blanche (SVG, stroke 2). À côté, wordmark « StudyWithCompany » en **Bricolage Grotesque
  700, 20px**, couleur `#19222e`, `letter-spacing: -0.01em`. Gap `11px`.
- **Droite** : `@Anatole` (couleur `#5c6675`, 14.5px, 600) puis lien
  « Déconnexion » (icône logout + texte, `#19222e`, 14.5px, 600). Gap `18px`.

### Titre
- H1 « Créer une salle » — **Bricolage Grotesque 700**, taille `clamp(34px,4.4vw,46px)`,
  `line-height: 1.04`, `letter-spacing: -0.02em`, couleur `#19222e`.
- Sous-titre « Configurez votre espace d'étude personnalisé. » — 17px, `#5c6675`.
- Marge basse du bloc : `34px`.

### Carte commune (toutes les sections)
`background:#ffffff` · `border:1px solid #e7edf2` · `border-radius:18px` ·
`padding: clamp(22px,3vw,30px)` · `box-shadow: 0 1px 3px rgba(25,34,46,.04)`.
Chaque carte démarre par un **eyebrow** : 12px, 700, `letter-spacing:.09em`,
`text-transform:uppercase`, couleur `#8a93a2`.

### Section « INFORMATIONS »
- **Champs texte** (Nom, Objectif) et **textarea** (Description) :
  - Label : 14.5px, 600, `#19222e`, marge basse `9px`. L'astérisque requis est `#2f7dc4`.
  - Input : pleine largeur, 15px, fond `#f9fbfc`, bordure `1px #e7edf2`,
    `border-radius:10px`, padding `13px 15px`, `outline:none`.
  - **Focus** : bordure `#2f7dc4`, fond `#ffffff`, transition `.15s`.
  - Placeholder : `#9aa3b0`.
  - Textarea : `rows=3`, `min-height:96px`, `resize:vertical`, `line-height:1.5`.
  - Nom — placeholder « Ex. Révisions du bac blanc » (requis *).
  - Description — placeholder « De quoi parle cette salle ? Qui peut la rejoindre ? ».
  - Objectif du jour — placeholder « Ex. Terminer 3 chapitres d'analyse » + texte d'aide
    « Affiché dans la salle pour tous les membres. » (13px, `#8a93a2`, marge haute `8px`).
- **Matière** (requis *) : zone scrollable `max-height:236px` (scrollbar fine `#cdd7e2`).
  Grille **2 colonnes**, `gap:10px`. Chaque option est un bouton :
  - padding `13px 15px`, `border-radius:11px`, 14.5px/600, icône SVG (18px) + libellé,
    `gap:10px`, texte aligné à gauche.
  - **Non sélectionné** : fond `#ffffff`, bordure `1px #e7edf2`.
  - **Sélectionné** : fond `#e3eef8`, bordure `1px #2f7dc4`, `box-shadow:0 0 0 1px #2f7dc4`.
  - Liste (avec couleur d'icône) : Mathématiques `#2f7dc4`, Physique `#e0564f`,
    Chimie `#3f9e6a`, Biologie `#5aa469`, Histoire `#b07d3a`, Géographie `#2f7dc4`,
    Littérature `#a05bc4`, Langues `#d4729a`, Informatique `#2f7dc4`, Philosophie `#6a7282`.
  - Sélection par défaut : **Mathématiques**.

### Section « APPARENCE »
- Label « Couleur de la salle ».
- Rangée de pastilles `flex-wrap`, `gap:12px`. Chaque pastille : `30×30`, ronde,
  `border:2px solid #ffffff`. **Sélectionnée** : `box-shadow:0 0 0 2px <couleur>`.
  Couleurs : `#6366f1 #3b82f6 #0ea5e9 #14b8a6 #10b981 #22c55e #f59e0b #ef4444 #ec4899
  #a855f7 #6b7280`. Défaut : `#3b82f6`.
- Sous la rangée : petit point `13×13` de la couleur active + son hex en 13.5px/600
  `#5c6675`, `font-variant-numeric:tabular-nums`.

### Section « ACCÈS »
- **Visibilité** : 2 boutons côte à côte (`flex:1`, `gap:12px`), padding `14px 16px`,
  `border-radius:12px`. Icône (20px) + bloc texte (titre 15px/700 `#19222e` + sous-titre
  12.5px `#8a93a2`).
  - Publique — icône globe `#2f7dc4`, sous-titre « Visible par tous ».
  - Privée — icône cadenas `#5c6675`, sous-titre « Via lien uniquement ».
  - États sélection identiques aux matières (fond `#e3eef8` + bordure/ring `#2f7dc4`).
  - Défaut : **Publique**.
- **Participants max** : label + valeur courante en 16px/700 `#2f7dc4` (tabular-nums).
  `<input type="range" min=1 max=30>` pleine largeur, `accent-color:#2f7dc4`. Sous le
  slider, repères « 1 » et « 30 » (12.5px `#8a93a2`, espacés). Défaut : **20**.

### Section « POMODORO »
- En-tête en `flex` espacé : à gauche, eyebrow « POMODORO COLLECTIF » (icône horloge
  15px) + description « Un timer partagé, synchronisé pour tous les membres. »
  (13.5px `#5c6675`). À droite, un **switch**.
  - **Switch** : piste `46×26`, `border-radius:999px`. ON → `#2f7dc4`, OFF → `#cbd5e1`.
    Pouce blanc `20×20` rond, `top:3px`, position `left:3px` (off) → `left:23px` (on),
    `box-shadow:0 1px 3px rgba(0,0,0,.25)`, transition `.2s`.
  - Défaut : **ON**.
- Quand le switch est ON, afficher **« Mode par défaut »** : 2 boutons (`flex:1`,
  `gap:12px`, colonne centrée, padding `14px`, `border-radius:12px`), mêmes états de
  sélection que ci-dessus.
  - `25/5` — gros texte 17px/700 (`#2f7dc4` si actif) + « 25 min travail / 5 min pause ».
  - `50/10` — 17px/700 (`#19222e`) + « 50 min travail / 10 min pause ».
  - Défaut : **25/5**.
  - Quand le switch est OFF, le bloc « Mode par défaut » est masqué entièrement.

### Bouton « Créer la salle »
Pleine largeur, 16px/700 blanc, fond `#2f7dc4`, `border-radius:13px`, padding `17px`,
`box-shadow:0 10px 24px rgba(47,125,196,.3)`. **Hover** : fond `#2a6fad`.

---

## Interactions & Behavior
- **Champs texte/textarea** : contrôlés, mettent à jour l'état au `input`. Focus change
  bordure+fond (transition `.15s`).
- **Matière / Visibilité / Mode** : sélection unique (radio-like). Cliquer applique
  l'état actif (fond `#e3eef8` + bordure + ring `#2f7dc4`). Transition `all .15s`.
- **Pastilles couleur** : sélection unique, ring de 2px de la couleur. Met à jour le hex
  affiché.
- **Slider participants** : 1→30, met à jour la valeur affichée en direct.
- **Switch Pomodoro** : bascule on/off (transition `.2s`) ; on=off contrôle l'affichage
  du bloc « Mode par défaut ».
- **Créer la salle** : hover assombrit le fond. (Le prototype ne fait pas de soumission
  réseau — branchez ici votre handler de création + navigation.)
- Toutes les transitions de sélection/hover : `0.15s` ; le switch : `0.2s`.

## State Management
État local du composant :
| Champ | Type | Défaut |
|---|---|---|
| `name` | string | `''` |
| `description` | string | `''` |
| `objective` | string | `''` |
| `subject` | enum (math…philosophie) | `math` |
| `color` | hex string | `#3b82f6` |
| `visibility` | `public` \| `private` | `public` |
| `maxParticipants` | number 1–30 | `20` |
| `pomodoro` | boolean | `true` |
| `mode` | `a` (25/5) \| `b` (50/10) | `a` |

Le bloc « Mode par défaut » est conditionné par `pomodoro === true`.
Validation suggérée : `name` et `subject` requis (marqués `*`) avant activation du bouton.

## Design Tokens
**Couleurs**
- Accent : `#2f7dc4` · accent hover : `#2a6fad` · accent soft (fond sélection) : `#e3eef8`
- Fond page / inputs : `#f9fbfc` · surface (cartes) : `#ffffff`
- Bordure : `#e7edf2` · piste switch off : `#cbd5e1`
- Texte principal : `#19222e` · secondaire : `#5c6675` · tertiaire/aide : `#8a93a2`
- Placeholder : `#9aa3b0` · scrollbar : `#cdd7e2`
- Palette pastilles : `#6366f1 #3b82f6 #0ea5e9 #14b8a6 #10b981 #22c55e #f59e0b #ef4444 #ec4899 #a855f7 #6b7280`
- Couleurs d'icônes matières : voir section Matière.

**Typographie**
- Titres / wordmark / gros chiffres : **Bricolage Grotesque** (500–800), Google Fonts.
- Corps / labels / champs : **Public Sans** (400–700), Google Fonts.
- Échelle : H1 `clamp(34px,4.4vw,46px)`/700 · wordmark 20px/700 · eyebrow 12px/700
  uppercase `.09em` · label 14.5px/600 · input 15px · sous-titre 17px · aide 13px ·
  meta 12.5–13.5px.

**Rayons** : inputs 10px · options 11px · visibilité/mode 12px · bouton 13px ·
cartes 18px · switch/pastilles 999px/50%.

**Espacements** : gap grille matières 10px · gap pastilles/boutons 12px ·
padding cartes `clamp(22px,3vw,30px)` · gap entre cartes 22px.

**Ombres** : carte `0 1px 3px rgba(25,34,46,.04)` · bouton principal
`0 10px 24px rgba(47,125,196,.3)` · pouce switch `0 1px 3px rgba(0,0,0,.25)`.

## Assets
- **Icônes** : toutes en SVG inline style **Lucide** (stroke 2, linecap/linejoin round).
  Utilisez votre librairie d'icônes (lucide-react ou équivalent) : book-open (logo),
  log-out, globe, lock, clock, et les icônes de matières (sigma/divide, atom, flask,
  leaf, landmark, globe, book, languages, code, brain).
- **Polices** : Bricolage Grotesque + Public Sans via Google Fonts (ou self-host).
- Aucune image bitmap.

## Files
- `Créer une salle StudyWithCompany.dc.html` — prototype HTML complet (référence).
- `support.js` — runtime du prototype (ne pas porter ; requis seulement pour ouvrir le `.dc.html`).
- `screenshots/01-page.png`, `02-page.png`, `03-page.png` — captures de référence
  (haut / milieu / bas de page).
