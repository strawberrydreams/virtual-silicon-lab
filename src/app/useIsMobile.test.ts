import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIsMobile } from './useIsMobile'

function stubMatchMedia(matches: boolean, listeners: ((e: MediaQueryListEvent) => void)[] = []) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }))
}

describe('useIsMobile', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns true when the mobile media query matches', () => {
    stubMatchMedia(true)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when the mobile media query does not match', () => {
    stubMatchMedia(false)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when the media query change event fires', () => {
    const listeners: ((e: MediaQueryListEvent) => void)[] = []
    stubMatchMedia(false, listeners)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
    act(() => listeners.forEach((cb) => cb({ matches: true } as MediaQueryListEvent)))
    expect(result.current).toBe(true)
  })
})
