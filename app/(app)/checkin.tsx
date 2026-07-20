import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/auth';
import { useCheckInStore } from '../../store/checkin';
import { useDirectiveStore } from '../../store/directive';
import { PILLARS } from '../../lib/pillars';
import { persistLifestyleScores } from '../../lib/score-service';
import { trackEvent } from '../../lib/analytics';
import type { MetricDefinition, MetricType } from '../../types';

// We only show leading metrics for active pillars during daily check-in
const STEPS = ['vitals', 'metrics', 'note', 'done'] as const;
type Step = (typeof STEPS)[number];

function SliderInput({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <View className="gap-3">
      <View className="flex-row justify-between">
        <Text className="text-white text-sm font-medium">{label}</Text>
        <Text className="text-gold font-bold text-sm">{value}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {steps.map((step) => (
            <TouchableOpacity
              key={step}
              onPress={() => {
                onChange(step);
                Haptics.selectionAsync();
              }}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{
                backgroundColor: value === step ? '#C9A84C' : '#1A1A1A',
                borderWidth: 1,
                borderColor: value === step ? '#C9A84C' : '#2A2A2A',
              }}
            >
              <Text
                className="text-sm font-bold"
                style={{ color: value === step ? '#111' : '#666' }}
              >
                {step}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function BooleanInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number; // 0 or 1
  onChange: (v: number) => void;
}) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-surface-border">
      <Text className="text-white text-sm flex-1 mr-4">{label}</Text>
      <View className="flex-row gap-2">
        <TouchableOpacity
          onPress={() => { onChange(1); Haptics.selectionAsync(); }}
          className="px-5 py-2 rounded-xl"
          style={{
            backgroundColor: value === 1 ? '#C9A84C' : '#1A1A1A',
            borderWidth: 1,
            borderColor: value === 1 ? '#C9A84C' : '#2A2A2A',
          }}
        >
          <Text style={{ color: value === 1 ? '#111' : '#666', fontWeight: '600', fontSize: 12 }}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { onChange(0); Haptics.selectionAsync(); }}
          className="px-5 py-2 rounded-xl"
          style={{
            backgroundColor: value === 0 && value !== undefined ? '#FF6584' + '22' : '#1A1A1A',
            borderWidth: 1,
            borderColor: value === 0 ? '#FF658444' : '#2A2A2A',
          }}
        >
          <Text style={{ color: value === 0 ? '#FF6584' : '#666', fontWeight: '600', fontSize: 12 }}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CountInput({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <View className="flex-row justify-between items-center py-3 border-b border-surface-border">
      <Text className="text-white text-sm flex-1 mr-4">{label}</Text>
      <View className="flex-row items-center gap-3">
        <TouchableOpacity
          onPress={() => { if (value > 0) { onChange(value - 1); Haptics.selectionAsync(); } }}
          className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center"
        >
          <Text className="text-white text-lg">−</Text>
        </TouchableOpacity>
        <Text className="text-gold font-bold text-lg w-8 text-center">{value}</Text>
        <TouchableOpacity
          onPress={() => { onChange(value + 1); Haptics.selectionAsync(); }}
          className="w-9 h-9 rounded-full bg-surface-raised items-center justify-center"
        >
          <Text className="text-white text-lg">+</Text>
        </TouchableOpacity>
        {unit && <Text className="text-white/30 text-xs">{unit}</Text>}
      </View>
    </View>
  );
}

function MetricInput({
  metric,
  value,
  onChange,
}: {
  metric: MetricDefinition;
  value: number;
  onChange: (v: number) => void;
}) {
  switch (metric.type) {
    case 'score':
      return <SliderInput label={metric.label} value={value ?? 5} onChange={onChange} />;
    case 'boolean':
      return <BooleanInput label={metric.label} value={value ?? -1} onChange={onChange} />;
    case 'count':
      return <CountInput label={metric.label} value={value ?? 0} onChange={onChange} unit={metric.unit} />;
    case 'duration':
      return <CountInput label={`${metric.label} (${metric.unit ?? 'min'})`} value={value ?? 0} onChange={onChange} />;
    default:
      return <CountInput label={metric.label} value={value ?? 0} onChange={onChange} />;
  }
}

export default function CheckIn() {
  const router = useRouter();
  const { profile, loadProfile } = useAuthStore();
  const { currentEntries, currentMood, currentEnergy, currentNote, recentCheckIns, setMetricValue, setMood, setEnergy, setNote, submitCheckIn, loading } = useCheckInStore();
  const { todayDirective, generateForCheckIn, loading: directiveLoading, error: directiveError } = useDirectiveStore();

  const [step, setStep] = useState<Step>('vitals');

  const activePillars = PILLARS.filter((p) =>
    profile?.activePillars?.includes(p.id)
  );

  const leadingMetrics = activePillars.flatMap((p) => p.leadingMetrics);

  const handleSubmit = async () => {
    if (!profile?.id) return;
    try {
      const completed = await submitCheckIn(profile.id);
      void trackEvent(profile.id, 'check_in_completed', { metric_count: completed.entries.length });
      const scoringInputs = [completed, ...recentCheckIns.filter((item) => item.id !== completed.id)];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('done');
      void (async () => {
        let directiveProfile = profile;
        try {
          const pillarScores = await persistLifestyleScores(profile.id, profile.activePillars, scoringInputs);
          directiveProfile = { ...profile, pillarScores };
          await loadProfile(profile.id);
        } catch {
          // The check-in remains valid if score persistence needs a later retry.
        }
        await generateForCheckIn(directiveProfile, scoringInputs).catch(() => undefined);
      })();
    } catch (e) {
      Alert.alert('Error', 'Failed to save check-in. Try again.');
    }
  };

  if (step === 'done') {
    return (
      <SafeAreaView className="flex-1 bg-surface items-center justify-center px-6">
        <Text className="text-5xl mb-6">✓</Text>
        <Text className="text-white text-2xl font-bold text-center mb-3">
          Check-in complete.
        </Text>
        {todayDirective ? (
          <View className="bg-surface-raised rounded-2xl p-5 w-full mb-8">
            <Text className="text-gold text-xs tracking-widest uppercase mb-2">{todayDirective.pillar} · AI-generated</Text>
            <Text className="text-white text-xl font-bold mb-3">{todayDirective.title}</Text>
            <Text className="text-white/70 text-sm leading-relaxed mb-4">{todayDirective.body}</Text>
            <Text className="text-white font-semibold">{todayDirective.action}</Text>
          </View>
        ) : (
          <Text className="text-white/50 text-base text-center mb-10">
            {directiveLoading ? 'Generating your directive...' : directiveError ?? 'Your check-in is saved. Generate the directive again from Today.'}
          </Text>
        )}
        <TouchableOpacity
          className="bg-gold rounded-2xl py-4 px-10"
          onPress={() => { router.push('/(app)'); setStep('vitals'); }}
        >
          <Text className="text-surface font-bold text-base">See My Directive</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row justify-end px-6 pt-4">
        <TouchableOpacity onPress={() => router.push('/(app)/pillars')}>
          <Text className="text-white/50 text-xs font-medium">Browse Pillars ›</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View className="h-1 bg-surface-border mx-6 mt-3 rounded-full">
        <View
          className="h-1 bg-gold rounded-full"
          style={{
            width: step === 'vitals' ? '33%' : step === 'metrics' ? '66%' : '100%',
          }}
        />
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {step === 'vitals' && (
          <View className="gap-8">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">Daily Vitals</Text>
              <Text className="text-white/40 text-sm">How are you operating today?</Text>
            </View>
            <SliderInput label="Mood" value={currentMood} onChange={setMood} />
            <SliderInput label="Energy" value={currentEnergy} onChange={setEnergy} />
            <View className="h-6" />
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center"
              onPress={() => setStep('metrics')}
            >
              <Text className="text-surface font-bold">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'metrics' && (
          <View className="gap-6">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">Today's Metrics</Text>
              <Text className="text-white/40 text-sm">Log your leading indicators.</Text>
            </View>

            {activePillars.map((pillar) => (
              <View key={pillar.id} className="gap-3">
                <View className="flex-row items-center gap-2">
                  <Text style={{ fontSize: 16 }}>{pillar.icon}</Text>
                  <Text
                    className="text-xs font-bold tracking-widest uppercase"
                    style={{ color: pillar.color }}
                  >
                    {pillar.label}
                  </Text>
                </View>
                {pillar.leadingMetrics.map((metric) => (
                  <MetricInput
                    key={metric.id}
                    metric={metric}
                    value={currentEntries[metric.id] ?? (metric.type === 'score' ? 5 : 0)}
                    onChange={(v) => setMetricValue(metric.id, v)}
                  />
                ))}
              </View>
            ))}

            <View className="h-6" />
            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center"
              onPress={() => setStep('note')}
            >
              <Text className="text-surface font-bold">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'note' && (
          <View className="gap-6">
            <View>
              <Text className="text-white text-2xl font-bold mb-1">Reflection</Text>
              <Text className="text-white/40 text-sm">Optional. What's on your mind?</Text>
            </View>

            <TextInput
              className="bg-surface-raised border border-surface-border rounded-2xl p-4 text-white text-base"
              placeholder="Insights, blockers, wins..."
              placeholderTextColor="#444"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={currentNote}
              onChangeText={setNote}
              style={{ minHeight: 140 }}
            />

            <TouchableOpacity
              className="bg-gold rounded-2xl py-4 items-center"
              onPress={handleSubmit}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <Text className="text-surface font-bold">
                {loading ? 'Saving...' : 'Complete Check-in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="py-3 items-center"
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text className="text-white/40 text-sm">Skip reflection</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
