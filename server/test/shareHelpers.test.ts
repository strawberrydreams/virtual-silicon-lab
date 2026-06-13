import { describe, expect, it } from 'vitest'
import { buildShareUrl, resolvePublicBaseUrl } from '../src/share/baseUrl'
import { decodePngDataUrl } from '../src/share/poster'

describe('resolvePublicBaseUrl', () => {
  it('prefers the configured base and strips trailing slashes', () => {
    expect(resolvePublicBaseUrl('http://localhost/s/abc', 'https://chips.example.com/')).toBe(
      'https://chips.example.com',
    )
  })

  it('falls back to the request origin when no base is configured', () => {
    expect(resolvePublicBaseUrl('http://127.0.0.1:8787/s/abc', undefined)).toBe('http://127.0.0.1:8787')
    expect(resolvePublicBaseUrl('http://127.0.0.1:8787/s/abc', '')).toBe('http://127.0.0.1:8787')
  })
})

describe('buildShareUrl', () => {
  it('joins the base and slug under /s/', () => {
    expect(buildShareUrl('https://chips.example.com', 'ada-chip-deadbeef')).toBe(
      'https://chips.example.com/s/ada-chip-deadbeef',
    )
  })
})

describe('decodePngDataUrl', () => {
  it('decodes a base64 PNG data URL into bytes', () => {
    const bytes = decodePngDataUrl('data:image/png;base64,AAAA')
    expect(bytes).not.toBeNull()
    expect((bytes as Buffer).length).toBeGreaterThan(0)
  })

  it('returns null for non-PNG or empty data URLs', () => {
    expect(decodePngDataUrl('data:image/jpeg;base64,AAAA')).toBeNull()
    expect(decodePngDataUrl('data:image/png;base64,')).toBeNull()
    expect(decodePngDataUrl('not-a-data-url')).toBeNull()
  })
})
