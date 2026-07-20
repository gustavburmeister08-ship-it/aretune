import type { FastifyInstance } from 'fastify';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { getModel, COACH_SYSTEM_PROMPT } from '../lib/ai';
import { AuthenticationError, assertOwnRequest, requireAiProcessingConsent, requireAuthenticatedUser } from '../lib/auth';
import { enforceRateLimit, RateLimitError } from '../lib/rate-limit';
import type { AuditRequest, AuditResponse } from '../lib/types';
import { assertDailyTokenBudget, DailyBudgetError, recordAiUsage } from '../lib/usage';

const pillarSchema = z.enum(['body', 'mind', 'spirit', 'relationships', 'vocation', 'lore']);
const pillarScoresSchema = z.record(z.string(), z.number().min(0).max(100));
const auditRequestSchema = z.object({
  userId: z.string().uuid(),
  phase: z.enum(['dissonance', 'uncertainty', 'discovery']),
  pillarScores: pillarScoresSchema,
  weeklyMetrics: z.record(z.string(), z.array(z.number()).max(14)),
  directiveCompletion: z.number().min(0).max(100),
  provider: z.enum(['anthropic', 'openai']).optional(),
});

const auditOutputSchema = z.object({
  summary: z.string().min(20).max(800),
  highlights: z.array(z.string().min(3).max(180)).max(3),
  gaps: z.array(z.string().min(3).max(180)).max(3),
});

function buildAuditPrompt(req: AuditRequest): string {
  const scores = Object.entries(req.pillarScores)
    .map(([pillar, score]) => `- ${pillar}: ${score?.toFixed(0) ?? 'N/A'}/100`)
    .join('\n');
  const metrics = Object.entries(req.weeklyMetrics)
    .slice(0, 16)
    .map(([metricId, values]) => `- ${metricId}: ${values.join(', ')}`)
    .join('\n') || '- no metric data';

  return `Write a concise weekly coaching audit using only the supplied facts.

Phase: ${req.phase}
Directive completion: ${req.directiveCompletion.toFixed(0)}%

PILLAR SCORES
${scores}

WEEKLY METRICS
${metrics}

Identify concrete wins, one important gap, and the most useful focus for next week. Do not diagnose conditions and do not invent causal claims.`;
}

export async function auditRoute(fastify: FastifyInstance) {
  fastify.post<{ Body: AuditRequest }>('/audit/summary', async (request, reply) => {
    try {
      const userId = await requireAuthenticatedUser(request);
      enforceRateLimit(`audit:${userId}`, 4, 60_000);
      const parsedRequest = auditRequestSchema.safeParse(request.body);
      if (!parsedRequest.success) {
        return reply.status(400).send({ error: 'Invalid request', details: parsedRequest.error.flatten() });
      }
      assertOwnRequest(userId, parsedRequest.data.userId);
      await requireAiProcessingConsent(userId);
      await assertDailyTokenBudget(userId);

      const body = parsedRequest.data as AuditRequest;
      const provider = body.provider ?? 'anthropic';
      const { model, modelId } = getModel(provider);
      const { output, usage } = await generateText({
        model,
        system: COACH_SYSTEM_PROMPT,
        prompt: buildAuditPrompt(body),
        output: Output.object({ schema: auditOutputSchema }),
        maxOutputTokens: 700,
        temperature: 0.5,
        abortSignal: AbortSignal.timeout(20_000),
      });

      const response: AuditResponse = output;
      await recordAiUsage({ userId, route: 'audit', provider, model: modelId, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens });
      return reply.send(response);
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
      return reply.status(500).send({ error: 'Failed to generate audit summary' });
    }
  });
}
