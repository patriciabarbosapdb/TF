-- ==========================================
-- TF / SUPABASE DATABASE
-- ==========================================

create extension if not exists pgcrypto;


-- ==========================================
-- PROFILES
-- ==========================================

create table if not exists public.profiles (
  id uuid primary key
    references auth.users(id)
    on delete cascade,

  username text unique not null
    check (username in ('LadyWhite', 'LadyBlack')),

  created_at timestamptz not null default now()
);


-- ==========================================
-- CHAT
-- ==========================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  body text not null
    check (char_length(body) between 1 and 1000),

  created_at timestamptz not null default now()
);


-- ==========================================
-- REFERENCES
-- ==========================================

create table if not exists public.references (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  image_url text,

  link_url text,

  note text,

  created_at timestamptz not null default now()
);


-- ==========================================
-- PERSONAL NOTES
-- ==========================================

create table if not exists public.notes (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  body text not null default '',

  quick text not null default '',

  updated_at timestamptz not null default now()
);


-- ==========================================
-- BOOKS
-- ==========================================

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  status text not null default 'to_read'
    check (status in ('to_read', 'reading', 'read')),

  created_at timestamptz not null default now()
);


-- ==========================================
-- TASKS
-- ==========================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null,

  done boolean not null default false,

  created_at timestamptz not null default now()
);


-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.references enable row level security;
alter table public.notes enable row level security;
alter table public.books enable row level security;
alter table public.tasks enable row level security;


-- ==========================================
-- PROFILES POLICIES
-- ==========================================

create policy "profiles read authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles insert own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


-- ==========================================
-- CHAT POLICIES
-- ==========================================

create policy "messages read authenticated"
on public.messages
for select
to authenticated
using (true);

create policy "messages insert own"
on public.messages
for insert
to authenticated
with check (user_id = auth.uid());

create policy "messages delete own"
on public.messages
for delete
to authenticated
using (user_id = auth.uid());


-- ==========================================
-- REFERENCES POLICIES
-- ==========================================

create policy "references read authenticated"
on public.references
for select
to authenticated
using (true);

create policy "references insert own"
on public.references
for insert
to authenticated
with check (user_id = auth.uid());

create policy "references delete own"
on public.references
for delete
to authenticated
using (user_id = auth.uid());


-- ==========================================
-- PERSONAL NOTES
-- ==========================================

create policy "notes own all"
on public.notes
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ==========================================
-- PERSONAL BOOKS
-- ==========================================

create policy "books own all"
on public.books
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ==========================================
-- PERSONAL TASKS
-- ==========================================

create policy "tasks own all"
on public.tasks
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());


-- ==========================================
-- REALTIME
-- ==========================================

alter table public.messages
replica identity full;

alter table public.references
replica identity full;

alter table public.notes
replica identity full;

alter table public.books
replica identity full;

alter table public.tasks
replica identity full;


-- ==========================================
-- ADD TABLES TO SUPABASE REALTIME
-- ==========================================

do $$
begin

  alter publication supabase_realtime
  add table public.messages;

exception
  when duplicate_object then null;

end $$;


do $$
begin

  alter publication supabase_realtime
  add table public.references;

exception
  when duplicate_object then null;

end $$;


do $$
begin

  alter publication supabase_realtime
  add table public.notes;

exception
  when duplicate_object then null;

end $$;


do $$
begin

  alter publication supabase_realtime
  add table public.books;

exception
  when duplicate_object then null;

end $$;


do $$
begin

  alter publication supabase_realtime
  add table public.tasks;

exception
  when duplicate_object then null;

end $$;
