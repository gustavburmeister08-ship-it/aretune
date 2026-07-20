import { createClient } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';

export class AuthenticationError extends Error {}

function getBearerToken(request: FastifyRequest): string {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing bearer token');
  }
  return authorization.slice('Bearer '.length).trim();
}

export async function requireAuthenticatedUser(request: FastifyRequest): Promise<string> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase authentication is not configured');

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(getBearerToken(request));
  if (error || !data.user) {
    throw new AuthenticationError('Invalid or expired access token');
  }
  return data.user.id;
}

export function assertOwnRequest(authenticatedUserId: string, requestedUserId: string): void {
  if (authenticatedUserId !== requestedUserId) {
    throw new AuthenticationError('Cross-user access is not allowed');
  }
}

export async function requireAiProcessingConsent(userId: string): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase authentication is not configured');
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('profiles')
    .select('ai_processing_consent')
    .eq('id', userId)
    .single();
  if (error) throw error;
  if (!data?.ai_processing_consent) {
    throw new AuthenticationError('AI processing consent is required');
  }
}
