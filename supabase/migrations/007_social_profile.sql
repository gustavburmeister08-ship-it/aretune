-- Social profile foundation: private profile metadata, platform links and avatars.
-- Public/community discovery can be added later without exposing the profiles
-- table, which also contains email and personal tracking state.

create table if not exists public.social_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text not null default '',
  avatar_path text,
  is_discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_profiles_bio_length check (char_length(bio) <= 300)
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  platform text not null check (platform in (
    'x', 'instagram', 'facebook', 'linkedin', 'substack',
    'youtube', 'tiktok', 'github', 'website'
  )),
  url text not null,
  handle text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform),
  constraint social_links_url_length check (char_length(url) between 8 and 500),
  constraint social_links_handle_length check (handle is null or char_length(handle) <= 100)
);

alter table public.social_profiles enable row level security;
alter table public.social_links enable row level security;

create policy "Users can manage own social profile"
  on public.social_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage own social links"
  on public.social_links for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger social_profiles_updated_at
  before update on public.social_profiles
  for each row execute function public.handle_updated_at();

create trigger social_links_updated_at
  before update on public.social_links
  for each row execute function public.handle_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own avatars"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can upload own avatars"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update own avatars"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete own avatars"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create index social_links_user_position_idx on public.social_links (user_id, position);

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

  insert into public.social_profiles (user_id, bio, avatar_path, is_discoverable)
  values (v_user_id, trim(coalesce(p_bio, '')), p_avatar_path, coalesce(p_is_discoverable, false))
  on conflict (user_id) do update set
    bio = excluded.bio,
    avatar_path = excluded.avatar_path,
    is_discoverable = excluded.is_discoverable;

  delete from public.social_links where user_id = v_user_id;
  insert into public.social_links (user_id, platform, url, handle, position)
  select
    v_user_id,
    item.value ->> 'platform',
    item.value ->> 'url',
    nullif(item.value ->> 'handle', ''),
    item.ordinality - 1
  from jsonb_array_elements(coalesce(p_links, '[]'::jsonb)) with ordinality as item(value, ordinality)
  where item.value ->> 'platform' in (
    'x', 'instagram', 'facebook', 'linkedin', 'substack',
    'youtube', 'tiktok', 'github', 'website'
  )
    and item.value ->> 'url' ~ '^https://';
end;
$$;

grant execute on function public.save_social_profile(text, text, boolean, jsonb) to authenticated;

comment on table public.social_profiles is 'User-controlled social identity. Private until a later community release explicitly adds discovery policies.';
comment on table public.social_links is 'Validated outbound profile links; no OAuth tokens or third-party credentials are stored.';
