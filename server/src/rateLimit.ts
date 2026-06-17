export type RateLimitOptions = {
  windowMs: number
  max: number
  overrides?: Record<string, { windowMs: number; max: number }>
}

export type RateLimitDecision = { ok: true } | { ok: false; retryAfterSeconds: number }

type Bucket = {
  windowStart: number
  count: number
  windowMs: number
}

export function createRateLimiter(options: RateLimitOptions, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>()

  return {
    check(key: string, override?: { windowMs: number; max: number }): RateLimitDecision {
      const current = now()
      for (const [bucketKey, bucket] of buckets) {
        if (current - bucket.windowStart >= bucket.windowMs) buckets.delete(bucketKey)
      }
      const activeOptions = override ?? options
      const existing = buckets.get(key)
      const bucket =
        existing === undefined || current - existing.windowStart >= activeOptions.windowMs
          ? { windowStart: current, count: 0, windowMs: activeOptions.windowMs }
          : existing

      if (bucket.count >= activeOptions.max) {
        const retryAfterMs = Math.max(0, bucket.windowStart + bucket.windowMs - current)
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
      }

      bucket.count += 1
      buckets.set(key, bucket)
      return { ok: true }
    },
    size() {
      return buckets.size
    },
  }
}
