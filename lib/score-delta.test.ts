import assert from 'node:assert/strict';
import test from 'node:test';
import { computeScoreDelta, type ScoreSnapshotRow } from './score-delta';

const row = (date: string, pillar: string, score: number): ScoreSnapshotRow => ({
  snapshot_date: date,
  pillar,
  pillar_score: score,
});

test('returns null with fewer than two distinct snapshot dates', () => {
  assert.equal(computeScoreDelta([]), null);
  assert.equal(computeScoreDelta([row('2026-07-20', 'body', 80), row('2026-07-20', 'mind', 70)]), null);
});

test('computes the delta between the two most recent dates, order-independent', () => {
  const rows = [
    // deliberately unsorted
    row('2026-07-19', 'body', 70),
    row('2026-07-21', 'body', 82),
    row('2026-07-19', 'mind', 80),
    row('2026-07-21', 'mind', 91),
    row('2026-07-18', 'body', 60),
  ];
  const result = computeScoreDelta(rows);
  assert.ok(result);
  assert.equal(result!.current, 82 + 91); // latest = 2026-07-21
  assert.equal(result!.previous, 70 + 80); // previous = 2026-07-19
  assert.equal(result!.delta, 23);
  assert.equal(result!.sinceDate, '2026-07-19');
});

test('surfaces a negative delta when the score dropped', () => {
  const result = computeScoreDelta([
    row('2026-07-20', 'body', 90),
    row('2026-07-21', 'body', 84),
  ]);
  assert.equal(result!.delta, -6);
});
