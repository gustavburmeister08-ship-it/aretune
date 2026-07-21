import { hasBenchmark, percentileFor, type BenchmarkResult } from './benchmarks';
import { CATEGORY_MAP } from './category-catalog';
import { PILLAR_MAP } from './pillars';
import type { CategoryTrackingEntry, PillarId } from '../types';

export interface BenchmarkStanding {
  metricId: string;
  metricLabel: string;
  categoryId: string;
  pillar: PillarId;
  pillarColor: string;
  value: number;
  unit?: string;
  result: BenchmarkResult;
}

/**
 * Pure: the user's population standing on every metric that has a cited
 * benchmark (see lib/benchmarks.ts), using the latest logged value per metric.
 * Sorted best-percentile first. Additive to the score — never feeds it.
 */
export function computeBenchmarkStandings(entries: CategoryTrackingEntry[]): BenchmarkStanding[] {
  const latest = new Map<string, { value: number; loggedAt: string; categoryId: string }>();
  for (const entry of entries) {
    for (const [metricId, rawValue] of Object.entries(entry.values)) {
      if (!hasBenchmark(metricId)) continue;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) continue;
      const current = latest.get(metricId);
      if (!current || entry.loggedAt > current.loggedAt) {
        latest.set(metricId, { value, loggedAt: entry.loggedAt, categoryId: entry.categoryId });
      }
    }
  }

  const standings: BenchmarkStanding[] = [];
  for (const [metricId, info] of latest) {
    const result = percentileFor(metricId, info.value);
    if (!result) continue;
    const category = CATEGORY_MAP[info.categoryId];
    const metric = category?.metrics.find((m) => m.id === metricId);
    const pillar = category?.pillar;
    if (!pillar) continue;
    standings.push({
      metricId,
      metricLabel: metric?.label ?? metricId,
      categoryId: info.categoryId,
      pillar,
      pillarColor: PILLAR_MAP[pillar].color,
      value: info.value,
      unit: metric?.unit,
      result,
    });
  }
  return standings.sort((a, b) => b.result.percentile - a.result.percentile);
}

/** Loads the user's category entries and returns their benchmark standings. */
export async function loadBenchmarkStandings(userId: string): Promise<BenchmarkStanding[]> {
  const { loadCategoryEntries } = await import('./category-tracking');
  const entries = await loadCategoryEntries(userId);
  return computeBenchmarkStandings(entries);
}
