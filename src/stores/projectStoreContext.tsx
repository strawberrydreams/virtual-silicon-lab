import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createIndexedDbProjectRepository } from '../storage/indexedDbProjectRepository'
import { createLocalStorageProjectRepository } from '../storage/localStorageProjectRepository'
import type { ProjectRepository } from '../storage/projectRepository'
import { createResilientProjectRepository } from '../storage/resilientProjectRepository'
import { createProjectStore } from './projectStore'

export function createDefaultRepository(): ProjectRepository {
  return createResilientProjectRepository(
    createIndexedDbProjectRepository(),
    createLocalStorageProjectRepository(),
  )
}

type Store = ReturnType<typeof createProjectStore>
const ProjectStoreContext = createContext<Store | undefined>(undefined)

export function ProjectStoreProvider({
  children,
  repository,
}: {
  children: ReactNode
  repository?: ProjectRepository
}) {
  // Lazy useState keeps one stable store instance without reading a ref during
  // render (react-hooks/refs).
  const [store] = useState<Store>(() => createProjectStore(repository ?? createDefaultRepository()))

  useEffect(() => {
    void store.getState().load()
  }, [store])

  return <ProjectStoreContext.Provider value={store}>{children}</ProjectStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook is intentionally colocated with its provider; fast-refresh boundary is acceptable
export function useProjectStore() {
  const store = useContext(ProjectStoreContext)
  if (store === undefined) throw new Error('ProjectStoreProvider is missing')

  return useStore(store)
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook is intentionally colocated with its provider; fast-refresh boundary is acceptable
export function useProjectStoreApi() {
  const store = useContext(ProjectStoreContext)
  if (store === undefined) throw new Error('ProjectStoreProvider is missing')
  return store
}
