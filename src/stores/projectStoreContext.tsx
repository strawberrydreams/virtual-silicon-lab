import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { createIndexedDbProjectRepository } from '../storage/indexedDbProjectRepository'
import { createLocalStorageProjectRepository } from '../storage/localStorageProjectRepository'
import type { ProjectRepository } from '../storage/projectRepository'
import { createResilientProjectRepository } from '../storage/resilientProjectRepository'
import { createProjectStore } from './projectStore'

function createDefaultRepository(): ProjectRepository {
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
  const store = useRef<Store | undefined>(undefined)
  store.current ??= createProjectStore(repository ?? createDefaultRepository())

  useEffect(() => {
    void store.current?.getState().load()
  }, [])

  return <ProjectStoreContext.Provider value={store.current}>{children}</ProjectStoreContext.Provider>
}

export function useProjectStore() {
  const store = useContext(ProjectStoreContext)
  if (store === undefined) throw new Error('ProjectStoreProvider is missing')

  return useStore(store)
}
