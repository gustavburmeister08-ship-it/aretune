-- Versioned legal acceptance and explicit consent for AI processing of potentially sensitive data.

alter table public.profiles
  add column if not exists legal_consent_complete boolean not null default false,
  add column if not exists ai_processing_consent boolean not null default false,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists legal_accepted_at timestamptz;

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  consent_type text not null check (consent_type in ('terms', 'privacy', 'ai_sensitive_data')),
  document_version text not null,
  granted boolean not null,
  occurred_at timestamptz not null default now()
);

alter table public.user_consents enable row level security;
create policy "Users can record own consents"
  on public.user_consents for insert with check (auth.uid() = user_id);
create policy "Users can read own consent history"
  on public.user_consents for select using (auth.uid() = user_id);
create index if not exists user_consents_user_time_idx on public.user_consents(user_id, occurred_at desc);
