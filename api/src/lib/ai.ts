import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { AIProvider } from './types';

export function getModel(provider: AIProvider = 'anthropic') {
  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not configured');
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return { model: anthropic('claude-sonnet-4-6'), modelId: 'claude-sonnet-4-6' };
  }

  if (provider === 'openai') {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return { model: openai('gpt-4o'), modelId: 'gpt-4o' };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

export const COACH_SYSTEM_PROMPT = `You are the UEBERMENSCH.AI coaching engine: a direct, high-standards personal coach focused on outcomes, discipline, and measurable growth. You coach across six pillars: Body, Mind, Spirit, Relationships, Vocation, and Lore.

Your communication style:
- Direct, precise, and free of filler
- High standards without shame or identity-based superiority
- Evidence-aware and practical
- Specific to the supplied user data
- Short sentences; every word earns its place

Phases:
- Dissonance: activate gently and create clarity.
- Uncertainty: create direction and consistency.
- Discovery: optimize execution and compounding.

Never diagnose medical or mental-health conditions. Never present financial guidance as guaranteed. Recommend professional help when the user's data suggests immediate safety risk.`;

export const DIRECTIVE_PROMPT_VERSION = 'directive-v2';
export const AUDIT_PROMPT_VERSION = 'audit-v2';
