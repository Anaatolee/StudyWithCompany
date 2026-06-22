-- StudyTogether — schéma Supabase
-- À exécuter dans le SQL Editor de votre projet Supabase.

-- ----------------------------------------------------------------------------
-- Profils utilisateurs
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Crée automatiquement un profil quand un user s'inscrit
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Matières (sujets)
-- ----------------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  icon text not null,
  color text not null,
  sort_order int not null default 0
);

alter table public.subjects enable row level security;

create policy "subjects are readable by everyone"
  on public.subjects for select
  using (true);

insert into public.subjects (slug, name, icon, color, sort_order) values
  ('mathematics', 'Mathématiques', 'Sigma', '#6366f1', 1),
  ('physics', 'Physique', 'Atom', '#ef4444', 2),
  ('chemistry', 'Chimie', 'FlaskConical', '#10b981', 3),
  ('biology', 'Biologie', 'Leaf', '#22c55e', 4),
  ('history', 'Histoire', 'Landmark', '#f59e0b', 5),
  ('geography', 'Géographie', 'Globe', '#0ea5e9', 6),
  ('literature', 'Littérature', 'BookOpen', '#a855f7', 7),
  ('languages', 'Langues', 'Languages', '#ec4899', 8),
  ('computer-science', 'Informatique', 'Code', '#3b82f6', 9),
  ('philosophy', 'Philosophie', 'BrainCircuit', '#64748b', 10),
  ('economics', 'Économie', 'TrendingUp', '#14b8a6', 11),
  ('general', 'Étude libre', 'Library', '#737373', 12)
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- Salles d'étude
-- ----------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  description text,
  daily_room_name text unique,
  daily_room_url text,
  max_participants int not null default 20,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists empty_since timestamptz;
alter table public.rooms add column if not exists is_public boolean not null default true;
alter table public.rooms add column if not exists color text not null default '#6366f1';
alter table public.rooms add column if not exists invite_token text;
alter table public.rooms add column if not exists pomodoro_enabled boolean not null default false;
alter table public.rooms add column if not exists pomodoro_mode text not null default '25/5';
alter table public.rooms add column if not exists pomodoro_phase text not null default 'work';
alter table public.rooms add column if not exists pomodoro_running boolean not null default false;
alter table public.rooms add column if not exists pomodoro_started_at timestamptz;
alter table public.rooms add column if not exists pomodoro_phase_duration int;

create unique index if not exists rooms_invite_token_idx
  on public.rooms (invite_token)
  where invite_token is not null;

create index if not exists rooms_subject_idx on public.rooms (subject_id);

alter table public.rooms enable row level security;

create policy "rooms are readable by authenticated users"
  on public.rooms for select
  to authenticated
  using (true);

create policy "authenticated users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Salles par défaut (une par matière)
insert into public.rooms (subject_id, name, description, max_participants)
select s.id,
       'Salle ' || s.name,
       'Salle par défaut pour étudier ' || s.name,
       30
from public.subjects s
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- Messages de chat
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at desc);

alter table public.messages enable row level security;

create policy "messages are readable by authenticated users"
  on public.messages for select
  to authenticated
  using (true);

create policy "users can post their own messages"
  on public.messages for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can delete their own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = user_id);

-- Allow creators to update and delete their rooms (needed for pomodoro control)
create policy "room creator can update their room"
  on public.rooms for update
  to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "room creator can delete their room"
  on public.rooms for delete
  to authenticated
  using (auth.uid() = created_by);

-- Enable Realtime on rooms for shared Pomodoro sync
alter publication supabase_realtime add table public.rooms;

-- Active Realtime sur la table messages
alter publication supabase_realtime add table public.messages;

-- Garde au maximum 100 messages par salle : à chaque insertion, supprime
-- les plus anciens au-delà de cette limite.
create or replace function public.trim_room_messages()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.messages
  where room_id = new.room_id
    and id not in (
      select id from public.messages
      where room_id = new.room_id
      order by created_at desc
      limit 100
    );
  return new;
end;
$$;

drop trigger if exists trim_messages_after_insert on public.messages;
create trigger trim_messages_after_insert
  after insert on public.messages
  for each row execute function public.trim_room_messages();

-- ----------------------------------------------------------------------------
-- Vue enrichie : messages avec auteur
-- ----------------------------------------------------------------------------
-- ----------------------------------------------------------------------------
-- Messages privés (DM entre deux participants d'une même salle)
-- ----------------------------------------------------------------------------
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists direct_messages_room_idx on public.direct_messages (room_id, created_at desc);
create index if not exists direct_messages_to_idx on public.direct_messages (to_id);

alter table public.direct_messages enable row level security;

create policy "direct messages visible to sender and recipient"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "users can send direct messages"
  on public.direct_messages for insert
  to authenticated
  with check (auth.uid() = from_id);

alter publication supabase_realtime add table public.direct_messages;

-- ----------------------------------------------------------------------------
-- Vue enrichie : messages avec auteur
-- ----------------------------------------------------------------------------
create or replace view public.messages_with_author as
  select m.id,
         m.room_id,
         m.user_id,
         m.content,
         m.created_at,
         p.username,
         p.avatar_url
  from public.messages m
  join public.profiles p on p.id = m.user_id;

-- ----------------------------------------------------------------------------
-- Sessions d'étude (statistiques & streaks)
-- Une ligne par passage dans une salle. `ended_at`/`duration_seconds` sont
-- mis à jour par heartbeat tant que l'utilisateur reste dans la salle.
-- ----------------------------------------------------------------------------

-- BLOC 1 — La table qui stocke chaque passage en salle (`if not exists` = ré-exécutable sans risque)
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),                              -- identifiant unique de la session, généré automatiquement
  user_id uuid not null references public.profiles(id) on delete cascade,     -- à qui appartient la session (obligatoire) ; supprimé avec le profil
  room_id uuid references public.rooms(id) on delete set null,                -- dans quelle salle (optionnel) ; passe à null si la salle est supprimée (on garde la stat)
  subject_id uuid references public.subjects(id) on delete set null,          -- quelle matière (pour le donut) ; passe à null si la matière est supprimée
  started_at timestamptz not null default now(),                             -- début de la session, horodaté automatiquement
  ended_at timestamptz,                                                       -- fin (reste vide tant que la session est en cours)
  duration_seconds int not null default 0                                     -- durée en secondes, mise à jour par le heartbeat
);

-- BLOC 2 — Index : accélère la requête de la page stats (sessions d'un user, des plus récentes aux plus anciennes)
create index if not exists study_sessions_user_idx
  on public.study_sessions (user_id, started_at desc);

-- BLOC 3 — Active la sécurité au niveau ligne (sans ça + sans policies, l'accès est bloqué par défaut)
alter table public.study_sessions enable row level security;

-- BLOC 4 — Règles d'accès (auth.uid() = utilisateur connecté)
-- Lecture : on ne peut consulter que ses propres sessions
create policy "users can read their own study sessions"
  on public.study_sessions for select
  to authenticated
  using (auth.uid() = user_id);

-- Création : on ne peut insérer une session qu'en son propre nom (user_id doit être soi-même)
create policy "users can insert their own study sessions"
  on public.study_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Modification : on ne peut mettre à jour que ses propres sessions
create policy "users can update their own study sessions"
  on public.study_sessions for update
  to authenticated
  using (auth.uid() = user_id)
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
    set ended_at = now(),                                                              -- marque la fin à l'instant présent
        duration_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::int)  -- durée en secondes (epoch), arrondie, jamais négative
  where id = p_session_id and user_id = auth.uid();                                    -- uniquement la session visée ET appartenant à l'utilisateur connecté
end;
$$;
