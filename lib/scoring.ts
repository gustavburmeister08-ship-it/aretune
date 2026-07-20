import { PILLAR_MAP } from './pillars';
import type { CheckIn, PillarId, PillarScoreSnapshot, ScoreBreakdown } from '../types';

export const LIFESTYLE_FORMULA_VERSION = 'lifestyle-v1';

const clamp = (value: number): number => Math.max(0, Math.min(100, value));
const round = (value: number): number => Math.round(value * 10) / 10;

export function calculatePillarLifestyleScore(
  pillarId: PillarId,
  checkIns: CheckIn[],
  calculatedAt = new Date().toISOString()
): PillarScoreSnapshot {
  const metrics = PILLAR_MAP[pillarId].leadingMetrics;
  const metricIds = new Set(metrics.map((metric) => metric.id));
  const entries = checkIns
    .flatMap((checkIn) => checkIn.entries)
    .filter((entry) => metricIds.has(entry.metricId));

  const observedMetricDays = new Set(
    entries.map((entry) => `${entry.metricId}:${entry.loggedAt.slice(0, 10)}`)
  ).size;
  const expectedMetricDays = Math.max(1, metrics.length * 7);
  const consistency = clamp((observedMetricDays / expectedMetricDays) * 100);

  const representedMetrics = new Set(entries.map((entry) => entry.metricId)).size;
  const breadth = clamp((representedMetrics / Math.max(1, metrics.length)) * 100);

  const intensityValues = metrics.flatMap((definition) => {
    const target = Math.max(definition.target ?? 1, 0.0001);
    return entries
      .filter((entry) => entry.metricId === definition.id)
      .map((entry) => clamp((entry.value / target) * 100));
  });
  const intensity = intensityValues.length
    ? intensityValues.reduce((sum, value) => sum + value, 0) / intensityValues.length
    : 0;

  const progressionValues = metrics.flatMap((definition) => {
    const values = entries
      .filter((entry) => entry.metricId === definition.id)
      .sort((left, right) => left.loggedAt.localeCompare(right.loggedAt))
      .map((entry) => entry.value);
    if (values.length < 2) return [];
    const target = Math.max(definition.target ?? 1, 0.0001);
    return [clamp(50 + ((values.at(-1)! - values[0]) / target) * 50)];
  });
  const progression = progressionValues.length
    ? progressionValues.reduce((sum, value) => sum + value, 0) / progressionValues.length
    : 0;

  const breakdown: ScoreBreakdown = {
    consistency: round(consistency),
    progression: round(progression),
    breadth: round(breadth),
    intensity: round(intensity),
    lifestyle: round(
      consistency * 0.35 +
      progression * 0.3 +
      breadth * 0.2 +
      intensity * 0.15
    ),
  };

  return {
    pillar: pillarId,
    score: breakdown.lifestyle,
    breakdown,
    formulaVersion: LIFESTYLE_FORMULA_VERSION,
    calculatedAt,
  };
}

export function calculateLifestyleScores(
  activePillars: PillarId[],
  checkIns: CheckIn[],
  calculatedAt = new Date().toISOString()
): PillarScoreSnapshot[] {
  return activePillars.map((pillar) => calculatePillarLifestyleScore(pillar, checkIns, calculatedAt));
}
