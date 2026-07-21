import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PillarId } from '../types';

const THRESHOLDS = [50, 70, 90] as const;

const storageKey = (userId: string) => `aretune:milestones_offered:${userId}`;

async function offeredSet(userId: string): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  return new Set(raw ? (JSON.parse(raw) as string[]) : []);
}

// Returns the highest newly-crossed pillar/threshold milestone that hasn't
// been offered to the user yet, or null if there is none. Does not mark it
// as offered — call markMilestoneOffered once the user has responded to the
// share prompt (accepted or dismissed), so a "not now" doesn't re-prompt on
// every screen visit but a later, higher threshold still can.
export async function findNewMilestone(
  userId: string,
  pillarScores: Partial<Record<PillarId, number>>
): Promise<{ pillar: PillarId; score: number } | null> {
  const offered = await offeredSet(userId);
  for (const [pillar, score] of Object.entries(pillarScores) as [PillarId, number | undefined][]) {
    if (score == null) continue;
    for (const threshold of THRESHOLDS) {
      if (score >= threshold && !offered.has(`${pillar}:${threshold}`)) {
        return { pillar, score };
      }
    }
  }
  return null;
}

export async function markMilestoneOffered(userId: string, pillar: PillarId, score: number): Promise<void> {
  const offered = await offeredSet(userId);
  for (const threshold of THRESHOLDS) {
    if (score >= threshold) offered.add(`${pillar}:${threshold}`);
  }
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify([...offered]));
}
