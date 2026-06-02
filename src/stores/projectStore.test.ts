import { describe, expect, it } from 'vitest'
import type { Project } from '../domain/project'
import type { ProjectRepository } from '../storage/projectRepository'
import { createProjectStore } from './projectStore'

function createMemoryRepository(): ProjectRepository {
  const projects = new Map<string, Project>()
  return {
    list: async () => [...projects.values()],
    get: async (id) => projects.get(id),
    save: async (project) => void projects.set(project.id, project),
    remove: async (id) => void projects.delete(id),
  }
}

describe('project store', () => {
  it('creates, duplicates, and removes local projects', async () => {
    const ids = ['project-1', 'project-2']
    const store = createProjectStore(createMemoryRepository(), () => 100, () => ids.shift()!)

    const created = await store.getState().create('Dream Chip')
    expect(created).toMatchObject({ id: 'project-1', name: 'Dream Chip' })

    const duplicated = await store.getState().duplicate(created.id)
    expect(duplicated).toMatchObject({ id: 'project-2', name: 'Dream Chip Copy' })

    await store.getState().remove(created.id)
    expect(store.getState().projects).toEqual([duplicated])
  })
})
