import { supabase } from './supabase';
import type {
  CommunityComment,
  CommunityPost,
  CommunityProfile,
  ConversationSummary,
  PillarLeaderboardEntry,
  PublicCommunityProfile,
  SocialLink,
  SocialMessage,
  SocialReportReason,
} from '../types';
import type { PillarId, SocialPlatform } from '../types';

const publicFileUrl = (bucket: 'avatars' | 'social-media', path?: string | null) => {
  if (!path) return undefined;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};

const mapProfile = (row: {
  user_id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_path: string | null;
}): CommunityProfile => ({
  userId: row.user_id,
  username: row.username ?? undefined,
  displayName: row.display_name || 'Operator',
  bio: row.bio,
  avatarUrl: publicFileUrl('avatars', row.avatar_path),
});

const fallbackProfile = (userId: string): CommunityProfile => ({
  userId,
  username: undefined,
  displayName: 'Operator',
  bio: '',
});

async function hydratePosts(rows: Array<{
  id: string;
  user_id: string;
  body: string;
  image_path: string | null;
  created_at: string;
  post_type: 'text' | 'milestone';
  milestone_pillar: string | null;
  milestone_score: number | null;
}>, currentUserId: string): Promise<CommunityPost[]> {
  if (!rows.length) return [];
  const postIds = rows.map((post) => post.id);
  const userIds = [...new Set(rows.map((post) => post.user_id))];
  const [profilesResult, likesResult, commentsResult] = await Promise.all([
    supabase.from('social_profiles').select('user_id,username,display_name,bio,avatar_path').in('user_id', userIds),
    supabase.from('social_post_likes').select('post_id,user_id').in('post_id', postIds),
    supabase.from('social_comments').select('post_id').in('post_id', postIds),
  ]);
  if (profilesResult.error) throw profilesResult.error;
  if (likesResult.error) throw likesResult.error;
  if (commentsResult.error) throw commentsResult.error;
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, mapProfile(profile)]));

  return rows.map((post) => {
    const likes = (likesResult.data ?? []).filter((like) => like.post_id === post.id);
    return {
      id: post.id,
      userId: post.user_id,
      body: post.body,
      imageUrl: publicFileUrl('social-media', post.image_path),
      createdAt: post.created_at,
      author: profiles.get(post.user_id) ?? fallbackProfile(post.user_id),
      likeCount: likes.length,
      commentCount: (commentsResult.data ?? []).filter((comment) => comment.post_id === post.id).length,
      likedByMe: likes.some((like) => like.user_id === currentUserId),
      postType: post.post_type,
      milestonePillar: (post.milestone_pillar as PillarId | null) ?? undefined,
      milestoneScore: post.milestone_score ?? undefined,
    };
  });
}

const POST_COLUMNS = 'id,user_id,body,image_path,created_at,post_type,milestone_pillar,milestone_score';

export async function loadSocialFeed(currentUserId: string, page = 0, pageSize = 15) {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from('social_posts')
    .select(POST_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return hydratePosts(data ?? [], currentUserId);
}

export async function loadSocialPostsByUser(userId: string, currentUserId: string, limit = 60) {
  const { data, error } = await supabase
    .from('social_posts')
    .select(POST_COLUMNS)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return hydratePosts(data ?? [], currentUserId);
}

export async function loadPublicCommunityProfile(userId: string): Promise<{
  profile: PublicCommunityProfile;
  links: SocialLink[];
}> {
  const [profileResult, linksResult] = await Promise.all([
    supabase.rpc('get_public_social_profile', { p_user_id: userId }),
    supabase.from('social_links').select('*').eq('user_id', userId).order('position'),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (linksResult.error) throw linksResult.error;
  const row = profileResult.data?.[0];
  if (!row) throw new Error('Profile is not available');

  return {
    profile: {
      userId: row.user_id,
      username: row.username ?? undefined,
      displayName: row.display_name || 'Operator',
      bio: row.bio,
      avatarUrl: publicFileUrl('avatars', row.avatar_path),
      phase: row.phase,
      level: row.level,
      activePillars: row.active_pillars as PillarId[],
      pillarScores: (row.pillar_scores ?? {}) as Partial<Record<PillarId, number>>,
      memberSince: row.member_since,
    },
    links: (linksResult.data ?? []).map((link) => ({
      id: link.id,
      userId: link.user_id,
      platform: link.platform as SocialPlatform,
      url: link.url,
      handle: link.handle ?? undefined,
      position: link.position,
    })),
  };
}

export async function loadSocialPost(postId: string, currentUserId: string) {
  const { data, error } = await supabase
    .from('social_posts')
    .select(POST_COLUMNS)
    .eq('id', postId)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return (await hydratePosts([data], currentUserId))[0];
}

export async function createSocialPost(userId: string, body: string, imagePath?: string) {
  const { data, error } = await supabase
    .from('social_posts')
    .insert({ user_id: userId, body: body.trim(), image_path: imagePath ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function deleteSocialPost(postId: string) {
  const { data } = await supabase.from('social_posts').select('image_path').eq('id', postId).maybeSingle();
  const { error } = await supabase.from('social_posts').delete().eq('id', postId);
  if (error) throw error;
  if (data?.image_path) await removeSocialImage(data.image_path);
}

export async function togglePostLike(userId: string, postId: string, currentlyLiked: boolean) {
  const result = currentlyLiked
    ? await supabase.from('social_post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    : await supabase.from('social_post_likes').insert({ post_id: postId, user_id: userId });
  if (result.error) throw result.error;
  return !currentlyLiked;
}

export async function loadPostComments(postId: string): Promise<CommunityComment[]> {
  const { data, error } = await supabase
    .from('social_comments')
    .select('id,post_id,user_id,parent_id,body,created_at')
    .eq('post_id', postId)
    .order('created_at');
  if (error) throw error;
  const userIds = [...new Set((data ?? []).map((comment) => comment.user_id))];
  const profilesResult = userIds.length
    ? await supabase.from('social_profiles').select('user_id,username,display_name,bio,avatar_path').in('user_id', userIds)
    : { data: [], error: null };
  if (profilesResult.error) throw profilesResult.error;
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, mapProfile(profile)]));
  return (data ?? []).map((comment) => ({
    id: comment.id,
    postId: comment.post_id,
    userId: comment.user_id,
    parentId: comment.parent_id ?? undefined,
    body: comment.body,
    createdAt: comment.created_at,
    author: profiles.get(comment.user_id) ?? fallbackProfile(comment.user_id),
  }));
}

export async function createPostComment(userId: string, postId: string, body: string, parentId?: string) {
  const { error } = await supabase.from('social_comments').insert({
    user_id: userId,
    post_id: postId,
    parent_id: parentId ?? null,
    body: body.trim(),
  });
  if (error) throw error;
}

export async function deletePostComment(commentId: string) {
  const { error } = await supabase.from('social_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function reportSocialContent(
  reporterId: string,
  reason: SocialReportReason,
  target: { postId?: string; commentId?: string },
  details?: string
) {
  const { error } = await supabase.from('social_reports').insert({
    reporter_id: reporterId,
    post_id: target.postId ?? null,
    comment_id: target.commentId ?? null,
    reason,
    details: details?.trim() || null,
  });
  if (error) throw error;
}

export async function uploadSocialImage(userId: string, base64: string, mimeType = 'image/jpeg') {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/post-${Date.now()}.${extension}`;
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const { error } = await supabase.storage.from('social-media').upload(path, bytes.buffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeSocialImage(path?: string) {
  if (!path) return;
  const { error } = await supabase.storage.from('social-media').remove([path]);
  if (error) throw error;
}

export async function loadDiscoverableProfiles(currentUserId: string) {
  const { data, error } = await supabase
    .from('social_profiles')
    .select('user_id,username,display_name,bio,avatar_path')
    .eq('is_discoverable', true)
    .neq('user_id', currentUserId)
    .order('display_name')
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}

export async function getOrCreateDirectConversation(otherUserId: string) {
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other_user_id: otherUserId,
  });
  if (error || !data) throw error ?? new Error('Could not create conversation');
  return data;
}

const mapMessage = (row: {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}): SocialMessage => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  body: row.body,
  createdAt: row.created_at,
});

export async function loadConversationSummaries(userId: string): Promise<ConversationSummary[]> {
  const { data: ownMemberships, error: ownError } = await supabase
    .from('social_conversation_members')
    .select('conversation_id,last_read_at')
    .eq('user_id', userId);
  if (ownError) throw ownError;
  const conversationIds = (ownMemberships ?? []).map((member) => member.conversation_id);
  if (!conversationIds.length) return [];

  const [membersResult, messagesResult] = await Promise.all([
    supabase.from('social_conversation_members').select('conversation_id,user_id').in('conversation_id', conversationIds),
    supabase.from('social_messages').select('id,conversation_id,sender_id,body,created_at').in('conversation_id', conversationIds).is('deleted_at', null).order('created_at', { ascending: false }).limit(1000),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (messagesResult.error) throw messagesResult.error;
  const otherIds = [...new Set((membersResult.data ?? []).filter((member) => member.user_id !== userId).map((member) => member.user_id))];
  const profilesResult = otherIds.length
    ? await supabase.from('social_profiles').select('user_id,username,display_name,bio,avatar_path').in('user_id', otherIds)
    : { data: [], error: null };
  if (profilesResult.error) throw profilesResult.error;
  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.user_id, mapProfile(profile)]));
  const messages = (messagesResult.data ?? []).map(mapMessage);

  return conversationIds.map((conversationId) => {
    const otherId = (membersResult.data ?? []).find((member) => member.conversation_id === conversationId && member.user_id !== userId)?.user_id ?? '';
    const lastMessage = messages.find((message) => message.conversationId === conversationId);
    const lastReadAt = ownMemberships?.find((member) => member.conversation_id === conversationId)?.last_read_at ?? '';
    return {
      id: conversationId,
      otherUser: profiles.get(otherId) ?? fallbackProfile(otherId),
      lastMessage,
      unread: Boolean(lastMessage && lastMessage.senderId !== userId && lastMessage.createdAt > lastReadAt),
    };
  }).sort((left, right) => (right.lastMessage?.createdAt ?? '').localeCompare(left.lastMessage?.createdAt ?? ''));
}

export async function loadConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('social_messages')
    .select('id,conversation_id,sender_id,body,created_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at')
    .limit(500);
  if (error) throw error;
  return (data ?? []).map(mapMessage);
}

export async function sendSocialMessage(userId: string, conversationId: string, body: string) {
  const { data, error } = await supabase
    .from('social_messages')
    .insert({ sender_id: userId, conversation_id: conversationId, body: body.trim() })
    .select('id,conversation_id,sender_id,body,created_at')
    .single();
  if (error) throw error;
  return mapMessage(data);
}

export async function markConversationRead(conversationId: string) {
  const { error } = await supabase.rpc('mark_social_conversation_read', { p_conversation_id: conversationId });
  if (error) throw error;
}

export async function createMilestonePost(
  userId: string,
  pillar: PillarId,
  score: number,
  note?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('social_posts')
    .insert({
      user_id: userId,
      body: (note ?? '').trim(),
      post_type: 'milestone',
      milestone_pillar: pillar,
      milestone_score: score,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function loadPillarLeaderboard(pillar: PillarId, limit = 50): Promise<PillarLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_pillar_leaderboard', { p_pillar: pillar, p_limit: limit });
  if (error) throw error;
  return (data ?? []).map((row: {
    user_id: string;
    username: string | null;
    display_name: string;
    avatar_path: string | null;
    pillar_score: number;
    rank: number;
  }) => ({
    userId: row.user_id,
    username: row.username ?? undefined,
    displayName: row.display_name || 'Operator',
    avatarUrl: publicFileUrl('avatars', row.avatar_path),
    pillarScore: row.pillar_score,
    rank: row.rank,
  }));
}
