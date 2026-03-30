-- =============================================================
-- Noteflow — Supabase Database Schema
-- =============================================================
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- =============================================================

-- 1. Create the meetings table
create table if not exists public.meetings (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text default '',
  notes       text default '',
  transcript  text default '',
  summary     text default '',
  has_summary boolean default false,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.meetings enable row level security;

-- 3. RLS Policies — users can only access their own meetings
create policy "Users can view their own meetings"
  on public.meetings for select
  using (auth.uid() = user_id);

create policy "Users can create their own meetings"
  on public.meetings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meetings"
  on public.meetings for update
  using (auth.uid() = user_id);

create policy "Users can delete their own meetings"
  on public.meetings for delete
  using (auth.uid() = user_id);

-- 4. Index for faster queries
create index if not exists meetings_user_id_idx on public.meetings (user_id);
create index if not exists meetings_created_at_idx on public.meetings (created_at desc);

-- 5. Auto-update the updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.meetings
  for each row
  execute function public.handle_updated_at();
