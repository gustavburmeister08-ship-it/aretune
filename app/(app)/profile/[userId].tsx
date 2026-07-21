import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Linking, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SextetChart } from '../../../components/profile/SextetChart';
import { PillarComparison } from '../../../components/profile/PillarComparison';
import { MiniHexagon } from '../../../components/profile/MiniHexagon';
import { PostCard } from '../../../components/social/PostCard';
import {
  getOrCreateDirectConversation,
  loadPublicCommunityProfile,
  loadSocialPostsByUser,
  reportSocialContent,
  togglePostLike,
} from '../../../lib/community';
import { PILLARS } from '../../../lib/pillars';
import { SOCIAL_PLATFORMS } from '../../../lib/social-profile';
import { useAuthStore } from '../../../store/auth';
import type { CommunityPost, PublicCommunityProfile, SocialLink, SocialReportReason } from '../../../types';

const COMPARE_COLOR = '#6C8CFF';

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const { profile: currentUser } = useAuthStore();
  const [profile, setProfile] = useState<PublicCommunityProfile>();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId || !currentUser?.id) return;
    if (userId === currentUser.id) {
      router.replace('/(app)/profile' as never);
      return;
    }
    const [{ profile: nextProfile, links: nextLinks }, nextPosts] = await Promise.all([
      loadPublicCommunityProfile(userId),
      loadSocialPostsByUser(userId, currentUser.id),
    ]);
    setProfile(nextProfile);
    setLinks(nextLinks);
    setPosts(nextPosts);
  }, [currentUser?.id, router, userId]);

  useEffect(() => {
    refresh()
      .catch(() => Alert.alert('Profile unavailable', 'This profile is private or no longer exists.', [{ text: 'Back', onPress: () => router.back() }]))
      .finally(() => setLoading(false));
  }, [refresh, router]);

  const openChat = async () => {
    if (!profile || openingChat) return;
    setOpeningChat(true);
    try {
      const conversationId = await getOrCreateDirectConversation(profile.userId);
      router.push({
        pathname: '/(app)/chat/[conversationId]',
        params: {
          conversationId,
          userId: profile.userId,
          name: profile.displayName,
          avatar: profile.avatarUrl ?? '',
        },
      } as never);
    } catch {
      Alert.alert('Could not start conversation');
      setOpeningChat(false);
    }
  };

  const like = async (post: CommunityPost) => {
    if (!currentUser?.id) return;
    setPosts((items) => items.map((item) => item.id === post.id ? {
      ...item,
      likedByMe: !item.likedByMe,
      likeCount: Math.max(0, item.likeCount + (item.likedByMe ? -1 : 1)),
    } : item));
    await togglePostLike(currentUser.id, post.id, post.likedByMe).catch(refresh);
  };

  const report = (post: CommunityPost, reason: SocialReportReason) => {
    if (!currentUser?.id) return;
    reportSocialContent(currentUser.id, reason, { postId: post.id })
      .then(() => Alert.alert('Report received'))
      .catch(() => Alert.alert('Could not submit report'));
  };

  const menu = (post: CommunityPost) => Alert.alert('Report post', 'Why are you reporting this?', [
    { text: 'Spam', onPress: () => report(post, 'spam') },
    { text: 'Harassment', onPress: () => report(post, 'harassment') },
    { text: 'Cancel', style: 'cancel' },
  ]);

  const youScores = currentUser?.pillarScores ?? {};
  const canCompare = Object.keys(youScores).length > 0;
  const otherLabel = profile ? (profile.username ? `@${profile.username}` : profile.displayName) : '';

  const header = profile ? (
    <View>
      <View className="px-6 pt-3 pb-7 items-center border-b border-surface-border">
        <View className="w-28 h-28 rounded-full bg-surface-raised border-2 border-gold items-center justify-center overflow-hidden">
          {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} className="w-full h-full" resizeMode="cover" /> : <Text className="text-gold text-4xl font-bold">{profile.displayName[0]?.toUpperCase() ?? 'O'}</Text>}
        </View>
        <View className="absolute right-6 top-3"><MiniHexagon scores={profile.pillarScores} size={46} showGrid dots /></View>
        <Text className="text-white text-2xl font-bold text-center mt-4">{profile.displayName}</Text>
        {profile.username && <Text className="text-gold/80 text-sm mt-1">@{profile.username}</Text>}
        {!!profile.bio && <Text className="text-white/55 text-sm leading-5 text-center mt-2 max-w-md">{profile.bio}</Text>}
        <View className="flex-row gap-2 mt-4">
          <View className="bg-surface-raised rounded-full px-3 py-1.5"><Text className="text-gold text-[10px] tracking-widest uppercase">Level {profile.level}</Text></View>
          <View className="bg-surface-raised rounded-full px-3 py-1.5"><Text className="text-white/45 text-[10px] tracking-widest uppercase">{profile.phase}</Text></View>
        </View>
        <TouchableOpacity className="bg-gold rounded-xl px-6 py-3 mt-5" disabled={openingChat} onPress={openChat}>
          <Text className="text-surface font-bold">{openingChat ? 'Opening…' : 'Message'}</Text>
        </TouchableOpacity>
        {links.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-2 mt-4">
            {links.map((link) => {
              const platform = SOCIAL_PLATFORMS.find((item) => item.id === link.platform);
              return <TouchableOpacity key={link.platform} className="border border-surface-border rounded-full px-3 py-2" onPress={() => Linking.openURL(link.url)}><Text className="text-white/60 text-xs font-semibold">{platform?.shortLabel ?? link.platform}</Text></TouchableOpacity>;
            })}
          </View>
        )}
      </View>

      <View className="px-5 py-6 gap-5">
        <SextetChart
          scores={profile.pillarScores}
          overlay={canCompare ? { scores: youScores, color: COMPARE_COLOR, label: 'You', baseLabel: otherLabel } : undefined}
        />
        {canCompare && (
          <PillarComparison you={youScores} them={profile.pillarScores} themLabel={otherLabel} youColor={COMPARE_COLOR} />
        )}
      </View>

      <View className="px-5 pb-6">
        <Text className="text-white/45 text-xs tracking-widest uppercase mb-3">Focus pillars</Text>
        <View className="flex-row flex-wrap gap-2">
          {PILLARS.map((pillar) => {
            const active = profile.activePillars.includes(pillar.id);
            return <View key={pillar.id} className="rounded-full px-3 py-2 border" style={{ backgroundColor: active ? `${pillar.color}22` : '#151515', borderColor: active ? `${pillar.color}55` : '#282828' }}><Text style={{ color: active ? pillar.color : '#444', fontSize: 11, fontWeight: '600' }}>{pillar.label}</Text></View>;
          })}
        </View>
      </View>

      <View className="px-5 pt-2 pb-3 border-t border-surface-border">
        <Text className="text-white text-lg font-bold">Posts</Text>
        <Text className="text-white/30 text-xs mt-1">{posts.length} community contributions</Text>
      </View>
    </View>
  ) : null;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 py-4 flex-row items-center border-b border-surface-border">
        <TouchableOpacity onPress={() => router.back()} className="pr-4"><Text className="text-white/60 text-xl">‹</Text></TouchableOpacity>
        <Text className="text-white font-bold text-lg">Profile</Text>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={!loading && profile ? <Text className="text-white/25 text-center py-12">No posts yet.</Text> : null}
        ListFooterComponent={loading ? <Text className="text-white/30 text-center py-16">Loading profile…</Text> : <View className="h-8" />}
        renderItem={({ item }) => <PostCard post={item} currentUserId={currentUser?.id ?? ''} onLike={like} onMenu={menu} />}
      />
    </SafeAreaView>
  );
}
