import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { rafThrottle } from './rafThrottle'

describe('rafThrottle', () => {
  let frameCallbacks: FrameRequestCallback[]

  beforeEach(() => {
    frameCallbacks = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallbacks.push(callback)
      return frameCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => {
      frameCallbacks[handle - 1] = () => {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function flushFrame() {
    const callbacks = frameCallbacks
    frameCallbacks = []
    for (const callback of callbacks) callback(0)
  }

  it('coalesces a burst of calls into one invocation with the latest argument', () => {
    const target = vi.fn()
    const throttled = rafThrottle(target)

    throttled(1)
    throttled(2)
    throttled(3)
    expect(target).not.toHaveBeenCalled()

    flushFrame()
    expect(target).toHaveBeenCalledTimes(1)
    expect(target).toHaveBeenCalledWith(3)
  })

  it('schedules again after the frame fires', () => {
    const target = vi.fn()
    const throttled = rafThrottle(target)

    throttled('a')
    flushFrame()
    throttled('b')
    flushFrame()

    expect(target).toHaveBeenCalledTimes(2)
    expect(target).toHaveBeenLastCalledWith('b')
  })

  it('cancel drops the pending invocation', () => {
    const target = vi.fn()
    const throttled = rafThrottle(target)

    throttled('stale')
    throttled.cancel()
    flushFrame()

    expect(target).not.toHaveBeenCalled()
  })
})
