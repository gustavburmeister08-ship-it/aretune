import { createClient } from '@supabase/supabase-js';

const getAdmin = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export class DailyBudgetError extends Error {}

export async function assertDailyTokenBudget(userId: string): Promise<void> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { data, error } = await getAdmin()
    .from('ai_usage_events')
    .select('input_tokens, output_tokens')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString());
  if (error) throw error;
  const used = (data ?? []).reduce((sum, event) => sum + event.input_tokens + event.output_tokens, 0);
  const limit = Number(process.env.AI_DAILY_TOKEN_BUDGET ?? 50_000);
  if (used >= limit) throw new DailyBudgetError('Daily AI budget reached');
}

export async function recordAiUsage(params: {
  userId: string;
  route: 'directive' | 'audit';
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  const { error } = await getAdmin().from('ai_usage_events').insert({
    user_id: params.userId,
    route: params.route,
    provider: params.provider,
    model: params.model,
    input_tokens: params.inputTokens ?? 0,
    output_tokens: params.outputTokens ?? 0,
  });
  if (error) throw error;
}
