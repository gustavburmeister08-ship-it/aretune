-- Server-side AI usage accounting for cost and abuse controls.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  route text not null check (route in ('directive', 'audit')),
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.ai_usage_events enable row level security;
create policy "Users can read own AI usage"
  on public.ai_usage_events for select using (auth.uid() = user_id);
create index if not exists ai_usage_user_time_idx on public.ai_usage_events(user_id, created_at desc);
