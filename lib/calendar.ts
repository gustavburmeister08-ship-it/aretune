import { supabase } from './supabase';
import { connectOAuthProvider, disconnectIntegration } from './integrations/client';

export async function getCalendarConnectionStatus(userId: string): Promise<'connected' | 'disconnected'> {
  const { data, error } = await supabase
    .from('integration_connections')
    .select('id')
    .eq('user_id', userId)
    .eq('provider_id', 'google-calendar')
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  return data ? 'connected' : 'disconnected';
}

export const connectGoogleCalendar = () => connectOAuthProvider('google-calendar');
export const disconnectGoogleCalendar = () => disconnectIntegration('google-calendar');
