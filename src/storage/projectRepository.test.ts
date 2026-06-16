import 'fake-indexeddb/auto'
import { openDB } from 'idb'
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

  it('returns undefined for a corrupt IndexedDB record requested by id', async () => {
    const databaseName = `test-corrupt-get-${crypto.randomUUID()}`
    const database = await openDB(databaseName, 1, {
      upgrade(db) {
        db.createObjectStore('projects')
      },
    })
    await database.put('projects', { schemaVersion: 1, id: 'half-written' }, 'half-written')
    database.close()

    const repository = createIndexedDbProjectRepository(databaseName)

    await expect(repository.get('half-written')).resolves.toBeUndefined()
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

  it('returns an empty list when the localStorage blob is not valid JSON', async () => {
    const repository = createLocalStorageProjectRepository('test-corrupt-json')
    localStorage.setItem('test-corrupt-json', '{ this is not json')

    expect(await repository.list()).toEqual([])
  })

  it('returns an empty list when the localStorage blob is valid JSON but not an array', async () => {
    const repository = createLocalStorageProjectRepository('test-nonarray')
    localStorage.setItem('test-nonarray', 'null')

    expect(await repository.list()).toEqual([])
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
