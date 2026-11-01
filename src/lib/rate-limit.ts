type RateLimitEntry = { windowStartedAt: number; count: number };
const requestsByKey = new Map<string, RateLimitEntry>();

/** Best-effort process-local limit; use shared Redis/KV for multi-instance enforcement. */
export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  for (const [entryKey, entry] of requestsByKey) {
    if (now - entry.windowStartedAt >= windowMs) requestsByKey.delete(entryKey);
  }
  const current = requestsByKey.get(key);
  if (!current || now - current.windowStartedAt >= windowMs) {
    requestsByKey.set(key, { windowStartedAt: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - current.windowStartedAt)) / 1000)) };
  current.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - current.count), retryAfterSeconds: 0 };
}
