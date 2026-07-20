import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { useCheckInStore } from '../../store/checkin';
import { useDirectiveStore } from '../../store/directive';
import { PILLARS } from '../../lib/pillars';
import type { PillarId } from '../../types';

function PillarScoreCard({
  pillarId,
  score,
}: {
  pillarId: PillarId;
  score: number;
}) {
  const pillar = PILLARS.find((p) => p.id === pillarId)!;
  const pct = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <View className="bg-surface-raised rounded-2xl p-4 flex-1 min-w-[44%]">
      <View className="flex-row items-center gap-2 mb-3">
        <Text style={{ fontSize: 18 }}>{pillar.icon}</Text>
        <Text className="text-white/70 text-xs font-medium tracking-wide uppercase">
          {pillar.label}
        </Text>
      </View>
      {/* Progress bar */}
      <View className="h-1.5 bg-surface-overlay rounded-full mb-2">
        <View
          className="h-1.5 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: pillar.color }}
        />
      </View>
      <Text className="text-white font-bold text-xl">{Math.round(score)}</Text>
    </View>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { todaysCheckIn, recentCheckIns, loadTodaysCheckIn, loadRecentCheckIns } = useCheckInStore();
  const { todayDirective, loading: directiveLoading, loadToday, generateForCheckIn, complete, skip } = useDirectiveStore();

  useEffect(() => {
    if (profile?.id) {
      loadTodaysCheckIn(profile.id);
      loadRecentCheckIns(profile.id);
      loadToday(profile.id);
    }
  }, [profile?.id]);

  if (!profile) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  const scores = profile.pillarScores ?? {};
  const phaseLabel = {
    dissonance: 'Dissonance',
    uncertainty: 'Uncertainty',
    discovery: 'Discovery',
  }[profile.phase];

  const checkedInToday = !!todaysCheckIn;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-gold text-xs tracking-[4px] uppercase">
              Phase: {phaseLabel}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(app)/profile')}>
              <Text style={{ fontSize: 20 }}>◉</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-white text-2xl font-bold">
            {getGreeting()},{' '}
            {profile.displayName?.split(' ')[0] ?? 'Operator'}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-white/40 text-sm">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(app)/audit')}>
              <Text className="text-white/50 text-xs font-medium">Weekly Audit ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Directive */}
        <View className="px-6 mb-6">
          <View className="bg-gold/10 border border-gold/30 rounded-2xl p-5">
            <Text className="text-gold text-xs tracking-widest uppercase mb-2">
              Today's Directive · AI-generated
            </Text>
            {todayDirective ? (
              <View>
                <Text className="text-white text-xl font-bold mb-2">{todayDirective.title}</Text>
                <Text className="text-white/60 text-sm leading-relaxed mb-4">{todayDirective.body}</Text>
                <Text className="text-white font-semibold mb-5">{todayDirective.action}</Text>
                {todayDirective.completedAt ? (
                  <Text className="text-body font-semibold">Completed today</Text>
                ) : todayDirective.skippedAt ? (
                  <Text className="text-white/40">Skipped today</Text>
                ) : (
                  <View className="flex-row gap-3">
                    <TouchableOpacity className="bg-gold rounded-xl px-5 py-3" onPress={() => void complete(todayDirective.id)}>
                      <Text className="text-surface font-bold">Complete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="border border-surface-border rounded-xl px-5 py-3" onPress={() => void skip(todayDirective.id)}>
                      <Text className="text-white/50 font-semibold">Skip</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : checkedInToday && todaysCheckIn ? (
              <TouchableOpacity
                disabled={directiveLoading}
                onPress={() => void generateForCheckIn(profile, recentCheckIns.length ? recentCheckIns : [todaysCheckIn])}
              >
                <Text className="text-white text-base font-medium">
                  {directiveLoading ? 'Generating directive...' : 'Generate today\'s directive →'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push('/(app)/checkin')}>
                <Text className="text-white text-base font-medium">
                Complete today's check-in to unlock your directive →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Pillar Scores */}
        <View className="px-6 mb-6">
          <Text className="text-white/50 text-xs tracking-widest uppercase mb-4">
            Pillar Scores
          </Text>
          {Object.keys(scores).length === 0 ? (
            <View className="bg-surface-raised rounded-2xl p-6 items-center">
              <Text className="text-white/30 text-sm text-center">
                Complete your first check-in to see pillar scores.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {profile.activePillars.map((pillarId) => (
                <PillarScoreCard
                  key={pillarId}
                  pillarId={pillarId}
                  score={scores[pillarId] ?? 0}
                />
              ))}
            </View>
          )}
        </View>

        {/* Quick Stats */}
        {checkedInToday && (
          <View className="px-6">
            <Text className="text-white/50 text-xs tracking-widest uppercase mb-4">
              Today
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1 bg-surface-raised rounded-2xl p-4">
                <Text className="text-white/50 text-xs mb-1">Mood</Text>
                <Text className="text-white text-2xl font-bold">
                  {todaysCheckIn?.mood}/10
                </Text>
              </View>
              <View className="flex-1 bg-surface-raised rounded-2xl p-4">
                <Text className="text-white/50 text-xs mb-1">Energy</Text>
                <Text className="text-white text-2xl font-bold">
                  {todaysCheckIn?.energyLevel}/10
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
