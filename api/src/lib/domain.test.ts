import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOnboardingResult } from '../../../lib/onboarding';
import { calculatePillarLifestyleScore } from '../../../lib/scoring';
import { findWeakestPillar } from '../routes/directive';
import { ALL_CATEGORIES } from '../../../lib/pillars';
import type { CheckIn, OnboardingAnswer } from '../../../types';

test('onboarding returns six-pillar scores and three focus pillars', () => {
  const answers: OnboardingAnswer[] = Array.from({ length: 12 }, (_, index) => ({
    questionId: `q${index + 1}`,
    answer: index % 4,
  }));
  const result = calculateOnboardingResult(answers);
  assert.equal(Object.keys(result.initialScores).length, 6);
  assert.equal(result.topPillars.length, 3);
  assert.ok(result.topPillars.every((pillar) => pillar in result.initialScores));
});

test('canonical catalog contains 46 unique categories', () => {
  assert.equal(ALL_CATEGORIES.length, 46);
  assert.equal(new Set(ALL_CATEGORIES.map((category) => category.id)).size, 46);
});

test('weakest pillar selection uses the lowest 0-100 score', () => {
  assert.equal(findWeakestPillar(['body', 'mind', 'lore'], { body: 70, mind: 31, lore: 55 }), 'mind');
});

test('lifestyle score is deterministic for seven complete days', () => {
  const checkIns: CheckIn[] = Array.from({ length: 7 }, (_, index) => {
    const loggedAt = new Date(Date.UTC(2026, 6, index + 1, 8)).toISOString();
    return {
      id: `check-in-${index}`,
      userId: 'user-1',
      mood: 7,
      energyLevel: 8,
      completedAt: loggedAt,
      entries: [
        { id: `sleep-${index}`, metricId: 'body_sleep_hours', userId: 'user-1', value: 8, loggedAt },
        { id: `training-${index}`, metricId: 'body_training', userId: 'user-1', value: 1, loggedAt },
      ],
    };
  });
  const snapshot = calculatePillarLifestyleScore('body', checkIns, '2026-07-08T00:00:00.000Z');
  assert.equal(snapshot.breakdown.consistency, 100);
  assert.equal(snapshot.breakdown.breadth, 100);
  assert.equal(snapshot.breakdown.intensity, 100);
  assert.equal(snapshot.breakdown.progression, 50);
  assert.equal(snapshot.score, 85);
});
