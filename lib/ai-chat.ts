import { supabase } from './supabase';
import { authenticatedPost } from './ai';
import type { ChatConversation, ChatMessage, ChatReplyInput } from '../types';

const mapConversation = (row: {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}): ChatConversation => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapMessage = (row: {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}): ChatMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
});

export async function listConversations(userId: string): Promise<ChatConversation[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id,user_id,title,created_at,updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapConversation);
}

export async function createConversation(userId: string, title?: string): Promise<ChatConversation> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: userId, title: title ?? null })
    .select('id,user_id,title,created_at,updated_at')
    .single();
  if (error) throw error;
  return mapConversation(data);
}

export async function loadMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id,conversation_id,role,content,created_at')
    .eq('conversation_id', conversationId)
    .order('created_at')
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendMessage(
  userId: string,
  content: string,
  context: ChatReplyInput,
): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Message cannot be empty');

  const { data: inserted, error } = await supabase
    .from('ai_messages')
    .insert({ conversation_id: context.conversationId, role: 'user', content: trimmed })
    .select('id,conversation_id,role,content,created_at')
    .single();
  if (error) throw error;
  const userMessage = mapMessage(inserted);

  const assistantMessage = await authenticatedPost<ChatMessage>('/api/chat', context);
  return { userMessage, assistantMessage };
}
