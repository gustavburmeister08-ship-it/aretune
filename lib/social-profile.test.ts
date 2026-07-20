import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSocialUrl, SOCIAL_PLATFORMS } from './social-platforms';

test('social catalog contains the requested networks and unique ids', () => {
  const ids = SOCIAL_PLATFORMS.map((platform) => platform.id);
  assert.deepEqual(ids.slice(0, 5), ['x', 'instagram', 'facebook', 'linkedin', 'substack']);
  assert.equal(new Set(ids).size, ids.length);
});

test('handles are normalized to canonical HTTPS links', () => {
  assert.deepEqual(normalizeSocialUrl('x', '@operator'), { url: 'https://x.com/operator', handle: 'operator' });
  assert.deepEqual(normalizeSocialUrl('substack', 'operator'), { url: 'https://operator.substack.com', handle: 'operator' });
  assert.deepEqual(normalizeSocialUrl('linkedin', 'linkedin.com/in/operator'), { url: 'https://linkedin.com/in/operator', handle: 'operator' });
  assert.deepEqual(normalizeSocialUrl('website', 'example.com'), { url: 'https://example.com', handle: undefined });
});

test('platform links reject lookalike domains and unsafe schemes', () => {
  assert.throws(() => normalizeSocialUrl('instagram', 'https://instagram.example.com/operator'));
  assert.throws(() => normalizeSocialUrl('website', 'javascript:alert(1)'));
});
