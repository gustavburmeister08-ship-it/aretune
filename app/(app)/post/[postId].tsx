import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import {
  createPostComment,
  deletePostComment,
  deleteSocialPost,
  loadPostComments,
  loadSocialPost,
  reportSocialContent,
  togglePostLike,
} from '../../../lib/community';
import { Avatar, PostCard } from '../../../components/social/PostCard';
import type { CommunityComment, CommunityPost, SocialReportReason } from '../../../types';

export default function PostThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId: string }>();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const { profile } = useAuthStore();
  const [post, setPost] = useState<CommunityPost>();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!postId || !profile?.id) return;
    const [nextPost, nextComments] = await Promise.all([
      loadSocialPost(postId, profile.id),
      loadPostComments(postId),
    ]);
    setPost(nextPost);
    setComments(nextComments);
  }, [postId, profile?.id]);

  useEffect(() => { refresh().catch(() => Alert.alert('Could not load thread')).finally(() => setLoading(false)); }, [refresh]);

  const send = async () => {
    if (!profile?.id || !postId || !body.trim() || sending) return;
    setSending(true);
    try {
      await createPostComment(profile.id, postId, body);
      setBody('');
      await refresh();
    } catch {
      Alert.alert('Could not post comment');
    } finally {
      setSending(false);
    }
  };

  const like = async (item: CommunityPost) => {
    if (!profile?.id) return;
    setPost({ ...item, likedByMe: !item.likedByMe, likeCount: item.likeCount + (item.likedByMe ? -1 : 1) });
    await togglePostLike(profile.id, item.id, item.likedByMe).catch(refresh);
  };

  const report = (reason: SocialReportReason, target: { postId?: string; commentId?: string }) => {
    if (!profile?.id) return;
    reportSocialContent(profile.id, reason, target)
      .then(() => Alert.alert('Report received'))
      .catch(() => Alert.alert('Could not submit report'));
  };

  const postMenu = (item: CommunityPost) => {
    if (item.userId === profile?.id) {
      Alert.alert('Delete post?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSocialPost(item.id).then(() => router.back()).catch(() => undefined) },
      ]);
    } else {
      Alert.alert('Report post', undefined, [
        { text: 'Spam', onPress: () => report('spam', { postId: item.id }) },
        { text: 'Harassment', onPress: () => report('harassment', { postId: item.id }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const commentMenu = (comment: CommunityComment) => {
    if (comment.userId === profile?.id) {
      Alert.alert('Delete comment?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePostComment(comment.id).then(refresh).catch(() => undefined) },
      ]);
    } else {
      Alert.alert('Report comment', undefined, [
        { text: 'Harassment', onPress: () => report('harassment', { commentId: comment.id }) },
        { text: 'Spam', onPress: () => report('spam', { commentId: comment.id }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="px-5 py-4 flex-row items-center border-b border-surface-border">
          <TouchableOpacity onPress={() => router.back()} className="pr-4"><Text className="text-white/60 text-xl">‹</Text></TouchableOpacity>
          <Text className="text-white font-bold text-lg">Thread</Text>
        </View>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={post ? <PostCard post={post} currentUserId={profile?.id ?? ''} onLike={like} onMenu={postMenu} /> : null}
          ListEmptyComponent={!loading && post ? <Text className="text-white/30 text-center py-12">No comments yet.</Text> : null}
          renderItem={({ item }) => (
            <TouchableOpacity onLongPress={() => commentMenu(item)} className="px-5 py-4 border-b border-surface-border flex-row gap-3">
              <TouchableOpacity onPress={() => router.push(item.userId === profile?.id ? '/(app)/profile' as never : { pathname: '/(app)/profile/[userId]', params: { userId: item.userId } } as never)}>
                <Avatar uri={item.author.avatarUrl} name={item.author.displayName} size={38} />
              </TouchableOpacity>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity onPress={() => router.push(item.userId === profile?.id ? '/(app)/profile' as never : { pathname: '/(app)/profile/[userId]', params: { userId: item.userId } } as never)}>
                    <Text className="text-white font-bold text-sm">{item.author.displayName}</Text>
                    {item.author.username && <Text className="text-white/35 text-[11px]">@{item.author.username}</Text>}
                  </TouchableOpacity>
                  <Text className="text-white/25 text-[11px]">{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <Text className="text-white/70 text-sm leading-5 mt-1">{item.body}</Text>
              </View>
              <TouchableOpacity onPress={() => commentMenu(item)}><Text className="text-white/25">•••</Text></TouchableOpacity>
            </TouchableOpacity>
          )}
        />
        <View className="px-4 py-3 border-t border-surface-border bg-surface-raised flex-row items-end gap-3">
          <TextInput
            className="flex-1 bg-surface border border-surface-border rounded-2xl px-4 py-3 text-white max-h-28"
            placeholder="Write a comment…" placeholderTextColor="#555"
            multiline maxLength={1000} value={body} onChangeText={setBody}
          />
          <TouchableOpacity className="bg-gold rounded-xl px-4 py-3" disabled={!body.trim() || sending} style={{ opacity: !body.trim() || sending ? 0.45 : 1 }} onPress={send}>
            <Text className="text-surface font-bold">Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
