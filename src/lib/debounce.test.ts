import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncer } from './debounce'

describe('createDebouncer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs the callback once after the quiet window', () => {
    const callback = vi.fn()
    const debouncer = createDebouncer(callback, 600)

    debouncer.schedule()
    debouncer.schedule()
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(600)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('cancel prevents a pending callback', () => {
    const callback = vi.fn()
    const debouncer = createDebouncer(callback, 600)

    debouncer.schedule()
    debouncer.cancel()
    vi.advanceTimersByTime(600)

    expect(callback).not.toHaveBeenCalled()
  })

  it('flush runs a pending callback immediately and only once', () => {
    const callback = vi.fn()
    const debouncer = createDebouncer(callback, 600)

    debouncer.schedule()
    debouncer.flush()
    vi.advanceTimersByTime(600)

    expect(callback).toHaveBeenCalledTimes(1)
  })
})
