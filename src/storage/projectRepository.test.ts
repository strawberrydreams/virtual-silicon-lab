import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../domain/projectFactory'
import { createIndexedDbProjectRepository } from './indexedDbProjectRepository'
import { createLocalStorageProjectRepository } from './localStorageProjectRepository'
import { createResilientProjectRepository } from './resilientProjectRepository'

describe('project repositories', () => {
  beforeEach(() => localStorage.clear())

  it('saves, lists, reads, and removes projects in IndexedDB', async () => {
    const repository = createIndexedDbProjectRepository(`test-${crypto.randomUUID()}`)
    const project = createProject('Dream Chip', 'project-1', 100)

    await repository.save(project)
    expect(await repository.list()).toEqual([project])
    expect(await repository.get('project-1')).toEqual(project)

    await repository.remove('project-1')
    expect(await repository.list()).toEqual([])
  })

  it('uses localStorage when the primary repository fails', async () => {
    const fallback = createLocalStorageProjectRepository('test-projects')
    const repository = createResilientProjectRepository(
      {
        list: async () => Promise.reject(new Error('IndexedDB unavailable')),
        get: async () => Promise.reject(new Error('IndexedDB unavailable')),
        save: async () => Promise.reject(new Error('IndexedDB unavailable')),
        remove: async () => Promise.reject(new Error('IndexedDB unavailable')),
      },
      fallback,
    )
    const project = createProject('Fallback Chip', 'project-2', 200)

    await repository.save(project)

    expect(await repository.get('project-2')).toEqual(project)
  })

  it('sticks to the fallback after a primary failure and never reads stale primary data', async () => {
    const fresh = createProject('Fresh Chip', 'project-3', 300)
    const stale = createProject('Stale Chip', 'project-3', 100)
    const fallback = createLocalStorageProjectRepository('test-sticky-projects')
    let primaryGetCalls = 0
    const primary = {
      list: async () => [stale],
      get: async () => {
        primaryGetCalls += 1
        return stale
      },
      save: async () => Promise.reject(new Error('IndexedDB write failed')),
      remove: async () => {},
    }
    const repository = createResilientProjectRepository(primary, fallback)

    await repository.save(fresh) // primary rejects -> fallback, and marks primary failed

    expect(await repository.get('project-3')).toEqual(fresh) // sticky fallback, not stale primary
    expect(primaryGetCalls).toBe(0) // primary not consulted again this session
  })
})
