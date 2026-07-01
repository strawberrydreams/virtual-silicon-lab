import { describe, expect, it } from 'vitest'
import { validateSyncPush } from '../src/sync/validation'

describe('validateSyncPush', () => {
  it('accepts a project object whose id matches the url and serializes it', () => {
    const result = validateSyncPush({ id: 'p1', updatedAt: 100, name: 'X' }, 'p1')
    expect(result).toEqual({
      ok: true,
      projectJson: JSON.stringify({ id: 'p1', updatedAt: 100, name: 'X' }),
      updatedAt: 100,
    })
  })

  it('rejects a non-object body', () => {
    expect(validateSyncPush(null, 'p1')).toEqual({
      ok: false,
      message: 'Body must be a project object.',
    })
    expect(validateSyncPush([1, 2], 'p1')).toEqual({
      ok: false,
      message: 'Body must be a project object.',
    })
  })

  it('rejects a project whose id does not match the url', () => {
    expect(validateSyncPush({ id: 'other', updatedAt: 100 }, 'p1')).toEqual({
      ok: false,
      message: 'Project id must match the URL.',
    })
  })

  it('rejects a non-finite updatedAt', () => {
    expect(validateSyncPush({ id: 'p1', updatedAt: 'soon' }, 'p1')).toEqual({
      ok: false,
      message: 'Project updatedAt must be a finite number.',
    })
    expect(validateSyncPush({ id: 'p1', updatedAt: Infinity }, 'p1')).toEqual({
      ok: false,
      message: 'Project updatedAt must be a finite number.',
    })
  })
})
