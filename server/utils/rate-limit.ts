interface RateLimitBucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  }
}

export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

export function clearRateLimits(): void {
  buckets.clear()
}
