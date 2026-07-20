import { supabase } from './supabase';
import type { PillarId, PillarScoreSnapshot } from '../types';
import type { Json } from '../types/database';

export async function persistScoreSnapshots(
  userId: string,
  snapshots: PillarScoreSnapshot[],
  inputs: Record<string, unknown>
): Promise<Partial<Record<PillarId, number>>> {
  if (!snapshots.length) return {};
  const snapshotDate = snapshots[0].calculatedAt.slice(0, 10);
  const payload = snapshots.map((snapshot) => ({
    pillar: snapshot.pillar,
    performance_score: snapshot.breakdown.performance ?? snapshot.score,
    lifestyle_score: snapshot.breakdown.lifestyle,
    pillar_score: snapshot.breakdown.pillar ?? snapshot.score,
    consistency_score: snapshot.breakdown.consistency,
    progression_score: snapshot.breakdown.progression,
    breadth_score: snapshot.breakdown.breadth,
    intensity_score: snapshot.breakdown.intensity,
    formula_version: snapshot.formulaVersion,
    inputs,
  }));
  const { data, error } = await supabase.rpc('persist_score_snapshots', {
    p_user_id: userId,
    p_snapshot_date: snapshotDate,
    p_snapshots: payload as unknown as Json,
  });
  if (error) throw error;
  return (data ?? {}) as Partial<Record<PillarId, number>>;
}
