import { createStore } from 'zustand/vanilla'
import type { Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import type { ProjectRepository } from '../storage/projectRepository'

type ProjectState = {
  projects: Project[]
  load: () => Promise<void>
  create: (name: string) => Promise<Project>
  duplicate: (id: string) => Promise<Project>
  remove: (id: string) => Promise<void>
}

export function createProjectStore(
  repository: ProjectRepository,
  now = Date.now,
  createId: () => string = () => crypto.randomUUID(),
) {
  return createStore<ProjectState>((set, get) => ({
    projects: [],
    async load() {
      set({ projects: await repository.list() })
    },
    async create(name) {
      const project = createProject(name, createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
    async duplicate(id) {
      const source = get().projects.find((project) => project.id === id)
      if (source === undefined) throw new Error(`Project not found: ${id}`)

      const duplicated: Project = structuredClone({
        ...source,
        id: createId(),
        name: `${source.name} Copy`,
        createdAt: now(),
        updatedAt: now(),
      })
      await repository.save(duplicated)
      set({ projects: [duplicated, ...get().projects] })
      return duplicated
    },
    async remove(id) {
      await repository.remove(id)
      set({ projects: get().projects.filter((project) => project.id !== id) })
    },
  }))
}
