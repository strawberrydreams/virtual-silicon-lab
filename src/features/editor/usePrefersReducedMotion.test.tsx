import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

function Probe() {
  return <div>{usePrefersReducedMotion() ? 'reduced' : 'motion-ok'}</div>
}

function installMatchMedia(initialMatches: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | null = null
  const mediaQuery = {
    matches: initialMatches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: string, cb: (event: MediaQueryListEvent) => void) => {
      listener = cb
    }),
    removeEventListener: vi.fn(),
    addListener: vi.fn((cb: (event: MediaQueryListEvent) => void) => {
      listener = cb
    }),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mediaQuery),
  )

  return {
    mediaQuery,
    emit(matches: boolean) {
      ;(mediaQuery as { matches: boolean }).matches = matches
      act(() => listener?.({ matches } as MediaQueryListEvent))
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePrefersReducedMotion', () => {
  it('reads the current media query value', () => {
    installMatchMedia(true)

    render(<Probe />)

    expect(screen.getByText('reduced')).toBeInTheDocument()
  })

  it('updates when the media query changes', () => {
    const media = installMatchMedia(false)

    render(<Probe />)

    expect(screen.getByText('motion-ok')).toBeInTheDocument()

    media.emit(true)

    expect(screen.getByText('reduced')).toBeInTheDocument()
  })
})
