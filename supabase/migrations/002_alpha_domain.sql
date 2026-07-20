-- Canonical six-pillar Alpha domain and atomic daily check-in.

alter table public.directives
  add column if not exists prompt_version text not null default 'directive-v1',
  add column if not exists feedback text
    check (feedback is null or feedback in ('helpful', 'too_easy', 'too_hard', 'not_relevant'));

alter table public.weekly_audits
  add column if not exists formula_version text not null default 'lifestyle-v1';

create unique index if not exists onboarding_answers_user_question_idx
  on public.onboarding_answers (user_id, question_id);

-- Migrate existing seven-pillar Alpha profiles without deleting historical logs.
update public.profiles profile
set active_pillars = (
      select array_agg(value order by first_position)
      from (
        select
          case pillar
            when 'emotion' then 'spirit'
            when 'wealth' then 'vocation'
            when 'adventure' then 'lore'
            else pillar
          end as value,
          min(position) as first_position
        from unnest(profile.active_pillars) with ordinality as source(pillar, position)
        group by 1
      ) deduplicated
    ),
    pillar_scores = jsonb_strip_nulls(
      (profile.pillar_scores - 'emotion' - 'wealth' - 'adventure') ||
      jsonb_build_object(
        'spirit', coalesce(profile.pillar_scores -> 'spirit', profile.pillar_scores -> 'emotion'),
        'vocation', coalesce(profile.pillar_scores -> 'vocation', profile.pillar_scores -> 'wealth'),
        'lore', coalesce(profile.pillar_scores -> 'lore', profile.pillar_scores -> 'adventure')
      )
    )
where profile.active_pillars && array['emotion', 'wealth', 'adventure'];

update public.directives
set pillar = case pillar
  when 'emotion' then 'spirit'
  when 'wealth' then 'vocation'
  when 'adventure' then 'lore'
  else pillar
end
where pillar in ('emotion', 'wealth', 'adventure');

create unique index if not exists directives_one_active_per_day_idx
  on public.directives (user_id, ((generated_at at time zone 'utc')::date))
  where completed_at is null and skipped_at is null;

create table if not exists public.categories (
  id text primary key,
  pillar text not null check (pillar in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore')),
  label text not null,
  position integer not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.metric_definitions (
  id text primary key,
  pillar text not null check (pillar in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore')),
  category_id text references public.categories(id) on delete restrict not null,
  label text not null,
  description text not null default '',
  metric_type text not null check (metric_type in ('score', 'count', 'boolean', 'duration', 'percentage')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'quarterly', 'milestone')),
  unit text,
  target numeric,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.score_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  snapshot_date date not null,
  pillar text not null check (pillar in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore')),
  lifestyle_score numeric not null check (lifestyle_score between 0 and 100),
  consistency_score numeric not null check (consistency_score between 0 and 100),
  progression_score numeric not null check (progression_score between 0 and 100),
  breadth_score numeric not null check (breadth_score between 0 and 100),
  intensity_score numeric not null check (intensity_score between 0 and 100),
  formula_version text not null,
  inputs jsonb not null default '{}',
  calculated_at timestamptz not null default now(),
  unique (user_id, snapshot_date, pillar)
);

alter table public.categories enable row level security;
alter table public.metric_definitions enable row level security;
alter table public.score_snapshots enable row level security;

create policy "Authenticated users can read categories"
  on public.categories for select to authenticated using (true);
create policy "Authenticated users can read metric definitions"
  on public.metric_definitions for select to authenticated using (true);
create policy "Users can manage own score snapshots"
  on public.score_snapshots for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.submit_check_in(
  p_user_id uuid,
  p_mood integer,
  p_energy integer,
  p_note text,
  p_completed_at timestamptz,
  p_entries jsonb
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_check_in_id uuid;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;
  if p_mood not between 0 and 10 or p_energy not between 0 and 10 then
    raise exception 'Mood and energy must be between 0 and 10';
  end if;

  insert into public.check_ins (user_id, mood, energy_level, note, completed_at)
  values (p_user_id, p_mood, p_energy, nullif(trim(p_note), ''), p_completed_at)
  returning id into v_check_in_id;

  insert into public.metric_entries (check_in_id, user_id, metric_id, value, logged_at)
  select v_check_in_id, p_user_id, entry.key, (entry.value #>> '{}')::numeric, p_completed_at
  from jsonb_each(coalesce(p_entries, '{}'::jsonb)) as entry;

  return v_check_in_id;
end;
$$;

grant execute on function public.submit_check_in(uuid, integer, integer, text, timestamptz, jsonb) to authenticated;
