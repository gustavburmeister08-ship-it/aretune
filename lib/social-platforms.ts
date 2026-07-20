import type { SocialPlatform } from '../types';

export const SOCIAL_PLATFORMS: ReadonlyArray<{
  id: SocialPlatform;
  label: string;
  shortLabel: string;
  placeholder: string;
  baseUrl?: string;
  allowedHosts?: string[];
}> = [
  { id: 'x', label: 'X', shortLabel: 'X', placeholder: '@username or x.com/username', baseUrl: 'https://x.com/', allowedHosts: ['x.com', 'twitter.com'] },
  { id: 'instagram', label: 'Instagram', shortLabel: 'IG', placeholder: '@username or instagram.com/username', baseUrl: 'https://instagram.com/', allowedHosts: ['instagram.com'] },
  { id: 'facebook', label: 'Facebook', shortLabel: 'FB', placeholder: 'facebook.com/your.profile', baseUrl: 'https://facebook.com/', allowedHosts: ['facebook.com', 'fb.com'] },
  { id: 'linkedin', label: 'LinkedIn', shortLabel: 'in', placeholder: 'linkedin.com/in/username', baseUrl: 'https://linkedin.com/in/', allowedHosts: ['linkedin.com'] },
  { id: 'substack', label: 'Substack', shortLabel: 'S', placeholder: 'publication.substack.com', allowedHosts: ['substack.com'] },
  { id: 'youtube', label: 'YouTube', shortLabel: 'YT', placeholder: '@channel or youtube.com/@channel', baseUrl: 'https://youtube.com/@', allowedHosts: ['youtube.com', 'youtu.be'] },
  { id: 'tiktok', label: 'TikTok', shortLabel: 'TT', placeholder: '@username or tiktok.com/@username', baseUrl: 'https://tiktok.com/@', allowedHosts: ['tiktok.com'] },
  { id: 'github', label: 'GitHub', shortLabel: 'GH', placeholder: '@username or github.com/username', baseUrl: 'https://github.com/', allowedHosts: ['github.com'] },
  { id: 'website', label: 'Website', shortLabel: '↗', placeholder: 'your-site.com' },
];

const platformMap = new Map(SOCIAL_PLATFORMS.map((platform) => [platform.id, platform]));
const hostMatches = (hostname: string, allowed: string) => hostname === allowed || hostname.endsWith(`.${allowed}`);

export function normalizeSocialUrl(platformId: SocialPlatform, rawValue: string) {
  const platform = platformMap.get(platformId);
  if (!platform) throw new Error('Unknown social platform');
  let value = rawValue.trim();
  if (!value) return null;

  if (!/^https?:\/\//i.test(value)) {
    const hostCandidate = value.toLowerCase().replace(/^www\./, '').split('/')[0];
    const isPlatformUrl = platform.allowedHosts?.some((allowed) => hostMatches(hostCandidate, allowed));
    if (platformId === 'website' || isPlatformUrl) {
      value = `https://${value.replace(/^\/+/, '')}`;
    } else if (platformId === 'substack') {
      const handle = value.replace(/^@/, '').replace(/\.substack\.com.*$/i, '').replace(/^\/+|\/+$/g, '');
      value = `https://${handle}.substack.com`;
    } else {
      const handle = value.replace(/^@/, '').replace(/^\/+|\/+$/g, '');
      value = `${platform.baseUrl}${handle}`;
    }
  }

  const parsed = new URL(value);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error(`${platform.label}: invalid URL`);
  parsed.protocol = 'https:';
  parsed.username = '';
  parsed.password = '';
  parsed.hash = '';
  parsed.search = '';

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (platform.allowedHosts && !platform.allowedHosts.some((allowed) => hostMatches(hostname, allowed))) {
    throw new Error(`${platform.label}: URL does not belong to ${platform.label}`);
  }
  if (!hostname || hostname === 'localhost') throw new Error(`${platform.label}: invalid hostname`);

  const handle = platformId === 'substack'
    ? hostname.replace(/\.substack\.com$/, '')
    : parsed.pathname.split('/').filter(Boolean).at(-1)?.replace(/^@/, '');
  return { url: parsed.toString().replace(/\/$/, ''), handle: handle || undefined };
}
