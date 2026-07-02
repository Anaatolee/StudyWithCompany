-- ============================================================================
-- StudyTogether — Schéma Supabase complet
-- À exécuter dans le SQL Editor de votre projet Supabase.
-- Toutes les instructions utilisent IF NOT EXISTS / OR REPLACE / drop-if-exists :
-- elles sont ré-exécutables sans risque sur un projet déjà initialisé.
--
-- Le fichier est découpé en SECTIONS (1 à 9), elles-mêmes en BLOCS numérotés.
-- Chaque section est autonome : on peut exécuter tout le fichier, ou seulement
-- le bloc voulu en le sélectionnant.
--
-- SOMMAIRE :
--   1. PROFILS UTILISATEURS ........ table profiles, pseudo unique, bio,
--                                     trigger d'inscription, backfill, RPC pseudo
--   2. MATIÈRES .................... table subjects + 12 matières de base
--   3. SALLES D'ÉTUDE ............. table rooms (+ colonnes pomodoro), policies
--   4. MESSAGES DE CHAT ........... table messages + nettoyage auto (max 100)
--   5. VUE messages_with_author .... messages + pseudo/avatar de l'auteur
--   6. MESSAGES PRIVÉS (DM) ........ table direct_messages
--   7. SESSIONS D'ÉTUDE ........... table study_sessions (stats /stats)
--   8. STOCKAGE PHOTOS DE PROFIL ... bucket Storage "avatars" + policies
--   9. AMIS ....................... table friendships (demandes + relations)
-- ============================================================================


-- ============================================================================
-- 1. PROFILS UTILISATEURS
-- ============================================================================

-- BLOC 1 — Table principale des profils : étend auth.users avec un pseudo + un avatar.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade, -- = l'UUID Supabase Auth ; on delete cascade = profil supprimé avec le compte
  username   text unique not null,                                         -- pseudo affiché partout (unicité renforcée plus bas, insensible à la casse)
  avatar_url text,                                                         -- URL publique de la photo de profil (bucket Storage "avatars"), null = initiales
  created_at timestamptz not null default now()                            -- date de création du profil
);

-- BLOC 2 — Biographie courte affichée sur le profil (max 280 caractères, façon bio Twitter).
-- IF NOT EXISTS + drop/add constraint = ré-exécutable sans erreur en production.
alter table public.profiles add column if not exists bio text;                                                          -- texte libre, null = pas de bio
alter table public.profiles drop constraint if exists profiles_bio_length;                                             -- retire l'ancienne contrainte si présente
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280);         -- borne la longueur à 280

-- BLOC 3 — Unicité du pseudo INSENSIBLE À LA CASSE.
-- On remplace la contrainte unique par défaut (sensible à la casse → "Jean" et
-- "jean" pourraient coexister) par un index unique sur lower(username).
alter table public.profiles drop constraint if exists profiles_username_key;   -- supprime l'unicité sensible à la casse
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));                                        -- unicité sur la version minuscule → aucun doublon, quelle que soit la casse

-- BLOC 4 — Active la sécurité au niveau ligne (sans ça, les policies n'ont aucun effet).
alter table public.profiles enable row level security;

-- BLOC 5 — Policies d'accès aux profils.
-- drop+create = idempotent ET corrige une éventuelle policy plus restrictive
-- héritée d'une version antérieure de la base.

-- Lecture : tout utilisateur connecté voit tous les profils (pseudos en salle, recherche d'amis, avatars/bio)
drop policy if exists "profiles are readable by authenticated users" on public.profiles;
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);                                  -- aucune restriction de lecture pour un utilisateur connecté

-- Modification : on ne peut modifier que son propre profil
drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)                        -- la ligne ciblée doit être la mienne
  with check (auth.uid() = id);                  -- et le résultat doit le rester (pas d'usurpation d'id)

-- Insertion : on ne peut créer un profil qu'avec son propre id (empêche l'usurpation)
drop policy if exists "users can insert their own profile" on public.profiles;
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- BLOC 6 — Fonction appelée automatiquement à chaque inscription : crée le profil en base.
-- Pseudo de base = celui choisi à l'inscription (raw_user_meta_data.username), sinon
-- la partie locale de l'email (cas Google OAuth, qui ne fournit pas de pseudo). S'il
-- est déjà pris (insensible à la casse), on le suffixe (jean, jean1, jean2…) pour ne
-- JAMAIS faire échouer l'inscription. Le doublon strict reste impossible (index unique).
-- security definer = s'exécute avec les droits du créateur de la fonction, pas de l'appelant.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_name  text;        -- pseudo souhaité (avant suffixe)
  final_name text;        -- pseudo réellement attribué (après suffixe éventuel)
  suffix     int := 0;    -- compteur de suffixe en cas de collision
begin
  base_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))), ''); -- pseudo choisi, sinon partie locale de l'email
  if base_name is null then base_name := 'membre'; end if;                                                       -- garde-fou si tout est vide

  final_name := base_name;
  while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop                    -- tant que le pseudo est pris (insensible à la casse)…
    suffix := suffix + 1;
    final_name := base_name || suffix;                                                                          -- …on essaie jean1, jean2, etc.
  end loop;

  insert into public.profiles (id, username)
  values (new.id, final_name)
  on conflict (id) do nothing;                                                                                  -- si le profil existe déjà, on ne touche à rien
  return new;
end;
$$;

-- BLOC 7 — Vérifie si un pseudo est disponible (insensible à la casse).
-- Appelée AVANT l'inscription, donc par le rôle anon → security definer pour
-- contourner la RLS (un visiteur non connecté ne peut pas lire profiles directement).
create or replace function public.username_is_available(check_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(check_username))   -- comparaison insensible à la casse et aux espaces
  );
$$;

-- Autorise anon (page d'inscription) et authenticated à appeler la fonction
grant execute on function public.username_is_available(text) to anon, authenticated;

-- BLOC 8 — Trigger d'inscription : déclenche handle_new_user() après chaque création de compte.
drop trigger if exists on_auth_user_created on auth.users;   -- supprime l'ancien trigger (idempotent)
create trigger on_auth_user_created
  after insert on auth.users                                 -- = à chaque nouvelle inscription
  for each row execute function public.handle_new_user();

-- BLOC 9 — BACKFILL des profils manquants : crée un profil pour tout compte auth.users
-- qui n'en a pas (inscrits avant l'existence du trigger, ou création échouée).
-- Idempotent : ne touche que les comptes sans profil. Même logique de pseudo (suffixe si pris).
do $$
declare
  u          record;
  base_name  text;
  final_name text;
  suffix     int;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null                                                                                      -- uniquement les comptes SANS profil
  loop
    base_name := nullif(trim(coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1))), ''); -- même dérivation que le trigger
    if base_name is null then base_name := 'membre'; end if;
    final_name := base_name;
    suffix := 0;
    while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop              -- suffixe en cas de collision
      suffix := suffix + 1;
      final_name := base_name || suffix;
    end loop;
    insert into public.profiles (id, username)
    values (u.id, final_name)
    on conflict (id) do nothing;
  end loop;
end $$;


-- ============================================================================
-- 2. MATIÈRES (sujets)
-- ============================================================================

-- BLOC 1 — Table de référence statique : matières disponibles à la création de salle.
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(), -- identifiant de la matière
  slug       text unique not null,                       -- clé stable utilisée dans le code (lib/subjects.ts)
  name       text not null,                              -- libellé affiché (ex. "Mathématiques")
  icon       text not null,                              -- nom de l'icône Lucide utilisée dans l'UI
  color      text not null,                              -- couleur hex du tag matière
  sort_order int  not null default 0                     -- ordre d'affichage dans les listes
);

-- BLOC 2 — Active la sécurité au niveau ligne.
alter table public.subjects enable row level security;

-- BLOC 3 — Lecture publique : les matières sont visibles même sans être connecté (landing).
create policy "subjects are readable by everyone"
  on public.subjects for select
  using (true);

-- BLOC 4 — Données initiales : les 12 matières de base.
-- on conflict (slug) do nothing = ré-exécutable sans doublon.
-- Ne pas modifier les slugs sans mettre à jour lib/subjects.ts en parallèle.
insert into public.subjects (slug, name, icon, color, sort_order) values
  ('general',         'Étude libre',   'Library',       '#737373', 1),
  ('mathematics',     'Mathématiques', 'Sigma',        '#6366f1', 2),
  ('physics',         'Physique',      'Atom',          '#ef4444', 3),
  ('chemistry',       'Chimie',        'FlaskConical',  '#10b981', 4),
  ('biology',         'Biologie',      'Leaf',          '#22c55e', 5),
  ('history',         'Histoire',      'Landmark',      '#f59e0b', 6),
  ('geography',       'Géographie',    'Globe',         '#0ea5e9', 7),
  ('literature',      'Littérature',   'BookOpen',      '#a855f7', 8),
  ('languages',       'Langues',       'Languages',     '#ec4899', 9),
  ('computer-science','Informatique',  'Code',          '#3b82f6', 10),
  ('philosophy',      'Philosophie',   'BrainCircuit',  '#64748b', 11),
  ('economics',       'Économie',      'TrendingUp',    '#14b8a6', 12)
on conflict (slug) do nothing;


-- ============================================================================
-- 3. SALLES D'ÉTUDE
-- ============================================================================

-- BLOC 1 — Table centrale : chaque salle appartient à un créateur et à une matière.
create table if not exists public.rooms (
  id               uuid primary key default gen_random_uuid(),                  -- identifiant de la salle
  subject_id       uuid not null references public.subjects(id) on delete cascade, -- matière rattachée ; supprimée avec la matière
  name             text not null,                                               -- nom de la salle
  description      text,                                                        -- description optionnelle
  daily_room_name  text unique,                                                 -- héritage Daily.co (non utilisé depuis migration LiveKit)
  daily_room_url   text,                                                        -- héritage Daily.co (non utilisé)
  max_participants int  not null default 20,                                    -- capacité maximale
  created_by       uuid references public.profiles(id) on delete cascade,        -- créateur ; null = salle par défaut (seedée). Salle communautaire supprimée si le créateur supprime son compte
  created_at       timestamptz not null default now()                           -- date de création
);

-- BLOC 2 — Colonnes ajoutées progressivement après la création initiale.
-- IF NOT EXISTS = ré-exécutable sans erreur sur un projet déjà en production.
alter table public.rooms add column if not exists empty_since             timestamptz;                       -- moment où la salle s'est vidée (nettoyage auto éventuel)
alter table public.rooms add column if not exists is_public              boolean not null default true;     -- publique (listée) ou privée (accès par lien)
alter table public.rooms add column if not exists color                  text    not null default '#6366f1'; -- couleur hex affichée sur la RoomCard
alter table public.rooms add column if not exists invite_token           text;                              -- token aléatoire des salles privées ; null = publique
alter table public.rooms add column if not exists study_goal             text;                              -- objectif d'étude du jour, affiché dans le header
alter table public.rooms add column if not exists pomodoro_enabled       boolean not null default false;    -- pomodoro collectif activé ?
alter table public.rooms add column if not exists pomodoro_mode          text    not null default '25/5';   -- '25/5', '50/10' ou 'custom'
alter table public.rooms add column if not exists pomodoro_phase         text    not null default 'work';   -- phase courante : 'work' (travail) ou 'break' (pause)
alter table public.rooms add column if not exists pomodoro_running       boolean not null default false;    -- true = timer en cours ; false = en attente de démarrage
alter table public.rooms add column if not exists pomodoro_started_at    timestamptz;                       -- début de la phase courante (source de vérité du temps restant)
alter table public.rooms add column if not exists pomodoro_phase_duration int;                              -- durée totale de la phase courante en secondes
alter table public.rooms add column if not exists pomodoro_pending_mode  text;                              -- mode demandé, appliqué au prochain cycle de travail
alter table public.rooms add column if not exists pomodoro_work_duration  int;                              -- durée de travail perso en secondes (mode 'custom')
alter table public.rooms add column if not exists pomodoro_break_duration int;                              -- durée de pause perso en secondes (mode 'custom')

-- BLOC 3 — Index.
create unique index if not exists rooms_invite_token_idx
  on public.rooms (invite_token) where invite_token is not null;   -- index partiel (plus léger) : unicité du token quand il existe
create index if not exists rooms_subject_idx on public.rooms (subject_id); -- accélère le filtre "toutes les salles de cette matière"

-- BLOC 4 — Active la sécurité au niveau ligne.
alter table public.rooms enable row level security;

-- BLOC 5 — Policies d'accès aux salles.

-- Lecture : toute personne connectée voit toutes les salles (liste communautaire)
create policy "rooms are readable by authenticated users"
  on public.rooms for select
  to authenticated
  using (true);

-- Insertion : on ne peut créer une salle qu'en son propre nom
create policy "authenticated users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Modification : seul le créateur peut modifier sa salle (contrôle du pomodoro, etc.)
create policy "room creator can update their room"
  on public.rooms for update
  to authenticated
  using  (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Suppression : seul le créateur peut supprimer sa salle
create policy "room creator can delete their room"
  on public.rooms for delete
  to authenticated
  using (auth.uid() = created_by);

-- BLOC 6 — Branche la table sur le canal Realtime (indispensable pour la sync du Pomodoro collectif).
alter publication supabase_realtime add table public.rooms;

-- BLOC 7 — Salles par défaut : une salle communautaire par matière, créée au premier déploiement.
-- on conflict do nothing = ré-exécutable sans doublon.
insert into public.rooms (subject_id, name, description, max_participants)
select s.id,                                            -- la matière
       'Salle ' || s.name,                              -- nom généré, ex. "Salle Mathématiques"
       'Salle générale pour étudier ' || s.name,         -- description générée
       30                                               -- capacité par défaut
from public.subjects s
on conflict do nothing;


-- ============================================================================
-- 4. MESSAGES DE CHAT (messages publics dans une salle)
-- ============================================================================

-- BLOC 1 — Table des messages : un message appartient à une salle et à un utilisateur.
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),                       -- identifiant du message
  room_id    uuid not null references public.rooms(id)    on delete cascade,   -- salle ; le message disparaît avec la salle
  user_id    uuid not null references public.profiles(id) on delete cascade,   -- auteur ; le message disparaît avec l'auteur
  content    text not null check (char_length(content) between 1 and 2000),    -- contenu (1 à 2000 caractères)
  created_at timestamptz not null default now()                               -- horodatage
);

-- BLOC 2 — Index couvrant pour la requête la plus fréquente : "derniers messages de cette salle".
create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at desc);

-- BLOC 3 — Active la sécurité au niveau ligne.
alter table public.messages enable row level security;

-- BLOC 4 — Policies d'accès au chat.

-- Lecture : tout membre connecté peut lire tous les messages (chat public)
create policy "messages are readable by authenticated users"
  on public.messages for select
  to authenticated
  using (true);

-- Insertion : on ne peut poster un message qu'en son propre nom
create policy "users can post their own messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Suppression : on ne peut supprimer que ses propres messages
create policy "users can delete their own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = user_id);

-- BLOC 5 — Branche la table sur Realtime (messages en temps réel).
alter publication supabase_realtime add table public.messages;

-- BLOC 6 — Nettoyage automatique : conserve au maximum 100 messages par salle.
-- Déclenché après chaque insertion ; supprime les plus anciens au-delà de la limite.
-- security definer = droits suffisants pour le DELETE même avec RLS actif.
create or replace function public.trim_room_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages
  where room_id = new.room_id                       -- dans la salle concernée
    and id not in (
      select id from public.messages
      where room_id = new.room_id
      order by created_at desc
      limit 100                                     -- on garde les 100 plus récents…
    );                                              -- …et on supprime tout le reste
  return new;
end;
$$;

-- BLOC 7 — Trigger de nettoyage : déclenche trim_room_messages() après chaque nouveau message.
drop trigger if exists trim_messages_after_insert on public.messages;   -- supprime l'ancien trigger (idempotent)
create trigger trim_messages_after_insert
  after insert on public.messages
  for each row execute function public.trim_room_messages();


-- ============================================================================
-- 5. VUE : messages enrichis avec l'auteur
-- Permet au composant Chat d'afficher pseudo + avatar sans JOIN côté client.
-- ============================================================================

-- BLOC 1 — Vue jointant chaque message à son auteur (pseudo + avatar).
create or replace view public.messages_with_author as
  select m.id,
         m.room_id,
         m.user_id,
         m.content,
         m.created_at,
         p.username,        -- pseudo de l'auteur
         p.avatar_url       -- photo de l'auteur
  from public.messages m
  join public.profiles p on p.id = m.user_id;


-- ============================================================================
-- 6. MESSAGES PRIVÉS (DM entre deux membres d'une même salle)
-- ============================================================================

-- BLOC 1 — Table des DM : from_id envoie à to_id dans le contexte de room_id.
create table if not exists public.direct_messages (
  id         uuid primary key default gen_random_uuid(),                     -- identifiant du DM
  room_id    uuid references public.rooms(id)    on delete set null, -- salle d'origine (facultative) ; le DM SURVIT à la suppression de la salle
  from_id    uuid not null references public.profiles(id) on delete cascade, -- expéditeur
  to_id      uuid not null references public.profiles(id) on delete cascade, -- destinataire
  content    text not null check (char_length(content) between 1 and 2000),  -- contenu (1 à 2000 caractères)
  created_at timestamptz not null default now()                             -- horodatage
);

-- BLOC 2 — Index.
create index if not exists direct_messages_room_idx on public.direct_messages (room_id, created_at desc); -- charge une conversation triée par date
create index if not exists direct_messages_to_idx   on public.direct_messages (to_id);                    -- détecte vite les non-lus côté destinataire

-- BLOC 3 — Active la sécurité au niveau ligne.
alter table public.direct_messages enable row level security;

-- BLOC 4 — Policies d'accès aux DM.

-- Lecture : un DM n'est visible que par l'expéditeur et le destinataire
create policy "direct messages visible to sender and recipient"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

-- Insertion : on ne peut envoyer un DM qu'en son propre nom (from_id = soi-même)
create policy "users can send direct messages"
  on public.direct_messages for insert
  to authenticated
  with check (auth.uid() = from_id);

-- BLOC 5 — Branche la table sur Realtime (DM en temps réel).
alter publication supabase_realtime add table public.direct_messages;


-- ============================================================================
-- 7. SESSIONS D'ÉTUDE (statistiques & streaks)
-- Une ligne par passage en salle. ended_at et duration_seconds sont mis à jour
-- toutes les 60 secondes par un heartbeat côté client tant que l'utilisateur
-- est dans la salle. Ces données alimentent la page /stats.
-- ============================================================================

-- BLOC 1 — Table des sessions : chaque session = un passage dans une salle.
create table if not exists public.study_sessions (
  id               uuid primary key default gen_random_uuid(),                  -- identifiant de la session
  user_id          uuid not null references public.profiles(id) on delete cascade,  -- à qui appartient la session ; supprimée avec le profil
  room_id          uuid references public.rooms(id)    on delete set null,      -- salle (optionnel) ; passe à null si la salle est supprimée (stat conservée)
  subject_id       uuid references public.subjects(id) on delete set null,      -- matière (pour le donut) ; passe à null si la matière est supprimée
  started_at       timestamptz not null default now(),                          -- début de la session
  ended_at         timestamptz,                                                 -- fin ; null tant que la session est en cours
  duration_seconds int not null default 0                                       -- durée en secondes, mise à jour par le heartbeat
);

-- BLOC 2 — Index pour la requête principale de /stats (sessions d'un user, plus récentes d'abord).
create index if not exists study_sessions_user_idx
  on public.study_sessions (user_id, started_at desc);

-- BLOC 3 — Active la sécurité au niveau ligne.
alter table public.study_sessions enable row level security;

-- BLOC 4 — Policies d'accès aux sessions (auth.uid() = utilisateur connecté).

-- Lecture : on ne consulte que ses propres sessions
create policy "users can read their own study sessions"
  on public.study_sessions for select
  to authenticated
  using (auth.uid() = user_id);

-- Insertion : on ne crée une session qu'en son propre nom
create policy "users can insert their own study sessions"
  on public.study_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Modification : on ne met à jour que ses propres sessions (heartbeat)
create policy "users can update their own study sessions"
  on public.study_sessions for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- BLOC 5 — Fonction appelée par le heartbeat pour rafraîchir une session.
-- security definer = droits élevés (pour écrire proprement) ; search_path figé = sécurité ;
-- le filtre auth.uid() garantit qu'un user ne peut toucher que SES sessions.
create or replace function public.touch_study_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.study_sessions
    set ended_at         = now(),                                                                    -- marque la fin à l'instant présent
        duration_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::int)         -- durée en secondes, arrondie, jamais négative
  where id = p_session_id and user_id = auth.uid();                                                  -- uniquement la session visée ET appartenant à l'utilisateur connecté
end;
$$;


-- ============================================================================
-- 8. STOCKAGE DES PHOTOS DE PROFIL (Supabase Storage)
-- Bucket public "avatars" : chaque utilisateur dépose ses fichiers dans un
-- dossier nommé d'après son UUID (ex. "<uid>/avatar.png"). La lecture est
-- publique (les URLs sont affichées partout) ; l'écriture est restreinte à son
-- propre dossier. Les policies portent sur storage.objects.
-- ============================================================================

-- BLOC 1 — Crée le bucket public s'il n'existe pas encore (idempotent).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)              -- public = true → les URLs sont accessibles sans authentification
on conflict (id) do nothing;

-- BLOC 2 — Policies du bucket (sur storage.objects). drop+create = idempotent.

-- Lecture publique : n'importe qui peut afficher une photo de profil
drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');                 -- restreint au bucket avatars

-- Upload : on ne peut écrire que dans le dossier portant son propre UUID
drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text); -- 1er segment du chemin = mon UUID

-- Remplacement : idem, restreint à son propre dossier
drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Suppression : idem
drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================================
-- 9. AMIS (demandes d'amitié + relations acceptées)
-- Une ligne = une relation entre deux utilisateurs. requester_id envoie la
-- demande à addressee_id. status : 'pending' (en attente) ou 'accepted' (amis).
-- Refus / annulation / suppression d'ami = suppression de la ligne.
-- ============================================================================

-- BLOC 1 — Table des relations d'amitié.
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),                       -- identifiant de la relation
  requester_id uuid not null references public.profiles(id) on delete cascade,   -- celui qui envoie la demande
  addressee_id uuid not null references public.profiles(id) on delete cascade,   -- celui qui la reçoit
  status       text not null default 'pending' check (status in ('pending', 'accepted')), -- 'pending' (en attente) ou 'accepted' (amis)
  created_at   timestamptz not null default now(),                               -- date de la demande
  updated_at   timestamptz not null default now(),                               -- date de dernière mise à jour (acceptation)
  constraint friendships_no_self check (requester_id <> addressee_id)            -- on ne peut pas être ami avec soi-même
);

-- BLOC 2 — Unicité par PAIRE d'utilisateurs, quel que soit le sens de la demande.
-- least/greatest normalisent la paire → empêche A→B et B→A de coexister.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- BLOC 3 — Index pour retrouver vite les relations d'un utilisateur (dans les deux sens).
create index if not exists friendships_requester_idx on public.friendships (requester_id);
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

-- BLOC 4 — Active la sécurité au niveau ligne.
alter table public.friendships enable row level security;

-- BLOC 5 — Policies d'accès aux amitiés. drop+create = idempotent.

-- Lecture : on ne voit que les relations qui nous concernent
drop policy if exists "friendships visible to involved users" on public.friendships;
create policy "friendships visible to involved users"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Création : on n'envoie une demande qu'en son propre nom, en statut 'pending'
drop policy if exists "users can send friend requests" on public.friendships;
create policy "users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

-- Acceptation : seul le destinataire peut passer la demande à 'accepted'
drop policy if exists "addressee can accept friend requests" on public.friendships;
create policy "addressee can accept friend requests"
  on public.friendships for update
  to authenticated
  using (auth.uid() = addressee_id)                              -- seul le destinataire agit
  with check (auth.uid() = addressee_id and status = 'accepted'); -- et seulement pour accepter

-- Suppression : refuser, annuler une demande ou retirer un ami (les deux côtés)
drop policy if exists "involved users can delete friendship" on public.friendships;
create policy "involved users can delete friendship"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- BLOC 6 — Branche la table sur Realtime (listes d'amis / demandes en direct).
-- DO block = idempotent (alter publication ... add table échoue si déjà membre).
do $$
begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;   -- déjà dans la publication → on ignore
end $$;
