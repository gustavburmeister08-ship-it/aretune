import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PILLAR_MAP } from '../../lib/pillars';
import { MiniHexagon } from '../profile/MiniHexagon';
import type { CommunityPost } from '../../types';

const relativeTime = (iso: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(iso).toLocaleDateString();
};

export function Avatar({ uri, name, size = 44 }: { uri?: string; name: string; size?: number }) {
  return (
    <View className="rounded-full bg-surface border border-surface-border overflow-hidden items-center justify-center" style={{ width: size, height: size }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text className="text-gold font-bold" style={{ fontSize: size * 0.36 }}>{name[0]?.toUpperCase() ?? 'O'}</Text>
      )}
    </View>
  );
}

function MilestoneBanner({ pillar, score }: { pillar: CommunityPost['milestonePillar']; score: number }) {
  const definition = pillar ? PILLAR_MAP[pillar] : undefined;
  if (!definition) return null;
  return (
    <View
      className="flex-row items-center gap-2 rounded-xl px-3 py-2 mt-2 self-start"
      style={{ backgroundColor: definition.color + '1A', borderWidth: 1, borderColor: definition.color + '55' }}
    >
      <Text style={{ fontSize: 16 }}>🏆</Text>
      <Text style={{ color: definition.color, fontWeight: '700', fontSize: 13 }}>
        {definition.label} milestone · {Math.round(score)}
      </Text>
    </View>
  );
}

export function PostCard({
  post,
  currentUserId,
  onLike,
  onMenu,
}: {
  post: CommunityPost;
  currentUserId: string;
  onLike: (post: CommunityPost) => void;
  onMenu: (post: CommunityPost) => void;
}) {
  const router = useRouter();
  const openPost = () => router.push({ pathname: '/(app)/post/[postId]', params: { postId: post.id } } as never);
  const openProfile = () => router.push(post.userId === currentUserId
    ? '/(app)/profile' as never
    : { pathname: '/(app)/profile/[userId]', params: { userId: post.userId } } as never);
  return (
    <View className="bg-surface-raised border-y border-surface-border px-5 py-4">
      <View className="flex-row items-start gap-3">
        <TouchableOpacity onPress={openProfile} accessibilityRole="link" accessibilityLabel={`Open ${post.author.displayName}'s profile`}>
          <View>
            <Avatar uri={post.author.avatarUrl} name={post.author.displayName} />
            {post.author.pillarScores && Object.keys(post.author.pillarScores).length > 0 && (
              <View className="absolute -bottom-1 -right-1 bg-surface rounded-full p-0.5 border border-surface-border">
                <MiniHexagon scores={post.author.pillarScores} size={18} strokeWidth={1.3} />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <TouchableOpacity onPress={openProfile} className="shrink" accessibilityRole="link">
                <Text className="text-white font-bold text-sm" numberOfLines={1}>{post.author.displayName}</Text>
                {post.author.username && <Text className="text-white/35 text-xs" numberOfLines={1}>@{post.author.username}</Text>}
              </TouchableOpacity>
              <Text className="text-white/25 text-xs">· {relativeTime(post.createdAt)}</Text>
            </View>
            <TouchableOpacity onPress={() => onMenu(post)} className="px-2 py-1">
              <Text className="text-white/35 text-lg">•••</Text>
            </TouchableOpacity>
          </View>
          {post.postType === 'milestone' && post.milestonePillar && post.milestoneScore != null && (
            <MilestoneBanner pillar={post.milestonePillar} score={post.milestoneScore} />
          )}
          {!!post.body && <Text className="text-white/80 text-[15px] leading-6 mt-2">{post.body}</Text>}
        </View>
      </View>

      {post.imageUrl && (
        <TouchableOpacity onPress={openPost} className="mt-3 rounded-2xl overflow-hidden border border-surface-border">
          <Image source={{ uri: post.imageUrl }} style={{ width: '100%', aspectRatio: 4 / 3 }} resizeMode="cover" />
        </TouchableOpacity>
      )}

      <View className="flex-row items-center gap-7 mt-4 ml-14">
        <TouchableOpacity className="flex-row items-center gap-2" onPress={() => onLike(post)}>
          <Text style={{ color: post.likedByMe ? '#FF6584' : '#777', fontSize: 18 }}>{post.likedByMe ? '♥' : '♡'}</Text>
          <Text style={{ color: post.likedByMe ? '#FF6584' : '#777', fontSize: 12 }}>{post.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center gap-2" onPress={openPost}>
          <Text className="text-white/45 text-base">◯</Text>
          <Text className="text-white/45 text-xs">{post.commentCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openPost}>
          <Text className="text-white/35 text-xs">View thread</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
