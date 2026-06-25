import { describe, expect, it } from 'vitest'
import { CURRENT_SCHEMA_VERSION, type RemixOrigin } from './project'

describe('schema version', () => {
  it('is 9 for v10 camera pose authoring', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(9)
  })

  it('RemixOrigin carries chip id, slug, and title', () => {
    const origin: RemixOrigin = { chipId: 'c1', slug: 's1', title: 'T1' }

    expect(origin).toEqual({ chipId: 'c1', slug: 's1', title: 'T1' })
  })
})
