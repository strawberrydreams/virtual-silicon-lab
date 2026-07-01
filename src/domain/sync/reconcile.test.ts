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

describe('reconcile — last-write-wins on both sides', () => {
  it('applies the server copy when it is newer', () => {
    const plan = reconcile([{ id: 'a', updatedAt: 100 }], [{ id: 'a', updatedAt: 200 }])

    expect(plan).toEqual({ toPush: [], toApply: ['a'], toDeleteLocal: [] })
  })

  it('pushes the local copy when it is newer', () => {
    const plan = reconcile([{ id: 'a', updatedAt: 300 }], [{ id: 'a', updatedAt: 200 }])

    expect(plan).toEqual({ toPush: ['a'], toApply: [], toDeleteLocal: [] })
  })

  it('does nothing when both sides share the same updatedAt', () => {
    const plan = reconcile([{ id: 'a', updatedAt: 200 }], [{ id: 'a', updatedAt: 200 }])

    expect(plan).toEqual({ toPush: [], toApply: [], toDeleteLocal: [] })
  })
})
