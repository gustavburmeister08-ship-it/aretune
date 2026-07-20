import { calculateLifestyleScores } from './scoring';
import { calculateCategoryScores } from './category-scoring';
import { loadCategoryEntries } from './category-tracking';
import { persistScoreSnapshots } from './score-persistence';
import type { CheckIn, PillarId } from '../types';

export async function persistLifestyleScores(
  userId: string,
  activePillars: PillarId[],
  checkIns: CheckIn[]
): Promise<Partial<Record<PillarId, number>>> {
  const calculatedAt = new Date().toISOString();
  const categoryEntries = await loadCategoryEntries(userId);
  const snapshots = categoryEntries.length
    ? calculateCategoryScores(activePillars, categoryEntries, calculatedAt)
    : calculateLifestyleScores(activePillars, checkIns, calculatedAt);
  return persistScoreSnapshots(userId, snapshots, { check_in_ids: checkIns.map((checkIn) => checkIn.id) });
}
