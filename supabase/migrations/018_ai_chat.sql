-- AI chat agent: persistent conversation history per user, replacing the
-- stateless single-shot directive/audit calls with a real multi-turn agent.
-- Isolated per user; the service role (Pages Function) writes assistant
-- replies, the client writes its own user messages directly via RLS.

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now(),
  constraint ai_messages_content_length check (char_length(trim(content)) between 1 and 8000)
);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create or replace function public.is_ai_conversation_owner(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ai_conversations conversation
    where conversation.id = p_conversation_id and conversation.user_id = auth.uid()
  );
$$;

revoke all on function public.is_ai_conversation_owner(uuid) from public;
grant execute on function public.is_ai_conversation_owner(uuid) to authenticated;

create policy "Users can read own conversations"
  on public.ai_conversations for select to authenticated using (auth.uid() = user_id);
create policy "Users can create own conversations"
  on public.ai_conversations for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own conversations"
  on public.ai_conversations for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can read own conversation messages"
  on public.ai_messages for select to authenticated using (public.is_ai_conversation_owner(conversation_id));
create policy "Users can send own user messages"
  on public.ai_messages for insert to authenticated
  with check (role = 'user' and public.is_ai_conversation_owner(conversation_id));

create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.handle_updated_at();

create index ai_conversations_user_updated_idx on public.ai_conversations (user_id, updated_at desc);
create index ai_messages_conversation_created_idx on public.ai_messages (conversation_id, created_at);
