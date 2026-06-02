import type { Project } from '../domain/project'

export type ProjectRepository = {
  list: () => Promise<Project[]>
  get: (id: string) => Promise<Project | undefined>
  save: (project: Project) => Promise<void>
  remove: (id: string) => Promise<void>
}
