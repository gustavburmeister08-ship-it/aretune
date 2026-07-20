import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { PILLARS } from '../../lib/pillars';
import { loadCategoryEntries } from '../../lib/category-tracking';

export default function PillarsScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const scores = profile?.pillarScores ?? {};
  const [lastTracked, setLastTracked] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile?.id) return;
    loadCategoryEntries(profile.id)
      .then((entries) => {
        const latest: Record<string, string> = {};
        for (const entry of entries) {
          if (!latest[entry.categoryId]) latest[entry.categoryId] = entry.loggedAt;
        }
        setLastTracked(latest);
      })
      .catch(() => undefined);
  }, [profile?.id, scores]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1 px-6 pt-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="text-white text-2xl font-bold mb-1">Pillars</Text>
        <Text className="text-white/40 text-sm mb-8">
          46 categories across your 6 dimensions. Open any category to log its exact metrics.
        </Text>

        <View className="gap-4">
          {PILLARS.map((pillar) => {
            const score = scores[pillar.id] ?? null;
            const isActive = profile?.activePillars?.includes(pillar.id);
            const pct = score != null ? Math.max(0, Math.min(100, Math.round(score))) : 0;

            return (
              <View
                key={pillar.id}
                className="bg-surface-raised rounded-2xl p-5"
                style={{ borderLeftWidth: 3, borderLeftColor: isActive ? pillar.color : '#2A2A2A' }}
              >
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center gap-2 flex-1 pr-3">
                    <Text style={{ fontSize: 22 }}>{pillar.icon}</Text>
                    <View className="flex-1">
                      <Text className="text-white font-bold text-base">{pillar.label}</Text>
                      <Text className="text-white/40 text-xs">{pillar.description}</Text>
                    </View>
                  </View>
                  {score != null && (
                    <Text className="text-2xl font-bold" style={{ color: pillar.color }}>
                      {Math.round(score)}
                    </Text>
                  )}
                </View>

                {score != null && (
                  <View className="h-1 bg-surface-overlay rounded-full mb-3">
                    <View className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: pillar.color }} />
                  </View>
                )}

                <View className="gap-2 mt-2">
                  {pillar.categories.map((category) => {
                    const trackedAt = lastTracked[category.id];
                    return (
                      <TouchableOpacity
                        key={category.id}
                        className="bg-surface border border-surface-border rounded-xl px-4 py-3 flex-row items-center justify-between"
                        onPress={() => router.push({
                          pathname: '/(app)/category/[categoryId]',
                          params: { categoryId: category.id },
                        } as unknown as Href)}
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-white text-sm font-medium">{category.label}</Text>
                          <Text className="text-white/30 text-[11px] mt-1">
                            {trackedAt ? `Tracked ${new Date(trackedAt).toLocaleDateString()}` : 'Not tracked yet'}
                          </Text>
                        </View>
                        <Text style={{ color: pillar.color, fontSize: 18 }}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {!isActive && (
                  <Text className="text-white/20 text-xs italic mt-3">Not active — enable in settings</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
