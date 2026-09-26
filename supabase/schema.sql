create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 20),
  levels_cleared integer not null check (levels_cleared between 0 and 12),
  created_at timestamptz not null default now()
);

create index if not exists scores_rank_idx on public.scores (levels_cleared desc, created_at asc);
alter table public.scores enable row level security;
