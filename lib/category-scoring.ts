import { CATEGORIES_BY_PILLAR, CATEGORY_MAP } from './category-catalog';
import { percentileFor, type BenchmarkResult } from './benchmarks';
import type {
  CategoryMetricDefinition,
  CategoryTrackingEntry,
  MetricFrequency,
  PillarId,
  PillarScoreSnapshot,
  ScoreBreakdown,
} from '../types';

export const CATEGORY_SCORE_FORMULA_VERSION = 'category-v2';

const clamp = (value: number) => Math.max(0, Math.min(100, value));
const round = (value: number) => Math.round(value * 10) / 10;
const DAY = 86_400_000;

const ageInDays = (loggedAt: string, calculatedAt: string) => Math.max(
  0,
  Math.floor((new Date(calculatedAt).getTime() - new Date(loggedAt).getTime()) / DAY)
);

function decayPenalty(days: number, frequency: MetricFrequency): number {
  if (frequency === 'milestone') return 0;
  const grace = frequency === 'daily' ? 3
    : frequency === 'weekly' ? 10
      : frequency === 'monthly' ? 35
        : 100;
  if (days <= grace) return 0;

  if (frequency !== 'daily') return (days - grace) * 1.5;
  const days4to7 = Math.min(Math.max(days - 3, 0), 4);
  const days8to14 = Math.min(Math.max(days - 7, 0), 7);
  const days15plus = Math.max(days - 14, 0);
  return days4to7 * 0.5 + days8to14 + days15plus * 1.5;
}

export function normalizeMetricValue(metric: CategoryMetricDefinition, value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (metric.type === 'boolean') return value >= 1 ? 100 : 0;

  if (metric.direction === 'lower') {
    if (value <= metric.target) return 100;
    if (metric.target <= 0) return clamp(100 - value * 25);
    return clamp((metric.target / value) * 100);
  }

  if (metric.direction === 'range') {
    const distance = Math.abs(value - metric.target);
    const tolerance = Math.max(metric.target * 0.25, 1);
    return clamp(100 - (distance / tolerance) * 100);
  }

  return clamp((value / Math.max(metric.target, 0.0001)) * 100);
}

function periodsExpected(frequency: MetricFrequency, windowDays: number) {
  if (frequency === 'milestone') return 0;
  if (frequency === 'daily') return windowDays;
  if (frequency === 'weekly') return Math.ceil(windowDays / 7);
  if (frequency === 'monthly') return Math.ceil(windowDays / 30);
  return Math.ceil(windowDays / 90);
}

function periodKey(loggedAt: string, frequency: MetricFrequency) {
  const date = new Date(loggedAt);
  if (frequency === 'daily') return loggedAt.slice(0, 10);
  if (frequency === 'weekly') {
    const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const weekday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - weekday);
    return start.toISOString().slice(0, 10);
  }
  if (frequency === 'monthly') return loggedAt.slice(0, 7);
  if (frequency === 'quarterly') {
    return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
  }
  return 'milestone';
}

function breadthScore(active: number, total: number) {
  if (active <= 0 || total <= 0) return 0;
  if (active >= total) return 100;
  const ratio = active / total;
  if (active === 1) return 40;
  if (ratio <= 0.375) return 60;
  if (ratio <= 0.625) return 80;
  if (ratio <= 0.875) return 95;
  return 95;
}

type Observation = { value: number; loggedAt: string };

function observationsForPillar(pillar: PillarId, entries: CategoryTrackingEntry[]) {
  const observations = new Map<string, Observation[]>();
  for (const entry of entries) {
    const category = CATEGORY_MAP[entry.categoryId];
    if (!category || category.pillar !== pillar) continue;
    for (const [metricId, rawValue] of Object.entries(entry.values)) {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      const current = observations.get(metricId) ?? [];
      current.push({ value, loggedAt: entry.loggedAt });
      observations.set(metricId, current);
    }
  }
  observations.forEach((values) => values.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)));
  return observations;
}

export function calculateCategoryPillarScore(
  pillar: PillarId,
  entries: CategoryTrackingEntry[],
  calculatedAt = new Date().toISOString()
): PillarScoreSnapshot {
  const categories = CATEGORIES_BY_PILLAR[pillar];
  const observations = observationsForPillar(pillar, entries);
  const metricLookup = new Map(categories.flatMap((category) => category.metrics).map((metric) => [metric.id, metric]));

  let performance = 0;
  for (const category of categories) {
    const observed = category.metrics.flatMap((metric) => {
      const values = observations.get(metric.id);
      if (!values?.length) return [];
      const latest = values[values.length - 1];
      const rawScore = normalizeMetricValue(metric, latest.value);
      return [Math.max(10, rawScore - decayPenalty(ageInDays(latest.loggedAt, calculatedAt), metric.frequency))];
    });
    const categoryScore = observed.length
      ? observed.reduce((sum, value) => sum + value, 0) / observed.length
      : 0;
    performance += categoryScore * (category.weight / 100);
  }

  const activeMetricIds = [...observations.keys()].filter((id) => metricLookup.has(id));
  const consistencyForWindow = (windowDays: number) => {
    const cutoff = new Date(new Date(calculatedAt).getTime() - windowDays * DAY).toISOString();
    const scores = activeMetricIds.flatMap((metricId) => {
      const metric = metricLookup.get(metricId)!;
      const expected = periodsExpected(metric.frequency, windowDays);
      if (!expected) return [];
      const periods = new Set(
        (observations.get(metricId) ?? [])
          .filter((entry) => entry.loggedAt >= cutoff && entry.loggedAt <= calculatedAt)
          .map((entry) => periodKey(entry.loggedAt, metric.frequency))
      );
      return [clamp((periods.size / expected) * 100)];
    });
    return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  };

  const consistency = consistencyForWindow(7) * 0.5
    + consistencyForWindow(30) * 0.3
    + consistencyForWindow(90) * 0.2;

  const progressionValues = activeMetricIds.flatMap((metricId) => {
    const metric = metricLookup.get(metricId)!;
    const values = observations.get(metricId) ?? [];
    if (values.length < 2) return [];
    const first = normalizeMetricValue(metric, values[0].value);
    const latest = normalizeMetricValue(metric, values[values.length - 1].value);
    return [clamp(50 + latest - first)];
  });
  const progression = progressionValues.length
    ? progressionValues.reduce((sum, score) => sum + score, 0) / progressionValues.length
    : 0;

  const activeCategories = new Set(
    entries
      .filter((entry) => CATEGORY_MAP[entry.categoryId]?.pillar === pillar && Object.keys(entry.values).length > 0)
      .map((entry) => entry.categoryId)
  ).size;
  const breadth = breadthScore(activeCategories, categories.length);

  const intensityValues = activeMetricIds.flatMap((metricId) => {
    const metric = metricLookup.get(metricId)!;
    const values = observations.get(metricId) ?? [];
    return values.length ? [normalizeMetricValue(metric, values[values.length - 1].value)] : [];
  });
  const intensity = intensityValues.length
    ? intensityValues.reduce((sum, score) => sum + score, 0) / intensityValues.length
    : 0;

  const lifestyle = consistency * 0.35 + progression * 0.3 + breadth * 0.2 + intensity * 0.15;
  const pillarScore = performance * 0.4 + lifestyle * 0.6;
  const breakdown: ScoreBreakdown = {
    consistency: round(consistency),
    progression: round(progression),
    breadth: round(breadth),
    intensity: round(intensity),
    lifestyle: round(lifestyle),
    performance: round(performance),
    pillar: round(pillarScore),
  };

  return {
    pillar,
    score: breakdown.pillar ?? 0,
    breakdown,
    formulaVersion: CATEGORY_SCORE_FORMULA_VERSION,
    calculatedAt,
  };
}

export function calculateCategoryScores(
  pillars: PillarId[],
  entries: CategoryTrackingEntry[],
  calculatedAt = new Date().toISOString()
) {
  return pillars.map((pillar) => calculateCategoryPillarScore(pillar, entries, calculatedAt));
}

// Population-benchmark percentiles for a category's metrics, additive to the
// score formula above (never influences performance/lifestyle/pillar
// scores). Only returns entries for metrics with a cited benchmark source
// (see lib/benchmarks.ts) and at least one logged value.
export function categoryMetricPercentiles(
  categoryId: string,
  entries: CategoryTrackingEntry[]
): Record<string, BenchmarkResult> {
  const category = CATEGORY_MAP[categoryId];
  if (!category) return {};

  const latestByMetric = new Map<string, { value: number; loggedAt: string }>();
  for (const entry of entries) {
    if (entry.categoryId !== categoryId) continue;
    for (const [metricId, rawValue] of Object.entries(entry.values)) {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      const current = latestByMetric.get(metricId);
      if (!current || entry.loggedAt > current.loggedAt) {
        latestByMetric.set(metricId, { value, loggedAt: entry.loggedAt });
      }
    }
  }

  const results: Record<string, BenchmarkResult> = {};
  for (const metric of category.metrics) {
    const latest = latestByMetric.get(metric.id);
    if (!latest) continue;
    const result = percentileFor(metric.id, latest.value);
    if (result) results[metric.id] = result;
  }
  return results;
}
