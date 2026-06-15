import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, type RemixOrigin } from './project'

describe('schema version', () => {
  it('is 5 for v4-m4 remix lineage', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(5)
  })

  it('RemixOrigin carries chip id, slug, and title', () => {
    const origin: RemixOrigin = { chipId: 'c1', slug: 's1', title: 'T1' }

    expect(origin).toEqual({ chipId: 'c1', slug: 's1', title: 'T1' })
  })
})
