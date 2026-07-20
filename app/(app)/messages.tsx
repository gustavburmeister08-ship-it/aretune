import { useCallback, useState } from 'react';
import { Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { loadConversationSummaries } from '../../lib/community';
import { Avatar } from '../../components/social/PostCard';
import type { ConversationSummary } from '../../types';

export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    setLoading(true);
    loadConversationSummaries(profile.id)
      .then(setConversations)
      .catch(() => Alert.alert('Could not load messages'))
      .finally(() => setLoading(false));
  }, [profile?.id]));

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 py-4 flex-row items-center justify-between border-b border-surface-border">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="pr-4"><Text className="text-white/60 text-xl">‹</Text></TouchableOpacity>
          <Text className="text-white text-xl font-bold">Messages</Text>
        </View>
        <TouchableOpacity className="bg-gold rounded-xl px-4 py-2.5" onPress={() => router.push('/(app)/new-message' as never)}>
          <Text className="text-surface font-bold text-sm">New</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={!loading ? <Text className="text-white/30 text-center py-20">No conversations yet.</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="px-5 py-4 border-b border-surface-border flex-row items-center gap-3"
            onPress={() => router.push({
              pathname: '/(app)/chat/[conversationId]',
              params: {
                conversationId: item.id,
                userId: item.otherUser.userId,
                name: item.otherUser.displayName,
                avatar: item.otherUser.avatarUrl ?? '',
              },
            } as never)}
          >
            <Avatar uri={item.otherUser.avatarUrl} name={item.otherUser.displayName} size={50} />
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-bold">{item.otherUser.displayName}</Text>
                {item.lastMessage && <Text className="text-white/25 text-[11px]">{new Date(item.lastMessage.createdAt).toLocaleDateString()}</Text>}
              </View>
              <Text className="text-white/40 text-sm mt-1" numberOfLines={1}>{item.lastMessage?.body ?? 'Start the conversation'}</Text>
            </View>
            {item.unread && <View className="w-2.5 h-2.5 rounded-full bg-gold" />}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
