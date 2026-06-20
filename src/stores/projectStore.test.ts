import { describe, expect, it } from 'vitest'
import type { Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
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
    const store = createProjectStore(
      createMemoryRepository(),
      () => 100,
      () => ids.shift()!,
    )

    const created = await store.getState().create('Dream Chip')
    expect(created).toMatchObject({ id: 'project-1', name: 'Dream Chip' })

    const duplicated = await store.getState().duplicate(created.id)
    expect(duplicated).toMatchObject({ id: 'project-2', name: 'Dream Chip Copy' })

    await store.getState().remove(created.id)
    expect(store.getState().projects).toEqual([duplicated])
  })

  it('persists an independent preset remix and lists it first', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(
      repository,
      () => 1000,
      () => `remix-${n++}`,
    )

    const first = await store.getState().remixPreset('neon-district-n9')
    const second = await store.getState().remixPreset('neon-district-n9')

    expect(first).toMatchObject({ id: 'remix-0', theme: 'neon', die: { shape: 'hexagon' } })
    expect(second.id).toBe('remix-1')
    expect(second.blocks[0].id).not.toBe(first.blocks[0].id)
    expect(store.getState().projects.map((project) => project.id)).toEqual(['remix-1', 'remix-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })

  it('imports a published snapshot as an independent local project listed first', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(
      repository,
      () => 9_000,
      () => `import-${n++}`,
    )
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const first = await store.getState().remixImport(snapshot)
    const second = await store.getState().remixImport(snapshot)

    expect(first).toMatchObject({ id: 'import-0', name: 'Ada Chip Remix', createdAt: 9_000 })
    expect(second.id).toBe('import-1')
    expect(store.getState().projects.map((project) => project.id)).toEqual(['import-1', 'import-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })

  it('remixImport persists the provided origin as remixedFrom', async () => {
    const repository = createMemoryRepository()
    const store = createProjectStore(
      repository,
      () => 9_000,
      () => 'import-0',
    )
    const snapshot = createProject('Ada Chip', 'source-id', 1_000)

    const project = await store.getState().remixImport(snapshot, {
      chipId: 'c1',
      slug: 's1',
      title: 'Parent',
    })

    expect(project.remixedFrom).toEqual({ chipId: 'c1', slug: 's1', title: 'Parent' })
    expect(await repository.get(project.id)).toEqual(project)
  })

  it('saves an AI draft as a fresh local project listed first, keeping its name', async () => {
    const repository = createMemoryRepository()
    let n = 0
    const store = createProjectStore(repository, () => 7_000, () => `ai-${n++}`)
    const draft = createProject('Prompted Chip', 'server-id', 1_000)

    const first = await store.getState().createFromAiDraft(draft)
    const second = await store.getState().createFromAiDraft(draft)

    expect(first).toMatchObject({ id: 'ai-0', name: 'Prompted Chip', createdAt: 7_000 })
    expect(first.remixedFrom).toBeUndefined()
    expect(second.id).toBe('ai-1')
    expect(store.getState().projects.map((project) => project.id)).toEqual(['ai-1', 'ai-0'])
    expect(await repository.get(first.id)).toEqual(first)
  })

  it('persists a deterministic random chip project and lists it first', async () => {
    const repository = createMemoryRepository()
    const store = createProjectStore(
      repository,
      () => 2000,
      () => 'random-seed',
    )

    const project = await store.getState().createRandom()

    expect(project).toMatchObject({ id: 'random-seed', name: 'RANDOM CHIP RANDOM' })
    expect(project.blocks.length).toBeGreaterThanOrEqual(6)
    expect(store.getState().projects[0]).toEqual(project)
    expect(await repository.get(project.id)).toEqual(project)
  })
})
