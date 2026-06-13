# HANDOFF — StudyTogether

**Date :** 2026-05-04  
**État global :** Application scaffold complète, prête pour `npm install` + config env

---

## Ce qu'on a accompli aujourd'hui

Création from scratch d'une application web de salles d'étude en visio :

- **Authentification complète** : inscription, connexion, déconnexion, callback OAuth, middleware de protection des routes
- **12 matières prédéfinies** (mathématiques, physique, chimie, biologie, histoire, géographie, littérature, langues, informatique, philosophie, économie, étude libre) avec une salle par défaut chacune, insérées via le schema SQL
- **Salle d'étude vidéo** : grille de participants via Daily.co, caméra toggleable, micro verrouillé côté serveur par token Daily
- **Chat temps réel** : Supabase Realtime via `postgres_changes` sur la table `messages`, avec vue enrichie `messages_with_author` pour éviter les N+1
- **Appels privés vocaux 1-à-1** : création de salle Daily éphémère (1h), signalisation via Supabase broadcast, modal superposé à la salle publique, micro activé uniquement dans ce contexte
- **UI responsive** dark-mode-first en Tailwind CSS

---

## Fichiers créés et pourquoi

### Configuration
| Fichier | Raison |
|---|---|
| `package.json` | Dépendances : next 15, @daily-co/daily-react, @supabase/ssr, lucide-react, jotai |
| `tsconfig.json` | Alias `@/*` → `src/*`, strict mode |
| `tailwind.config.ts` | Variables CSS custom (background, surface, border, accent, muted) |
| `next.config.ts` | remotePatterns pour Supabase et Daily |
| `middleware.ts` | Refresh session Supabase + redirect vers /login si non-auth (exclut /api) |
| `.env.local.example` | Modèle pour les 5 variables d'env requises |

### Base de données
| Fichier | Raison |
|---|---|
| `supabase/schema.sql` | Tables `profiles`, `subjects`, `rooms`, `messages` + RLS + trigger de création automatique du profil à l'inscription + publication realtime + vue `messages_with_author` + données seed (12 matières + 12 salles par défaut) |

### Lib (serveur + client)
| Fichier | Raison |
|---|---|
| `src/lib/supabase/client.ts` | Client Supabase browser (SSR-safe via @supabase/ssr) |
| `src/lib/supabase/server.ts` | Client Supabase Server Components |
| `src/lib/supabase/middleware.ts` | Logique de refresh session dans le middleware Next.js |
| `src/lib/daily.ts` | Wrappers REST API Daily.co : `createDailyRoom`, `getOrCreateDailyRoom`, `createDailyMeetingToken` |
| `src/lib/types.ts` | Types TypeScript partagés : `Subject`, `Room`, `Profile`, `ChatMessage`, `PrivateCallInvite` |
| `src/lib/subjects.ts` | Mapping nom d'icône → composant Lucide |

### Routes app
| Fichier | Raison |
|---|---|
| `src/app/layout.tsx` | Root layout, métadonnées globales |
| `src/app/globals.css` | Variables CSS + Tailwind base + scrollbar custom |
| `src/app/page.tsx` | Landing page (redirect /rooms si déjà auth) |
| `src/app/login/page.tsx` | Formulaire connexion (client) |
| `src/app/signup/page.tsx` | Formulaire inscription avec username (client) |
| `src/app/auth/callback/route.ts` | Échange code OAuth → session |
| `src/app/auth/signout/route.ts` | POST pour déconnecter |
| `src/app/rooms/page.tsx` | Liste des salles groupées par matière (Server Component) |
| `src/app/rooms/[roomId]/page.tsx` | Shell serveur de la salle : fetch room + subject + profil, passe au client |

### Routes API
| Fichier | Raison |
|---|---|
| `src/app/api/daily/room/route.ts` | Provisionnement lazy de la salle Daily (crée si inexistante, persiste le `daily_room_name` en base) + token avec `canSend: ['video', 'screenVideo']` |
| `src/app/api/daily/private-call/route.ts` | Crée une salle Daily éphémère (expire 1h) + token `canSend: ['audio']` pour l'appelant |
| `src/app/api/daily/private-call/join/route.ts` | Token `canSend: ['audio']` pour l'appelé qui rejoint une salle privée existante |

### Composants
| Fichier | Raison |
|---|---|
| `src/components/Navbar.tsx` | Barre de navigation avec username + bouton déconnexion |
| `src/components/RoomCard.tsx` | Carte cliquable pour chaque salle dans la liste |
| `src/components/StudyRoomClient.tsx` | Orchestrateur principal : gère le cycle de vie Daily (création, join, destroy), les abonnements Supabase broadcast pour les invites d'appel, et passe les callbacks aux sous-composants |
| `src/components/VideoGrid.tsx` | Grille responsive (1/2/3/4 colonnes selon nb de participants) |
| `src/components/VideoTile.tsx` | Tuile d'un participant : `DailyVideo` ou placeholder si caméra coupée |
| `src/components/Controls.tsx` | Boutons : toggle caméra, indicateur micro verrouillé (non-cliquable), quitter |
| `src/components/ParticipantList.tsx` | Liste des participants connectés avec bouton « Appeler » (sauf soi-même) |
| `src/components/Chat.tsx` | Chat temps réel : chargement initial 100 messages + subscription `postgres_changes` |
| `src/components/IncomingCallToast.tsx` | Toast d'appel entrant (Accepter / Refuser) |
| `src/components/PrivateCallModal.tsx` | Modal d'appel vocal : crée son propre `DailyCall` (`audioSource: true, videoSource: false`), propre `DailyProvider`, boutons mute/raccrocher |

---

## Prochaine étape exacte

```bash
# 1. Créer les comptes externes si pas encore fait
#    → https://supabase.com  (créer un projet, noter URL + anon key + service role key)
#    → https://dashboard.daily.co  (noter API key + sous-domaine)

# 2. Configurer les variables d'environnement
cp .env.local.example .env.local
# Remplir les 5 variables dans .env.local

# 3. Exécuter le schema en base
#    → Supabase Dashboard > SQL Editor > coller le contenu de supabase/schema.sql > Run

# 4. Installer et lancer
npm install
npm run dev
# → http://localhost:3000
```

**Première vérification recommandée :**
1. S'inscrire → vérifier que le profil est créé dans Supabase (table `profiles`)
2. Aller dans une salle → vérifier que la caméra démarre et que la salle Daily est créée
3. Ouvrir deux onglets avec deux comptes → vérifier que les deux caméras s'affichent
4. Envoyer un message dans le chat → vérifier qu'il apparaît en temps réel dans l'autre onglet
5. Lancer un appel privé → vérifier le toast + le modal vocal

---

## Décisions techniques prises

### Micro verrouillé côté serveur, pas seulement côté UI
Le token Daily est émis avec `canSend: ['video', 'screenVideo']` via l'API REST Daily côté serveur. Même si quelqu'un modifie le JavaScript dans le navigateur, le serveur Daily refuse l'émission audio. Le bouton "micro verrouillé" dans l'UI est un signal visuel, pas la seule protection.

### Appels privés = audio uniquement (pas vidéo)
Deux raisons : (1) le navigateur ne peut pas streamer la caméra vers deux `DailyCall` simultanément, (2) le besoin utilisateur était "appels vocaux" (whisper entre camarades). La salle publique garde la vidéo, le modal privé est `audioSource: true, videoSource: false`.

### Deux `DailyCall` indépendants, pas de "breakout rooms" Daily
Plutôt que d'utiliser la feature breakout de Daily, on crée manuellement deux objets `DailyCall` dans deux `DailyProvider` distincts. Plus de contrôle, moins de complexité API.

### Signalisation des appels privés via Supabase broadcast (pas une table)
Les invites d'appel ne sont pas persistées en base. On utilise le broadcast Supabase (WebSocket) sur le canal `call-invites:{roomId}`. Si le destinataire n'est pas connecté à la même salle, l'invite est perdue — comportement intentionnel pour le MVP.

### Provisionnement lazy des salles Daily
On ne crée pas les salles Daily à la création du projet ou au démarrage. Elles sont créées (`getOrCreateDailyRoom`) au premier utilisateur qui rejoint. Le `daily_room_name` est ensuite persisté dans la table `rooms` pour les accès suivants.

### Salles publiques "private" chez Daily
Malgré leur nom "salles publiques" dans l'UI, les salles Daily sont créées avec `privacy: "private"`. L'accès se fait uniquement via un token signé généré par notre API. Aucun lien daily.co ne peut être utilisé directement.

---

## Problèmes en cours non résolus

### 1. Race condition légère sur les invites d'appel
Dans `StudyRoomClient`, le canal Supabase est abonné via `channel.subscribe(callback)` avec assignation de `inviteChannelRef.current` à l'intérieur du callback `SUBSCRIBED`. Si l'utilisateur clique "Appeler" dans les premières secondes avant que le canal soit souscrit, l'invite n'est pas envoyée.
**Fix envisagé :** Mettre le bouton "Appeler" en disabled jusqu'à ce que `inviteChannelRef.current !== null`.

### 2. Pas de gestion du cas "Daily API key invalide"
Si `DAILY_API_KEY` est incorrect, `/api/daily/room` renvoie une erreur 500 et le composant `StudyRoomClient` affiche "Erreur de connexion" sans détail utile en production.
**Fix envisagé :** Logger l'erreur côté serveur, renvoyer un code d'erreur structuré au client.

### 3. Pas de nettoyage des salles Daily expirées
Les salles des appels privés expirent après 1h côté Daily (via `exp` dans les propriétés), mais les salles des études publiques n'ont pas d'expiration. Si un utilisateur supprime son compte, la salle Daily associée reste.
**Fix envisagé :** Webhook Daily ou cron job Supabase pour nettoyer.

### 4. Vue `messages_with_author` sans RLS propre
La vue hérite du RLS de la table `messages` via `SECURITY INVOKER`. Fonctionne, mais n'est pas explicitement documentée dans le schema. Supabase pourrait se comporter différemment selon la version.
**Fix envisagé :** Ajouter un commentaire dans le schema, ou remplacer la vue par une fonction RPC si des problèmes apparaissent.

### 5. Pas de gestion des doublons de message dans le chat
Le composant `Chat` vérifie `prev.some(m => m.id === newMsg.id)` pour éviter les doublons, mais si deux événements realtime arrivent très rapidement, il est possible (edge case) que le message apparaisse deux fois.
**Fix envisagé :** Utiliser `useReducer` avec une Map keyed by id.

### 6. `npm run typecheck` non testé
Les dépendances ne sont pas installées (`node_modules` absent). Le typecheck sera à faire après `npm install`. Les types `@daily-co/daily-react` v0.23 ont pu évoluer depuis la connaissance du modèle (janvier 2026).
**Vérifier en priorité :** Les types de retour de `useVideoTrack`, `useParticipantProperty`, et `DailyVideo`.
