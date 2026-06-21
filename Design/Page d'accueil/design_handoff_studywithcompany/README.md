# Handoff : Page d'accueil StudyWithCompany

## Overview
StudyWithCompany est un site qui motive les gens à travailler en les regroupant dans des **salles d'étude virtuelles triées par matière** (caméra allumée, micro coupé), avec des fonctionnalités de productivité collective : Pomodoro personnel et collectif, chat de salle, appels privés 1-à-1, lecteur de musique d'ambiance.

Ce package documente la **nouvelle page d'accueil** (landing page) : une page longue scrollable qui présente le produit, explique son fonctionnement et donne un aperçu réaliste de l'intérieur d'une salle d'étude.

## About the Design Files
Le fichier `Accueil StudyWithCompany.dc.html` de ce bundle est une **référence de design réalisée en HTML** — un prototype montrant l'apparence et le comportement voulus, **pas du code de production à copier tel quel**.

La tâche est de **recréer ce design dans l'environnement du codebase cible** (React, Vue, Svelte, etc.) en suivant ses patterns et sa librairie de composants existants. Si aucun environnement n'existe encore, choisir le framework le plus approprié (React + Tailwind est un bon défaut) et y implémenter le design.

⚠️ Détail technique : le fichier source est un « Design Component » (`.dc.html`) — un format de prototype. Toute la logique (timer, accordéon FAQ, sélecteur de thème) y est écrite dans une classe JS. **Ignorer la mécanique du format** et ne retenir que la structure, les styles et les comportements décrits ci-dessous.

## Fidelity
**Hi-fi.** Couleurs, typographie, espacements et interactions sont définitifs. Recréer l'UI fidèlement avec les librairies du codebase. Les valeurs exactes (hex, tailles, poids) sont listées dans **Design Tokens**.

Un seul élément est volontairement « explorationnel » : un **sélecteur de thème** flottant en bas de page permet de basculer entre 3 palettes (Salle de lecture / Lumière du jour / Studio). C'est un outil de comparaison qui a servi à choisir la direction — **la direction retenue est « Lumière du jour »**. En production, **garder uniquement cette palette** et retirer le sélecteur.

---

## Thème & direction visuelle

Le contenu de la page utilise un système de **variables CSS de thème**. La direction visuelle à implémenter est **« Lumière du jour » (daylight)** — une seule palette, claire et bleutée. Elle s'harmonise avec l'aperçu de la salle (même famille de bleus).

### Thème à implémenter — « Lumière du jour » (clair, bleu, moderne)
| Variable | Valeur | Usage |
|---|---|---|
| `--bg` | `#f9fbfc` | Fond de page |
| `--surface` | `#ffffff` | Cartes, surfaces élevées |
| `--surface-2` | `#eef3f8` | Surfaces secondaires (sections alternées, puces) |
| `--ink` | `#19222e` | Texte principal, blocs sombres |
| `--muted` | `#5c6675` | Texte secondaire |
| `--accent` | `#2f7dc4` | Accent (CTA, liens actifs, chiffres) — bleu |
| `--accent-soft` | `#e3eef8` | Fond d'accent doux (badges, icônes) |
| `--line` | `#e7edf2` | Bordures, séparateurs |

### Typographie
- **Display / titres** : `Bricolage Grotesque` (sans-serif), poids 600. Google Fonts. Utilisé pour H1, H2, H3 de section, gros chiffres, valeurs de timer.
- **Corps / UI** : `Public Sans` (sans-serif), poids 400–700. Google Fonts. Tout le texte courant, boutons, nav.
- H1 : `clamp(42px, 5.6vw, 68px)`, line-height 1.02, letter-spacing -0.02em.
- H2 de section : `clamp(30px, 3.6vw, 44px)`, letter-spacing -0.02em.
- Sur-titres (eyetags) : 13px, weight 600, letter-spacing 0.08em, uppercase, couleur accent.

> Note : l'aperçu de la salle (section « Aperçu ») partage exactement cette palette bleue — c'est voulu : la page « Lumière du jour » et le mockup produit forment un ensemble cohérent. Polices du mockup : `Bricolage Grotesque` (titres) + `Public Sans` (UI).
>
> ⚠️ Le fichier prototype contient aussi deux autres thèmes (« Salle de lecture » terracotta, « Studio » vert) et un sélecteur flottant pour basculer entre eux. **Les ignorer** : n'implémenter que « Lumière du jour » et retirer le sélecteur.

---

## Screens / Views

C'est une **page unique scrollable**, largeur de contenu max `1180px` centrée, padding horizontal `24px`. Sections dans l'ordre :

### 1. Header (sticky)
- Position sticky en haut, `z-index:50`, fond `--bg` à 82% + `backdrop-filter: blur(10px)`, bordure basse `--line`.
- Padding `15px 24px`, flex space-between.
- **Gauche** : logo = carré 34px radius 9px fond `--accent`, icône « livre ouvert » (SVG stroke blanc) + wordmark « StudyWithCompany » en Bricolage Grotesque 600 20px.
- **Droite** : nav flex gap 10px — liens « Fonctionnalités », « FAQ » (texte `--muted` 14.5px), « Connexion » (`--ink` 600), bouton « S'inscrire » (fond `--accent`, texte blanc, radius 10px, padding 10px 18px, shadow accent à 30%).

### 2. Hero
- Grille 2 colonnes `1.05fr .95fr`, gap `clamp(32px,5vw,72px)`, align center. Padding vertical `clamp(48px,7vw,92px)` haut.
- **Colonne gauche** :
  - Badge live : pill `--accent-soft`, texte `--accent` 13px 600, point `--accent` 7px qui pulse, libellé « Plus de 60 étudiants en train de travailler maintenant ».
  - H1 (Bricolage Grotesque 600) : « Étudiez ensemble,<br>maximisez votre productivité. »
  - Paragraphe (`--muted`, clamp 17–19px, line-height 1.6, max 520px) : « Du mal à t'y mettre, à rester concentré, à tenir sur la durée ? Rejoins une salle d'étude virtuelle dédiée à ta matière et travaille aux côtés d'autres étudiants.<br>La motivation vient des autres. » (le « ? » est sur la même ligne que « durée » via `&nbsp;`).
  - 2 CTA : « Commencer gratuitement » (plein accent) + « Voir une salle d'étude » (outline, ancre vers `#apercu`).
  - Rangée de pills matières (flex wrap gap 8px) : Mathématiques, Droit, Médecine, Informatique, Langues, Histoire-Géo, Économie, Physique-Chimie, **et plus encore !** — la dernière pill est en **accent plein** (fond `--accent`, texte blanc), les autres en `--surface` bordure `--line` texte `--muted`.
- **Colonne droite (visuel composite, hauteur clamp 360–460px)** :
  - Carte salle : `--surface`, radius 22px, shadow forte. Barre de titre « Salle · Mathématiques » + « 14 en ligne ». Grille 2×2 de tuiles caméra (dégradés colorés, initiales 2 lettres + nom : **LU / Lucas**, Aline, Léa, Toi).
  - Carte flottante haut-droite (fond `--ink`) : « Pomodoro collectif » + minuteur `23:12` (Bricolage Grotesque 30px), animation float ~6s.
  - Carte flottante bas-gauche (`--surface`) : icône chat + « Léa : "Je t'explique en appel 🙂" » + sous-titre « **Chat général** », animation float ~7s.

### 3. Comment ça marche (3 étapes)
- Eyetag « Comment ça marche » + H2 « Trois étapes pour s'y mettre », centrés.
- Grille 3 colonnes, gap 22px. Chaque carte : `--surface`, bordure `--line`, radius 18px, padding 30px 26px.
  - Gros numéro (Bricolage Grotesque 40px, couleur `--accent`) + H3 (20px 700) + paragraphe (`--muted` 15px).
  - **01 — Choisis ta matière** : « Maths, droit, médecine, langues… Choisis parmi une longue liste de matières académiques et professions. »
  - **02 — Rejoins une salle d'étude** : « Tu apparais aux côtés d'autres étudiants et professionnels. Des outils sont à ta disposition pour rester concentré. »
  - **03 — Avancez ensemble** : « Plonge toi dans ton travail, pose tes questions dans le chat, ou passe un appel à un autre utilisateur qui te viendra en aide. »

### 4. Aperçu d'une salle d'étude (`id="apercu"`)
Section à fond `--surface-2`, bordures haut/bas `--line`. Eyetag « À l'intérieur d'une salle » + H2 « L'énergie d'une salle pleine, depuis ton bureau ».

**Mockup d'application — palette BLEUE figée (indépendante du thème) :**
- Conteneur : fond `#f9fbfc`, bordure `#e7edf2`, radius 20px, shadow forte, overflow hidden.
- **Top bar** (fond `#fff`, bordure basse `#e7edf2`, flex gap 13px, padding 11px 18px) :
  - Bouton retour (flèche gauche, carré 32px bordé).
  - Identité : point vert `#3f9d6a` pulsant + « Révisions du bac » (Bricolage 600 17px) / « Géographie » (12px `#5c6675`).
  - Séparateur + « Objectif » (accent `#2f7dc4` 12px uppercase) + « Chap. 4 — Climats ».
  - **Lecteur musique** (pill `#fff` bordée, `margin:0 auto`) : icône note `#2f7dc4` + « Good Night Lofi Cozy » + boutons précédent / **play (cercle plein `#2f7dc4`)** / suivant.
  - **Pomodoro** (pill bordée) : icône horloge + « Focus » (vert) + minuteur live + badges « 25/5 » (actif, fond `#2f7dc4` blanc) et « 50/10 » (inactif `#eef3f8`).
- **Body** (flex, hauteur 480px) :
  - **Scène vidéo (flex:1)** : grille **3×3 de 9 participants**, gap 11px, padding 16px. Chaque tuile : radius 14px, **dégradé de couleur unique**, point vert haut-gauche, **initiales 2 lettres** (blanc 23px) centrées, **nom** en bas-gauche (pill noire translucide). Liste exacte (init → nom → couleur claire/foncée du dégradé) :
    1. `TO` Toi (vous) — `#2f7dc4`/`#235e94` — **bordure accent 2px** (c'est l'utilisateur courant)
    2. `LU` Lucas — `#5aa775`/`#3f7350`
    3. `AL` Aline — `#9bb8d3`/`#7a9cbd`
    4. `LÉ` Léa — `#d4a5c4`/`#b67fa3`
    5. `SO` Sofia — `#7fb3ad`/`#5e918c`
    6. `MA` Marc — `#cbb46b`/`#a8965a`
    7. `NA` Nadia — `#b294cc`/`#8d6cab`
    8. `EM` Emma — `#e0a07f`/`#c47f5c`
    9. `YA` Yanis — `#6f8fc4`/`#4f6ea0`
  - **Dock flottant** centré en bas de la scène (compact, fond `#fff` bordé, radius 11px, gap 5px) : « Caméra coupée » (accent), « Micro verrouillé » (gris), « Quitter » (rouge `#b8473f` blanc). Texte 11px.
  - **Panneau latéral droit (largeur 330px, fond `#fff`, bordure gauche `#e7edf2`)** :
    - En-tête « Participants (9) » (uppercase `#5c6675`) avec **chevron ▾** aligné à droite (suggère un menu déroulant ouvert).
    - Liste : ligne « Toi (vous) » (surlignée `#eef3f8`, avatar dégradé bleu « T »), ligne « Lucas » (avatar dégradé vert « LU ») suivie de **deux boutons icônes** carrés 30px (`#e3eef8`, icône `#2f7dc4`) : **bulle de message** (messages privés) puis **téléphone** (appel).
    - **5 points de pagination** centrés (le 1er plus gros, 6px, couleur `#2f7dc4` ; les 4 autres 4px gris `#c4ccd5`) → suggère qu'on est sur la 1ʳᵉ page de participants, scroll possible.
    - Séparateur `#e7edf2`.
    - Section « Chat » : message reçu de **Lucas** (« Quelqu'un a fini la fiche sur les climats ? », bulle `#eef3f8` alignée gauche, nom `#3f7350`) + message envoyé « Toi » (« Oui, je te l'envoie 🙂 », bulle `#2f7dc4` blanc alignée droite).
    - Barre de saisie en bas : champ « Écrire un message… » + bouton envoi carré `#2f7dc4` (icône avion en papier).

### 5. Fonctionnalités (`id="fonctionnalites"`)
- Eyetag « Tout ce qu'il te faut » + H2 « Pensé pour rester concentré, ensemble ».
- Grille 3 colonnes, 6 cartes (`--surface`, bordure `--line`, radius 18px, padding 28px 26px). Chaque carte : icône 46px (carré `--accent-soft`, glyphe `--accent`) + H3 19px 700 + paragraphe `--muted` 14.5px.
  1. **Salles triées par matière** — « Chaque salle regroupe des personnes qui bossent sur le même sujet que toi. On se sent moins seul, et on reste dans le bon état d'esprit. »
  2. **Travail en caméra** — « Caméra allumée, micro coupé. La présence des autres recrée la pression positive d'une vraie salle de travail. »
  3. **Pomodoro collectif** — « Toute la salle suit le même minuteur. Vous démarrez et faites vos pauses ensemble, pour tenir la cadence sur la durée. »
  4. **Pomodoro personnel** — « Besoin de ton propre rythme ? Lance un minuteur perso en parallèle, visible seulement par toi. »
  5. **Chat & entraide** — « Une question, une ressource à partager ? Le chat de la salle est là pour s'entraider sans casser la concentration. »
  6. **Appels privés 1-à-1** — « Pour expliquer un point de vive voix, lance un appel privé avec un camarade en un clic, sans déranger la salle. »

### 6. FAQ (`id="faq"`)
- Section fond `--surface-2`, contenu max 760px. Eyetag « Questions fréquentes » + H2 « Tout ce que tu veux savoir ».
- Accordéon : 6 items (cartes `--surface` bordure `--line` radius 14px). En-tête cliquable (question 16.5px 600) + icône « + » (`--accent` 24px) qui **tourne à 45° quand ouvert**. Réponse révélée en dessous (`--muted` 15px line-height 1.65). **Un seul item ouvert à la fois ; le 1er est ouvert par défaut.**
  1. C'est vraiment gratuit ? → « Oui. Tu crées un compte et tu rejoins les salles d'étude gratuitement. On veut d'abord t'aider à reprendre le rythme. »
  2. Comment fonctionnent les salles par matière ? → « Chaque salle regroupe des personnes qui travaillent sur le même domaine (maths, droit, langues…). Tu choisis ta matière et tu retrouves des gens dans le même état d'esprit que toi. »
  3. Dois-je vraiment montrer mon visage ? → « La caméra est encouragée : c'est elle qui recrée la présence des autres et la concentration. Mais tu restes libre de la couper quand tu en as besoin. »
  4. Le micro est-il toujours coupé ? → « Par défaut oui, pour préserver le calme de la salle. Pour échanger de vive voix, tu peux lancer un appel privé 1-à-1 avec un camarade. »
  5. À quoi sert le Pomodoro collectif ? → « Toute la salle suit le même minuteur : vous démarrez vos sessions de travail et vos pauses en même temps. C'est plus facile de tenir quand tout le monde avance avec toi. »
  6. Sur quels appareils ça marche ? → « Directement dans ton navigateur, sur ordinateur — rien à installer. L'expérience mobile arrive prochainement. »

### 7. CTA final
- Bloc `--ink` (sombre), radius 26px, padding généreux, texte centré, cercle accent flou décoratif en haut-droite.
- H2 (Bricolage Grotesque, `--bg` clair) « Ta prochaine session<br>commence maintenant. » + paragraphe + bouton « Commencer gratuitement » (accent plein).

### 8. Footer
- Bordure haute `--line`, flex space-between : logo + wordmark à gauche, baseline « Étudiez ensemble, maximisez votre productivité. » à droite (`--muted` 14px).

---

## Interactions & Behavior
- **Header sticky** avec blur ; les liens nav scrollent vers les ancres (`#fonctionnalites`, `#faq`, `#apercu`).
- **Pomodoro live** : un minuteur décompte chaque seconde depuis `23:12`, et se réinitialise à `25:00` en atteignant zéro. La même valeur alimente le pomodoro de la top bar du mockup salle. Une barre de progression (le cas échéant) reflète l'avancement. En prod, remplacer par le vrai état de session.
- **FAQ accordéon** : clic sur une question ouvre/ferme ; **un seul ouvert à la fois** ; l'icône « + » pivote à 45° (rotation, transition 0.25s ease) quand l'item est ouvert.
- **Animations subtiles** : badge live + points de statut « pulsent » (`@keyframes` opacity/scale, ~2–2.4s). Cartes flottantes du hero : translation verticale douce (`float` ~6–7s ease-in-out infinite).
- **Sélecteur de thème** (outil de design, à retirer en prod) : 3 boutons bas-centre qui réécrivent les variables CSS de thème en direct.
- Pas de logique réseau dans le prototype — tous les contenus (participants, messages, salles) sont statiques et doivent être branchés sur les vraies données.

## State Management
Pour une implémentation réelle, prévoir au minimum :
- `pomodoroSeconds` + phase (focus/pause) + preset (25/5 ou 50/10) — partagé au niveau de la salle pour le pomodoro collectif, local pour le perso.
- `openFaqIndex` (number | null) pour l'accordéon.
- `currentRoom` (matière, objectif, niveau), `participants[]` (id, nom, initiales, couleur, caméra on/off, micro), `messages[]` (auteur, texte, sens), `musicTrack` (titre, lecture, progression).
- `theme` : **non nécessaire en prod** (figer sur « Lumière du jour »).

## Design Tokens

### Couleurs — page (thème « Lumière du jour »)
`--bg #f9fbfc` · `--surface #ffffff` · `--surface-2 #eef3f8` · `--ink #19222e` · `--muted #5c6675` · `--accent #2f7dc4` · `--accent-soft #e3eef8` · `--line #e7edf2`

> La page et le mockup salle partagent donc la même palette bleue (cohérence voulue).

### Couleurs — mockup salle (palette bleue figée)
Fond `#f9fbfc` · surface `#fff` · surface-2 `#eef3f8` · accent `#2f7dc4` · accent-soft `#e3eef8` · texte `#19222e` · texte muet `#5c6675` · ligne `#e7edf2` · succès/online `#3f9d6a` · danger/quitter `#b8473f` · points pagination inactifs `#c4ccd5`

### Avatars participants (dégradés 150deg, clair → foncé)
Voir la liste des 9 participants ci-dessus.

### Typographie
- Display / titres : **Bricolage Grotesque** (sans-serif) 600
- UI : **Public Sans** 400/500/600/700
- Échelle : H1 clamp(42,5.6vw,68) · H2 clamp(30,3.6vw,44) · H3 19–20 · corps 14.5–19 · eyetag 13 · micro-UI 11–12.5

### Rayons
Boutons/pills 10–13px · cartes 14–22px · gros blocs 26px · pills rondes 999px · tuiles caméra 14px · avatars 50%.

### Ombres
- Cartes flottantes hero : `0 18–30px 40–70px rgba(40,30,20,.13–.28)`
- Mockup salle : `0 34px 80px rgba(20,30,45,.18)`
- Boutons accent : `0 6–14px 16–30px` de la couleur d'accent à 30–40%.

### Espacements
Padding sections : `clamp(48–56px, 6–7vw, 80–104px)` vertical, `24px` horizontal. Largeur contenu max `1180px` (760px pour la FAQ). Gaps de grille : 22px (cartes), 11–16px (tuiles caméra).

## Assets
- **Icônes** : toutes en SVG inline, style « Feather/Lucide » (stroke 2, linecap round). Remplaçables par la librairie d'icônes du codebase (Lucide recommandé) : livre, caméra/caméra-off, micro-off, horloge, message, téléphone, avion en papier, note de musique, haut-parleur, chevron, flèche, play/pause/précédent/suivant, users.
- **Polices** : Google Fonts — Bricolage Grotesque (titres), Public Sans (UI). (Le prototype charge aussi Newsreader et Space Grotesk pour les thèmes alternatifs non retenus — inutiles ici.)
- **Images** : aucune image bitmap. Les caméras sont représentées par des dégradés + initiales (placeholders) ; en prod, ce sont les flux vidéo réels.
- **Emojis** : 🙂 dans deux messages de chat (décoratif, conservable).

## Files
- `Accueil StudyWithCompany.dc.html` — le design complet (prototype). Source unique de vérité pour la structure et les styles. (Le `.dc.html` est un format de prototype ; en extraire le markup/CSS, ignorer la tuyauterie du format.)
- `screenshots/` — captures de référence (rendu cible en thème « Lumière du jour ») :
  - `01-hero.png` — header + hero
  - `02-comment-ca-marche.png` — les 3 étapes
  - `03-apercu-salle.png` — mockup de la salle d'étude
  - `04-fonctionnalites.png` — grille des 6 fonctionnalités
  - `05-faq.png` — accordéon FAQ
