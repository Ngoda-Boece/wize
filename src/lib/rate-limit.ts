// Fixed-window in-memory rate limiter. It protects the expensive AI endpoints
// from bursts on a single server instance. For multi-instance deployments,
// replace it with a shared store (e.g. Redis); see README "Limitations".

type Bucket = { count: number; resetAt: number };
const globalBuckets = globalThis as unknown as { __wizeRateBuckets?: Map<string, Bucket> };
const buckets = (globalBuckets.__wizeRateBuckets ??= new Map());

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  bucket.count++;
  return { ok: true };
}

export const CHAT_RATE_LIMIT = { limit: 20, windowMs: 60_000 };
export const SUMMARY_RATE_LIMIT = { limit: 5, windowMs: 60_000 };

// One generation at a time per conversation (per instance) prevents two tabs
// or a double submit from producing interleaved replies.
const globalLocks = globalThis as unknown as { __wizeGenerationLocks?: Set<string> };
const locks = (globalLocks.__wizeGenerationLocks ??= new Set());

export function acquireGenerationLock(conversationId: string): boolean {
  if (locks.has(conversationId)) return false;
  locks.add(conversationId);
  return true;
}

export function releaseGenerationLock(conversationId: string): void {
  locks.delete(conversationId);
}
