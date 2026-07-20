-- Close a score-tampering gap: pillar_scores and score_snapshots were
-- writable directly by any authenticated user via RLS with no validation,
-- letting a raw REST/PostgREST call set arbitrary scores. All score writes
-- must now go through validated, security-definer functions.

revoke update (pillar_scores) on public.profiles from authenticated, anon;

drop policy if exists "Users can manage own score snapshots" on public.score_snapshots;

create policy "Users can view own score snapshots"
  on public.score_snapshots for select
  using (auth.uid() = user_id);

create or replace function public.set_pillar_scores(
  p_user_id uuid,
  p_pillar_scores jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pillar text;
  v_score numeric;
  v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;
  if jsonb_typeof(p_pillar_scores) <> 'object' then
    raise exception 'pillar_scores must be an object';
  end if;

  for v_pillar, v_score in
    select key, (value #>> '{}')::numeric from jsonb_each(p_pillar_scores)
  loop
    if v_pillar not in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore') then
      raise exception 'Unknown pillar %', v_pillar;
    end if;
    if v_score is null or v_score < 0 or v_score > 100 then
      raise exception 'Pillar score for % must be between 0 and 100', v_pillar;
    end if;
  end loop;

  update public.profiles
  set pillar_scores = coalesce(pillar_scores, '{}'::jsonb) || p_pillar_scores
  where id = p_user_id
  returning pillar_scores into v_result;

  return v_result;
end;
$$;

grant execute on function public.set_pillar_scores(uuid, jsonb) to authenticated;

create or replace function public.persist_score_snapshots(
  p_user_id uuid,
  p_snapshot_date date,
  p_snapshots jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot jsonb;
  v_pillar text;
  v_pillar_scores jsonb := '{}'::jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;
  if jsonb_typeof(p_snapshots) <> 'array' or jsonb_array_length(p_snapshots) = 0 then
    raise exception 'At least one snapshot is required';
  end if;

  for v_snapshot in select * from jsonb_array_elements(p_snapshots)
  loop
    v_pillar := v_snapshot ->> 'pillar';
    if v_pillar not in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore') then
      raise exception 'Unknown pillar %', v_pillar;
    end if;

    insert into public.score_snapshots (
      user_id, snapshot_date, pillar, performance_score, lifestyle_score, pillar_score,
      consistency_score, progression_score, breadth_score, intensity_score,
      formula_version, inputs, calculated_at
    ) values (
      p_user_id,
      p_snapshot_date,
      v_pillar,
      (v_snapshot ->> 'performance_score')::numeric,
      (v_snapshot ->> 'lifestyle_score')::numeric,
      (v_snapshot ->> 'pillar_score')::numeric,
      (v_snapshot ->> 'consistency_score')::numeric,
      (v_snapshot ->> 'progression_score')::numeric,
      (v_snapshot ->> 'breadth_score')::numeric,
      (v_snapshot ->> 'intensity_score')::numeric,
      coalesce(v_snapshot ->> 'formula_version', 'unknown'),
      coalesce(v_snapshot -> 'inputs', '{}'::jsonb),
      now()
    )
    on conflict (user_id, snapshot_date, pillar) do update set
      performance_score = excluded.performance_score,
      lifestyle_score = excluded.lifestyle_score,
      pillar_score = excluded.pillar_score,
      consistency_score = excluded.consistency_score,
      progression_score = excluded.progression_score,
      breadth_score = excluded.breadth_score,
      intensity_score = excluded.intensity_score,
      formula_version = excluded.formula_version,
      inputs = excluded.inputs,
      calculated_at = excluded.calculated_at;

    v_pillar_scores := v_pillar_scores || jsonb_build_object(v_pillar, (v_snapshot ->> 'pillar_score')::numeric);
  end loop;

  return public.set_pillar_scores(p_user_id, v_pillar_scores);
end;
$$;

grant execute on function public.persist_score_snapshots(uuid, date, jsonb) to authenticated;
