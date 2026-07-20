import { supabase } from './supabase';
import { normalizeSocialUrl, SOCIAL_PLATFORMS } from './social-platforms';
import type { Json } from '../types/database';
import type { SocialLink, SocialPlatform, SocialProfile } from '../types';

export { normalizeSocialUrl, SOCIAL_PLATFORMS } from './social-platforms';

export async function loadSocialProfile(userId: string): Promise<{ profile: SocialProfile; links: SocialLink[] }> {
  const [profileResult, linksResult] = await Promise.all([
    supabase.from('social_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('social_links').select('*').eq('user_id', userId).order('position'),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (linksResult.error) throw linksResult.error;

  const row = profileResult.data;
  let avatarUrl: string | undefined;
  if (row?.avatar_path) {
    const { data } = await supabase.storage.from('avatars').createSignedUrl(row.avatar_path, 3600);
    avatarUrl = data?.signedUrl;
  }
  return {
    profile: {
      userId,
      username: row?.username ?? undefined,
      bio: row?.bio ?? '',
      avatarPath: row?.avatar_path ?? undefined,
      avatarUrl,
      isDiscoverable: row?.is_discoverable ?? false,
      createdAt: row?.created_at ?? new Date().toISOString(),
      updatedAt: row?.updated_at ?? new Date().toISOString(),
    },
    links: (linksResult.data ?? []).map((link) => ({
      id: link.id,
      userId: link.user_id,
      platform: link.platform,
      url: link.url,
      handle: link.handle ?? undefined,
      position: link.position,
    })),
  };
}

export async function saveSocialProfile(
  userId: string,
  bio: string,
  avatarPath: string | undefined,
  values: Partial<Record<SocialPlatform, string>>,
  isDiscoverable = false
) {
  const links = SOCIAL_PLATFORMS.flatMap((platform, position) => {
    const normalized = normalizeSocialUrl(platform.id, values[platform.id] ?? '');
    return normalized ? [{ platform: platform.id, ...normalized, position }] : [];
  });
  const { error } = await supabase.rpc('save_social_profile', {
    p_bio: bio.trim(),
    p_avatar_path: avatarPath ?? null,
    p_is_discoverable: isDiscoverable,
    p_links: links as unknown as Json,
  });
  if (error) throw error;
  return links.map((link) => ({ ...link, userId })) as SocialLink[];
}

export async function uploadAvatar(userId: string, base64: string, mimeType = 'image/jpeg') {
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
  const { error } = await supabase.storage.from('avatars').upload(path, bytes.buffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeAvatar(path?: string) {
  if (!path) return;
  const { error } = await supabase.storage.from('avatars').remove([path]);
  if (error) throw error;
}

export async function signedAvatarUrl(path?: string) {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
