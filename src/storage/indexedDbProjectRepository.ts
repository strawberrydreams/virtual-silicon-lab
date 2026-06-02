import { openDB, type DBSchema } from 'idb'
import { migrateProject } from '../domain/projectMigration'
import type { ProjectRepository } from './projectRepository'

interface ProjectDatabase extends DBSchema {
  projects: {
    key: string
    value: unknown
  }
}

export function createIndexedDbProjectRepository(
  databaseName = 'virtual-silicon-lab',
): ProjectRepository {
  const database = openDB<ProjectDatabase>(databaseName, 1, {
    upgrade(db) {
      db.createObjectStore('projects')
    },
  })

  return {
    async list() {
      return (await (await database).getAll('projects'))
        .map(migrateProject)
        .sort((left, right) => right.updatedAt - left.updatedAt)
    },
    async get(id) {
      const value = await (await database).get('projects', id)
      return value === undefined ? undefined : migrateProject(value)
    },
    async save(project) {
      await (await database).put('projects', project, project.id)
    },
    async remove(id) {
      await (await database).delete('projects', id)
    },
  }
}
