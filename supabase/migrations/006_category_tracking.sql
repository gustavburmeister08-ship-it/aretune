-- Detailed per-category tracking for all 46 enumerated categories.
-- Values are stored as a versionable JSON object so each category can carry
-- the exact set of measures described by the product specification without
-- turning the fast daily check-in into a large form.

create table if not exists public.category_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  category_id text references public.categories(id) on delete restrict not null,
  values jsonb not null default '{}',
  note text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint category_entries_values_object check (jsonb_typeof(values) = 'object'),
  constraint category_entries_has_values_or_note check (
    values <> '{}'::jsonb or nullif(trim(note), '') is not null
  )
);

alter table public.category_entries enable row level security;

create policy "Users can manage own category entries"
  on public.category_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index category_entries_user_time_idx
  on public.category_entries (user_id, logged_at desc);
create index category_entries_user_category_time_idx
  on public.category_entries (user_id, category_id, logged_at desc);

alter table public.score_snapshots
  add column if not exists performance_score numeric not null default 0
    check (performance_score between 0 and 100),
  add column if not exists pillar_score numeric not null default 0
    check (pillar_score between 0 and 100);

-- Preserve the meaning of existing snapshots. New snapshots are calculated
-- with the documented 40% performance / 60% lifestyle formula.
update public.score_snapshots
set performance_score = lifestyle_score,
    pillar_score = lifestyle_score
where pillar_score = 0 and lifestyle_score > 0;

comment on table public.category_entries is
  'Detailed category tracking. Sensitive relationship, health and finance values remain private through user-scoped RLS.';
comment on column public.category_entries.values is
  'Numeric values keyed by the versioned metric ids in lib/category-catalog.ts.';
