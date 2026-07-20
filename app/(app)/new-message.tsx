import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { getOrCreateDirectConversation, loadDiscoverableProfiles } from '../../lib/community';
import { Avatar } from '../../components/social/PostCard';
import type { CommunityProfile } from '../../types';

export default function NewMessageScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [query, setQuery] = useState('');
  const [opening, setOpening] = useState<string>();

  useEffect(() => {
    if (!profile?.id) return;
    loadDiscoverableProfiles(profile.id).then(setProfiles).catch(() => Alert.alert('Could not load community members'));
  }, [profile?.id]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? profiles.filter((item) => `${item.displayName} ${item.username ?? ''} ${item.bio}`.toLowerCase().includes(value.replace(/^@/, ''))) : profiles;
  }, [profiles, query]);

  const openChat = async (other: CommunityProfile) => {
    if (opening) return;
    setOpening(other.userId);
    try {
      const conversationId = await getOrCreateDirectConversation(other.userId);
      router.replace({
        pathname: '/(app)/chat/[conversationId]',
        params: { conversationId, userId: other.userId, name: other.displayName, avatar: other.avatarUrl ?? '' },
      } as never);
    } catch {
      Alert.alert('Could not start conversation');
      setOpening(undefined);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 py-4 flex-row items-center border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()} className="pr-4"><Text className="text-white/60 text-xl">‹</Text></TouchableOpacity>
        <Text className="text-white text-xl font-bold">New Message</Text>
      </View>
      <View className="px-5 py-4">
        <TextInput className="bg-surface-raised border border-surface-border rounded-2xl px-4 py-3 text-white" placeholder="Search people…" placeholderTextColor="#555" value={query} onChangeText={setQuery} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.userId}
        ListEmptyComponent={<Text className="text-white/30 text-center py-16">No discoverable profiles found.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity className="px-5 py-4 border-b border-surface-border flex-row items-center gap-3" disabled={Boolean(opening)} onPress={() => openChat(item)}>
            <Avatar uri={item.avatarUrl} name={item.displayName} size={48} />
            <View className="flex-1">
              <Text className="text-white font-bold">{item.displayName}</Text>
              {item.username && <Text className="text-gold/70 text-xs mt-0.5">@{item.username}</Text>}
              <Text className="text-white/35 text-sm mt-1" numberOfLines={1}>{item.bio || 'Community member'}</Text>
            </View>
            <Text className="text-gold">{opening === item.userId ? '…' : '›'}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
