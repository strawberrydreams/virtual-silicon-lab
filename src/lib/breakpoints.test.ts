import { describe, expect, it } from 'vitest'
import { MOBILE_MAX_WIDTH, MOBILE_MEDIA_QUERY } from './breakpoints'

describe('breakpoints', () => {
  it('exposes the mobile max width and a matching media query', () => {
    expect(MOBILE_MAX_WIDTH).toBe(767)
    expect(MOBILE_MEDIA_QUERY).toBe(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
  })
})
