import type { ProjectRepository } from './projectRepository'

export function createResilientProjectRepository(
  primary: ProjectRepository,
  fallback: ProjectRepository,
): ProjectRepository {
  return {
    async list() {
      return primary.list().catch(() => fallback.list())
    },
    async get(id) {
      return primary.get(id).catch(() => fallback.get(id))
    },
    async save(project) {
      return primary.save(project).catch(() => fallback.save(project))
    },
    async remove(id) {
      return primary.remove(id).catch(() => fallback.remove(id))
    },
  }
}
