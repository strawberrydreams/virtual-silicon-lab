import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, type RemixOrigin } from './project'

describe('schema version', () => {
  it('is 8 for v9 per-block material overrides', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(8)
  })

  it('RemixOrigin carries chip id, slug, and title', () => {
    const origin: RemixOrigin = { chipId: 'c1', slug: 's1', title: 'T1' }

    expect(origin).toEqual({ chipId: 'c1', slug: 's1', title: 'T1' })
  })
})
