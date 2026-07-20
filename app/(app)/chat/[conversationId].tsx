import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { loadConversationMessages, markConversationRead, sendSocialMessage } from '../../../lib/community';
import { supabase } from '../../../lib/supabase';
import { Avatar } from '../../../components/social/PostCard';
import type { SocialMessage } from '../../../types';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ conversationId: string; userId?: string; name?: string; avatar?: string }>();
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : params.conversationId;
  const otherUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const name = Array.isArray(params.name) ? params.name[0] : params.name || 'Conversation';
  const avatar = Array.isArray(params.avatar) ? params.avatar[0] : params.avatar || undefined;
  const { profile } = useAuthStore();
  const [messages, setMessages] = useState<SocialMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<SocialMessage>>(null);

  useEffect(() => {
    if (!conversationId) return;
    loadConversationMessages(conversationId)
      .then((items) => { setMessages(items); void markConversationRead(conversationId); })
      .catch(() => Alert.alert('Could not load conversation'));

    const channel = supabase
      .channel(`social-messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'social_messages', filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const row = payload.new as { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
        const next: SocialMessage = { id: row.id, conversationId: row.conversation_id, senderId: row.sender_id, body: row.body, createdAt: row.created_at };
        setMessages((current) => current.some((item) => item.id === next.id) ? current : [...current, next]);
        void markConversationRead(conversationId);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async () => {
    if (!profile?.id || !conversationId || !body.trim() || sending) return;
    const text = body.trim();
    setBody('');
    setSending(true);
    try {
      const message = await sendSocialMessage(profile.id, conversationId, text);
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      await markConversationRead(conversationId);
    } catch {
      setBody(text);
      Alert.alert('Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-5 py-3 flex-row items-center gap-3 border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()}><Text className="text-white/60 text-xl">‹</Text></TouchableOpacity>
          <TouchableOpacity disabled={!otherUserId} onPress={() => otherUserId && router.push({ pathname: '/(app)/profile/[userId]', params: { userId: otherUserId } } as never)}>
            <Avatar uri={avatar} name={name} size={40} />
          </TouchableOpacity>
          <TouchableOpacity className="flex-1" disabled={!otherUserId} onPress={() => otherUserId && router.push({ pathname: '/(app)/profile/[userId]', params: { userId: otherUserId } } as never)}>
            <Text className="text-white font-bold">{name}</Text>
            <Text className="text-white/30 text-[11px]">Private conversation · View profile</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' }}
          renderItem={({ item }) => {
            const mine = item.senderId === profile?.id;
            return (
              <View className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? 'bg-gold self-end' : 'bg-surface-raised self-start'}`}>
                <Text style={{ color: mine ? '#111' : '#EEE', fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
                <Text style={{ color: mine ? '#1118' : '#666', fontSize: 9, marginTop: 4, textAlign: 'right' }}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text className="text-white/25 text-center py-20">Start the conversation.</Text>}
        />
        <View className="px-4 py-3 border-t border-surface-border bg-surface-raised flex-row items-end gap-3">
          <TextInput className="flex-1 bg-surface border border-surface-border rounded-2xl px-4 py-3 text-white max-h-28" placeholder="Message…" placeholderTextColor="#555" multiline maxLength={4000} value={body} onChangeText={setBody} />
          <TouchableOpacity className="bg-gold rounded-xl px-4 py-3" disabled={!body.trim() || sending} style={{ opacity: !body.trim() || sending ? 0.45 : 1 }} onPress={send}><Text className="text-surface font-bold">Send</Text></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
