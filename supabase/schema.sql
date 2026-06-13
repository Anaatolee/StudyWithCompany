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

-- Active Realtime sur la table messages
alter publication supabase_realtime add table public.messages;

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
