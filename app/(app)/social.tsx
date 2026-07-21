import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, RefreshControl, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../../store/auth';
import {
  createSocialPost,
  deleteSocialPost,
  loadSocialFeed,
  removeSocialImage,
  reportSocialContent,
  togglePostLike,
  uploadSocialImage,
} from '../../lib/community';
import { PostCard } from '../../components/social/PostCard';
import type { CommunityPost, SocialReportReason } from '../../types';

const PAGE_SIZE = 15;

export default function SocialFeedScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [body, setBody] = useState('');
  const [image, setImage] = useState<{ uri: string; base64: string; mimeType: string }>();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);

  const fetchPage = useCallback(async (nextPage: number, replace = false) => {
    if (!profile?.id) return;
    const next = await loadSocialFeed(profile.id, nextPage, PAGE_SIZE);
    setPosts((current) => replace ? next : [...current, ...next.filter((item) => !current.some((existing) => existing.id === item.id))]);
    setPage(nextPage);
    setHasMore(next.length === PAGE_SIZE);
  }, [profile?.id]);

  useEffect(() => {
    fetchPage(0, true).catch(() => Alert.alert('Could not load community feed')).finally(() => setLoading(false));
  }, [fetchPage]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchPage(0, true).catch(() => undefined);
    setRefreshing(false);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo access required');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, base64: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) return Alert.alert('Image too large', 'Choose an image under 10 MB.');
    if (!asset.base64) return Alert.alert('Could not read image');
    setImage({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
  };

  const publish = async () => {
    if (!profile?.id || posting || (!body.trim() && !image)) return;
    setPosting(true);
    let uploadedPath: string | undefined;
    try {
      if (image) uploadedPath = await uploadSocialImage(profile.id, image.base64, image.mimeType);
      await createSocialPost(profile.id, body, uploadedPath);
      setBody('');
      setImage(undefined);
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (uploadedPath) await removeSocialImage(uploadedPath).catch(() => undefined);
      Alert.alert('Could not publish', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (post: CommunityPost) => {
    if (!profile?.id) return;
    setPosts((current) => current.map((item) => item.id === post.id ? {
      ...item,
      likedByMe: !item.likedByMe,
      likeCount: Math.max(0, item.likeCount + (item.likedByMe ? -1 : 1)),
    } : item));
    await togglePostLike(profile.id, post.id, post.likedByMe).catch(() => refresh());
  };

  const report = (post: CommunityPost, reason: SocialReportReason) => {
    if (!profile?.id) return;
    reportSocialContent(profile.id, reason, { postId: post.id })
      .then(() => Alert.alert('Report received', 'Thank you. The post has been queued for review.'))
      .catch(() => Alert.alert('Could not submit report'));
  };

  const openMenu = (post: CommunityPost) => {
    if (post.userId === profile?.id) {
      Alert.alert('Your post', 'Delete this post?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSocialPost(post.id).then(refresh).catch(() => Alert.alert('Could not delete post')) },
      ]);
      return;
    }
    Alert.alert('Report post', 'Why are you reporting this?', [
      { text: 'Spam', onPress: () => report(post, 'spam') },
      { text: 'Harassment', onPress: () => report(post, 'harassment') },
      { text: 'Other', onPress: () => report(post, 'other') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const header = (
    <View>
      <View className="px-5 pt-4 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-2xl font-bold">Community</Text>
          <Text className="text-white/35 text-xs mt-1">Share progress. Build with serious people.</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity className="bg-surface-raised border border-surface-border rounded-xl px-3 py-3" onPress={() => router.push('/(app)/leaderboard' as never)}>
            <Text style={{ fontSize: 16 }}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-surface-raised border border-surface-border rounded-xl px-4 py-3" onPress={() => router.push('/(app)/messages' as never)}>
            <Text className="text-gold font-bold text-sm">Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity className="bg-surface-raised border border-surface-border rounded-xl px-3 py-3" onPress={() => router.push('/(app)/profile' as never)}>
            <Text style={{ fontSize: 16 }}>◉</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="bg-surface-raised border-y border-surface-border px-5 py-4">
        <TextInput
          className="text-white text-base min-h-20"
          placeholder="Share a milestone, lesson or question…"
          placeholderTextColor="#555"
          multiline maxLength={2000} value={body} onChangeText={setBody}
          style={{ textAlignVertical: 'top' }}
        />
        {image && (
          <View className="mt-3 rounded-2xl overflow-hidden">
            <Image source={{ uri: image.uri }} style={{ width: '100%', aspectRatio: 16 / 9 }} resizeMode="cover" />
            <TouchableOpacity className="absolute top-2 right-2 bg-black/70 rounded-full w-8 h-8 items-center justify-center" onPress={() => setImage(undefined)}><Text className="text-white">×</Text></TouchableOpacity>
          </View>
        )}
        <View className="flex-row items-center justify-between mt-3">
          <TouchableOpacity className="px-3 py-2" onPress={pickImage}><Text className="text-gold text-sm font-semibold">＋ Photo</Text></TouchableOpacity>
          <View className="flex-row items-center gap-3">
            <Text className="text-white/25 text-xs">{body.length}/2000</Text>
            <TouchableOpacity className="bg-gold rounded-xl px-5 py-2.5" disabled={posting || (!body.trim() && !image)} style={{ opacity: posting || (!body.trim() && !image) ? 0.45 : 1 }} onPress={publish}>
              <Text className="text-surface font-bold text-sm">{posting ? 'Posting…' : 'Post'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} currentUserId={profile?.id ?? ''} onLike={handleLike} onMenu={openMenu} />}
        ListHeaderComponent={header}
        ListEmptyComponent={!loading ? <Text className="text-white/35 text-center py-16">No posts yet. Start the conversation.</Text> : null}
        ListFooterComponent={loading ? <Text className="text-white/30 text-center py-8">Loading…</Text> : <View className="h-8" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#C9A84C" />}
        onEndReached={() => { if (hasMore && !loading) { setLoading(true); fetchPage(page + 1).finally(() => setLoading(false)); } }}
        onEndReachedThreshold={0.4}
      />
    </SafeAreaView>
  );
}
