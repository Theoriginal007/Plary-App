-- ═══ Plary v2 — Database Schema ═══════════════════════════════════════
-- Run this in Supabase Dashboard → SQL Editor → New query → paste → Run
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Profiles (extends Supabase auth.users) ──────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  county text,
  created_at timestamptz default now()
);

-- ─── Season Setups ───────────────────────────────────────────────────
create table if not exists public.season_setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  crop text,
  farm_size text,
  unit text default 'Acres',
  water_source text,
  challenge text,
  show_focus boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Checklist (one row per season setup) ────────────────────────────
create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mulch boolean default false,
  water boolean default false,
  pest boolean default false,
  input_plan boolean default false,
  updated_at timestamptz default now()
);

-- ─── Records (inputs and sales) ──────────────────────────────────────
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('input', 'sale')),
  label text not null,
  amount numeric default 0,
  date date not null default current_date,
  notes text,
  quantity text,
  buyer text,
  created_at timestamptz default now()
);

-- ─── Actions (weekly tasks derived from focus list) ──────────────────
create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_index integer not null,
  done boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, action_index)
);

-- ─── Reminders setting ───────────────────────────────────────────────
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  enabled boolean default true,
  updated_at timestamptz default now()
);

-- ═══ Row Level Security ═══════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.season_setups enable row level security;
alter table public.checklists enable row level security;
alter table public.records enable row level security;
alter table public.actions enable row level security;
alter table public.reminders enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Season setups: users manage their own
create policy "Users read own setups" on public.season_setups for select using (auth.uid() = user_id);
create policy "Users insert own setups" on public.season_setups for insert with check (auth.uid() = user_id);
create policy "Users update own setups" on public.season_setups for update using (auth.uid() = user_id);
create policy "Users delete own setups" on public.season_setups for delete using (auth.uid() = user_id);

-- Checklists: users manage their own
create policy "Users read own checklist" on public.checklists for select using (auth.uid() = user_id);
create policy "Users insert own checklist" on public.checklists for insert with check (auth.uid() = user_id);
create policy "Users update own checklist" on public.checklists for update using (auth.uid() = user_id);
create policy "Users delete own checklist" on public.checklists for delete using (auth.uid() = user_id);

-- Records: users manage their own
create policy "Users read own records" on public.records for select using (auth.uid() = user_id);
create policy "Users insert own records" on public.records for insert with check (auth.uid() = user_id);
create policy "Users delete own records" on public.records for delete using (auth.uid() = user_id);

-- Actions: users manage their own
create policy "Users read own actions" on public.actions for select using (auth.uid() = user_id);
create policy "Users insert own actions" on public.actions for insert with check (auth.uid() = user_id);
create policy "Users update own actions" on public.actions for update using (auth.uid() = user_id);

-- Reminders: users manage their own
create policy "Users read own reminders" on public.reminders for select using (auth.uid() = user_id);
create policy "Users insert own reminders" on public.reminders for insert with check (auth.uid() = user_id);
create policy "Users update own reminders" on public.reminders for update using (auth.uid() = user_id);

-- ═══ Auto-create profile on signup ════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══ Updated_at trigger ═══════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_setups
  before update on public.season_setups
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_checklists
  before update on public.checklists
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_actions
  before update on public.actions
  for each row execute procedure public.set_updated_at();

create trigger set_updated_at_reminders
  before update on public.reminders
  for each row execute procedure public.set_updated_at();
