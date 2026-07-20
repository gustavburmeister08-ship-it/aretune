import assert from 'node:assert/strict';
import test from 'node:test';
import { CATEGORY_CATALOG, CATEGORY_COUNT, CATEGORY_METRIC_COUNT, CATEGORIES_BY_PILLAR } from './category-catalog';
import { calculateCategoryPillarScore } from './category-scoring';
import type { CategoryTrackingEntry, PillarId } from '../types';

test('the documented hierarchy has complete and unique tracking coverage', () => {
  assert.equal(CATEGORY_COUNT, 46);
  assert.deepEqual(
    Object.fromEntries((Object.keys(CATEGORIES_BY_PILLAR) as PillarId[]).map((pillar) => [pillar, CATEGORIES_BY_PILLAR[pillar].length])),
    { body: 8, mind: 9, spirit: 7, relationships: 8, vocation: 8, lore: 6 }
  );
  assert.ok(CATEGORY_METRIC_COUNT >= 170);
  assert.equal(new Set(CATEGORY_CATALOG.map((category) => category.id)).size, CATEGORY_COUNT);
  assert.equal(
    new Set(CATEGORY_CATALOG.flatMap((category) => category.metrics.map((metric) => metric.id))).size,
    CATEGORY_METRIC_COUNT
  );
  assert.ok(CATEGORY_CATALOG.every((category) => category.metrics.length >= 3));
});

test('pillar weights sum to 100 and BODY uses the specified scientific base weights', () => {
  for (const categories of Object.values(CATEGORIES_BY_PILLAR)) {
    assert.equal(categories.reduce((sum, category) => sum + category.weight, 0), 100);
  }
  assert.deepEqual(
    Object.fromEntries(CATEGORIES_BY_PILLAR.body.map((category) => [category.label, category.weight])),
    {
      'Fitness & Athletics': 22,
      Nutrition: 20,
      'Wellness & Recovery': 8,
      Sleep: 25,
      'Medicine & Prevention': 15,
      'Body, Aesthetics & Style': 5,
      'Communication & Presence': 3,
      'Sexual Health': 2,
    }
  );
});

test('pillar score follows the documented 40/60 performance/lifestyle formula', () => {
  const now = '2026-07-14T10:00:00.000Z';
  const entries: CategoryTrackingEntry[] = CATEGORIES_BY_PILLAR.body.map((category, index) => ({
    id: `entry-${index}`,
    userId: 'user',
    categoryId: category.id,
    values: Object.fromEntries(category.metrics.map((metric) => [metric.id, metric.target])),
    loggedAt: now,
    createdAt: now,
  }));
  const result = calculateCategoryPillarScore('body', entries, now);
  assert.equal(result.breakdown.performance, 100);
  assert.equal(result.breakdown.breadth, 100);
  assert.equal(
    result.score,
    Math.round((100 * 0.4 + result.breakdown.lifestyle * 0.6) * 10) / 10
  );
});
