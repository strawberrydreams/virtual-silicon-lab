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
})
