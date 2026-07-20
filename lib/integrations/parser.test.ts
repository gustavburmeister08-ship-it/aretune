import assert from 'node:assert/strict';
import test from 'node:test';
import { parseIntegrationFile } from './parser';
import { INTEGRATION_PROVIDERS } from './catalog';

test('provider ids are unique and every provider declares data and permissions', () => {
  assert.equal(new Set(INTEGRATION_PROVIDERS.map((provider) => provider.id)).size, INTEGRATION_PROVIDERS.length);
  assert.ok(INTEGRATION_PROVIDERS.length >= 40);
  assert.ok(INTEGRATION_PROVIDERS.every((provider) => provider.dataTypes.length && provider.permissions.length));
});

test('parses normalized CSV and converts ten-point sleep scores', () => {
  const events = parseIntegrationFile('type,value,unit,occurred_at\nsleep_score,8.4,score,2026-07-14T06:00:00Z', 'sleep.csv', 'sleep-cycle');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'sleep_score');
  assert.equal(events[0].value, 84);
});

test('parses wide JSON exports and normalizes minute sleep duration', () => {
  const events = parseIntegrationFile(JSON.stringify([{ date: '2026-07-14', sleep_duration_minutes: 450, hrv: 62 }]), 'health.json', 'generic-csv');
  assert.deepEqual(events.map((event) => event.type), ['sleep_duration_hours', 'hrv_ms']);
  assert.equal(events[0].value, 7.5);
});
