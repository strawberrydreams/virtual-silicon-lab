export type RateLimitOptions = {
  windowMs: number
  max: number
}

export type RateLimitDecision = { ok: true } | { ok: false; retryAfterSeconds: number }

type Bucket = {
  windowStart: number
  count: number
}

export function createRateLimiter(options: RateLimitOptions, now: () => number = Date.now) {
  const buckets = new Map<string, Bucket>()

  return {
    check(key: string): RateLimitDecision {
      const current = now()
      const existing = buckets.get(key)
      const bucket =
        existing === undefined || current - existing.windowStart >= options.windowMs
          ? { windowStart: current, count: 0 }
          : existing

      if (bucket.count >= options.max) {
        const retryAfterMs = Math.max(0, bucket.windowStart + options.windowMs - current)
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
      }

      bucket.count += 1
      buckets.set(key, bucket)
      return { ok: true }
    },
  }
}
