-- Privacy-first external tracking integrations and normalized observations.

create extension if not exists pgcrypto;

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_id text not null,
  connection_mode text not null check (connection_mode in ('oauth', 'device', 'file', 'webhook', 'fhir', 'partner')),
  status text not null default 'active' check (status in ('pending', 'active', 'needs_attention', 'disconnected')),
  display_name text not null,
  scopes text[] not null default '{}',
  settings jsonb not null default '{}',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider_id),
  constraint integration_connection_settings_object check (jsonb_typeof(settings) = 'object')
);

create table public.integration_credentials (
  connection_id uuid primary key references public.integration_connections(id) on delete cascade,
  encrypted_access_token text not null,
  encrypted_refresh_token text,
  expires_at timestamptz,
  provider_user_id text,
  updated_at timestamptz not null default now()
);

create table public.integration_oauth_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_id text not null,
  redirect_uri text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('running', 'completed', 'failed')),
  source_name text,
  records_received integer not null default 0 check (records_received >= 0),
  records_imported integer not null default 0 check (records_imported >= 0),
  error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.integration_events (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_event_id text not null,
  event_type text not null,
  value numeric not null,
  unit text,
  occurred_at timestamptz not null,
  payload jsonb not null default '{}',
  imported_at timestamptz not null default now(),
  unique (connection_id, provider_event_id),
  constraint integration_event_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint integration_event_type_check check (event_type in (
    'steps', 'active_energy_kcal', 'workout_minutes', 'workout',
    'sleep_duration_hours', 'sleep_score', 'sleep_latency_minutes', 'hrv_ms',
    'recovery_score', 'resting_heart_rate_bpm', 'weight_kg', 'body_fat_percent',
    'calorie_adherence_percent', 'macro_quality_score', 'meal_quality_score',
    'hydration_liters', 'mood_score', 'stress_score', 'meditation_minutes',
    'focus_minutes', 'therapy_session', 'glucose_mg_dl',
    'blood_pressure_systolic', 'blood_pressure_diastolic', 'spo2_percent'
  ))
);

create index integration_connections_user_idx on public.integration_connections(user_id);
create index integration_events_user_time_idx on public.integration_events(user_id, occurred_at desc);
create index integration_events_connection_time_idx on public.integration_events(connection_id, occurred_at desc);
create index integration_sync_runs_user_time_idx on public.integration_sync_runs(user_id, started_at desc);
create index integration_oauth_states_expiry_idx on public.integration_oauth_states(expires_at);

alter table public.integration_connections enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.integration_oauth_states enable row level security;
alter table public.integration_sync_runs enable row level security;
alter table public.integration_events enable row level security;

create policy "Users manage own integration connections"
  on public.integration_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own integration sync runs"
  on public.integration_sync_runs for select using (auth.uid() = user_id);
create policy "Users read own integration events"
  on public.integration_events for select using (auth.uid() = user_id);
create policy "Users delete own integration events"
  on public.integration_events for delete using (auth.uid() = user_id);

-- Credentials and one-time OAuth state deliberately have no client-access policy.
revoke all on public.integration_credentials from anon, authenticated;
revoke all on public.integration_oauth_states from anon, authenticated;

create or replace function public.ingest_integration_events(
  p_provider_id text,
  p_mode text,
  p_display_name text,
  p_events jsonb,
  p_source_name text default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_connection_id uuid;
  v_run_id uuid;
  v_event jsonb;
  v_event_id uuid;
  v_imported integer := 0;
  v_type text;
  v_value numeric;
  v_category_id text;
  v_metric_id text;
  v_multiplier numeric;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_mode not in ('oauth', 'device', 'file', 'webhook', 'fhir', 'partner') then
    raise exception 'Invalid connection mode';
  end if;
  if jsonb_typeof(p_events) <> 'array' then raise exception 'Events must be an array'; end if;
  if jsonb_array_length(p_events) > 500 then raise exception 'Maximum 500 events per import'; end if;

  insert into public.integration_connections(user_id, provider_id, connection_mode, status, display_name)
  values (v_user_id, left(p_provider_id, 80), p_mode, 'active', left(p_display_name, 120))
  on conflict (user_id, provider_id) do update set
    connection_mode = excluded.connection_mode,
    status = 'active', display_name = excluded.display_name,
    last_error = null, updated_at = now()
  returning id into v_connection_id;

  insert into public.integration_sync_runs(connection_id, user_id, status, source_name, records_received)
  values (v_connection_id, v_user_id, 'running', left(p_source_name, 250), jsonb_array_length(p_events))
  returning id into v_run_id;

  for v_event in select value from jsonb_array_elements(p_events) loop
    v_type := v_event->>'type';
    begin v_value := (v_event->>'value')::numeric; exception when others then continue; end;
    if v_type is null or v_event->>'occurredAt' is null then continue; end if;

    insert into public.integration_events(
      connection_id, user_id, provider_event_id, event_type, value, unit, occurred_at, payload
    ) values (
      v_connection_id, v_user_id,
      left(coalesce(nullif(v_event->>'id', ''), encode(digest(v_event::text, 'sha256'), 'hex')), 200),
      v_type, v_value, left(v_event->>'unit', 40), (v_event->>'occurredAt')::timestamptz,
      coalesce(v_event->'payload', '{}'::jsonb)
    ) on conflict (connection_id, provider_event_id) do nothing returning id into v_event_id;

    if v_event_id is null then continue; end if;
    v_imported := v_imported + 1;
    v_category_id := null; v_metric_id := null; v_multiplier := 1;

    case v_type
      when 'workout' then v_category_id := 'body_fitness_athletics'; v_metric_id := 'body_fitness_athletics_training_days';
      when 'sleep_duration_hours' then v_category_id := 'body_sleep'; v_metric_id := 'body_sleep_sleep_duration';
      when 'sleep_score' then v_category_id := 'body_sleep'; v_metric_id := 'body_sleep_sleep_quality'; v_multiplier := 0.1;
      when 'sleep_latency_minutes' then v_category_id := 'body_sleep'; v_metric_id := 'body_sleep_sleep_latency';
      when 'hrv_ms' then v_category_id := 'body_sleep'; v_metric_id := 'body_sleep_hrv';
      when 'recovery_score' then v_category_id := 'body_sleep'; v_metric_id := 'body_sleep_recovery'; v_multiplier := 0.1;
      when 'calorie_adherence_percent' then v_category_id := 'body_nutrition'; v_metric_id := 'body_nutrition_calorie_target_adherence';
      when 'macro_quality_score' then v_category_id := 'body_nutrition'; v_metric_id := 'body_nutrition_macro_ratio_quality'; v_multiplier := 0.1;
      when 'meal_quality_score' then v_category_id := 'body_nutrition'; v_metric_id := 'body_nutrition_meal_quality'; v_multiplier := 0.1;
      when 'hydration_liters' then v_category_id := 'body_nutrition'; v_metric_id := 'body_nutrition_hydration';
      when 'meditation_minutes' then v_category_id := 'spirit_transcendence_meditation'; v_metric_id := 'spirit_transcendence_meditation_meditation';
      when 'focus_minutes' then v_category_id := 'mind_deep_work_productivity'; v_metric_id := 'mind_deep_work_productivity_focus_time';
      when 'therapy_session' then v_category_id := 'spirit_psychological_development'; v_metric_id := 'spirit_psychological_development_therapy_sessions';
      else null;
    end case;

    if v_category_id is not null then
      insert into public.category_entries(user_id, category_id, values, note, logged_at)
      values (
        v_user_id, v_category_id, jsonb_build_object(v_metric_id, v_value * v_multiplier),
        'Imported from ' || left(p_display_name, 120), (v_event->>'occurredAt')::timestamptz
      );
    end if;
    v_event_id := null;
  end loop;

  update public.integration_sync_runs set status = 'completed', records_imported = v_imported, completed_at = now()
  where id = v_run_id;
  update public.integration_connections set last_synced_at = now(), updated_at = now() where id = v_connection_id;
  return v_imported;
exception when others then
  if v_run_id is not null then
    update public.integration_sync_runs set status = 'failed', error = left(sqlerrm, 500), completed_at = now() where id = v_run_id;
  end if;
  raise;
end;
$$;

revoke all on function public.ingest_integration_events(text, text, text, jsonb, text) from public;

create or replace function public.disconnect_integration(p_provider_id text)
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.integration_connections where user_id = auth.uid() and provider_id = p_provider_id;
end;
$$;

revoke all on function public.disconnect_integration(text) from public;

grant execute on function public.ingest_integration_events(text, text, text, jsonb, text) to authenticated;
grant execute on function public.disconnect_integration(text) to authenticated;

comment on table public.integration_events is 'Private normalized observations imported from user-authorized tracking sources; raw medical data is not automatically scored.';
comment on table public.integration_credentials is 'Server-only encrypted OAuth credentials. Never exposed through client RLS.';
