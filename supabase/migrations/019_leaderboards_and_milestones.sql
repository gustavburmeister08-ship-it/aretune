-- Community MVP completion: per-pillar leaderboards and structured
-- milestone posts. Leaderboards only ever expose pillar-level totals for
-- discoverable profiles, mirroring get_public_social_profile from
-- 012_public_sextet_profiles.sql — private category-level data never
-- enters this path.

create or replace function public.get_pillar_leaderboard(p_pillar text, p_limit integer default 50)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_path text,
  pillar_score numeric,
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

-- Structured milestone posts: same social_posts table, distinguished by
-- post_type, with the achieved pillar/score attached instead of relying on
-- free text.
alter table public.social_posts
  add column post_type text not null default 'text' check (post_type in ('text', 'milestone'));
alter table public.social_posts
  add column milestone_pillar text check (milestone_pillar in ('body', 'mind', 'spirit', 'relationships', 'vocation', 'lore'));
alter table public.social_posts
  add column milestone_score numeric;
alter table public.social_posts
  add constraint social_posts_milestone_fields check (
    (post_type = 'milestone' and milestone_pillar is not null and milestone_score is not null)
    or (post_type = 'text' and milestone_pillar is null and milestone_score is null)
  );
