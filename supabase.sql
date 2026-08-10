-- TF / Supabase database
-- Run this whole file in Supabase SQL Editor AFTER creating your project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username in ('LadyWhite','LadyBlack')),
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  image_url text,
  link_url text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.notes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  body text not null default '',
  quick text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  status text not null default 'to_read' check (status in ('to_read','reading','read')),
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.references enable row level security;
alter table public.notes enable row level security;
alter table public.books enable row level security;
alter table public.tasks enable row level security;

-- Profiles: a logged-in user may read the two display names and only edit itself.
create policy "profiles read authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Shared chat
create policy "messages read authenticated" on public.messages for select to authenticated using (true);
create policy "messages insert own" on public.messages for insert to authenticated with check (user_id = auth.uid());
create policy "messages delete own" on public.messages for delete to authenticated using (user_id = auth.uid());

-- Shared references: both can read; each may add/delete their own.
create policy "references read authenticated" on public.references for select to authenticated using (true);
create policy "references insert own" on public.references for insert to authenticated with check (user_id = auth.uid());
create policy "references delete own" on public.references for delete to authenticated using (user_id = auth.uid());

-- Personal data
create policy "notes own all" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "books own all" on public.books for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks own all" on public.tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime
alter table public.messages replica identity full;
alter table public.references replica identity full;
alter table public.notes replica identity full;
alter table public.books replica identity full;
alter table public.tasks replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.references;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.books;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null;
end $$;

-- After creating the two Auth users, insert their profiles:
-- replace the UUIDs with the user IDs shown in Authentication > Users.
-- insert into public.profiles (id, username) values
-- ('UUID-DA-LADYWHITE','LadyWhite'),
-- ('UUID-DA-LADYBLACK','LadyBlack');
