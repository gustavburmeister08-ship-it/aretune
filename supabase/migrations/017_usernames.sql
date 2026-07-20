-- Unique, changeable public handles. Usernames are stored lowercase and are
-- intentionally separate from free-form display names and outbound social links.

alter table public.profiles
  add column if not exists username text;

alter table public.social_profiles
  add column if not exists username text;

alter table public.profiles
  add constraint profiles_username_format check (
    username is null or (
      username ~ '^[a-z0-9_][a-z0-9._]{1,28}[a-z0-9_]$'
      and username not like '%..%'
    )
  );

alter table public.social_profiles
  add constraint social_profiles_username_format check (
    username is null or (
      username ~ '^[a-z0-9_][a-z0-9._]{1,28}[a-z0-9_]$'
      and username not like '%..%'
    )
  );

create unique index if not exists profiles_username_unique_idx
  on public.profiles (username) where username is not null;

create unique index if not exists social_profiles_username_unique_idx
  on public.social_profiles (username) where username is not null;

create or replace function public.normalize_username(p_username text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(trim(leading '@' from trim(coalesce(p_username, ''))));
$$;

create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text := public.normalize_username(p_username);
begin
  if auth.uid() is null then return false; end if;
  if v_username !~ '^[a-z0-9_][a-z0-9._]{1,28}[a-z0-9_]$' or v_username like '%..%' then return false; end if;
  return not exists (
    select 1 from public.profiles
    where username = v_username and id <> auth.uid()
  );
end;
$$;

create or replace function public.set_username(p_username text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := public.normalize_username(p_username);
begin
  if v_user_id is null then raise exception 'Not authorized'; end if;
  if v_username !~ '^[a-z0-9_][a-z0-9._]{1,28}[a-z0-9_]$' or v_username like '%..%' then
    raise exception 'Username must be 3-30 characters and use only lowercase letters, numbers, periods and underscores';
  end if;

  begin
    update public.profiles set username = v_username where id = v_user_id;
  exception when unique_violation then
    raise exception 'Username is already taken' using errcode = '23505';
  end;

  update public.social_profiles set username = v_username where user_id = v_user_id;
  return v_username;
end;
$$;

create or replace function public.sync_social_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.social_profiles
  set username = new.username,
      display_name = coalesce(nullif(trim(new.display_name), ''), 'Operator')
  where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_social_identity on public.profiles;
create trigger profiles_sync_social_identity
  after update of username, display_name on public.profiles
  for each row execute function public.sync_social_profile_identity();

create or replace function public.save_social_profile(
  p_bio text,
  p_avatar_path text,
  p_is_discoverable boolean,
  p_links jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Not authorized'; end if;
  if char_length(coalesce(p_bio, '')) > 300 then raise exception 'Bio is too long'; end if;
  if jsonb_typeof(coalesce(p_links, '[]'::jsonb)) <> 'array' then raise exception 'Links must be an array'; end if;
  if jsonb_array_length(coalesce(p_links, '[]'::jsonb)) > 9 then raise exception 'Too many links'; end if;

  insert into public.social_profiles (user_id, username, display_name, bio, avatar_path, is_discoverable)
  select v_user_id, profile.username, coalesce(nullif(trim(profile.display_name), ''), 'Operator'), trim(coalesce(p_bio, '')), p_avatar_path, coalesce(p_is_discoverable, false)
  from public.profiles profile where profile.id = v_user_id
  on conflict (user_id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    bio = excluded.bio,
    avatar_path = excluded.avatar_path,
    is_discoverable = excluded.is_discoverable;

  delete from public.social_links where user_id = v_user_id;
  insert into public.social_links (user_id, platform, url, handle, position)
  select v_user_id, item.value ->> 'platform', item.value ->> 'url',
    nullif(item.value ->> 'handle', ''), item.ordinality - 1
  from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where item.value ->> 'platform' in (
    'x', 'instagram', 'facebook', 'linkedin', 'substack',
    'youtube', 'tiktok', 'github', 'website'
  ) and item.value ->> 'url' ~ '^https://';
end;
$$;

create or replace function public.ensure_public_social_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_profiles (user_id, username, display_name, is_discoverable)
  select new.user_id, profile.username, coalesce(nullif(trim(profile.display_name), ''), 'Operator'), true
  from public.profiles profile where profile.id = new.user_id
  on conflict (user_id) do update set
    username = excluded.username,
    display_name = excluded.display_name,
    is_discoverable = true;
  return new;
end;
$$;

drop function if exists public.get_public_social_profile(uuid);
create function public.get_public_social_profile(p_user_id uuid)
returns table (
  user_id uuid,
  username text,
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
  if auth.uid() is null then raise exception 'Not authorized'; end if;
  return query
  select social.user_id, social.username, social.display_name, social.bio, social.avatar_path,
    profile.phase, profile.level, profile.active_pillars,
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

revoke all on function public.normalize_username(text) from public;
revoke all on function public.is_username_available(text) from public;
revoke all on function public.set_username(text) from public;
revoke all on function public.get_public_social_profile(uuid) from public;
grant execute on function public.is_username_available(text) to authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.get_public_social_profile(uuid) to authenticated;
