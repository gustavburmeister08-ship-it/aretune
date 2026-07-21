-- Community signature hexagons: expose the full six-pillar sextet (aggregate
-- pillar totals only) alongside the leaderboard and for batches of feed
-- authors, so lists can render each person's identity hexagon next to their
-- @handle. This stays within the same privacy boundary as
-- get_public_social_profile (012) and get_pillar_leaderboard (019): only
-- discoverable profiles, only the six 0-100 pillar totals, never private
-- category- or metric-level data.

-- 1. Leaderboard now also returns the full sextet. Adding a column to the
--    RETURNS TABLE requires dropping the old function first.
drop function if exists public.get_pillar_leaderboard(text, integer);

create function public.get_pillar_leaderboard(p_pillar text, p_limit integer default 50)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  pillar_score numeric,
  pillar_scores jsonb,
  rank bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  if p_pillar not in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore') then
    raise exception 'Invalid pillar';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 then p_limit := 50; end if;

  return query
  select
    social.user_id,
    social.username,
    social.display_name,
    social.avatar_path,
    (profile.pillar_scores ->> p_pillar)::numeric as pillar_score,
    jsonb_build_object(
      'body', profile.pillar_scores -> 'body',
      'mind', profile.pillar_scores -> 'mind',
      'spirit', profile.pillar_scores -> 'spirit',
      'relationships', profile.pillar_scores -> 'relationships',
      'vocation', profile.pillar_scores -> 'vocation',
      'lore', profile.pillar_scores -> 'lore'
    ) as pillar_scores,
    row_number() over (order by (profile.pillar_scores ->> p_pillar)::numeric desc) as rank
  from public.social_profiles social
  join public.profiles profile on profile.id = social.user_id
  where social.is_discoverable = true
    and profile.pillar_scores ? p_pillar
    and (profile.pillar_scores ->> p_pillar) is not null
  order by pillar_score desc
  limit p_limit;
end;
$$;

revoke all on function public.get_pillar_leaderboard(text, integer) from public;
grant execute on function public.get_pillar_leaderboard(text, integer) to authenticated;

-- 2. Batch sextet lookup for feed authors: given a set of user ids, return the
--    public sextet for the discoverable ones (or the caller themselves). Users
--    whose profile is not discoverable simply do not appear in the result.
create or replace function public.get_public_sextets(p_user_ids uuid[])
returns table (
  user_id uuid,
  pillar_scores jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not authorized'; end if;

  return query
  select
    social.user_id,
    jsonb_build_object(
      'body', profile.pillar_scores -> 'body',
      'mind', profile.pillar_scores -> 'mind',
      'spirit', profile.pillar_scores -> 'spirit',
      'relationships', profile.pillar_scores -> 'relationships',
      'vocation', profile.pillar_scores -> 'vocation',
      'lore', profile.pillar_scores -> 'lore'
    )
  from public.social_profiles social
  join public.profiles profile on profile.id = social.user_id
  where social.user_id = any(p_user_ids)
    and (social.is_discoverable = true or social.user_id = auth.uid());
end;
$$;

revoke all on function public.get_public_sextets(uuid[]) from public;
grant execute on function public.get_public_sextets(uuid[]) to authenticated;
