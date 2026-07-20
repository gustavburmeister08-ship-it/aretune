import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/auth';
import {
  loadSocialProfile,
  removeAvatar,
  saveSocialProfile,
  signedAvatarUrl,
  SOCIAL_PLATFORMS,
  uploadAvatar,
} from '../../lib/social-profile';
import { claimUsername, isUsernameAvailable, normalizeUsernameInput, usernameValidationError } from '../../lib/username';
import type { SocialPlatform } from '../../types';

type PendingAvatar = { uri: string; base64: string; mimeType: string };

export default function SocialProfileEditor() {
  const router = useRouter();
  const { profile, loadProfile } = useAuthStore();
  const [username, setUsername] = useState('');
  const [originalUsername, setOriginalUsername] = useState('');
  const [bio, setBio] = useState('');
  const [links, setLinks] = useState<Partial<Record<SocialPlatform, string>>>({});
  const [avatarPath, setAvatarPath] = useState<string>();
  const [originalAvatarPath, setOriginalAvatarPath] = useState<string>();
  const [avatarUrl, setAvatarUrl] = useState<string>();
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar>();
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    loadSocialProfile(profile.id)
      .then(({ profile: socialProfile, links: storedLinks }) => {
        const currentUsername = profile.username ?? socialProfile.username ?? '';
        setUsername(currentUsername);
        setOriginalUsername(currentUsername);
        setBio(socialProfile.bio);
        setAvatarPath(socialProfile.avatarPath);
        setOriginalAvatarPath(socialProfile.avatarPath);
        setAvatarUrl(socialProfile.avatarUrl);
        setIsDiscoverable(socialProfile.isDiscoverable);
        setLinks(Object.fromEntries(storedLinks.map((link) => [link.platform, link.url])));
      })
      .catch(() => Alert.alert('Could not load social profile'))
      .finally(() => setLoading(false));
  }, [profile?.id, profile?.username]);

  const chooseAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access required', 'Allow photo access to choose a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert('Image too large', 'Choose an image smaller than 5 MB.');
      return;
    }
    if (!asset.base64) {
      Alert.alert('Could not read image', 'Please choose a different JPEG, PNG or WebP image.');
      return;
    }
    setPendingAvatar({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
    setAvatarUrl(asset.uri);
  };

  const clearAvatar = () => {
    setPendingAvatar(undefined);
    setAvatarPath(undefined);
    setAvatarUrl(undefined);
  };

  const handleSave = async () => {
    if (!profile?.id || saving) return;
    setSaving(true);
    let uploadedPath: string | undefined;
    try {
      const validationError = usernameValidationError(username);
      if (validationError) throw new Error(validationError);
      if (username !== originalUsername) {
        if (!(await isUsernameAvailable(username))) throw new Error('This username is already taken.');
        const savedUsername = await claimUsername(username);
        setUsername(savedUsername);
        setOriginalUsername(savedUsername);
        await loadProfile(profile.id);
      }
      let nextPath = avatarPath;
      if (pendingAvatar) {
        uploadedPath = await uploadAvatar(profile.id, pendingAvatar.base64, pendingAvatar.mimeType);
        nextPath = uploadedPath;
      }
      await saveSocialProfile(profile.id, bio, nextPath, links, isDiscoverable);
      if (originalAvatarPath && originalAvatarPath !== nextPath) await removeAvatar(originalAvatarPath);
      setAvatarPath(nextPath);
      setOriginalAvatarPath(nextPath);
      setPendingAvatar(undefined);
      setAvatarUrl(await signedAvatarUrl(nextPath));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Social profile saved', 'Your description, picture and links are up to date.');
    } catch (error) {
      if (uploadedPath) await removeAvatar(uploadedPath).catch(() => undefined);
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} className="mb-6"><Text className="text-white/50">‹ Profile</Text></TouchableOpacity>
        <Text className="text-white text-2xl font-bold">Social Profile</Text>
        <Text className="text-white/40 text-sm mt-1 mb-7">Your identity and verified outbound profile links. No passwords or OAuth tokens are stored.</Text>

        {loading ? <Text className="text-white/40 text-center py-12">Loading…</Text> : (
          <View className="gap-6">
            <View>
              <Text className="text-white font-semibold text-sm mb-2">Username</Text>
              <View className="bg-surface-raised border border-surface-border rounded-2xl px-4 flex-row items-center">
                <Text className="text-gold text-base font-bold">@</Text>
                <TextInput
                  className="flex-1 text-white text-sm py-4 ml-1"
                  placeholder="username"
                  placeholderTextColor="#555"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={30}
                  value={username}
                  onChangeText={(value) => setUsername(normalizeUsernameInput(value))}
                  accessibilityLabel="Username"
                />
              </View>
              <Text className="text-white/30 text-xs mt-2">Your unique UEBERMENSCH.AI handle. Changing it releases the old username.</Text>
            </View>

            <View className="items-center">
              <View className="w-28 h-28 rounded-full bg-surface-raised border-2 border-gold overflow-hidden items-center justify-center">
                {avatarUrl ? <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" /> : <Text className="text-white/30 text-4xl">◉</Text>}
              </View>
              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity className="bg-gold rounded-xl px-4 py-3" onPress={chooseAvatar}><Text className="text-surface font-bold text-sm">Choose photo</Text></TouchableOpacity>
                {avatarUrl && <TouchableOpacity className="border border-surface-border rounded-xl px-4 py-3" onPress={clearAvatar}><Text className="text-white/50 text-sm">Remove</Text></TouchableOpacity>}
              </View>
              <Text className="text-white/25 text-xs mt-2">JPEG, PNG or WebP · max. 5 MB</Text>
            </View>

            <View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-white font-semibold text-sm">Description</Text>
                <Text className="text-white/30 text-xs">{bio.length}/300</Text>
              </View>
              <TextInput
                className="bg-surface-raised border border-surface-border rounded-2xl p-4 text-white text-sm"
                placeholder="What are you building, learning or becoming?"
                placeholderTextColor="#555"
                multiline maxLength={300} value={bio} onChangeText={setBio}
                style={{ minHeight: 110, textAlignVertical: 'top' }}
              />
            </View>

            <View className="bg-surface-raised border border-surface-border rounded-2xl p-4 flex-row items-center justify-between gap-4">
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">Community profile</Text>
                <Text className="text-white/35 text-xs leading-5 mt-1">Show your name, bio, avatar and links to signed-in community members. Posting also enables this automatically.</Text>
              </View>
              <Switch value={isDiscoverable} onValueChange={setIsDiscoverable} trackColor={{ false: '#2A2A2A', true: '#C9A84C66' }} thumbColor={isDiscoverable ? '#C9A84C' : '#666'} />
            </View>

            <View>
              <Text className="text-white font-semibold text-sm mb-1">Connected profiles</Text>
              <Text className="text-white/35 text-xs mb-4">Enter a username or the full profile URL. Empty fields are not displayed.</Text>
              <View className="gap-3">
                {SOCIAL_PLATFORMS.map((platform) => (
                  <View key={platform.id} className="bg-surface-raised border border-surface-border rounded-2xl px-4 py-3 flex-row items-center gap-3">
                    <View className="w-9 h-9 rounded-xl bg-surface items-center justify-center"><Text className="text-gold text-xs font-bold">{platform.shortLabel}</Text></View>
                    <View className="flex-1">
                      <Text className="text-white/50 text-[11px] font-semibold mb-1">{platform.label}</Text>
                      <TextInput
                        className="text-white text-sm py-1"
                        placeholder={platform.placeholder}
                        placeholderTextColor="#4A4A4A"
                        autoCapitalize="none" autoCorrect={false}
                        keyboardType="url"
                        value={links[platform.id] ?? ''}
                        onChangeText={(value) => setLinks((current) => ({ ...current, [platform.id]: value }))}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="bg-surface-raised border border-surface-border rounded-2xl p-4">
              <Text className="text-white/45 text-xs leading-5">Part 1 stores only links to your profiles. Publishing, importing posts or OAuth login requires separate approval and credentials from each platform.</Text>
            </View>

            <TouchableOpacity className="bg-gold rounded-2xl py-4 items-center" disabled={saving} style={{ opacity: saving ? 0.6 : 1 }} onPress={handleSave}>
              <Text className="text-surface font-bold">{saving ? 'Saving…' : 'Save Social Profile'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
