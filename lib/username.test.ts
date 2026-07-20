import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeUsernameInput, usernameValidationError } from './username-rules';

test('normalizes an Instagram-style username', () => {
  assert.equal(normalizeUsernameInput(' @Max.Power_7 '), 'max.power_7');
});

test('accepts letters, numbers, periods and underscores', () => {
  assert.equal(usernameValidationError('max.power_7'), undefined);
});

test('rejects short, dotted-edge and consecutive-period usernames', () => {
  assert.match(usernameValidationError('ab') ?? '', /at least/);
  assert.match(usernameValidationError('.max') ?? '', /Start and end/);
  assert.match(usernameValidationError('max..power') ?? '', /Consecutive/);
});
