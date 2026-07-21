import { PILLARS } from './pillars';
import type { PillarId } from '../types';

/**
 * The total Aretune Score is the sum of all six pillar scores (each 0–100),
 * so it ranges from 0 to 600. See docs/uebermensch-scoring.docx:
 * "Der Aretune Score ist die Summe aller 6 Säulen-Scores."
 */
export const MAX_ARETUNE_SCORE = 600;

export interface ScoreLevel {
  /** 0-based band index (0 = Sleeping … 5 = Ascendant). */
  index: number;
  name: string;
  min: number;
  max: number;
}

/**
 * Six equal 100-point bands. Names follow the scoring spec; the top band is
 * intentionally easy to rename (spec calls it "Übermensch").
 */
export const SCORE_LEVELS: ScoreLevel[] = [
  { index: 0, name: 'Sleeping', min: 0, max: 100 },
  { index: 1, name: 'Awakening', min: 101, max: 200 },
  { index: 2, name: 'Building', min: 201, max: 300 },
  { index: 3, name: 'Thriving', min: 301, max: 400 },
  { index: 4, name: 'Elite', min: 401, max: 500 },
  { index: 5, name: 'Ascendant', min: 501, max: 600 },
];

/** Sum of all six pillar scores, rounded, clamped to 0–600. Missing pillars count as 0. */
export function totalAretuneScore(scores: Partial<Record<PillarId, number>>): number {
  const total = PILLARS.reduce((sum, pillar) => {
    const value = scores[pillar.id];
    return sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
  return Math.max(0, Math.min(MAX_ARETUNE_SCORE, Math.round(total)));
}

/** Resolve the level band for a total score (0–600). */
export function scoreLevel(total: number): ScoreLevel {
  const clamped = Math.max(0, Math.min(MAX_ARETUNE_SCORE, total));
  return SCORE_LEVELS.find((level) => clamped <= level.max) ?? SCORE_LEVELS[SCORE_LEVELS.length - 1];
}
