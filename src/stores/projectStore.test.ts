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

  it('persists the hero chip and lists it first', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(repository, () => 1000, () => `id-${n++}`)

    const hero = await store.getState().createHero()
    expect(hero.theme).toBe('keynote')
    expect(hero.blocks).toHaveLength(6)
    expect(store.getState().projects[0].id).toBe(hero.id)
    expect(await repository.get(hero.id)).toMatchObject({ id: hero.id, theme: 'keynote' })
  })

  it('persists an independent preset remix and lists it first', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(repository, () => 1000, () => `remix-${n++}`)

    const first = await store.getState().remixPreset('neon-district-n9')
    const second = await store.getState().remixPreset('neon-district-n9')

    expect(first).toMatchObject({ id: 'remix-0', theme: 'neon', die: { shape: 'hexagon' } })
    expect(second.id).toBe('remix-1')
    expect(second.blocks[0].id).not.toBe(first.blocks[0].id)
    expect(store.getState().projects.map((project) => project.id)).toEqual(['remix-1', 'remix-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })
})
