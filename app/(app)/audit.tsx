import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { PILLAR_MAP, PILLARS } from '../../lib/pillars';
import type { WeeklyAudit } from '../../types';
import { generateAndPersistWeeklyAudit, getWeekStart } from '../../lib/audit';

export default function AuditScreen() {
  const { profile } = useAuthStore();
  const [audit, setAudit] = useState<WeeklyAudit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    loadAudit(profile.id);
  }, [profile?.id]);

  const loadAudit = async (userId: string) => {
    const weekStart = getWeekStart().toISOString().split('T')[0];

    const { data } = await supabase
      .from('weekly_audits')
      .select('*')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle();

    if (data) {
      setAudit({
        id: data.id,
        userId: data.user_id,
        weekStart: data.week_start,
        pillarScores: (data.pillar_scores ?? {}) as WeeklyAudit['pillarScores'],
        highlights: data.highlights ?? [],
        gaps: data.gaps ?? [],
        directiveCompletion: data.directive_completion ?? 0,
        aiSummary: data.ai_summary ?? undefined,
        completedAt: data.completed_at,
      });
    }

    setLoading(false);
  };

  const generateAudit = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const generated = await generateAndPersistWeeklyAudit(profile);
      setAudit(generated);
    } catch (error) {
      Alert.alert('Could not generate audit', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  const weekLabel = `Week of ${getWeekStart().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-white/50 text-xs tracking-widest uppercase mb-1">
          Weekly Audit
        </Text>
        <Text className="text-white text-2xl font-bold mb-1">{weekLabel}</Text>
        <Text className="text-white/40 text-sm mb-8">
          Your operational review for the week.
        </Text>

        {!audit ? (
          <View className="bg-surface-raised rounded-2xl p-8 items-center">
            <Text className="text-3xl mb-4">📊</Text>
            <Text className="text-white font-semibold text-center mb-2">
              No audit yet this week
            </Text>
            <Text className="text-white/40 text-sm text-center mb-6">
              Complete at least 3 check-ins this week to generate your audit.
            </Text>
            <TouchableOpacity className="bg-gold rounded-xl px-6 py-3" onPress={generateAudit}>
              <Text className="text-surface font-bold">Generate Audit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="gap-6">
            {/* Directive completion */}
            <View className="bg-surface-raised rounded-2xl p-5">
              <Text className="text-white/50 text-xs uppercase tracking-widest mb-3">
                Directive Completion
              </Text>
              <Text className="text-white text-4xl font-bold mb-2">
                {Math.round(audit.directiveCompletion)}%
              </Text>
              <View className="h-2 bg-surface-overlay rounded-full">
                <View
                  className="h-2 bg-gold rounded-full"
                  style={{ width: `${audit.directiveCompletion}%` }}
                />
              </View>
            </View>

            {/* Pillar scores */}
            <View className="bg-surface-raised rounded-2xl p-5">
              <Text className="text-white/50 text-xs uppercase tracking-widest mb-4">
                Pillar Scores
              </Text>
              <View className="gap-3">
                {PILLARS.filter((p) =>
                  profile?.activePillars?.includes(p.id)
                ).map((pillar) => {
                  const score = audit.pillarScores[pillar.id];
                  return (
                    <View key={pillar.id} className="flex-row items-center gap-3">
                      <Text style={{ fontSize: 16, width: 24 }}>{pillar.icon}</Text>
                      <Text className="text-white/70 text-sm flex-1">{pillar.label}</Text>
                      <View className="flex-1 h-1.5 bg-surface-overlay rounded-full">
                        <View
                          className="h-1.5 rounded-full"
                          style={{
                            width: score != null ? `${Math.max(0, Math.min(100, score))}%` : '0%',
                            backgroundColor: pillar.color,
                          }}
                        />
                      </View>
                      <Text className="text-white font-bold text-sm w-8 text-right">
                        {score != null ? Math.round(score) : '–'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* AI Summary */}
            {audit.aiSummary && (
              <View className="bg-surface-raised rounded-2xl p-5">
                <Text className="text-gold text-xs tracking-widest uppercase mb-3">
                  Coach's Assessment · AI-generated
                </Text>
                <Text className="text-white/80 text-sm leading-relaxed">
                  {audit.aiSummary}
                </Text>
              </View>
            )}

            {/* Highlights */}
            {audit.highlights.length > 0 && (
              <View className="bg-surface-raised rounded-2xl p-5">
                <Text className="text-white/50 text-xs uppercase tracking-widest mb-3">
                  Highlights
                </Text>
                {audit.highlights.map((h, i) => (
                  <Text key={i} className="text-white/80 text-sm mb-2">
                    ↑ {h}
                  </Text>
                ))}
              </View>
            )}

            {/* Gaps */}
            {audit.gaps.length > 0 && (
              <View className="bg-surface-raised rounded-2xl p-5">
                <Text className="text-white/50 text-xs uppercase tracking-widest mb-3">
                  Gaps to Close
                </Text>
                {audit.gaps.map((g, i) => (
                  <Text key={i} className="text-white/80 text-sm mb-2">
                    → {g}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
