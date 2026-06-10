// Coalesce a burst of calls (e.g. pointer-move events, which can outpace the
// display) into at most one invocation per animation frame, keeping only the
// latest argument. Framework-agnostic; the caller cancels on teardown.
export type RafThrottled<T> = {
  (value: T): void
  cancel: () => void
}

export function rafThrottle<T>(target: (value: T) => void): RafThrottled<T> {
  let handle: number | null = null
  let latest: T

  const throttled = (value: T) => {
    latest = value
    if (handle !== null) return
    handle = requestAnimationFrame(() => {
      handle = null
      target(latest)
    })
  }

  throttled.cancel = () => {
    if (handle === null) return
    cancelAnimationFrame(handle)
    handle = null
  }

  return throttled
}
