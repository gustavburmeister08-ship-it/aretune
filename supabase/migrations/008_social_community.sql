-- Social community MVP: public feed, reactions, comments, follows, reports and
-- private direct conversations. Tracking/profile tables remain isolated.

alter table public.social_profiles
  add column if not exists display_name text not null default 'Operator';

update public.social_profiles social
set display_name = coalesce(nullif(trim(profile.display_name), ''), 'Operator')
from public.profiles profile
where profile.id = social.user_id;

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

  insert into public.social_profiles (user_id, display_name, bio, avatar_path, is_discoverable)
  select v_user_id, coalesce(nullif(trim(profile.display_name), ''), 'Operator'), trim(coalesce(p_bio, '')), p_avatar_path, coalesce(p_is_discoverable, false)
  from public.profiles profile where profile.id = v_user_id
  on conflict (user_id) do update set
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

create policy "Authenticated users can read discoverable social profiles"
  on public.social_profiles for select to authenticated
  using (is_discoverable = true);

create policy "Authenticated users can read discoverable social links"
  on public.social_links for select to authenticated
  using (exists (
    select 1 from public.social_profiles social
    where social.user_id = social_links.user_id and social.is_discoverable = true
  ));

update storage.buckets set public = true where id = 'avatars';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media', 'social-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can upload own social media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update own social media"
  on storage.objects for update to authenticated
  using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete own social media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'social-media' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  body text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint social_posts_body_length check (char_length(body) <= 2000),
  constraint social_posts_has_content check (nullif(trim(body), '') is not null or image_path is not null)
);

create table public.social_post_likes (
  post_id uuid references public.social_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.social_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.social_posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  parent_id uuid references public.social_comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_comments_body_length check (char_length(trim(body)) between 1 and 1000)
);

create table public.social_follows (
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint social_follows_not_self check (follower_id <> following_id)
);

create table public.social_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.social_posts(id) on delete cascade,
  comment_id uuid references public.social_comments(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'nudity', 'violence', 'other')),
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint social_reports_one_target check ((post_id is not null)::int + (comment_id is not null)::int = 1),
  constraint social_reports_details_length check (details is null or char_length(details) <= 500)
);

create table public.social_conversations (
  id uuid primary key default gen_random_uuid(),
  direct_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_conversation_members (
  conversation_id uuid references public.social_conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  last_read_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.social_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.social_conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint social_messages_body_length check (char_length(trim(body)) between 1 and 4000)
);

alter table public.social_posts enable row level security;
alter table public.social_post_likes enable row level security;
alter table public.social_comments enable row level security;
alter table public.social_follows enable row level security;
alter table public.social_reports enable row level security;
alter table public.social_conversations enable row level security;
alter table public.social_conversation_members enable row level security;
alter table public.social_messages enable row level security;

create or replace function public.is_social_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.social_conversation_members member
    where member.conversation_id = p_conversation_id and member.user_id = auth.uid()
  );
$$;

revoke all on function public.is_social_conversation_member(uuid) from public;
grant execute on function public.is_social_conversation_member(uuid) to authenticated;

create policy "Authenticated users can read social posts"
  on public.social_posts for select to authenticated using (deleted_at is null);
create policy "Users can create own social posts"
  on public.social_posts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own social posts"
  on public.social_posts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own social posts"
  on public.social_posts for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read likes"
  on public.social_post_likes for select to authenticated using (true);
create policy "Users can create own likes"
  on public.social_post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own likes"
  on public.social_post_likes for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read comments"
  on public.social_comments for select to authenticated using (true);
create policy "Users can create own comments"
  on public.social_comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own comments"
  on public.social_comments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own comments"
  on public.social_comments for delete to authenticated using (auth.uid() = user_id);

create policy "Authenticated users can read follows"
  on public.social_follows for select to authenticated using (true);
create policy "Users can create own follows"
  on public.social_follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "Users can delete own follows"
  on public.social_follows for delete to authenticated using (auth.uid() = follower_id);

create policy "Users can create own reports"
  on public.social_reports for insert to authenticated with check (auth.uid() = reporter_id);
create policy "Users can read own reports"
  on public.social_reports for select to authenticated using (auth.uid() = reporter_id);

create policy "Members can read conversations"
  on public.social_conversations for select to authenticated using (public.is_social_conversation_member(id));
create policy "Members can read conversation membership"
  on public.social_conversation_members for select to authenticated using (public.is_social_conversation_member(conversation_id));
create policy "Members can update own read state"
  on public.social_conversation_members for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Members can read messages"
  on public.social_messages for select to authenticated using (public.is_social_conversation_member(conversation_id));
create policy "Members can send messages"
  on public.social_messages for insert to authenticated
  with check (auth.uid() = sender_id and public.is_social_conversation_member(conversation_id));
create policy "Senders can update messages"
  on public.social_messages for update to authenticated
  using (auth.uid() = sender_id) with check (auth.uid() = sender_id);

create or replace function public.ensure_public_social_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.social_profiles (user_id, display_name, is_discoverable)
  select new.user_id, coalesce(nullif(trim(profile.display_name), ''), 'Operator'), true
  from public.profiles profile where profile.id = new.user_id
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    is_discoverable = true;
  return new;
end;
$$;

create trigger social_posts_ensure_identity
  before insert on public.social_posts
  for each row execute function public.ensure_public_social_identity();
create trigger social_comments_ensure_identity
  before insert on public.social_comments
  for each row execute function public.ensure_public_social_identity();

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
  v_key text;
begin
  if v_user_id is null or p_other_user_id is null or v_user_id = p_other_user_id then
    raise exception 'Invalid conversation participant';
  end if;
  if not exists (
    select 1 from public.social_profiles
    where user_id = p_other_user_id and is_discoverable = true
  ) then raise exception 'User is not available for messaging'; end if;

  v_key := least(v_user_id::text, p_other_user_id::text) || ':' || greatest(v_user_id::text, p_other_user_id::text);
  insert into public.social_conversations (direct_key)
  values (v_key)
  on conflict (direct_key) do update set direct_key = excluded.direct_key
  returning id into v_conversation_id;

  insert into public.social_conversation_members (conversation_id, user_id)
  values (v_conversation_id, v_user_id), (v_conversation_id, p_other_user_id)
  on conflict do nothing;
  return v_conversation_id;
end;
$$;

create or replace function public.mark_social_conversation_read(p_conversation_id uuid)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.social_conversation_members
  set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
$$;

grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.mark_social_conversation_read(uuid) to authenticated;

create trigger social_posts_updated_at before update on public.social_posts
  for each row execute function public.handle_updated_at();
create trigger social_comments_updated_at before update on public.social_comments
  for each row execute function public.handle_updated_at();
create trigger social_conversations_updated_at before update on public.social_conversations
  for each row execute function public.handle_updated_at();

create index social_posts_created_idx on public.social_posts (created_at desc) where deleted_at is null;
create index social_posts_user_created_idx on public.social_posts (user_id, created_at desc);
create index social_likes_post_idx on public.social_post_likes (post_id);
create index social_comments_post_created_idx on public.social_comments (post_id, created_at);
create index social_messages_conversation_created_idx on public.social_messages (conversation_id, created_at);
create index social_members_user_idx on public.social_conversation_members (user_id, conversation_id);

alter publication supabase_realtime add table public.social_messages;
