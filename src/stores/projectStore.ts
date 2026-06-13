import { createStore } from 'zustand/vanilla'
import type { Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import { importRemixedProject } from '../domain/remixImport'
import type { PresetId } from '../presets/presetCatalog'
import { createPresetProject } from '../presets/presetFactory'
import type { ProjectRepository } from '../storage/projectRepository'
import { generateRandomChipProject } from '../visual/randomChipGenerator'

type ProjectState = {
  projects: Project[]
  load: () => Promise<void>
  create: (name: string) => Promise<Project>
  createRandom: () => Promise<Project>
  remixPreset: (presetId: PresetId) => Promise<Project>
  remixImport: (snapshot: unknown) => Promise<Project>
  duplicate: (id: string) => Promise<Project>
  remove: (id: string) => Promise<void>
  get: (id: string) => Promise<Project | undefined>
  save: (project: Project) => Promise<Project>
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
    async createRandom() {
      const id = createId()
      const project = generateRandomChipProject(id, id, now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
    async remixPreset(presetId) {
      const project = createPresetProject(presetId, createId(), now())
      await repository.save(project)
      set({ projects: [project, ...get().projects] })
      return project
    },
    async remixImport(snapshot) {
      const project = importRemixedProject(snapshot, createId(), now())
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
    async get(id) {
      return get().projects.find((project) => project.id === id) ?? repository.get(id)
    },
    async save(project) {
      const saved = { ...project, updatedAt: now() }
      await repository.save(saved)
      set({
        projects: [
          saved,
          ...get().projects.filter((candidate) => candidate.id !== saved.id),
        ],
      })
      return saved
    },
  }))
}
