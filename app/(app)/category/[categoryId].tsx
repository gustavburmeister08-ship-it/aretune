import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CATEGORY_MAP } from '../../../lib/category-catalog';
import { PILLAR_MAP } from '../../../lib/pillars';
import { loadCategoryEntries, persistCategoryScores, saveCategoryEntry } from '../../../lib/category-tracking';
import { categoryMetricPercentiles } from '../../../lib/category-scoring';
import { useAuthStore } from '../../../store/auth';
import type { BenchmarkResult } from '../../../lib/benchmarks';
import type { CategoryMetricDefinition, CategoryTrackingEntry } from '../../../types';

const FREQUENCY_LABELS = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', milestone: 'Cumulative / milestone',
} as const;

function NumberField({ metric, value, onChange }: {
  metric: CategoryMetricDefinition;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <TextInput
      className="bg-surface border border-surface-border rounded-xl px-4 py-3 text-white text-base text-right"
      style={{ minWidth: 116 }}
      value={value == null ? '' : String(value)}
      placeholder="—"
      placeholderTextColor="#555"
      keyboardType="decimal-pad"
      onChangeText={(text) => {
        const normalized = text.replace(',', '.').trim();
        if (!normalized) return onChange(undefined);
        const parsed = Number(normalized);
        if (Number.isFinite(parsed)) onChange(parsed);
      }}
    />
  );
}

function BooleanField({ value, onChange }: { value?: number; onChange: (value: number) => void }) {
  return (
    <View className="flex-row gap-2">
      {[{ label: 'Yes', value: 1 }, { label: 'No', value: 0 }].map((option) => (
        <TouchableOpacity
          key={option.label}
          className="rounded-xl px-5 py-3 border"
          style={{
            backgroundColor: value === option.value ? '#C9A84C' : '#111111',
            borderColor: value === option.value ? '#C9A84C' : '#2A2A2A',
          }}
          onPress={() => { onChange(option.value); void Haptics.selectionAsync(); }}
        >
          <Text style={{ color: value === option.value ? '#111111' : '#777777', fontWeight: '700' }}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ScoreField({ value, max, onChange }: { value?: number; max: number; onChange: (value: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View className="flex-row gap-2">
        {Array.from({ length: max + 1 }, (_, index) => index).map((step) => (
          <TouchableOpacity
            key={step}
            className="w-10 h-10 rounded-xl items-center justify-center border"
            style={{
              backgroundColor: value === step ? '#C9A84C' : '#111111',
              borderColor: value === step ? '#C9A84C' : '#2A2A2A',
            }}
            onPress={() => { onChange(step); void Haptics.selectionAsync(); }}
          >
            <Text style={{ color: value === step ? '#111111' : '#666666', fontWeight: '700' }}>{step}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function MetricField({ metric, value, onChange, percentile }: {
  metric: CategoryMetricDefinition;
  value?: number;
  onChange: (value: number | undefined) => void;
  percentile?: BenchmarkResult;
}) {
  const scoreLike = metric.type === 'score' || metric.type === 'level';
  return (
    <View className="bg-surface-raised border border-surface-border rounded-2xl p-4 gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap gap-2">
            <Text className="text-white font-semibold text-sm">{metric.label}</Text>
            {metric.private && <Text className="text-gold/80 text-[10px] uppercase tracking-wider">Private</Text>}
            {percentile && (
              <Text className="text-gold/80 text-[10px] uppercase tracking-wider">{percentile.label}</Text>
            )}
          </View>
          <Text className="text-white/35 text-xs mt-1">
            {FREQUENCY_LABELS[metric.frequency]} · Target {metric.target}{metric.unit ? ` ${metric.unit}` : ''}
          </Text>
          {percentile && (
            <Text className="text-white/25 text-[10px] mt-1">{percentile.population}</Text>
          )}
        </View>
        {!scoreLike && metric.type !== 'boolean' && (
          <NumberField metric={metric} value={value} onChange={onChange} />
        )}
        {metric.type === 'boolean' && <BooleanField value={value} onChange={onChange} />}
      </View>
      {scoreLike && (
        <ScoreField value={value} max={metric.type === 'score' ? 10 : (metric.max ?? 10)} onChange={onChange} />
      )}
    </View>
  );
}

export default function CategoryTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId: string }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const category = categoryId ? CATEGORY_MAP[categoryId] : undefined;
  const pillar = category ? PILLAR_MAP[category.pillar] : undefined;
  const { profile, loadProfile } = useAuthStore();
  const [values, setValues] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<CategoryTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const latest = history[0];
  const hasSensitiveMetrics = useMemo(() => category?.metrics.some((metric) => metric.private) ?? false, [category]);
  const percentiles = useMemo(
    () => (categoryId ? categoryMetricPercentiles(categoryId, history) : {}),
    [categoryId, history]
  );

  useEffect(() => {
    if (!profile?.id || !categoryId || !category) return;
    setLoading(true);
    loadCategoryEntries(profile.id, categoryId)
      .then((entries) => { setHistory(entries); setValues(entries[0]?.values ?? {}); })
      .catch(() => Alert.alert('Could not load tracking data'))
      .finally(() => setLoading(false));
  }, [profile?.id, categoryId, category]);

  if (!category || !pillar) {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <Text className="text-white text-xl font-bold">Category not found</Text>
        <TouchableOpacity className="mt-6" onPress={() => router.back()}><Text className="text-gold">Go back</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!profile?.id || saving) return;
    if (!Object.keys(values).length && !note.trim()) {
      Alert.alert('Nothing to save', 'Enter at least one metric or a note.');
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCategoryEntry(profile.id, category.id, values, note);
      const allEntries = await loadCategoryEntries(profile.id);
      await persistCategoryScores(profile.id, profile.activePillars, allEntries);
      await loadProfile(profile.id);
      setHistory((current) => [saved, ...current]);
      setNote('');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', `${category.label} has been updated.`);
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <TouchableOpacity className="mb-6" onPress={() => router.back()}><Text className="text-white/50 text-sm">‹ All pillars</Text></TouchableOpacity>
        <View className="flex-row items-start gap-3 mb-3">
          <Text style={{ fontSize: 28 }}>{pillar.icon}</Text>
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-widest" style={{ color: pillar.color }}>{pillar.label}</Text>
            <Text className="text-white text-2xl font-bold mt-1">{category.label}</Text>
          </View>
        </View>
        <Text className="text-white/50 text-sm leading-5 mb-3">{category.description}</Text>
        <Text className="text-white/30 text-xs mb-6">
          Weight in {pillar.label}: {category.weight}% · {category.metrics.length} metrics
          {latest ? ` · Last tracked ${new Date(latest.loggedAt).toLocaleDateString()}` : ''}
        </Text>

        {(category.pillar === 'spirit' || category.pillar === 'relationships') && (
          <View className="bg-gold/10 border border-gold/20 rounded-2xl p-4 mb-5">
            <Text className="text-gold/90 text-xs leading-5">
              This score measures your investment and consistency — not spiritual depth or the objective quality of a relationship.
            </Text>
          </View>
        )}
        {hasSensitiveMetrics && (
          <View className="bg-surface-raised border border-surface-border rounded-2xl p-4 mb-5">
            <Text className="text-white/50 text-xs leading-5">
              Private metrics are protected by your account's row-level access rules and are not public profile data.
            </Text>
          </View>
        )}

        {loading ? (
          <Text className="text-white/40 py-10 text-center">Loading metrics…</Text>
        ) : (
          <View className="gap-3">
            {category.metrics.map((metric) => (
              <MetricField
                key={metric.id}
                metric={metric}
                value={values[metric.id]}
                percentile={percentiles[metric.id]}
                onChange={(value) => setValues((current) => {
                  if (value == null) { const next = { ...current }; delete next[metric.id]; return next; }
                  return { ...current, [metric.id]: value };
                })}
              />
            ))}
            <View className="mt-3">
              <Text className="text-white text-sm font-semibold mb-2">Context note (optional)</Text>
              <TextInput
                className="bg-surface-raised border border-surface-border rounded-2xl p-4 text-white text-sm"
                placeholder="What changed, what worked, what needs attention?"
                placeholderTextColor="#555"
                multiline value={note} onChangeText={setNote}
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />
            </View>
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center mt-3"
              style={{ opacity: saving ? 0.6 : 1 }}
              disabled={saving}
              onPress={handleSave}
            >
              <Text className="text-surface font-bold">{saving ? 'Saving…' : 'Save category update'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {history.length > 0 && (
          <View className="mt-10">
            <Text className="text-white text-lg font-bold mb-3">Recent updates</Text>
            <View className="gap-2">
              {history.slice(0, 5).map((entry) => (
                <View key={entry.id} className="bg-surface-raised rounded-xl px-4 py-3 flex-row justify-between">
                  <Text className="text-white/60 text-sm">{new Date(entry.loggedAt).toLocaleDateString()}</Text>
                  <Text className="text-white/35 text-xs">{Object.keys(entry.values).length} metrics</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
