interface Bucket { count: number; resetsAt: number }
const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Too many requests');
  }
}

export function enforceRateLimit(key: string, limit = 10, windowMs = 60_000): void {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return;
  }
  if (current.count >= limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((current.resetsAt - now) / 1000)));
  }
  current.count += 1;

  if (buckets.size > 10_000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetsAt <= now) buckets.delete(bucketKey);
    }
  }
}
