import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { AI_NOTICE_VERSION, PRIVACY_VERSION, TERMS_VERSION } from '../lib/legal';
import { useAuthStore } from '../store/auth';

function ConsentRow({ checked, label, onPress, onOpen }: { checked: boolean; label: string; onPress: () => void; onOpen: () => void }) {
  return (
    <View className="flex-row items-start gap-3 py-3">
      <TouchableOpacity onPress={onPress} className="w-6 h-6 border border-gold rounded-md items-center justify-center">
        <Text className="text-gold font-bold">{checked ? '✓' : ''}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onOpen} className="flex-1">
        <Text className="text-white/80 text-sm leading-relaxed underline">{label}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function LegalConsentScreen() {
  const router = useRouter();
  const { user, loadProfile } = useAuthStore();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  const open = (document: 'privacy' | 'terms' | 'ai') =>
    router.push({ pathname: '/legal', params: { document } } as never);

  const continueToApp = async () => {
    if (!user || !terms || !privacy) return;
    setSaving(true);
    const occurredAt = new Date().toISOString();
    try {
      const { error: consentError } = await supabase.from('user_consents').insert([
        { user_id: user.id, consent_type: 'terms', document_version: TERMS_VERSION, granted: true, occurred_at: occurredAt },
        { user_id: user.id, consent_type: 'privacy', document_version: PRIVACY_VERSION, granted: true, occurred_at: occurredAt },
        { user_id: user.id, consent_type: 'ai_sensitive_data', document_version: AI_NOTICE_VERSION, granted: aiConsent, occurred_at: occurredAt },
      ]);
      if (consentError) throw consentError;
      const { error: profileError } = await supabase.from('profiles').update({
        legal_consent_complete: true,
        ai_processing_consent: aiConsent,
        terms_version: TERMS_VERSION,
        privacy_version: PRIVACY_VERSION,
        legal_accepted_at: occurredAt,
      }).eq('id', user.id);
      if (profileError) throw profileError;
      await loadProfile(user.id);
      router.replace('/');
    } catch (error) {
      Alert.alert('Could not save your choices', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingVertical: 32 }}>
        <Text className="text-gold text-xs tracking-[4px] uppercase mb-3">Before you begin</Text>
        <Text className="text-white text-3xl font-bold mb-3">Your data. Your decision.</Text>
        <Text className="text-white/50 text-sm leading-relaxed mb-8">
          Tracking works without AI. AI coaching is optional because your metrics can reveal sensitive information.
        </Text>
        <ConsentRow checked={terms} onPress={() => setTerms(!terms)} onOpen={() => open('terms')} label="I accept the Terms of Use." />
        <ConsentRow checked={privacy} onPress={() => setPrivacy(!privacy)} onOpen={() => open('privacy')} label="I have read the Privacy Policy." />
        <ConsentRow checked={aiConsent} onPress={() => setAiConsent(!aiConsent)} onOpen={() => open('ai')} label="Optional: I explicitly consent to AI processing of my potentially sensitive check-in data." />
        <TouchableOpacity className="bg-gold rounded-2xl py-4 items-center mt-8" disabled={!terms || !privacy || saving} style={{ opacity: terms && privacy && !saving ? 1 : 0.35 }} onPress={continueToApp}>
          {saving ? <ActivityIndicator color="#111" /> : <Text className="text-surface font-bold">Continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
