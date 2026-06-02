import type { Project } from '../domain/project'
import { migrateProject } from '../domain/projectMigration'
import type { ProjectRepository } from './projectRepository'

export function createLocalStorageProjectRepository(
  storageKey = 'virtual-silicon-lab-projects',
): ProjectRepository {
  function readAll(): Project[] {
    const raw = localStorage.getItem(storageKey)
    return raw === null ? [] : (JSON.parse(raw) as unknown[]).map(migrateProject)
  }

  function writeAll(projects: Project[]) {
    localStorage.setItem(storageKey, JSON.stringify(projects))
  }

  return {
    async list() {
      return readAll().sort((left, right) => right.updatedAt - left.updatedAt)
    },
    async get(id) {
      return readAll().find((project) => project.id === id)
    },
    async save(project) {
      writeAll([...readAll().filter((candidate) => candidate.id !== project.id), project])
    },
    async remove(id) {
      writeAll(readAll().filter((project) => project.id !== id))
    },
  }
}
