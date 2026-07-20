import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { INTEGRATION_CATEGORIES, INTEGRATION_PROVIDERS } from '../../lib/integrations/catalog';
import { parseIntegrationFile } from '../../lib/integrations/parser';
import { connectOAuthProvider, disconnectIntegration, importIntegrationEvents, loadIntegrationConnections, syncIntegration } from '../../lib/integrations/client';
import { useAuthStore } from '../../store/auth';
import type { IntegrationConnection, IntegrationProvider } from '../../types';

const modeLabel: Record<IntegrationProvider['mode'], string> = {
  oauth: 'Secure account link', device: 'On-device permission', file: 'CSV / JSON import',
  webhook: 'Automation endpoint', fhir: 'FHIR connection', partner: 'Partner access',
};

const dataLabels: Record<string, string> = {
  steps: 'Steps', active_energy_kcal: 'Active energy', workout_minutes: 'Exercise time', workout: 'Workouts',
  sleep_duration_hours: 'Sleep duration', sleep_score: 'Sleep score', sleep_latency_minutes: 'Sleep latency',
  hrv_ms: 'HRV', recovery_score: 'Recovery', resting_heart_rate_bpm: 'Resting HR', weight_kg: 'Weight',
  body_fat_percent: 'Body fat', calorie_adherence_percent: 'Calorie adherence', macro_quality_score: 'Macros',
  meal_quality_score: 'Meal quality', hydration_liters: 'Hydration', mood_score: 'Mood', stress_score: 'Stress',
  meditation_minutes: 'Meditation', focus_minutes: 'Focus time', therapy_session: 'Therapy sessions',
  glucose_mg_dl: 'Glucose', blood_pressure_systolic: 'Systolic BP', blood_pressure_diastolic: 'Diastolic BP', spo2_percent: 'SpO₂',
};

export default function Integrations() {
  const router = useRouter();
  const { profile, loadProfile } = useAuthStore();
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [busy, setBusy] = useState<string>();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    try { setConnections(await loadIntegrationConnections(profile.id)); }
    catch (error) { Alert.alert('Could not load connections', error instanceof Error ? error.message : 'Try again.'); }
    finally { setLoading(false); }
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return INTEGRATION_PROVIDERS.filter((provider) => (category === 'all' || provider.category === category)
      && (!query || `${provider.name} ${provider.description} ${provider.dataTypes.join(' ')}`.toLowerCase().includes(query)));
  }, [category, search]);
  const connectionFor = (providerId: string) => connections.find((item) => item.providerId === providerId);

  const importFile = async (provider: IntegrationProvider) => {
    if (!profile) return;
    setBusy(provider.id);
    try {
      const selected = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'application/json', 'text/plain', 'application/octet-stream'], copyToCacheDirectory: true });
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const text = await (await fetch(asset.uri)).text();
      const events = parseIntegrationFile(text, asset.name, provider.id);
      const imported = await importIntegrationEvents(provider.id, 'file', provider.name, events, asset.name, profile);
      await Promise.all([refresh(), loadProfile(profile.id)]);
      Alert.alert('Import complete', `${imported} new observations imported. Duplicates were skipped.`);
    } catch (error) { Alert.alert('Import failed', error instanceof Error ? error.message : 'The file could not be imported.'); }
    finally { setBusy(undefined); }
  };

  const connect = async (provider: IntegrationProvider) => {
    setBusy(provider.id);
    try {
      if (provider.nativeOnly) Alert.alert('Native health permission', `${provider.name} is connected from the iOS or Android build because health data stays on the device. Until that native permission is available, you can import an export file here.`);
      else if (provider.oauthReady) await connectOAuthProvider(provider.id);
      else Alert.alert('Provider access', `${provider.name} requires provider approval. File import is already available now.`);
    } catch (error) { Alert.alert('Connection not available', error instanceof Error ? error.message : 'Try again.'); }
    finally { setBusy(undefined); }
  };

  const sync = async (provider: IntegrationProvider) => {
    if (!profile) return;
    setBusy(provider.id);
    try {
      const imported = await syncIntegration(provider.id, profile);
      await Promise.all([refresh(), loadProfile(profile.id)]);
      Alert.alert('Sync complete', `${imported} new observations imported.`);
    } catch (error) { Alert.alert('Sync failed', error instanceof Error ? error.message : 'Try again.'); }
    finally { setBusy(undefined); }
  };

  const disconnect = (provider: IntegrationProvider) => Alert.alert(`Disconnect ${provider.name}?`, 'The connection, encrypted credentials and imported source events will be deleted. Existing category entries derived from previous imports remain in your private tracker.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Disconnect', style: 'destructive', onPress: async () => { setBusy(provider.id); try { await disconnectIntegration(provider.id); await refresh(); } catch (error) { Alert.alert('Disconnect failed', error instanceof Error ? error.message : 'Try again.'); } finally { setBusy(undefined); } } },
  ]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-4 pb-5 border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()} className="mb-5"><Text className="text-gold text-sm">‹ Profile</Text></TouchableOpacity>
          <Text className="text-white text-3xl font-bold">Connected Tracking</Text>
          <Text className="text-white/50 text-sm leading-5 mt-2">Bring fitness, sleep, nutrition, mental wellbeing and focus data into one private system.</Text>
        </View>
        <View className="px-6 pt-5">
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 bg-surface-raised rounded-2xl p-4 border border-surface-border"><Text className="text-gold text-2xl font-bold">{connections.filter((item) => item.status === 'active').length}</Text><Text className="text-white/40 text-xs mt-1">Active sources</Text></View>
            <View className="flex-1 bg-surface-raised rounded-2xl p-4 border border-surface-border"><Text className="text-white text-2xl font-bold">{INTEGRATION_PROVIDERS.length}</Text><Text className="text-white/40 text-xs mt-1">Supported paths</Text></View>
          </View>
          <View className="bg-gold/10 border border-gold/30 rounded-2xl p-4 mb-5"><Text className="text-gold font-bold text-sm">Private by design</Text><Text className="text-white/55 text-xs leading-5 mt-2">You choose each source and file. OAuth tokens are encrypted server-side. Imported health values are private, never shown on your social profile, and medical readings never create an automatic health judgment.</Text></View>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search apps or data types" placeholderTextColor="#555" className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3 text-white mb-4" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5"><View className="flex-row gap-2 pr-6">{INTEGRATION_CATEGORIES.map((item) => <TouchableOpacity key={item.id} onPress={() => setCategory(item.id)} className="rounded-full px-4 py-2 border" style={{ backgroundColor: category === item.id ? '#C9A84C' : '#171717', borderColor: category === item.id ? '#C9A84C' : '#2A2A2A' }}><Text className="text-xs font-semibold" style={{ color: category === item.id ? '#0A0A0A' : '#999' }}>{item.label}</Text></TouchableOpacity>)}</View></ScrollView>
          {loading ? <ActivityIndicator color="#C9A84C" className="my-12" /> : filtered.map((provider) => {
            const connection = connectionFor(provider.id); const isBusy = busy === provider.id;
            return <View key={provider.id} className="bg-surface-raised border border-surface-border rounded-2xl p-5 mb-3">
              <View className="flex-row items-start"><View className="w-11 h-11 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: provider.accent + '22', borderWidth: 1, borderColor: provider.accent + '55' }}><Text className="font-bold" style={{ color: provider.accent }}>{provider.name.slice(0, 2).toUpperCase()}</Text></View><View className="flex-1"><View className="flex-row items-center flex-wrap gap-2"><Text className="text-white font-bold text-base">{provider.name}</Text>{connection?.status === 'active' && <View className="bg-green-500/15 rounded-full px-2 py-1"><Text className="text-green-400 text-[10px] font-bold uppercase">Connected</Text></View>}</View><Text className="text-white/35 text-[11px] mt-1">{modeLabel[provider.mode]}{provider.partnerApproval ? ' · approval required' : ''}</Text></View></View>
              <Text className="text-white/55 text-sm leading-5 mt-4">{provider.description}</Text>
              <View className="flex-row flex-wrap gap-1.5 mt-3">{provider.dataTypes.slice(0, 6).map((type) => <View key={type} className="bg-black/25 rounded-full px-2.5 py-1"><Text className="text-white/45 text-[10px]">{dataLabels[type] ?? type}</Text></View>)}{provider.dataTypes.length > 6 && <Text className="text-white/30 text-[10px] self-center">+{provider.dataTypes.length - 6}</Text>}</View>
              {connection?.lastSyncedAt && <Text className="text-white/30 text-[10px] mt-3">Last sync {new Date(connection.lastSyncedAt).toLocaleString()}</Text>}
              <View className="flex-row flex-wrap gap-2 mt-4">{connection?.status === 'active' && provider.mode === 'oauth' ? <TouchableOpacity disabled={isBusy} onPress={() => sync(provider)} className="bg-gold rounded-xl px-4 py-2.5"><Text className="text-surface text-xs font-bold">Sync now</Text></TouchableOpacity> : provider.mode !== 'file' && <TouchableOpacity disabled={isBusy} onPress={() => connect(provider)} className="bg-gold rounded-xl px-4 py-2.5"><Text className="text-surface text-xs font-bold">{provider.nativeOnly ? 'Enable on device' : provider.partnerApproval && !provider.oauthReady ? 'Access options' : 'Connect account'}</Text></TouchableOpacity>}<TouchableOpacity disabled={isBusy} onPress={() => importFile(provider)} className="border border-surface-border rounded-xl px-4 py-2.5"><Text className="text-white/70 text-xs font-bold">Import CSV / JSON</Text></TouchableOpacity>{connection && <TouchableOpacity disabled={isBusy} onPress={() => disconnect(provider)} className="px-3 py-2.5"><Text className="text-red-400/70 text-xs">Disconnect</Text></TouchableOpacity>}{isBusy && <ActivityIndicator color="#C9A84C" size="small" />}</View>
            </View>;
          })}
          {!loading && !filtered.length && <Text className="text-white/40 text-center py-12">No matching source found.</Text>}
          <View className="bg-surface-raised border border-surface-border rounded-2xl p-5 mt-3"><Text className="text-white font-bold">Universal import format</Text><Text className="text-white/45 text-xs leading-5 mt-2">CSV columns: type, value, unit, occurred_at. JSON may contain the same fields in an array or an events array. Imports are limited to 500 observations per file and duplicates are skipped.</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
