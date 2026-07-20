import { Linking } from 'react-native';
import { supabase } from '../supabase';
import { persistCategoryScores } from '../category-tracking';
import type { IntegrationConnection, IntegrationEvent, IntegrationMode, UserProfile } from '../../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://uebermensch-ai.pages.dev';
const ALL_PILLARS = ['body', 'mind', 'spirit', 'relationships', 'vocation', 'lore'] as const;

function mapConnection(row: any): IntegrationConnection {
  return { id: row.id, userId: row.user_id, providerId: row.provider_id, mode: row.connection_mode, status: row.status, displayName: row.display_name, scopes: row.scopes ?? [], lastSyncedAt: row.last_synced_at ?? undefined, lastError: row.last_error ?? undefined, createdAt: row.created_at };
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Authentication required');
  return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' };
}

export async function loadIntegrationConnections(userId: string) {
  const { data, error } = await supabase.from('integration_connections').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapConnection);
}

export async function importIntegrationEvents(providerId: string, mode: IntegrationMode, displayName: string, events: IntegrationEvent[], sourceName: string, profile: UserProfile) {
  const { data, error } = await supabase.rpc('ingest_integration_events', { p_provider_id: providerId, p_mode: mode, p_display_name: displayName, p_events: events as any, p_source_name: sourceName });
  if (error) throw error;
  await persistCategoryScores(profile.id, [...ALL_PILLARS]);
  return Number(data ?? 0);
}

export async function connectOAuthProvider(providerId: string) {
  const response = await fetch(`${API_BASE_URL}/api/integrations/${encodeURIComponent(providerId)}/connect`, { method: 'POST', headers: await authHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Connection failed (${response.status})`);
  await Linking.openURL(result.authorizationUrl);
}

export async function syncIntegration(providerId: string, profile: UserProfile) {
  const response = await fetch(`${API_BASE_URL}/api/integrations/${encodeURIComponent(providerId)}/sync`, { method: 'POST', headers: await authHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Sync failed (${response.status})`);
  await persistCategoryScores(profile.id, [...ALL_PILLARS]);
  return Number(result.imported ?? 0);
}

export async function disconnectIntegration(providerId: string) {
  const response = await fetch(`${API_BASE_URL}/api/integrations/${encodeURIComponent(providerId)}`, { method: 'DELETE', headers: await authHeaders() });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `Disconnect failed (${response.status})`);
}
