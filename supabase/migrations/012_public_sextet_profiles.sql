-- Expose only the explicitly public community profile and its six aggregate
-- pillar scores. Private profile fields and tracking inputs remain protected.

create or replace function public.get_public_social_profile(p_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  bio text,
  avatar_path text,
  phase text,
  level text,
  active_pillars text[],
  pillar_scores jsonb,
  member_since timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authorized';
  end if;

  return query
  select
    social.user_id,
    social.display_name,
    social.bio,
    social.avatar_path,
    profile.phase,
    profile.level,
    profile.active_pillars,
    jsonb_build_object(
      'body', profile.pillar_scores -> 'body',
      'mind', profile.pillar_scores -> 'mind',
      'spirit', profile.pillar_scores -> 'spirit',
      'relationships', profile.pillar_scores -> 'relationships',
      'vocation', profile.pillar_scores -> 'vocation',
      'lore', profile.pillar_scores -> 'lore'
    ),
    profile.created_at
  from public.social_profiles social
  join public.profiles profile on profile.id = social.user_id
  where social.user_id = p_user_id
    and (social.is_discoverable = true or social.user_id = auth.uid());
end;
$$;

revoke all on function public.get_public_social_profile(uuid) from public;
grant execute on function public.get_public_social_profile(uuid) to authenticated;

-- Give the seeded personas complete six-axis demonstration data.
update public.profiles profile
set pillar_scores = seeded.scores
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, '{"body":72,"mind":88,"spirit":70,"relationships":68,"vocation":94,"lore":82}'::jsonb),
  ('10000000-0000-4000-8000-000000000002'::uuid, '{"body":95,"mind":82,"spirit":86,"relationships":88,"vocation":90,"lore":78}'::jsonb),
  ('10000000-0000-4000-8000-000000000003'::uuid, '{"body":65,"mind":97,"spirit":84,"relationships":75,"vocation":90,"lore":92}'::jsonb),
  ('10000000-0000-4000-8000-000000000004'::uuid, '{"body":73,"mind":98,"spirit":87,"relationships":80,"vocation":96,"lore":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000005'::uuid, '{"body":80,"mind":96,"spirit":89,"relationships":76,"vocation":91,"lore":99}'::jsonb),
  ('10000000-0000-4000-8000-000000000006'::uuid, '{"body":70,"mind":97,"spirit":85,"relationships":80,"vocation":92,"lore":94}'::jsonb),
  ('10000000-0000-4000-8000-000000000007'::uuid, '{"body":68,"mind":96,"spirit":75,"relationships":65,"vocation":93,"lore":89}'::jsonb),
  ('10000000-0000-4000-8000-000000000008'::uuid, '{"body":74,"mind":90,"spirit":72,"relationships":76,"vocation":96,"lore":93}'::jsonb),
  ('10000000-0000-4000-8000-000000000009'::uuid, '{"body":76,"mind":89,"spirit":91,"relationships":96,"vocation":94,"lore":85}'::jsonb),
  ('10000000-0000-4000-8000-000000000010'::uuid, '{"body":98,"mind":95,"spirit":86,"relationships":82,"vocation":96,"lore":80}'::jsonb),
  ('10000000-0000-4000-8000-000000000011'::uuid, '{"body":97,"mind":96,"spirit":79,"relationships":86,"vocation":94,"lore":76}'::jsonb),
  ('10000000-0000-4000-8000-000000000012'::uuid, '{"body":72,"mind":95,"spirit":84,"relationships":82,"vocation":97,"lore":90}'::jsonb),
  ('10000000-0000-4000-8000-000000000013'::uuid, '{"body":78,"mind":92,"spirit":93,"relationships":94,"vocation":88,"lore":98}'::jsonb),
  ('10000000-0000-4000-8000-000000000014'::uuid, '{"body":82,"mind":91,"spirit":97,"relationships":98,"vocation":93,"lore":89}'::jsonb),
  ('10000000-0000-4000-8000-000000000015'::uuid, '{"body":76,"mind":88,"spirit":95,"relationships":84,"vocation":86,"lore":99}'::jsonb),
  ('10000000-0000-4000-8000-000000000016'::uuid, '{"body":83,"mind":94,"spirit":94,"relationships":91,"vocation":90,"lore":96}'::jsonb),
  ('10000000-0000-4000-8000-000000000017'::uuid, '{"body":84,"mind":93,"spirit":97,"relationships":96,"vocation":89,"lore":95}'::jsonb),
  ('10000000-0000-4000-8000-000000000018'::uuid, '{"body":70,"mind":95,"spirit":96,"relationships":88,"vocation":85,"lore":92}'::jsonb),
  ('10000000-0000-4000-8000-000000000019'::uuid, '{"body":68,"mind":94,"spirit":98,"relationships":92,"vocation":90,"lore":88}'::jsonb),
  ('10000000-0000-4000-8000-000000000020'::uuid, '{"body":97,"mind":94,"spirit":93,"relationships":82,"vocation":89,"lore":87}'::jsonb)
) as seeded(user_id, scores)
where profile.id = seeded.user_id;
