# Handoff: Login / Signup — StudyWithCompany

## Overview
Authentication screen for **StudyWithCompany**, a study-rooms app. A single
centered card lets a returning user **sign in** or a new user **create an
account**; the two modes share one card and toggle in place. Visual direction is
the "lumière du jour" (daylight) theme of the StudyWithCompany design system:
white surfaces, soft blue accent, generous rounding, subtle ambient glows.

## About the Design Files
The files in this bundle are **design references created in HTML** — a prototype
showing the intended look and behavior, **not** production code to copy directly.
The DC (`Connexion StudyWithCompany.dc.html`) uses an internal rendering runtime
(`support.js`); do **not** ship that runtime. Your task is to **recreate this
design in the target codebase's existing environment** (React, Vue, SwiftUI,
native, etc.) using its established components, styling approach and form
libraries. If no environment exists yet, choose the most appropriate framework
for the project and implement the design there.

If the codebase already has a brand/design system, map the tokens below onto it
rather than hard-coding these values.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing and interactions are
all specified below. Recreate the UI pixel-perfectly using the codebase's
existing libraries and patterns. Exact hex values, font sizes and radii are
given in **Design Tokens**.

## Screens / Views

The screen is one centered card with two modes. See `screenshots/login.png` and
`screenshots/signup.png`.

### Page chrome (both modes)
- **Background**: `#f9fbfc`, full viewport, `min-height:100vh`.
- **Ambient glows** (decorative, `position:absolute`, `pointer-events:none`,
  behind the content at a lower z-index):
  - Top-right: 520×520px circle, `radial-gradient(circle, #e3eef8 0%, transparent 70%)`, offset `top:-180px; right:-120px`. Floats with a 14s ease-in-out loop translating ~22px vertically.
  - Bottom-left: 560×560px circle, `radial-gradient(circle, #eaf4ec 0%, transparent 70%)`, offset `bottom:-220px; left:-140px`. Same drift, 18s, reversed.
  - These are ambience only — safe to simplify or drop on low-end targets.
- **Header / brand** (top-left, `padding:26px 30px`, flex row, `gap:11px`):
  - Logo tile: 34×34px, `border-radius:9px`, background `#2f7dc4`, white open-book icon (~19px, stroke 2). Shadow `0 6px 16px rgba(47,125,196,.28)`.
  - Wordmark: "StudyWithCompany", Bricolage Grotesque 700, 20px, `#19222e`, letter-spacing `-.01em`.

### Card (container for both modes)
- Centered in remaining space (flex center, `padding:24px 24px 64px`).
- `max-width:430px`, full width below that.
- Background `#ffffff`, border `1px solid #e7edf2`, `border-radius:22px`.
- Shadow: `0 30px 70px rgba(25,34,46,.08), 0 2px 6px rgba(25,34,46,.04)`.
- Padding `clamp(30px,5vw,42px)`.
- **Entrance animation**: fade + 16px rise, 0.5s ease, on mount.

### Mode A — Login (`mode = 'login'`, default)
- **Heading**: "Connexion" — Bricolage Grotesque 700, 30px, `#19222e`, letter-spacing `-.02em`, margin `0 0 7px`.
- **Subtitle**: "Retrouvez vos camarades dans les salles d'étude." — Public Sans 400, 15px, line-height 1.5, `#5c6675`, margin `0 0 28px`.
- **Form** (flex column, `gap:18px`):
  1. **Email field** — label "Email"; input `type=email`, placeholder `toi@exemple.com`. Inline error slot below (see validation).
  2. **Password field** — label "Mot de passe"; input `type=password`, placeholder `••••••••`; trailing eye toggle button (see Interactions).
  3. **Row** (`space-between`, margin-top `-4px`):
     - Left: custom checkbox + "Se souvenir de moi" (default **checked**).
     - Right: link "Mot de passe oublié ?" — Public Sans 600, 13.5px, `#2f7dc4`.
  4. **Submit button** — "Se connecter" (see button spec).
- **Divider**: hairline / "ou" / hairline. Lines `1px #e7edf2`; label Public Sans 500, 12.5px, `#9aa4b2`; margin `24px 0`; flex row `gap:14px`.
- **Google button** — full width, white, border `1px #e7edf2`, `border-radius:12px`, padding 13px; Public Sans 600, 14.5px, `#19222e`; 18px Google "G" icon + "Continuer avec Google". Hover: background `#f5f8fb`, border `#d4dde6`.
- **Mode switch line** (centered, Public Sans 400, 14px, `#5c6675`, margin-top 24px): "Pas encore de compte ?" + link "Créer un compte" (600, `#2f7dc4`).

### Mode B — Signup (`mode = 'signup'`)
Same card; differences only:
- **Heading**: "Créer un compte".
- **Subtitle**: "Rejoins les salles d'étude et avance avec les autres."
- **Extra first field**: **Nom d'utilisateur** — label + input `type=text`, placeholder `Ton prénom`, inserted above Email.
- **Hidden in signup**: the "Se souvenir de moi" / "Mot de passe oublié ?" row.
- **Submit button label**: "Créer mon compte".
- **Mode switch line**: "Déjà un compte ?" + link "Se connecter".
- Divider + Google button are unchanged and present in both modes.

## Components — shared specs

### Text input
- Full width, padding `13px 14px` (password: `13px 44px 13px 14px` to clear the eye button).
- Font Public Sans, 15px, `#19222e`. Placeholder `#9aa4b2`.
- Background `#f9fbfc`, border `1px solid #e7edf2`, `border-radius:12px`.
- **Focus**: border `#2f7dc4` + box-shadow `0 0 0 3px rgba(47,125,196,.14)`. Transition `border-color .18s, box-shadow .18s`.
- Field label: Public Sans 600, 13.5px, `#19222e`, `gap:7px` above its input.

### Password eye toggle
- Button inside the input, absolutely positioned `right:8px`, 34×34px, transparent, `border-radius:8px`, icon color `#8a94a3`.
- Toggles input `type` between `password` and `text`. Icon swaps eye ↔ eye-off (Feather-style, 19px, stroke 2).

### "Se souvenir de moi" checkbox (login only)
- Custom 19×19px box, `border-radius:6px`. Unchecked: border `1px #cfd8e2`, white fill. Checked: background + border `#2f7dc4`, white 12px check icon (stroke 3.5). Transition `all .15s`.
- Default state: **checked**.

### Primary submit button
- Full width, `min-height:50px`, flex center, `gap:9px`.
- Background `#2f7dc4`, white text, Public Sans 700, 15.5px, `border-radius:12px`.
- Shadow `0 10px 24px rgba(47,125,196,.30)`. Transition `background .18s, transform .12s`.
- **Loading state**: background `#5896cf`, label replaced by an 17px white spinner (2.5px ring, top transparent, 0.7s linear spin), cursor `default`.

## Interactions & Behavior
- **Mode toggle**: clicking the switch link flips `login ⇄ signup`. Clears any email error. Card content updates in place (heading, subtitle, fields, button label, switch line).
- **Password visibility**: eye button toggles masked/plaintext; icon reflects state.
- **Remember me**: toggles boolean; visual check appears/disappears. Login mode only.
- **Forgot password / Google**: present and styled; wire to real flows in the target app (currently no-ops in the prototype).
- **Submit**:
  1. `preventDefault`.
  2. Validate email against `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. If invalid → set `emailError = "Entre une adresse email valide."` and abort (error text renders below the email field, Public Sans 500, 12.5px, `#c0492f`).
  3. If password is empty → abort silently.
  4. Otherwise set `loading = true` and show the spinner. (Prototype clears it after ~1.4s; replace with the real auth request.)
- **Animations**: card entrance fade-up 0.5s ease; ambient glow drift 14s / 18s; spinner 0.7s linear; input focus/border transitions 0.18s.
- **Responsive**: card is fluid up to `max-width:430px`; padding uses `clamp(30px,5vw,42px)`. Works down to small mobile widths. Header stays top-left.

## State Management
| State | Type | Notes |
|---|---|---|
| `mode` | `'login' \| 'signup'` | default `'login'` |
| `name` | string | signup only |
| `email` | string | |
| `password` | string | |
| `showPw` | boolean | password visibility, default `false` |
| `remember` | boolean | default `true`, login only |
| `loading` | boolean | submit in flight |
| `emailError` | string | empty = no error |
| `focused` | field key \| null | drives the focus ring |

Transitions: mode toggle clears `emailError`; editing email clears `emailError`;
submit sets/clears `loading`. Real data fetching (auth request, Google SSO) is
**not** implemented — hook it into your backend.

## Design Tokens

**Colors**
| Token | Hex | Use |
|---|---|---|
| Accent / primary | `#2f7dc4` | buttons, links, focus, logo, checked box |
| Accent (loading) | `#5896cf` | submit button while loading |
| Focus ring | `rgba(47,125,196,.14)` | input focus shadow |
| Page background | `#f9fbfc` | viewport + input fill |
| Surface | `#ffffff` | card, Google button |
| Border | `#e7edf2` | card, inputs, dividers, Google button |
| Border (hover) | `#d4dde6` | Google button hover |
| Checkbox border | `#cfd8e2` | unchecked checkbox |
| Text strong | `#19222e` | headings, labels, input text |
| Text muted | `#5c6675` | subtitle, secondary copy |
| Text faint | `#9aa4b2` | divider label, placeholders |
| Icon muted | `#8a94a3` | eye toggle |
| Error | `#c0492f` | validation message |
| Glow blue | `#e3eef8` | top-right ambient glow |
| Glow green | `#eaf4ec` | bottom-left ambient glow |

**Typography**
- Display / headings & wordmark: **Bricolage Grotesque** (700). Heading 30px `-.02em`; wordmark 20px `-.01em`.
- Body / UI: **Public Sans** (400/500/600/700). Subtitle 15px; labels 13.5px/600; inputs 15px; buttons 15.5px(primary)/14.5px(Google); small/links 13.5px; divider/error 12.5px.
- Both load from Google Fonts.

**Radius**: card 22px; inputs/buttons/Google 12px; logo tile 9px; eye button 8px; checkbox 6px; glows 50%.

**Spacing**: header `26px 30px`; card padding `clamp(30px,5vw,42px)`; form gap 18px; label→input gap 7px; divider margin `24px 0`.

**Shadows**
- Card: `0 30px 70px rgba(25,34,46,.08), 0 2px 6px rgba(25,34,46,.04)`
- Primary button: `0 10px 24px rgba(47,125,196,.30)`
- Logo tile: `0 6px 16px rgba(47,125,196,.28)`

## Assets
- **Fonts**: Bricolage Grotesque + Public Sans — Google Fonts (CDN link in the file head). Self-host in production if preferred.
- **Icons**: inline SVGs — open-book logo, eye / eye-off, checkmark (Feather-style strokes). Google "G" is the standard 4-color mark. Re-draw using the target codebase's icon set; no external image assets are used.
- **No raster images** in the design.

## Files
- `Connexion StudyWithCompany.dc.html` — the design prototype (reference for exact markup, styles and logic). Open in a browser to interact.
- `support.js` — internal rendering runtime for the prototype. **Reference only — do not ship.**
- `screenshots/login.png` — login mode.
- `screenshots/signup.png` — signup mode.
