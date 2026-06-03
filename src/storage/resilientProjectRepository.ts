import type { ProjectRepository } from './projectRepository'

export function createResilientProjectRepository(
  primary: ProjectRepository,
  fallback: ProjectRepository,
): ProjectRepository {
  // Once the primary store fails for any operation, stay on the fallback for the
  // rest of the session. A per-operation retry would let a later read hit a
  // recovered primary and return data the fallback already superseded.
  let primaryFailed = false

  async function run<T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>): Promise<T> {
    if (primaryFailed) return fallbackOperation()
    try {
      return await operation()
    } catch (error) {
      primaryFailed = true
      console.warn('[storage] primary repository failed; using local fallback for this session', error)
      return fallbackOperation()
    }
  }

  return {
    list: () => run(() => primary.list(), () => fallback.list()),
    get: (id) => run(() => primary.get(id), () => fallback.get(id)),
    save: (project) => run(() => primary.save(project), () => fallback.save(project)),
    remove: (id) => run(() => primary.remove(id), () => fallback.remove(id)),
  }
}
