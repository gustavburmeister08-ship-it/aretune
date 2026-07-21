import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { PILLARS } from '../../lib/pillars';
import { loadSocialProfile, SOCIAL_PLATFORMS } from '../../lib/social-profile';
import { connectGoogleCalendar, disconnectGoogleCalendar, getCalendarConnectionStatus } from '../../lib/calendar';
import { SextetChart } from '../../components/profile/SextetChart';
import { MiniHexagon } from '../../components/profile/MiniHexagon';
import { BenchmarkStandings } from '../../components/profile/BenchmarkStandings';
import { loadBenchmarkStandings, type BenchmarkStanding } from '../../lib/benchmark-summary';
import type { SocialLink, SocialProfile } from '../../types';

const PHASE_DESCRIPTIONS = {
  dissonance: "You're aware something is off. The gap between who you are and who you could be is visible. Good — awareness precedes change.",
  uncertainty: "You're searching. The old patterns don't fit. You're building new ones. Stay in the work.",
  discovery: "You're executing. The systems are in place. Now it's about compounding gains.",
};

export default function Profile() {
  const router = useRouter();
  const { profile, signOut, loadProfile } = useAuthStore();
  const [socialProfile, setSocialProfile] = useState<SocialProfile>();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [standings, setStandings] = useState<BenchmarkStanding[]>([]);

  useFocusEffect(useCallback(() => {
    if (!profile?.id) return;
    void loadProfile(profile.id);
    loadSocialProfile(profile.id)
      .then(({ profile: nextProfile, links }) => { setSocialProfile(nextProfile); setSocialLinks(links); })
      .catch(() => undefined);
    getCalendarConnectionStatus(profile.id).then(setCalendarStatus).catch(() => undefined);
    loadBenchmarkStandings(profile.id).then(setStandings).catch(() => undefined);
  }, [profile?.id, loadProfile]));

  const toggleCalendar = async () => {
    setCalendarBusy(true);
    try {
      if (calendarStatus === 'connected') {
        await disconnectGoogleCalendar();
        setCalendarStatus('disconnected');
      } else {
        await connectGoogleCalendar();
      }
    } catch (error) {
      Alert.alert('Google Calendar', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setCalendarBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  if (!profile) return null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1 px-6 pt-6" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View className="items-center mb-6">
          <View className="absolute right-0 top-0"><MiniHexagon scores={profile.pillarScores} size={46} showGrid dots /></View>
          <View className="w-24 h-24 rounded-full bg-surface-raised border-2 border-gold items-center justify-center mb-4 overflow-hidden">
            {socialProfile?.avatarUrl ? (
              <Image source={{ uri: socialProfile.avatarUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Text className="text-3xl text-white">{profile.displayName?.[0]?.toUpperCase() ?? '◉'}</Text>
            )}
          </View>
          <Text className="text-white text-xl font-bold">{profile.displayName ?? 'Operator'}</Text>
          {profile.username && <Text className="text-gold/80 text-sm mt-1">@{profile.username}</Text>}
          <Text className="text-white/30 text-xs mt-1">{profile.email}</Text>
          {socialProfile?.bio ? (
            <Text className="text-white/60 text-sm text-center leading-5 mt-3 max-w-sm">{socialProfile.bio}</Text>
          ) : (
            <Text className="text-white/30 text-sm text-center mt-3">Add a short description and your social profiles.</Text>
          )}

          {socialLinks.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-2 mt-4">
              {socialLinks.map((link) => {
                const platform = SOCIAL_PLATFORMS.find((item) => item.id === link.platform);
                return (
                  <TouchableOpacity
                    key={link.platform}
                    className="bg-surface-raised border border-surface-border rounded-full px-3 py-2"
                    onPress={() => Linking.openURL(link.url)}
                  >
                    <Text className="text-white/70 text-xs font-semibold">{platform?.shortLabel ?? link.platform}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            className="bg-gold rounded-xl px-5 py-3 mt-5"
            onPress={() => router.push('/(app)/social-profile' as never)}
          >
            <Text className="text-surface font-bold text-sm">Edit Social Profile</Text>
          </TouchableOpacity>

          <View className="flex-row gap-3 mt-4">
            <View className="bg-surface-raised rounded-full px-4 py-1.5"><Text className="text-gold text-xs font-medium tracking-widest uppercase">Level {profile.level}</Text></View>
            <TouchableOpacity className="bg-surface-raised rounded-full px-4 py-1.5" onPress={() => router.push('/(app)/billing' as never)}>
              <Text className="text-white/50 text-xs tracking-widest uppercase">{profile.subscriptionTier === 'pro' ? 'Pro' : 'Free'}</Text>
            </TouchableOpacity>
            {profile.foundingMember && (
              <View className="bg-gold/10 border border-gold/40 rounded-full px-4 py-1.5"><Text className="text-gold text-xs tracking-widest uppercase">⭑ Founding</Text></View>
            )}
          </View>
        </View>

        <View className="bg-surface-raised rounded-2xl p-5 mb-6">
          <Text className="text-gold text-xs tracking-widest uppercase mb-2">Current Phase</Text>
          <Text className="text-white text-lg font-bold mb-2 capitalize">{profile.phase}</Text>
          <Text className="text-white/50 text-sm leading-relaxed">{PHASE_DESCRIPTIONS[profile.phase]}</Text>
        </View>

        <View className="mb-6">
          <SextetChart scores={profile.pillarScores} />
        </View>

        {standings.length > 0 && (
          <View className="mb-6">
            <BenchmarkStandings standings={standings} />
          </View>
        )}

        <View className="bg-surface-raised rounded-2xl p-5 mb-6">
          <Text className="text-white/50 text-xs tracking-widest uppercase mb-4">Active Pillars</Text>
          <View className="flex-row flex-wrap gap-2">
            {PILLARS.map((pillar) => {
              const active = profile.activePillars?.includes(pillar.id);
              return (
                <View key={pillar.id} className="flex-row items-center gap-1.5 px-3 py-2 rounded-full" style={{ backgroundColor: active ? pillar.color + '22' : '#1A1A1A', borderWidth: 1, borderColor: active ? pillar.color + '55' : '#2A2A2A' }}>
                  <Text style={{ fontSize: 12 }}>{pillar.icon}</Text>
                  <Text className="text-xs font-medium" style={{ color: active ? pillar.color : '#444' }}>{pillar.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="bg-surface-raised rounded-2xl p-5 mb-6">
          <Text className="text-white/50 text-xs tracking-widest uppercase mb-2">Google Calendar</Text>
          <Text className="text-white/40 text-sm mb-4">
            {calendarStatus === 'connected'
              ? "Connected. Today's meetings are included as read-only context in your AI chat."
              : 'Connect to let your AI coach plan around your meetings.'}
          </Text>
          <TouchableOpacity className="border border-gold rounded-xl py-3 items-center" onPress={() => void toggleCalendar()} disabled={calendarBusy}>
            {calendarBusy ? <ActivityIndicator color="#C9A84C" /> : (
              <Text className="text-gold font-bold">{calendarStatus === 'connected' ? 'Disconnect' : 'Connect Google Calendar'}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="bg-surface-raised rounded-2xl overflow-hidden mb-6">
          {[
            { label: 'Plan & Billing', icon: '✦', onPress: () => router.push('/(app)/billing' as never) },
            { label: 'Connected Tracking Apps', icon: '⌁', onPress: () => router.push('/(app)/integrations' as never) },
            { label: 'Privacy & Data', icon: '🔒', onPress: () => router.push('/(app)/privacy' as never) },
            { label: 'About ARETUNE', icon: 'ⓘ', onPress: () => Alert.alert('ARETUNE', 'Six pillars. One daily action. Honest weekly progress.') },
            { label: 'Visit Website', icon: '🌐', onPress: () => Linking.openURL('https://aretune.com') },
          ].map((item, index, items) => (
            <TouchableOpacity key={item.label} onPress={item.onPress} className="flex-row items-center px-5 py-4" style={{ borderBottomWidth: index < items.length - 1 ? 1 : 0, borderBottomColor: '#2A2A2A' }}>
              <Text className="mr-3" style={{ fontSize: 16 }}>{item.icon}</Text>
              <Text className="text-sm font-medium flex-1" style={{ color: '#CCC' }}>{item.label}</Text>
              <Text className="text-white/20">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity className="py-4 items-center rounded-2xl border border-surface-border" onPress={handleSignOut}>
          <Text className="text-white/40 text-sm">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
