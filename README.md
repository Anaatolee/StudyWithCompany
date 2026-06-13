# StudyWithCompany

Application web de **salles d'étude vidéo** par matière. Inspirée des
bibliothèques en ligne / "study with me" : on rejoint une salle, on allume sa
caméra (micro coupé), et on travaille à côté d'autres étudiants. Chaque salle
embarque un **chat temps réel** et la possibilité de lancer un **appel privé
vocal** 1‑à‑1 avec un autre participant.

## Stack

- **Next.js 15** (App Router, Server Components, TypeScript)
- **Tailwind CSS** pour le style
- **Supabase** — auth, base de données Postgres, Realtime (chat + signalisation
  des appels privés)
- **Daily.co** — vidéo WebRTC. Les permissions des tokens forcent
  côté serveur l'absence de micro dans les salles publiques.

## Fonctionnalités

- Inscription / connexion par email + mot de passe
- Liste de salles d'étude regroupées par matière (mathématiques, physique,
  histoire, ...)
- Salle vidéo avec :
  - **Caméra activée par défaut** (l'utilisateur peut la couper)
  - **Micro verrouillé** côté serveur (impossible à activer)
  - Grille de participants
  - Chat temps réel
  - Liste de participants avec un bouton « Appeler » pour chaque autre
- Appel privé **vocal** 1‑à‑1 :
  - Création d'une salle Daily éphémère (durée 1 h)
  - Notification temps réel du destinataire (via Supabase broadcast)
  - Modal d'appel séparé avec mute / raccrocher

## Mise en route

### 1. Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com), créez un nouveau projet
2. Dans **Settings → API**, copiez :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (gardé côté serveur uniquement)
3. Dans **SQL Editor**, exécutez le contenu de `supabase/schema.sql`
4. Dans **Authentication → Providers**, activez le provider Email
   (et désactivez la confirmation email pour le dev local si vous voulez aller
   plus vite)

### 2. Créer un compte Daily.co

1. [dashboard.daily.co](https://dashboard.daily.co) → créez un compte
2. Dans **Developers**, copiez votre `DAILY_API_KEY`
3. Notez votre sous-domaine Daily (ex. `mon-app.daily.co`) → c'est
   `NEXT_PUBLIC_DAILY_DOMAIN`

### 3. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Remplissez `.env.local` avec les valeurs Supabase et Daily ci-dessus.

### 4. Installation et lancement

```bash
npm install
npm run dev
```

L'app tourne sur [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/
│   ├── api/
│   │   └── daily/
│   │       ├── room/route.ts          # provisionne la salle Daily + token
│   │       └── private-call/
│   │           ├── route.ts           # crée un appel privé
│   │           └── join/route.ts      # token pour rejoindre un appel
│   ├── auth/
│   │   ├── callback/route.ts
│   │   └── signout/route.ts
│   ├── login/page.tsx
│   ├── signup/page.tsx
│   ├── rooms/
│   │   ├── page.tsx                    # liste par matière
│   │   └── [roomId]/page.tsx           # une salle (server component)
│   ├── layout.tsx
│   └── page.tsx                        # landing
├── components/
│   ├── StudyRoomClient.tsx             # orchestre Daily + chat + appels
│   ├── VideoGrid.tsx, VideoTile.tsx
│   ├── Controls.tsx                    # caméra / quitter (pas de micro)
│   ├── Chat.tsx                        # Supabase Realtime
│   ├── ParticipantList.tsx             # avec bouton "appeler"
│   ├── PrivateCallModal.tsx            # modal vocal
│   └── IncomingCallToast.tsx           # notification d'appel entrant
├── lib/
│   ├── supabase/                       # clients ssr + browser + middleware
│   ├── daily.ts                        # REST API Daily (rooms + tokens)
│   ├── subjects.ts                     # mapping icônes lucide
│   └── types.ts
└── middleware.ts                       # refresh session + redirect non-auth
supabase/
└── schema.sql                          # tables + RLS + triggers
```

### Comment le micro est verrouillé

Quand un utilisateur rejoint une salle d'étude, le serveur lui génère un
token Daily avec :

```ts
permissions: { canSend: ["video", "screenVideo"] }
```

Daily refuse alors toute publication de piste audio depuis ce client, même si
l'UI est trafiquée. L'absence de bouton « activer le micro » dans `Controls`
est un détail d'UX — la garantie vient du token.

Pour les **appels privés**, un autre token est émis avec
`canSend: ["audio"]`, dans une **salle Daily différente** (donc deux objets
`DailyCall` indépendants : un pour la salle publique vidéo, un pour le vocal
privé). La caméra continue à tourner dans la salle publique pendant l'appel.

### Flux d'invitation d'appel privé

1. A clique « Appeler » sur la tuile de B
2. Frontend POST `/api/daily/private-call` → reçoit `{roomUrl, token}`
3. Frontend broadcast Supabase sur le canal `call-invites:<roomId>`
4. B (abonné au même canal) voit un toast → accepte
5. Frontend de B POST `/api/daily/private-call/join` → reçoit son `token`
6. Les deux parties joignent la même salle Daily, audio des deux côtés

## Notes

- Le service-role key Supabase n'est pas utilisé côté client. Toutes les
  opérations passent par RLS via la session de l'utilisateur.
- Les salles Daily sont créées paresseusement à la première arrivée d'un
  utilisateur. Elles persistent (pas d'`exp`) pour les salles publiques.
- Les invites d'appel privé ne sont délivrées que si le destinataire est dans
  la même salle d'étude (broadcast scoppé par `roomId`). C'est le cas
  d'usage principal : appeler quelqu'un que vous voyez à côté.

## Limitations connues

- Pas de modération / kick. À ajouter via la table `rooms` + un rôle owner.
- Pas de partage d'écran exposé dans l'UI (le token le permet, l'UI non).
- Les appels privés sont 1‑à‑1 (max_participants = 2 sur la salle Daily).
- Pas de tests automatisés ; vérifier le typecheck avec `npm run typecheck`.
