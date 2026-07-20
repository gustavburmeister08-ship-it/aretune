import { supabase } from './supabase';
import type { Json } from '../types/database';

export type ProductEventName =
  | 'onboarding_completed'
  | 'check_in_completed'
  | 'directive_generated'
  | 'directive_completed'
  | 'directive_skipped'
  | 'weekly_audit_generated';

export async function trackEvent(
  userId: string,
  eventName: ProductEventName,
  properties: Record<string, Json | undefined> = {}
): Promise<void> {
  const { error } = await supabase.from('product_events').insert({
    user_id: userId,
    event_name: eventName,
    properties,
  });
  if (error && process.env.NODE_ENV !== 'production') {
    console.warn(`Analytics event failed: ${eventName}`, error.message);
  }
}
