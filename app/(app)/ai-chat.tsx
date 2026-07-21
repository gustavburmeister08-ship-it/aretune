import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { createConversation, listConversations, loadMessages, sendMessage } from '../../lib/ai-chat';
import type { ChatMessage } from '../../types';

export default function AiChatScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const existing = await listConversations(profile.id);
        const conversation = existing[0] ?? (await createConversation(profile.id));
        setConversationId(conversation.id);
        setMessages(await loadMessages(conversation.id));
      } catch {
        Alert.alert('Could not load your conversation');
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async () => {
    if (!profile?.id || !conversationId || !body.trim() || sending) return;
    const text = body.trim();
    setBody('');
    setSending(true);
    try {
      const { userMessage, assistantMessage } = await sendMessage(profile.id, text, {
        conversationId,
        phase: profile.phase,
        activePillars: profile.activePillars,
        pillarScores: profile.pillarScores ?? {},
      });
      setMessages((current) => [...current, userMessage, assistantMessage]);
    } catch (error) {
      setBody(text);
      const message = error instanceof Error ? error.message : '';
      if (message.startsWith('API 429')) {
        Alert.alert('Daily AI limit reached', 'Free plans get 5 AI requests/day. Upgrade to Pro for unlimited access.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(app)/billing' as never) },
        ]);
      } else {
        Alert.alert('Could not send message', 'Your AI coach is unavailable right now — try again in a moment.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-5 py-3 border-b border-surface-border">
          <Text className="text-white font-bold text-lg">Coach</Text>
          <Text className="text-white/30 text-[11px]">Your personal AI agent · knows your pillars and phase</Text>
        </View>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' }}
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View className={`max-w-[82%] rounded-2xl px-4 py-3 ${mine ? 'bg-gold self-end' : 'bg-surface-raised self-start'}`}>
                <Text style={{ color: mine ? '#111' : '#EEE', fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
                <Text style={{ color: mine ? '#1118' : '#666', fontSize: 9, marginTop: 4, textAlign: 'right' }}>
                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <Text className="text-white/25 text-center py-20">
              {loading ? 'Loading your coach…' : 'Ask about your day, your goals, or what to focus on next.'}
            </Text>
          }
          ListFooterComponent={
            sending ? (
              <View className="max-w-[60%] rounded-2xl px-4 py-3 bg-surface-raised self-start">
                <Text style={{ color: '#666', fontSize: 14 }}>…</Text>
              </View>
            ) : null
          }
        />
        <View className="px-4 py-3 border-t border-surface-border bg-surface-raised flex-row items-end gap-3">
          <TextInput
            className="flex-1 bg-surface border border-surface-border rounded-2xl px-4 py-3 text-white max-h-28"
            placeholder="Message your coach…"
            placeholderTextColor="#555"
            multiline
            maxLength={4000}
            value={body}
            onChangeText={setBody}
            editable={!loading}
          />
          <TouchableOpacity
            className="bg-gold rounded-xl px-4 py-3"
            disabled={!body.trim() || sending || loading}
            style={{ opacity: !body.trim() || sending || loading ? 0.45 : 1 }}
            onPress={send}
          >
            <Text className="text-surface font-bold">Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
