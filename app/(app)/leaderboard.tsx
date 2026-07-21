import { useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { loadPillarLeaderboard } from '../../lib/community';
import { PILLARS } from '../../lib/pillars';
import { Avatar } from '../../components/social/PostCard';
import { MiniHexagon } from '../../components/profile/MiniHexagon';
import type { PillarId, PillarLeaderboardEntry } from '../../types';

export default function LeaderboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [pillar, setPillar] = useState<PillarId>('body');
  const [entries, setEntries] = useState<PillarLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadPillarLeaderboard(pillar)
      .then(setEntries)
      .catch(() => Alert.alert('Could not load leaderboard'))
      .finally(() => setLoading(false));
  }, [pillar]);

  const activePillar = PILLARS.find((p) => p.id === pillar)!;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pt-4 pb-3 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}><Text className="text-white/60 text-xl">‹</Text></TouchableOpacity>
        <View>
          <Text className="text-white text-2xl font-bold">Leaderboard</Text>
          <Text className="text-white/35 text-xs mt-1">Only discoverable community profiles are ranked.</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 mb-2" contentContainerStyle={{ gap: 8 }}>
        {PILLARS.map((p) => (
          <TouchableOpacity
            key={p.id}
            className="flex-row items-center gap-2 rounded-xl px-4 py-2 border"
            style={{
              backgroundColor: pillar === p.id ? p.color + '22' : '#111111',
              borderColor: pillar === p.id ? p.color : '#2A2A2A',
            }}
            onPress={() => setPillar(p.id)}
          >
            <Text style={{ fontSize: 14 }}>{p.icon}</Text>
            <Text style={{ color: pillar === p.id ? p.color : '#888', fontWeight: '600', fontSize: 13 }}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <Text className="text-white/40 text-center py-16">Loading rankings…</Text>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={{ padding: 16, gap: 4 }}
          ListEmptyComponent={
            <Text className="text-white/25 text-center py-16">
              No discoverable profiles have a {activePillar.label} score yet.
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.userId === profile?.id;
            return (
              <TouchableOpacity
                className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
                style={{ backgroundColor: mine ? activePillar.color + '14' : 'transparent' }}
                onPress={() => router.push(mine
                  ? '/(app)/profile' as never
                  : { pathname: '/(app)/profile/[userId]', params: { userId: item.userId } } as never)}
              >
                <Text className="text-white/40 font-bold w-7 text-center">{item.rank}</Text>
                <View>
                  <Avatar uri={item.avatarUrl} name={item.displayName} size={36} />
                  {item.pillarScores && Object.keys(item.pillarScores).length > 0 && (
                    <View className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-surface-border">
                      <MiniHexagon scores={item.pillarScores} size={16} strokeWidth={1.2} color={activePillar.color} />
                    </View>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{item.displayName}{mine ? ' (you)' : ''}</Text>
                  {item.username && <Text className="text-white/30 text-xs">@{item.username}</Text>}
                </View>
                <Text className="font-bold text-lg" style={{ color: activePillar.color }}>{Math.round(item.pillarScore)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
