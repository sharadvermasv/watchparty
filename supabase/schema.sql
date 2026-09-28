-- Watch Party Supabase Schema
-- Run this in your Supabase SQL Editor to set up tables and Realtime

-- 1. Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  name text not null,
  host_id text not null,
  is_private boolean default true,
  created_at timestamptz default now()
);

-- Index on room_code for fast lookup
create index if not exists idx_rooms_code on public.rooms(room_code);

-- 2. Participants
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id text not null,
  display_name text not null,
  avatar text default '🦊',
  is_speaking boolean default false,
  is_mic_muted boolean default true,
  is_cam_muted boolean default true,
  is_sharing boolean default false,
  joined_at timestamptz default now(),
  last_seen timestamptz default now(),
  constraint unique_room_user unique (room_id, user_id)
);

create index if not exists idx_participants_room on public.participants(room_id);

-- 3. Watch State (Canonical state for synchronization)
create table if not exists public.watch_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  mode text not null default 'idle' check (mode in ('watch', 'screen', 'idle')),
  media_url text,
  media_title text,
  is_playing boolean default false,
  current_time double precision default 0.0,
  updated_at timestamptz default now(),
  updated_by text not null
);

-- 4. Queue (Up Next)
create table if not exists public.queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  media_url text not null,
  title text not null,
  duration text,
  thumbnail text,
  added_by text not null,
  position integer not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_queue_room_pos on public.queue(room_id, position);

-- 5. Chat Messages & Reactions
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms(id) on delete cascade not null,
  participant_name text not null,
  participant_id text not null,
  avatar text default '🦊',
  message text not null,
  is_reaction boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_messages_room on public.messages(room_id, created_at desc);

-- Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.watch_state enable row level security;
alter table public.queue enable row level security;
alter table public.messages enable row level security;

-- Open policies for guest access (secured by knowledge of room_code / room_id)
create policy "Allow public read on rooms" on public.rooms for select using (true);
create policy "Allow public insert on rooms" on public.rooms for insert with check (true);
create policy "Allow public update on rooms" on public.rooms for update using (true);

create policy "Allow public access on participants" on public.participants for all using (true) with check (true);
create policy "Allow public access on watch_state" on public.watch_state for all using (true) with check (true);
create policy "Allow public access on queue" on public.queue for all using (true) with check (true);
create policy "Allow public access on messages" on public.messages for all using (true) with check (true);

-- Enable Supabase Realtime publication
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;
alter publication supabase_realtime add table public.watch_state;
alter publication supabase_realtime add table public.queue;
alter publication supabase_realtime add table public.messages;
