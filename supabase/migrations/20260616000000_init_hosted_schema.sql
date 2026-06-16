-- blastimage — hosted-mode schema (BI-022.3)
--
-- An owner-scoped relational mirror of the lib/types.ts domain model
-- (Session → tasks → iterations → generated_images, plus the session's
-- ref_images library). Every row carries `owner` (defaulting to auth.uid())
-- and is protected by owner-scoped RLS so the hosted instance is a private,
-- single-operator store. Image bytes stay inline for now (data URLs in the
-- url / data_url columns); moving them to storage buckets is BI-022.4.
--
-- Array-order columns: ref_images.position, tasks.position,
-- generated_images.position, iterations.idx preserve the domain model's
-- ordered arrays across the relational round-trip. Child tables denormalize
-- session_id so the adapter can load a whole session with per-table selects
-- and RLS can scope uniformly on owner.

-- ─────────────────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.sessions (
  id             uuid primary key,
  owner          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name           text not null,
  schema_version integer not null default 1,
  created_at     timestamptz not null,
  updated_at     timestamptz not null
);

create table if not exists public.ref_images (
  id          uuid primary key,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  owner       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position    integer not null,
  name        text not null,
  data_url    text not null,
  mime_type   text not null,
  width       integer,
  height      integer,
  added_at    timestamptz not null
);

create table if not exists public.tasks (
  id                   uuid primary key,
  session_id           uuid not null references public.sessions (id) on delete cascade,
  owner                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position             integer not null,
  name                 text not null,
  base_prompt          text not null default '',
  active_ref_image_ids jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null,
  updated_at           timestamptz not null
);

create table if not exists public.iterations (
  id                   uuid primary key,
  task_id              uuid not null references public.tasks (id) on delete cascade,
  session_id           uuid not null references public.sessions (id) on delete cascade,
  owner                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  idx                  integer not null,
  prompt               text not null,
  ref_image_ids        jsonb not null default '[]'::jsonb,
  primary_ref_image_id uuid,
  created_at           timestamptz not null
);

create table if not exists public.generated_images (
  id           uuid primary key,
  iteration_id uuid not null references public.iterations (id) on delete cascade,
  session_id   uuid not null references public.sessions (id) on delete cascade,
  owner        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position     integer not null,
  url          text not null,
  prompt       text not null,
  status       text not null,
  decision     text not null,
  rating       integer not null default 0,
  feedback     jsonb,
  created_at   timestamptz not null
);

-- Per-user app state: the active-session pointer (mirrors localStorage's
-- single active-session key).
create table if not exists public.app_settings (
  owner             uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  active_session_id uuid references public.sessions (id) on delete set null
);

-- ─────────────────────────────────────────────────────────────────────────
-- Indexes (foreign keys the adapter filters on)
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists ref_images_session_id_idx       on public.ref_images (session_id);
create index if not exists tasks_session_id_idx            on public.tasks (session_id);
create index if not exists iterations_session_id_idx       on public.iterations (session_id);
create index if not exists iterations_task_id_idx          on public.iterations (task_id);
create index if not exists generated_images_session_id_idx on public.generated_images (session_id);
create index if not exists generated_images_iteration_idx  on public.generated_images (iteration_id);
create index if not exists sessions_owner_idx              on public.sessions (owner);

-- ─────────────────────────────────────────────────────────────────────────
-- Row-Level Security — owner-scoped on every table
-- ─────────────────────────────────────────────────────────────────────────

alter table public.sessions         enable row level security;
alter table public.ref_images       enable row level security;
alter table public.tasks            enable row level security;
alter table public.iterations       enable row level security;
alter table public.generated_images enable row level security;
alter table public.app_settings     enable row level security;

create policy "owner can do anything to own sessions"
  on public.sessions for all
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy "owner can do anything to own ref_images"
  on public.ref_images for all
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy "owner can do anything to own tasks"
  on public.tasks for all
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy "owner can do anything to own iterations"
  on public.iterations for all
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy "owner can do anything to own generated_images"
  on public.generated_images for all
  using (owner = auth.uid()) with check (owner = auth.uid());

create policy "owner can do anything to own app_settings"
  on public.app_settings for all
  using (owner = auth.uid()) with check (owner = auth.uid());
