import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_ARETUNE_SCORE, scoreLevel, totalAretuneScore } from './aretune-score';

test('total score sums all six pillars and treats missing pillars as zero', () => {
  assert.equal(totalAretuneScore({}), 0);
  assert.equal(totalAretuneScore({ body: 82, mind: 91 }), 173);
  assert.equal(
    totalAretuneScore({ body: 82, mind: 91, spirit: 64, relationships: 73, vocation: 88, lore: 69 }),
    467
  );
});

test('total score rounds and clamps into 0–600', () => {
  assert.equal(totalAretuneScore({ body: 33.4, mind: 33.4 }), 67);
  assert.equal(totalAretuneScore({ body: NaN, mind: 50 }), 50);
  const all = { body: 100, mind: 100, spirit: 100, relationships: 100, vocation: 100, lore: 100 };
  assert.equal(totalAretuneScore(all), MAX_ARETUNE_SCORE);
});

test('level bands map scores to the six spec levels at their boundaries', () => {
  assert.equal(scoreLevel(0).name, 'Sleeping');
  assert.equal(scoreLevel(100).name, 'Sleeping');
  assert.equal(scoreLevel(101).name, 'Awakening');
  assert.equal(scoreLevel(300).name, 'Building');
  assert.equal(scoreLevel(301).name, 'Thriving');
  assert.equal(scoreLevel(487).name, 'Elite');
  assert.equal(scoreLevel(600).name, 'Ascendant');
});
