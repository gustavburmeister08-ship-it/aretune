import assert from 'node:assert/strict';
import test from 'node:test';
import { computeBenchmarkStandings } from './benchmark-summary';
import type { CategoryTrackingEntry } from '../types';

const entry = (
  categoryId: string,
  values: Record<string, number>,
  loggedAt: string
): CategoryTrackingEntry => ({
  id: `${categoryId}-${loggedAt}`,
  userId: 'u1',
  categoryId,
  values,
  loggedAt,
  createdAt: loggedAt,
});

test('returns no standings when no benchmarked metric is logged', () => {
  const standings = computeBenchmarkStandings([
    entry('body_fitness_athletics', { body_fitness_athletics_athletic_performance: 8 }, '2026-07-20'),
  ]);
  assert.equal(standings.length, 0);
});

test('surfaces the latest value for a benchmarked metric with its percentile', () => {
  const standings = computeBenchmarkStandings([
    entry('body_sleep', { body_sleep_sleep_duration: 6 }, '2026-07-18'),
    entry('body_sleep', { body_sleep_sleep_duration: 8 }, '2026-07-21'),
  ]);
  assert.equal(standings.length, 1);
  assert.equal(standings[0].metricId, 'body_sleep_sleep_duration');
  assert.equal(standings[0].value, 8); // most recent wins
  assert.equal(standings[0].pillar, 'body');
  assert.equal(standings[0].result.percentile, 92);
  assert.equal(standings[0].result.label, 'Top 8%');
});

test('sorts multiple standings best-percentile first', () => {
  const standings = computeBenchmarkStandings([
    entry('body_sleep', { body_sleep_sleep_duration: 6 }, '2026-07-21'), // ~35th pct
    entry('vocation_finance_wealth', { vocation_finance_wealth_monthly_income: 100_719 / 12 }, '2026-07-21'), // 90th pct
  ]);
  assert.equal(standings.length, 2);
  assert.equal(standings[0].metricId, 'vocation_finance_wealth_monthly_income');
  assert.ok(standings[0].result.percentile > standings[1].result.percentile);
});
