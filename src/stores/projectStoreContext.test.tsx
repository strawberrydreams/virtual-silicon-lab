import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import type { ProjectRepository } from '../storage/projectRepository'
import { ProjectStoreProvider, useProjectStore } from './projectStoreContext'

describe('ProjectStoreProvider', () => {
  it('loads stored projects and creates new projects', async () => {
    const stored = createProject('Stored Chip', 'stored-project', 100)
    const projects = new Map<string, Project>([[stored.id, stored]])
    const repository: ProjectRepository = {
      list: async () => [...projects.values()],
      get: async (id) => projects.get(id),
      save: async (project) => void projects.set(project.id, project),
      remove: async (id) => void projects.delete(id),
    }

    const { result } = renderHook(() => useProjectStore(), {
      wrapper: ({ children }) => (
        <ProjectStoreProvider repository={repository}>{children}</ProjectStoreProvider>
      ),
    })

    await waitFor(() => expect(result.current.projects).toEqual([stored]))
    await act(async () => void (await result.current.create('Dream Chip')))

    expect(result.current.projects).toHaveLength(2)
  })
})
