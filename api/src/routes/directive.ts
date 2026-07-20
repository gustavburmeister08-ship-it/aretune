import type { FastifyInstance } from 'fastify';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getModel, COACH_SYSTEM_PROMPT } from '../lib/ai';
import { AuthenticationError, assertOwnRequest, requireAiProcessingConsent, requireAuthenticatedUser } from '../lib/auth';
import { enforceRateLimit, RateLimitError } from '../lib/rate-limit';
import type { DirectiveRequest, DirectiveResponse, PillarId } from '../lib/types';
import { assertDailyTokenBudget, DailyBudgetError, recordAiUsage } from '../lib/usage';

const pillarSchema = z.enum(['body', 'mind', 'spirit', 'relationships', 'vocation', 'lore']);
const pillarScoresSchema = z.record(z.string(), z.number().min(0).max(100));
const directiveRequestSchema = z.object({
  userId: z.string().uuid(),
  phase: z.enum(['dissonance', 'uncertainty', 'discovery']),
  activePillars: z.array(pillarSchema).min(1).max(6),
  pillarScores: pillarScoresSchema,
  recentMoods: z.array(z.number().min(0).max(10)).max(14),
  recentEnergy: z.array(z.number().min(0).max(10)).max(14),
  recentMetrics: z.record(z.string(), z.array(z.number()).max(14)),
  provider: z.enum(['anthropic', 'openai']).optional(),
});

const directiveOutputSchema = z.object({
  pillar: pillarSchema,
  title: z.string().min(3).max(80),
  body: z.string().min(10).max(500),
  why: z.string().min(10).max(240),
  action: z.string().min(3).max(160),
});

const PILLAR_LABELS: Record<PillarId, string> = {
  body: 'Body (health, energy, performance, recovery)',
  mind: 'Mind (focus, learning, reasoning, emotional intelligence)',
  spirit: 'Spirit (purpose, presence, identity, inner development)',
  relationships: 'Relationships (intimacy, trust, family, community)',
  vocation: 'Vocation (craft, output, wealth, influence, autonomy)',
  lore: 'Lore (adventure, culture, rare skills, meaningful experiences)',
};

export function findWeakestPillar(
  activePillars: PillarId[],
  pillarScores: Partial<Record<PillarId, number>>
): PillarId {
  return activePillars.reduce((weakest, pillar) =>
    (pillarScores[pillar] ?? 50) < (pillarScores[weakest] ?? 50) ? pillar : weakest
  , activePillars[0]);
}

function average(values: number[]): string {
  return values.length
    ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
    : 'unknown';
}

function buildDirectivePrompt(req: DirectiveRequest, weakest: PillarId): string {
  const scores = req.activePillars
    .map((pillar) => `- ${PILLAR_LABELS[pillar]}: ${(req.pillarScores[pillar] ?? 0).toFixed(0)}/100`)
    .join('\n');
  const metricTrends = Object.entries(req.recentMetrics)
    .slice(0, 12)
    .map(([metricId, values]) => `- ${metricId}: ${values.slice(0, 7).join(', ')}`)
    .join('\n') || '- no recent metric data';

  return `Generate exactly one daily directive.

USER CONTEXT
- Phase: ${req.phase}
- Average mood: ${average(req.recentMoods)}/10
- Average energy: ${average(req.recentEnergy)}/10
- Target pillar: ${PILLAR_LABELS[weakest]}

PILLAR SCORES
${scores}

RECENT METRICS (newest first)
${metricTrends}

The action must be safe, specific, measurable, and completable today. Match the intensity to the user's phase. Do not invent facts that are absent from the data.`;
}

export async function directiveRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: DirectiveRequest }>('/directive', async (request, reply) => {
    try {
      const userId = await requireAuthenticatedUser(request);
      enforceRateLimit(`directive:${userId}`, 10, 60_000);
      const parsedRequest = directiveRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.status(400).send({ error: 'Invalid request', details: parsedRequest.error.flatten() });
      }
      assertOwnRequest(userId, parsedRequest.data.userId);
      await requireAiProcessingConsent(userId);
      await assertDailyTokenBudget(userId);

      const body = parsedRequest.data as DirectiveRequest;
      const provider = body.provider ?? 'anthropic';
      const { model, modelId } = getModel(provider);
      const weakest = findWeakestPillar(body.activePillars, body.pillarScores);
      const { output, usage } = await generateText({
        model,
        system: COACH_SYSTEM_PROMPT,
        prompt: buildDirectivePrompt(body, weakest),
        output: Output.object({ schema: directiveOutputSchema }),
        maxOutputTokens: 500,
        temperature: 0.6,
        abortSignal: AbortSignal.timeout(20_000),
      });

      const directive: DirectiveResponse = { ...output, pillar: weakest, model: modelId };
      await recordAiUsage({ userId, route: 'directive', provider, model: modelId, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
      return reply.send(directive);
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return reply.status(401).send({ error: error.message });
      }
      if (error instanceof RateLimitError) {
        return reply.header('Retry-After', error.retryAfterSeconds).status(429).send({ error: error.message });
      }
      if (error instanceof DailyBudgetError) {
        return reply.status(429).send({ error: error.message });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate directive' });
    }
  });
}
