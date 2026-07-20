import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://app.aretune.com';

export async function exportAccountData(userId: string): Promise<Record<string, unknown>> {
  const [profile, socialProfile, socialLinks, socialPosts, socialLikes, socialComments, socialFollows, socialReports, conversations, conversationMembers, socialMessages, checkIns, metrics, categories, directives, audits, scores, onboarding, consents, events, integrationConnections, integrationEvents, integrationRuns] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('social_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('social_links').select('*').eq('user_id', userId),
    supabase.from('social_posts').select('*').eq('user_id', userId),
    supabase.from('social_post_likes').select('*').eq('user_id', userId),
    supabase.from('social_comments').select('*').eq('user_id', userId),
    supabase.from('social_follows').select('*').eq('follower_id', userId),
    supabase.from('social_reports').select('*').eq('reporter_id', userId),
    supabase.from('social_conversations').select('*'),
    supabase.from('social_conversation_members').select('*').eq('user_id', userId),
    supabase.from('social_messages').select('*'),
    supabase.from('check_ins').select('*').eq('user_id', userId),
    supabase.from('metric_entries').select('*').eq('user_id', userId),
    supabase.from('category_entries').select('*').eq('user_id', userId),
    supabase.from('directives').select('*').eq('user_id', userId),
    supabase.from('weekly_audits').select('*').eq('user_id', userId),
    supabase.from('score_snapshots').select('*').eq('user_id', userId),
    supabase.from('onboarding_answers').select('*').eq('user_id', userId),
    supabase.from('user_consents').select('*').eq('user_id', userId),
    supabase.from('product_events').select('*').eq('user_id', userId),
    supabase.from('integration_connections').select('*').eq('user_id', userId),
    supabase.from('integration_events').select('*').eq('user_id', userId),
    supabase.from('integration_sync_runs').select('*').eq('user_id', userId),
  ]);
  const firstError = [profile, socialProfile, socialLinks, socialPosts, socialLikes, socialComments, socialFollows, socialReports, conversations, conversationMembers, socialMessages, checkIns, metrics, categories, directives, audits, scores, onboarding, consents, events, integrationConnections, integrationEvents, integrationRuns]
    .map((result) => result.error)
    .find(Boolean);
  if (firstError) throw firstError;
  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    social_profile: socialProfile.data,
    social_links: socialLinks.data,
    social_posts: socialPosts.data,
    social_likes: socialLikes.data,
    social_comments: socialComments.data,
    social_follows: socialFollows.data,
    social_reports: socialReports.data,
    social_conversations: conversations.data,
    social_conversation_members: conversationMembers.data,
    social_messages: socialMessages.data,
    check_ins: checkIns.data,
    metric_entries: metrics.data,
    category_entries: categories.data,
    directives: directives.data,
    weekly_audits: audits.data,
    score_snapshots: scores.data,
    onboarding_answers: onboarding.data,
    user_consents: consents.data,
    product_events: events.data,
    integration_connections: integrationConnections.data,
    integration_events: integrationEvents.data,
    integration_sync_runs: integrationRuns.data,
  };
}

export async function deleteAccount(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE_URL}/api/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Account deletion failed (${response.status})`);
}
