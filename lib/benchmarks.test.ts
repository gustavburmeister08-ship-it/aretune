import assert from 'node:assert/strict';
import test from 'node:test';
import { hasBenchmark, percentileFor } from './benchmarks';

test('reports no benchmark for metrics without cited source data', () => {
  assert.equal(hasBenchmark('body_fitness_athletics_athletic_performance'), false);
  assert.equal(percentileFor('body_fitness_athletics_athletic_performance', 8), null);
});

test('sleep duration percentile matches the documented CDC anchor points', () => {
  assert.equal(hasBenchmark('body_sleep_sleep_duration'), true);
  assert.equal(percentileFor('body_sleep_sleep_duration', 7)?.percentile, 64);
  assert.equal(percentileFor('body_sleep_sleep_duration', 8)?.percentile, 92);
  assert.equal(percentileFor('body_sleep_sleep_duration', 2)?.percentile, 6);
  assert.equal(percentileFor('body_sleep_sleep_duration', 24)?.percentile, 100);
});

test('sleep duration interpolates linearly between anchor points', () => {
  const result = percentileFor('body_sleep_sleep_duration', 7.5);
  assert.equal(result?.percentile, 78);
  assert.match(result?.label ?? '', /^Top 22%$/);
});

test('income percentile matches the documented Destatis anchor points', () => {
  const median = percentileFor('vocation_finance_wealth_monthly_income', 54_066 / 12);
  assert.equal(median?.percentile, 50);
  const top = percentileFor('vocation_finance_wealth_monthly_income', 250_000 / 12);
  assert.equal(top?.percentile, 99);
});
