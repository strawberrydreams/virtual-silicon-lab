import { describe, expect, it } from 'vitest'
import { reconcile } from './reconcile'

describe('reconcile — new project routing', () => {
  it('pushes a project that exists only locally', () => {
    const plan = reconcile([{ id: 'a', updatedAt: 100 }], [])

    expect(plan).toEqual({ toPush: ['a'], toApply: [], toDeleteLocal: [] })
  })

  it('applies a live project that exists only on the server', () => {
    const plan = reconcile([], [{ id: 'b', updatedAt: 100 }])

    expect(plan).toEqual({ toPush: [], toApply: ['b'], toDeleteLocal: [] })
  })

  it('sorts output ids ascending regardless of input order', () => {
    const plan = reconcile([{ id: 'z', updatedAt: 1 }, { id: 'm', updatedAt: 1 }], [])

    expect(plan.toPush).toEqual(['m', 'z'])
  })
})
