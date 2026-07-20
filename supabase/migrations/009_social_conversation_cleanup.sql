-- Remove a direct conversation when account deletion leaves fewer than two
-- participants. This prevents orphaned direct keys, memberships and messages.

create or replace function public.cleanup_incomplete_social_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.social_conversation_members where conversation_id = old.conversation_id) < 2 then
    delete from public.social_conversations where id = old.conversation_id;
  end if;
  return old;
end;
$$;

create trigger social_conversation_cleanup_after_member_delete
  after delete on public.social_conversation_members
  for each row execute function public.cleanup_incomplete_social_conversation();
