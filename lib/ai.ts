import { supabase } from './supabase';
import type {
  AuditGenerationInput,
  AuditGenerationResult,
  DirectiveGenerationInput,
  DirectiveGenerationResult,
} from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://uebermensch-ai.pages.dev';

async function authenticatedPost<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Authentication required');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`API ${response.status}: ${detail}`);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export function generateDirective(input: DirectiveGenerationInput): Promise<DirectiveGenerationResult> {
  return authenticatedPost('/api/directive', input);
}

export function generateWeeklySummary(input: AuditGenerationInput): Promise<AuditGenerationResult> {
  return authenticatedPost('/api/audit/summary', input);
}
