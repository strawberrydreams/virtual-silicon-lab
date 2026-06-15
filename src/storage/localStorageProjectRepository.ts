import type { Project } from '../domain/project'
import { migrateProjects } from '../domain/projectMigration'
import type { ProjectRepository } from './projectRepository'

export function createLocalStorageProjectRepository(
  storageKey = 'virtual-silicon-lab-projects',
): ProjectRepository {
  function readAll(): Project[] {
    const raw = localStorage.getItem(storageKey)
    if (raw === null) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      // A corrupt top-level blob must degrade, not throw: the localStorage
      // fallback is the last-resort store and list()/get() must keep working.
      console.warn('[storage] discarding unreadable localStorage projects blob', error)
      return []
    }
    return Array.isArray(parsed) ? migrateProjects(parsed) : []
  }

  function writeAll(projects: Project[]) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(projects))
    } catch (error) {
      // localStorage is the last-resort fallback; surface a write failure
      // (e.g. QuotaExceededError) instead of losing the project silently.
      console.error('[storage] failed to persist projects to localStorage', error)
      throw error
    }
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
