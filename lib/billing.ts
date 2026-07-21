import { Linking } from 'react-native';
import { supabase } from './supabase';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://app.aretune.com';

export type BillingPlan = 'weekly' | 'monthly' | 'annual';

export const BILLING_PLANS: { id: BillingPlan; label: string; price: string; note?: string }[] = [
  { id: 'weekly', label: 'Pro Weekly', price: '€9.99 / week' },
  { id: 'monthly', label: 'Pro Monthly', price: '€29.99 / month' },
  { id: 'annual', label: 'Pro Annual', price: '€299 / year', note: 'Best value' },
];

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) throw new Error('Authentication required');
  return { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' };
}

export async function startCheckout(plan: BillingPlan) {
  const response = await fetch(`${API_BASE_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ plan }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Checkout failed (${response.status})`);
  await Linking.openURL(result.url);
}

export async function openBillingPortal() {
  const response = await fetch(`${API_BASE_URL}/api/billing/portal`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? `Unable to open billing portal (${response.status})`);
  await Linking.openURL(result.url);
}
