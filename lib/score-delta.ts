import { totalAretuneScore } from './aretune-score';
import type { PillarId } from '../types';

export interface ScoreDelta {
  /** Total Aretune score (0–600) at the most recent scored day. */
  current: number;
  /** Total at the previous scored day. */
  previous: number;
  /** current − previous (may be negative). */
  delta: number;
  /** Snapshot date the change is measured from (YYYY-MM-DD). */
  sinceDate: string;
}

export interface ScoreSnapshotRow {
  snapshot_date: string;
  pillar: string;
  pillar_score: number;
}

/**
 * Pure: change in the total Aretune score between the two most recent scored
 * days found in `rows`. Order-independent. Returns null until two distinct
 * snapshot dates exist.
 */
export function computeScoreDelta(rows: ScoreSnapshotRow[]): ScoreDelta | null {
  if (!rows.length) return null;

  const byDate = new Map<string, Partial<Record<PillarId, number>>>();
  for (const row of rows) {
    if (!byDate.has(row.snapshot_date)) byDate.set(row.snapshot_date, {});
    byDate.get(row.snapshot_date)![row.pillar as PillarId] = row.pillar_score;
  }

  const dates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
  if (dates.length < 2) return null;

  const [latest, previousDate] = dates;
  const current = totalAretuneScore(byDate.get(latest)!);
  const previous = totalAretuneScore(byDate.get(previousDate)!);
  return { current, previous, delta: current - previous, sinceDate: previousDate };
}

/**
 * Change in the total Aretune score between the two most recent scored days.
 * Returns null until at least two distinct snapshot dates exist.
 */
export async function loadScoreDelta(userId: string): Promise<ScoreDelta | null> {
  const { supabase } = await import('./supabase');
  const { data, error } = await supabase
    .from('score_snapshots')
    .select('snapshot_date, pillar, pillar_score')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(60);

  if (error || !data) return null;
  return computeScoreDelta(data as ScoreSnapshotRow[]);
}
