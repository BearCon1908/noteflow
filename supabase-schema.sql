-- =============================================================
-- Noteflow — Supabase Database Schema
-- =============================================================
-- HOW TO USE:
--   1. Go to your Supabase Dashboard
--   2. Click "SQL Editor" in the left sidebar
--   3. Click "New query"
--   4. Paste this ENTIRE file and click "Run"
--
--   If it fails, try running each numbered section separately.
-- =============================================================


-- STEP 1: Create the meetings table
create table public.meetings (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text default '' not null,
  notes       text default '' not null,
  transcript  text default '' not null,
  summary     text default '' not null,
  has_summary boolean default false not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);


-- STEP 2: Enable Row Level Security
alter table public.meetings enable row level security;


-- STEP 3: Create RLS policies (users can only access their own data)
create policy "select own meetings"
  on public.meetings for select
  using ( auth.uid() = user_id );

create policy "insert own meetings"
  on public.meetings for insert
  with check ( auth.uid() = user_id );

create policy "update own meetings"
  on public.meetings for update
  using ( auth.uid() = user_id );

create policy "delete own meetings"
  on public.meetings for delete
  using ( auth.uid() = user_id );


-- STEP 4: Add index for faster lookups
create index meetings_user_id_idx on public.meetings (user_id);
