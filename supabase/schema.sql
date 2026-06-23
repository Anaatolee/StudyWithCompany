-- ============================================================================
-- StudyTogether — Schéma Supabase complet
-- À exécuter dans le SQL Editor de votre projet Supabase.
-- Toutes les instructions utilisent IF NOT EXISTS / OR REPLACE :
-- elles sont ré-exécutables sans risque sur un projet déjà initialisé.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- PROFILS UTILISATEURS
-- ----------------------------------------------------------------------------

-- Table principale des profils : étend auth.users avec un pseudo et un avatar.
-- La clé primaire est l'UUID Supabase Auth (on delete cascade = profil supprimé si le compte l'est)
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Biographie courte affichée sur le profil (max 280 caractères, façon bio Twitter).
-- Ajoutée après coup → IF NOT EXISTS pour rester ré-exécutable en production
alter table public.profiles add column if not exists bio text;
alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280);

-- Unicité du pseudo INSENSIBLE À LA CASSE : on remplace la contrainte unique par
-- défaut (sensible à la casse → "Jean" et "jean" pourraient coexister) par un
-- index unique sur lower(username). Empêche tout doublon, quelle que soit la casse.
alter table public.profiles drop constraint if exists profiles_username_key;
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- Active la sécurité au niveau ligne ; sans ça les policies ci-dessous n'ont aucun effet
alter table public.profiles enable row level security;

-- Lecture : tout utilisateur connecté peut voir tous les profils (pour afficher les pseudos dans la salle)
create policy "profiles are readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Modification : on ne peut modifier que son propre profil
create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insertion : on ne peut créer un profil qu'avec son propre id (empêche l'usurpation)
create policy "users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Fonction appelée automatiquement à chaque inscription : crée le profil en base.
-- Le pseudo de base = celui choisi à l'inscription (raw_user_meta_data.username),
-- sinon la partie locale de l'email (cas Google OAuth, qui ne fournit pas de pseudo).
-- Si ce pseudo est déjà pris (insensible à la casse), on le suffixe (jean, jean1, jean2…)
-- pour ne JAMAIS faire échouer l'inscription. Le doublon strict reste impossible
-- (index unique sur lower(username)) ; la pré-vérification côté client gère l'UX.
-- security definer = s'exécute avec les droits du créateur de la fonction, pas de l'appelant
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  base_name  text;
  final_name text;
  suffix     int := 0;
begin
  base_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))), '');
  if base_name is null then base_name := 'membre'; end if;

  final_name := base_name;
  while exists (select 1 from public.profiles where lower(username) = lower(final_name)) loop
    suffix := suffix + 1;
    final_name := base_name || suffix;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, final_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Vérifie si un pseudo est disponible (insensible à la casse). Appelée AVANT
-- l'inscription, donc par le rôle anon → security definer pour contourner la RLS
-- (un visiteur non connecté ne peut pas lire la table profiles directement).
create or replace function public.username_is_available(check_username text)
returns boolean language sql security definer set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(username) = lower(trim(check_username))
  );
$$;

grant execute on function public.username_is_available(text) to anon, authenticated;

-- Supprime l'ancien trigger s'il existe, puis le recrée (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

-- Déclenche handle_new_user() après chaque insertion dans auth.users (= chaque inscription)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- MATIÈRES (sujets)
-- ----------------------------------------------------------------------------

-- Table de référence statique : liste des matières disponibles à la création de salle.
-- icon = nom de l'icône Lucide utilisée dans l'UI ; color = couleur hex du tag matière
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  icon       text not null,
  color      text not null,
  sort_order int  not null default 0
);

-- Active la sécurité au niveau ligne
alter table public.subjects enable row level security;

-- Lecture publique : les matières sont visibles même sans être connecté (page de landing)
create policy "subjects are readable by everyone"
  on public.subjects for select
  using (true);

-- Données initiales : insère les 12 matières de base. on conflict = ré-exécutable sans doublon.
-- Ne pas modifier les slugs sans mettre à jour lib/subjects.ts en parallèle
insert into public.subjects (slug, name, icon, color, sort_order) values
  ('mathematics',     'Mathématiques', 'Sigma',        '#6366f1', 1),
  ('physics',         'Physique',      'Atom',          '#ef4444', 2),
  ('chemistry',       'Chimie',        'FlaskConical',  '#10b981', 3),
  ('biology',         'Biologie',      'Leaf',          '#22c55e', 4),
  ('history',         'Histoire',      'Landmark',      '#f59e0b', 5),
  ('geography',       'Géographie',    'Globe',         '#0ea5e9', 6),
  ('literature',      'Littérature',   'BookOpen',      '#a855f7', 7),
  ('languages',       'Langues',       'Languages',     '#ec4899', 8),
  ('computer-science','Informatique',  'Code',          '#3b82f6', 9),
  ('philosophy',      'Philosophie',   'BrainCircuit',  '#64748b', 10),
  ('economics',       'Économie',      'TrendingUp',    '#14b8a6', 11),
  ('general',         'Étude libre',   'Library',       '#737373', 12)
on conflict (slug) do nothing;


-- ----------------------------------------------------------------------------
-- SALLES D'ÉTUDE
-- ----------------------------------------------------------------------------

-- Table centrale : chaque salle appartient à un créateur et est rattachée à une matière.
-- on delete set null sur created_by = la salle survit si son créateur supprime son compte
create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references public.subjects(id) on delete cascade,
  name            text not null,
  description     text,
  daily_room_name text unique,  -- héritage Daily.co (non utilisé depuis migration vers LiveKit)
  daily_room_url  text,         -- héritage Daily.co (non utilisé)
  max_participants int not null default 20,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Colonnes ajoutées progressivement après la création initiale.
-- IF NOT EXISTS = ré-exécutable sans erreur sur un projet déjà en production

-- Horodatage du moment où la salle s'est vidée (utilisé pour le nettoyage automatique éventuel)
alter table public.rooms add column if not exists empty_since        timestamptz;

-- Salle publique (visible dans la liste) ou privée (accès par lien uniquement)
alter table public.rooms add column if not exists is_public          boolean not null default true;

-- Couleur hex choisie à la création, affichée sur la RoomCard
alter table public.rooms add column if not exists color              text    not null default '#6366f1';

-- Token aléatoire généré pour les salles privées ; null = salle publique
alter table public.rooms add column if not exists invite_token       text;

-- Objectif d'étude du jour, affiché dans le header de la salle
alter table public.rooms add column if not exists study_goal         text;

-- Pomodoro collectif : timer synchronisé pour tous les membres
-- Mode actif : '25/5' (25 min travail / 5 min pause), '50/10', ou 'custom' (durées libres)
alter table public.rooms add column if not exists pomodoro_enabled        boolean     not null default false;
alter table public.rooms add column if not exists pomodoro_mode           text        not null default '25/5';

-- Phase courante du cycle : 'work' (travail) ou 'break' (pause)
alter table public.rooms add column if not exists pomodoro_phase          text        not null default 'work';

-- true = le timer tourne ; false = en attente de démarrage (géré par le client du créateur)
alter table public.rooms add column if not exists pomodoro_running        boolean     not null default false;

-- Timestamp de début de la phase courante (source de vérité pour le calcul du temps restant)
alter table public.rooms add column if not exists pomodoro_started_at     timestamptz;

-- Durée totale de la phase courante en secondes (stockée pour éviter de recalculer côté client)
alter table public.rooms add column if not exists pomodoro_phase_duration int;

-- Mode demandé par le créateur, en attente d'être appliqué au début du prochain cycle de travail
alter table public.rooms add column if not exists pomodoro_pending_mode   text;

-- Durées personnalisées en secondes (uniquement pour pomodoro_mode = 'custom')
alter table public.rooms add column if not exists pomodoro_work_duration  int;
alter table public.rooms add column if not exists pomodoro_break_duration int;

-- Index unique sur invite_token (WHERE non null = index partiel, plus léger)
create unique index if not exists rooms_invite_token_idx
  on public.rooms (invite_token) where invite_token is not null;

-- Index sur subject_id pour accélérer le filtre "toutes les salles de cette matière"
create index if not exists rooms_subject_idx on public.rooms (subject_id);

-- Active la sécurité au niveau ligne
alter table public.rooms enable row level security;

-- Lecture : toute personne connectée peut voir toutes les salles (liste communautaire)
create policy "rooms are readable by authenticated users"
  on public.rooms for select
  to authenticated
  using (true);

-- Insertion : on ne peut créer une salle qu'en son propre nom
create policy "authenticated users can create rooms"
  on public.rooms for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Modification : seul le créateur peut modifier sa salle (contrôle du pomodoro, suppression, etc.)
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

-- Branche la table sur le canal Realtime de Supabase (indispensable pour la sync du Pomodoro collectif)
alter publication supabase_realtime add table public.rooms;

-- Salles par défaut : une salle communautaire par matière, créée au premier déploiement.
-- on conflict do nothing = ré-exécutable sans doublon
insert into public.rooms (subject_id, name, description, max_participants)
select s.id,
       'Salle ' || s.name,
       'Salle par défaut pour étudier ' || s.name,
       30
from public.subjects s
on conflict do nothing;


-- ----------------------------------------------------------------------------
-- MESSAGES DE CHAT (messages publics dans une salle)
-- ----------------------------------------------------------------------------

-- Un message appartient à une salle et à un utilisateur.
-- on delete cascade sur les deux FK = le message disparaît si la salle ou l'auteur est supprimé
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id)    on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Index couvrant pour la requête la plus fréquente : "derniers messages de cette salle"
create index if not exists messages_room_created_idx
  on public.messages (room_id, created_at desc);

-- Active la sécurité au niveau ligne
alter table public.messages enable row level security;

-- Lecture : tout membre connecté peut lire tous les messages (chat public de la salle)
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

-- Branche la table sur le canal Realtime pour que les messages arrivent en temps réel
alter publication supabase_realtime add table public.messages;

-- Fonction de nettoyage automatique : conserve au maximum 100 messages par salle.
-- Déclenché après chaque insertion ; supprime les plus anciens au-delà de la limite.
-- security definer = droits suffisants pour le DELETE même avec RLS actif
create or replace function public.trim_room_messages()
returns trigger language plpgsql security definer set search_path = public
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

-- Supprime l'ancien trigger s'il existe, puis le recrée (idempotent)
drop trigger if exists trim_messages_after_insert on public.messages;

-- Déclenche trim_room_messages() après chaque nouveau message
create trigger trim_messages_after_insert
  after insert on public.messages
  for each row execute function public.trim_room_messages();


-- ----------------------------------------------------------------------------
-- VUE : messages enrichis avec l'auteur
-- Permet au composant Chat d'afficher pseudo + avatar sans JOIN côté client.
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
-- MESSAGES PRIVÉS (DM entre deux membres d'une même salle)
-- ----------------------------------------------------------------------------

-- Un DM est scopé à une salle : from_id envoie à to_id dans le contexte de room_id.
-- on delete cascade sur les trois FK = le DM disparaît si salle ou l'un des deux membres est supprimé
create table if not exists public.direct_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms(id)    on delete cascade,
  from_id    uuid not null references public.profiles(id) on delete cascade,
  to_id      uuid not null references public.profiles(id) on delete cascade,
  content    text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- Index sur (room_id, created_at) pour charger la conversation d'une salle triée par date
create index if not exists direct_messages_room_idx on public.direct_messages (room_id, created_at desc);

-- Index sur to_id pour accélérer la détection des messages non lus côté destinataire
create index if not exists direct_messages_to_idx on public.direct_messages (to_id);

-- Active la sécurité au niveau ligne
alter table public.direct_messages enable row level security;

-- Lecture : un DM n'est visible que par l'expéditeur et le destinataire
create policy "direct messages visible to sender and recipient"
  on public.direct_messages for select
  to authenticated
  using (auth.uid() = from_id or auth.uid() = to_id);

-- Insertion : on ne peut envoyer un DM qu'en son propre nom (from_id doit être soi-même)
create policy "users can send direct messages"
  on public.direct_messages for insert
  to authenticated
  with check (auth.uid() = from_id);

-- Branche la table sur le canal Realtime pour que les DMs arrivent en temps réel
alter publication supabase_realtime add table public.direct_messages;


-- ----------------------------------------------------------------------------
-- SESSIONS D'ÉTUDE (statistiques & streaks)
-- Une ligne par passage en salle. ended_at et duration_seconds sont mis à jour
-- toutes les 60 secondes par un heartbeat côté client tant que l'utilisateur
-- est dans la salle. Ces données alimentent la page /stats.
-- ----------------------------------------------------------------------------

-- Chaque session représente un passage dans une salle.
-- room_id et subject_id passent à null si la salle/matière est supprimée (stat conservée quand même)
create table if not exists public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  room_id          uuid references public.rooms(id)    on delete set null,
  subject_id       uuid references public.subjects(id) on delete set null,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,          -- null tant que la session est en cours
  duration_seconds int not null default 0
);

-- Index pour la requête principale de /stats : sessions d'un utilisateur triées par date
create index if not exists study_sessions_user_idx
  on public.study_sessions (user_id, started_at desc);

-- Active la sécurité au niveau ligne
alter table public.study_sessions enable row level security;

-- Lecture : on ne peut consulter que ses propres sessions
create policy "users can read their own study sessions"
  on public.study_sessions for select
  to authenticated
  using (auth.uid() = user_id);

-- Insertion : on ne peut créer une session qu'en son propre nom
create policy "users can insert their own study sessions"
  on public.study_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Modification : on ne peut mettre à jour que ses propres sessions (heartbeat)
create policy "users can update their own study sessions"
  on public.study_sessions for update
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Fonction appelée par le heartbeat (/api/study/session/heartbeat) pour prolonger la session.
-- Met à jour ended_at à l'instant présent et recalcule duration_seconds depuis started_at.
-- security definer = droits suffisants pour l'UPDATE malgré RLS ;
-- le filtre user_id = auth.uid() garantit qu'un utilisateur ne touche que ses propres sessions
create or replace function public.touch_study_session(p_session_id uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.study_sessions
    set ended_at         = now(),
        duration_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::int)
  where id = p_session_id and user_id = auth.uid();
end;
$$;


-- ----------------------------------------------------------------------------
-- STOCKAGE DES PHOTOS DE PROFIL (Supabase Storage)
-- Bucket public "avatars" : chaque utilisateur dépose ses fichiers dans un
-- dossier nommé d'après son UUID (ex. "<uid>/avatar.png"). La lecture est
-- publique (les URLs sont affichées partout) ; l'écriture est restreinte à son
-- propre dossier. Les policies portent sur storage.objects.
-- ----------------------------------------------------------------------------

-- Crée le bucket public s'il n'existe pas encore (idempotent)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Lecture publique : n'importe qui peut afficher une photo de profil
drop policy if exists "avatar images are publicly readable" on storage.objects;
create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload : on ne peut écrire que dans le dossier portant son propre UUID
drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

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
