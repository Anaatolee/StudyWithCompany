# Handoff: Salles d'étude — StudyWithCompany

## Overview
A single authenticated dashboard page for **StudyWithCompany**, a collaborative study-room app. From this page a logged-in user can: see their own active rooms, browse default rooms grouped by subject, browse community-created rooms, create a new room (modal form), join any room, and log out. The visual direction follows the project's **"daylight / lumière du jour"** theme (light surfaces, blue accent, Bricolage Grotesque headings).

## About the Design Files
The files in `design/` are **design references created in HTML** — a prototype showing the intended look and behavior. They are **not production code to ship directly**. The `.dc.html` file uses a small in-house template runtime (`support.js`) that is specific to the design tool; **do not import that runtime into your app**.

Your task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, etc.), using its established components, styling system, routing, and data layer. If no frontend environment exists yet, pick the most appropriate framework for the project and implement there. Treat the HTML as the spec for layout, spacing, color, type, and interaction — not as source to copy.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interactions are specified below and should be reproduced faithfully, adapted to your component library.

---

## Screens / Views

### 1. Dashboard — "Salles d'étude" (single page)
**Purpose:** the user's home after login. Find and join a study room, or create one.

**Page layout (top → bottom):**
1. **Sticky top nav** (full width, blurred translucent background, 1px bottom border).
2. **Centered content column**, `max-width: 1240px`, horizontal padding `28px`, top padding `clamp(32px,4vw,52px)`, bottom padding `80px`.
   - **Page header row** — title block on the left, "Créer une salle" button on the right; wraps on narrow widths. Bottom margin `40px`.
   - **"Mes salles" section** — heading + responsive card grid. Bottom margin `46px`.
   - **Tab bar** — two tabs with a bottom border; active tab underlined. Bottom margin `28px`.
   - **Room grid** — responsive card grid; content swaps with the active tab.
3. **Create-room modal** (overlay, conditionally rendered).
4. **Join toast** (fixed bottom-center, conditionally rendered).

#### Top nav
- Container: `max-width:1240px`, padding `14px 28px`, `display:flex; align-items:center; justify-content:space-between`.
- **Left — logo lockup:** 34×34 rounded square (`border-radius:9px`, `background:#2f7dc4`) with a white open-book SVG icon inside (two facing pages), then wordmark **"StudyWithCompany"** in Bricolage Grotesque 700, `20px`, color `#19222e`, letter-spacing `-0.01em`.
- **Right — nav (flex, gap 18px):**
  - **User chip:** 28px circle avatar (`background:#e3eef8`, blue letter "A", 700/12px) + label **"@Anatole"** (`#5c6675`, 600, 14.5px).
  - **Déconnexion link:** logout SVG icon + text, `#5c6675` 600 14.5px, padding `8px 12px`, radius `9px`. Hover → `background:#eef3f8; color:#19222e`. (Wire to the real logout action.)

#### Page header
- **Title** "Salles d'étude": Bricolage Grotesque 700, `clamp(32px,4vw,44px)`, line-height `1.05`, letter-spacing `-0.025em`, color `#19222e`, bottom margin `10px`.
- **Subtitle** "Rejoignez une salle existante ou créez la vôtre.": `16.5px`, color `#5c6675`, line-height `1.5`.
- **"Créer une salle" button** (primary): flex with a plus SVG + label. `background:#2f7dc4`, white text, Public Sans 600 15px, padding `13px 22px`, radius `11px`, shadow `0 8px 20px rgba(47,125,196,.28)`. Hover → `background:#2a6fad`. Opens the create modal.

#### "Mes salles" section
- Heading "Mes salles": Bricolage Grotesque 700, `21px`, `#19222e`, bottom margin `18px`.
- Grid: `repeat(auto-fill, minmax(290px, 1fr))`, gap `18px`.
- **Room card (mine):** see card spec below. Prototype seed data is one card: name **"test 3"**, description **"test 3"**, **20 max**, pomodoro **50/10**. The live-status dot on these cards **pulses** (see animations).

#### Tab bar
- `display:flex; gap:4px`, `border-bottom:1px solid #e7edf2`.
- Two tabs:
  - **"Par matière"** (default active)
  - **"Salles de la communauté"**
- Tab button: Public Sans, `15px`, padding `13px 16px`. Active → weight 700, color `#2f7dc4`, `border-bottom:2px solid #2f7dc4` (pulled down 1px with `margin-bottom:-1px` to sit on the bar). Inactive → weight 600, color `#5c6675`, transparent bottom border. Clicking switches the room grid content.

#### Room grid
- Grid: `repeat(auto-fill, minmax(264px, 1fr))`, gap `18px`.
- Cards animate in with a fade-up on mount.

**"Par matière" content** — 12 default subject rooms (any user-created rooms are prepended to this list):
`Mathématiques(14), Physique(8), Chimie(6), Biologie(5), Histoire(4), Géographie(3), Littérature(7), Langues(9), Informatique(12), Philosophie(2), Économie(5), Étude libre(16)` (number = "en ligne" count). Each card: name `"Salle <matière>"`, a colored subject tag, description `"Salle par défaut pour étudier <matière>"`.

**"Salles de la communauté" content** — 6 cards:
| Name | Subject tag | Description | En ligne |
|---|---|---|---|
| Prépa MPSI — Maths | Mathématiques | Entraide DS & colles, ambiance focus | 22 |
| Révisions PASS | Biologie | On révise l'anat ensemble, micros coupés | 31 |
| Code & café | Informatique | Projets perso et algo, pomodoro 50/10 | 18 |
| Deutsch B2 | Langues | Vocab et expression écrite, niveau B2 | 7 |
| Disserts philo | Philosophie | On planche sur les sujets de bac blanc | 9 |
| Macroéconomie L2 | Économie | Fiches & annales, rythme tranquille | 11 |

#### Room card spec (shared)
- `background:#fff`, `border:1px solid #e7edf2`, `border-radius:16px`, padding `22px`, base shadow `0 1px 2px rgba(25,34,46,.04)`, cursor pointer.
- **Hover:** `transform:translateY(-3px)`, shadow `0 16px 34px rgba(25,34,46,.10)`, border `#cfe0f1`. Transition `.18s ease` on transform/shadow/border.
- **Status dot:** absolute top-right (`top:18px; right:18px`), 9×9, `background:#2f7dc4`, ring `box-shadow:0 0 0 4px #e3eef8`.
- **Title:** Bricolage Grotesque 700, `17.5px` (18px on "Mes salles"), `#19222e`, right padding `22px` so it clears the dot.
- **Subject tag** (subject/community cards): pill, `border-radius:999px`, Public Sans 700, `12px`, padding `4px 11px`. Color is computed per subject — see Design Tokens → Subject colors.
- **Description:** `13.5px` (14px on "Mes salles"), `#5c6675`, line-height `1.55`.
- **Card footer:** flex row, `justify-content:space-between`, top border `1px solid #eef3f8`, padding-top `15px`.
  - Left meta: small SVG + count. Subject/community cards show **"<n> en ligne"** (users icon). "Mes salles" cards show **"<max> max"** (users icon) on the left and **pomodoro value** (timer icon, color `#2f7dc4`) on the right.
  - Right CTA (subject/community cards): **"Rejoindre"** + arrow SVG, color `#2f7dc4`, 600 12.5px.
- **Whole card is clickable → join** (fires the join toast in the prototype; wire to real "enter room" navigation).

### 2. Create-room modal
**Purpose:** create a new study room.
- **Overlay:** `position:fixed; inset:0`, `background:rgba(25,34,46,.42)`, `backdrop-filter:blur(3px)`, flex, `align-items:flex-start; justify-content:center`, padding `48px 20px`, `overflow-y:auto`. Fades in (`.2s`). Clicking the overlay (outside the card) closes it.
- **Card:** `max-width:520px`, `background:#fff`, `border:1px solid #e7edf2`, `border-radius:20px`, shadow `0 40px 90px rgba(25,34,46,.28)`. Pops in (`.26s cubic-bezier(.2,.8,.2,1)`). Click inside does not close (stop propagation).
- **Header:** title "Créer une salle" (Bricolage Grotesque 700, 20px) + 32px square close button (X icon, `background:#eef3f8`, radius 9px; hover `#e3eef8`). Bottom border `1px solid #eef3f8`.
- **Body** (padding `24px 26px`, vertical stack gap `18px`):
  - **Nom de la salle** — text input. Placeholder "Ex. Révisions partiel maths".
  - **Description** — text input. Placeholder "Quel est l'objectif de la session ?".
  - **Matière** — `<select>`, options = the 12 subjects listed above; default "Mathématiques".
  - Two-column row (`grid-template-columns:1fr 1fr`, gap 16px):
    - **Participants max** — number input, default `20`.
    - **Pomodoro (focus / pause)** — text input, placeholder/default `50/10`.
  - **Field label:** 13px, 600, `#19222e`, gap 7px above input.
  - **Input:** Public Sans 14.5px, `#19222e`, padding `12px 14px`, `border:1px solid #e7edf2`, radius `11px`, `background:#fbfcfe`. Focus → `border-color:#2f7dc4; background:#fff`.
- **Footer:** flex right-aligned, gap 10px, top border, `background:#fbfcfe`, padding `18px 26px`.
  - **Annuler** (secondary): white, `border:1px solid #e7edf2`, `#5c6675`, 600 14.5px, radius 11px; hover `#eef3f8`. Closes modal.
  - **Créer la salle** (primary): `#2f7dc4`, white, radius 11px, shadow `0 8px 18px rgba(47,125,196,.26)`; hover `#2a6fad`. Submits.

### 3. Join / confirmation toast
- `position:fixed; bottom:26px; left:50%; transform:translateX(-50%)`.
- `background:#19222e`, text `#f9fbfc`, Public Sans 14px, padding `13px 20px`, radius `13px`, shadow `0 18px 44px rgba(25,34,46,.32)`.
- Leading 9px green dot (`#5fbf7e`) that pulses.
- Pops in (`.3s cubic-bezier(.2,.8,.2,1)`), auto-dismisses after **2600ms**.

---

## Interactions & Behavior
- **Tabs:** clicking "Par matière" / "Salles de la communauté" swaps the room grid; active tab gets the blue underline + bold weight. No navigation/route change.
- **Créer une salle (header button):** opens the modal.
- **Modal submit ("Créer la salle"):** validates that **Nom** is non-empty (trimmed). If empty → toast "Donne un nom à ta salle" and stay open. If valid → prepend the new room to the "Par matière" list, switch active tab to "Par matière", close modal, reset form, and toast `Salle « <nom> » créée`.
- **Modal cancel / overlay click / X:** close without saving.
- **Join (click any room card):** prototype shows toast `Tu rejoins « <nom> »…`. In production this should navigate into the study-room view.
- **Déconnexion:** prototype is a placeholder link; wire to real logout.
- **Hover states:** cards lift; buttons darken; nav items get a light fill (see specs above).
- **Animations:**
  - `swc-fadeUp` — room cards on mount: opacity 0→1, translateY 14px→0, `.4s ease`.
  - `swc-pop` — modal card & toast entrance: opacity + translateY 16px→0 + slight scale, `cubic-bezier(.2,.8,.2,1)`.
  - `swc-overlay` — overlay fade `.2s`.
  - `swc-pulse` — "Mes salles" status dot and toast dot pulse (opacity/scale), `~2.4s` / `1.6s` infinite.
- **Responsive:** grids use `auto-fill minmax(...)` so columns reflow; header row wraps; content column is centered with `max-width:1240px`. Title scales with `clamp()`.

## State Management
Local UI state needed:
- `tab`: `'subject' | 'community'` — active tab (default `'subject'`).
- `createOpen`: boolean — modal visibility.
- `toast`: string — current toast message (empty = hidden); auto-clears via timeout (2600ms).
- `rooms`: array — user-created rooms (prepended into the subject list). In production these come from the backend.
- `form`: `{ name, desc, subject, max, pomodoro }` — modal form fields; reset after successful create.

**Data fetching (production):** the prototype hardcodes room lists. In the real app, fetch (a) the user's rooms ("Mes salles"), (b) default subject rooms with live online counts, and (c) community rooms — ideally with live presence for the online counts and status dots. POST on create; navigate on join.

## Design Tokens

**Colors**
| Token | Hex | Use |
|---|---|---|
| Accent blue | `#2f7dc4` | logo, primary buttons, links, active tab, status dots |
| Accent blue (hover) | `#2a6fad` | primary button hover |
| Accent tint | `#e3eef8` | avatar bg, status-dot ring |
| Page background | `#f9fbfc` | app background |
| Surface white | `#ffffff` | cards, modal, nav |
| Input surface | `#fbfcfe` | inputs, modal footer |
| Ink / heading | `#19222e` | headings, primary text, toast bg |
| Muted text | `#5c6675` | secondary text, meta |
| Border | `#e7edf2` | card/input/nav borders |
| Divider (light) | `#eef3f8` | inner dividers, hover fills |
| Border (hover) | `#cfe0f1` | card hover border |
| Success green | `#5fbf7e` | toast dot |

**Subject tag colors** — generated in OKLCH for a harmonious set (equal lightness/chroma, hue per subject). Text `oklch(0.52 0.12 <hue>)`, background `oklch(0.95 0.03 <hue>)`. Hue map:
`Mathématiques 255, Physique 25, Chimie 150, Biologie 140, Histoire 70, Géographie 195, Littérature 350, Langues 300, Informatique 270, Philosophie 320, Économie 165, Étude libre 250`. Unknown subjects fall back to hue `250`. You can hardcode these as a palette in your design system if OKLCH isn't convenient.

**Typography**
- **Display / headings:** Bricolage Grotesque (weights 500–800). Used at 700 for logo, page title, section/card titles, modal title.
- **Body / UI:** Public Sans (weights 400–700). Used for buttons, labels, meta, inputs.
- Key sizes: page title `clamp(32px,4vw,44px)` / section heading `21px` / card title `17.5–18px` / body & buttons `14.5–16.5px` / meta & tags `12–13.5px`.
- Letter-spacing: `-0.025em` on the big title, `-0.01em` on logo/section heads.

**Spacing** — 18px is the common grid gap; section bottom margins 40/46/28px; card padding 22px; content column padding `28px` horizontal.

**Radii** — buttons/inputs `11px`; cards `16px`; modal `20px`; pills/tags `999px`; small chips/close `9px`; toast `13px`.

**Shadows**
- Card base `0 1px 2px rgba(25,34,46,.04)`; card hover `0 16px 34px rgba(25,34,46,.10)`.
- Primary button `0 8px 20px rgba(47,125,196,.28)`.
- Modal `0 40px 90px rgba(25,34,46,.28)`; toast `0 18px 44px rgba(25,34,46,.32)`.

## Assets
- **Fonts:** Bricolage Grotesque + Public Sans via Google Fonts. Self-host or load from your app's font pipeline.
- **Icons:** inline SVGs in a Lucide/Feather style (stroke 2, round caps) — open book (logo), logout, plus, users, timer/clock, arrow-right, X. Replace with your codebase's icon library; the book logo mark is custom (two facing rounded pages).
- No raster images. No external image dependencies.

## Files
- `design/Salles d'étude.dc.html` — the design prototype (template markup + a `Component` logic class). Read this for exact markup, inline styles, seed data, and handlers.
- `design/support.js` — the design-tool runtime the prototype needs to render. **Reference only — do not port to production.**
- `screenshots/01-dashboard.png` — dashboard, top of page.
- `screenshots/01-dashboard-full.png` — dashboard incl. "Mes salles" + tab bar.
- `screenshots/02-community-tab.png` — "Salles de la communauté" tab with cards.
- `screenshots/03-create-modal.png` — create-room modal, full form.

### Where to read what in the prototype
- **Markup & inline styles** for nav, header, cards, tabs, modal, toast: the template (top of the `.dc.html`).
- **Seed data, subject→hue map, tab logic, validation, toast timing:** the `Component` class (`renderVals()` and the handlers) at the bottom of the `.dc.html`.
