import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { deleteAccount, exportAccountData } from '../../lib/account';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import { AI_NOTICE_VERSION } from '../../lib/legal';

export default function PrivacyScreen() {
  const router = useRouter();
  const { user, profile, signOut, loadProfile } = useAuthStore();
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const data = await exportAccountData(user.id);
      await Share.share({ message: JSON.stringify(data, null, 2), title: 'UEBERMENSCH.AI data export' });
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDeletion = () => {
    Alert.alert(
      'Delete account permanently?',
      'This deletes your profile, check-ins, scores, tracker connections, encrypted credentials, imported events, directives, and audits. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete permanently', style: 'destructive', onPress: () => void (async () => {
            setBusy(true);
            try {
              await deleteAccount();
              await signOut();
              router.replace('/(auth)/welcome');
            } catch (error) {
              Alert.alert('Deletion failed', error instanceof Error ? error.message : 'Please contact support.');
              setBusy(false);
            }
          })(),
        },
      ]
    );
  };

  const setAiConsent = async (granted: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      const { error: consentError } = await supabase.from('user_consents').insert({
        user_id: user.id,
        consent_type: 'ai_sensitive_data',
        document_version: AI_NOTICE_VERSION,
        granted,
      });
      if (consentError) throw consentError;
      const { error: profileError } = await supabase.from('profiles')
        .update({ ai_processing_consent: granted })
        .eq('id', user.id);
      if (profileError) throw profileError;
      await loadProfile(user.id);
    } catch (error) {
      Alert.alert('Could not update consent', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-gold">Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold mb-2">Privacy & Data</Text>
        <Text className="text-white/50 text-sm leading-relaxed mb-8">
          Your check-ins and connected trackers may contain sensitive health, relationship, and financial information. You control every connection, export, and deletion.
        </Text>
        <View className="bg-surface-raised rounded-2xl p-5 mb-4">
          <Text className="text-white font-bold mb-2">AI processing</Text>
          <Text className="text-white/40 text-sm mb-4">
            {profile?.aiProcessingConsent ? 'Enabled. Potentially sensitive metrics may be sent to the configured AI API.' : 'Disabled. Tracking and deterministic scoring remain available.'}
          </Text>
          <TouchableOpacity className="border border-gold rounded-xl py-3 items-center" onPress={() => void setAiConsent(!profile?.aiProcessingConsent)} disabled={busy}>
            <Text className="text-gold font-bold">{profile?.aiProcessingConsent ? 'Withdraw AI consent' : 'Enable AI coaching'}</Text>
          </TouchableOpacity>
          <TouchableOpacity className="py-3 items-center" onPress={() => router.push({ pathname: '/legal', params: { document: 'ai' } } as never)}>
            <Text className="text-white/40 underline">Read AI transparency notice</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-surface-raised rounded-2xl p-5 mb-4">
          <Text className="text-white font-bold mb-2">Connected trackers</Text>
          <Text className="text-white/40 text-sm mb-4">Review or disconnect external sources. OAuth credentials are encrypted and are never included in exports.</Text>
          <TouchableOpacity className="border border-gold rounded-xl py-3 items-center" onPress={() => router.push('/(app)/integrations' as never)} disabled={busy}>
            <Text className="text-gold font-bold">Manage connections</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-surface-raised rounded-2xl p-5 mb-4">
          <Text className="text-white font-bold mb-2">Export my data</Text>
          <Text className="text-white/40 text-sm mb-4">Creates a JSON copy of your profile and activity for sharing or storage.</Text>
          <TouchableOpacity className="border border-gold rounded-xl py-3 items-center" onPress={exportData} disabled={busy}>
            <Text className="text-gold font-bold">Export</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-surface-raised rounded-2xl p-5 mb-4">
          <Text className="text-white font-bold mb-2">Delete account</Text>
          <Text className="text-white/40 text-sm mb-4">Permanently removes your account and all associated product data.</Text>
          <TouchableOpacity className="border border-red-500/50 rounded-xl py-3 items-center" onPress={confirmDeletion} disabled={busy}>
            <Text className="text-red-400 font-bold">Delete permanently</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row justify-center gap-5 py-4">
          <TouchableOpacity onPress={() => router.push({ pathname: '/legal', params: { document: 'privacy' } } as never)}><Text className="text-white/40 underline">Privacy</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: '/legal', params: { document: 'terms' } } as never)}><Text className="text-white/40 underline">Terms</Text></TouchableOpacity>
        </View>
        {busy && <ActivityIndicator color="#C9A84C" className="mt-6" />}
      </ScrollView>
    </SafeAreaView>
  );
}
