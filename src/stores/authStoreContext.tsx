import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { AuthApi } from '../features/account/authApi'
import { createAuthStore } from './authStore'

type Store = ReturnType<typeof createAuthStore>
const AuthStoreContext = createContext<Store | undefined>(undefined)

export function AuthStoreProvider({ children, api }: { children: ReactNode; api?: AuthApi }) {
  const store = useRef<Store | undefined>(undefined)
  store.current ??= api === undefined ? createAuthStore() : createAuthStore(api)

  useEffect(() => {
    void store.current?.getState().init()
  }, [])

  return <AuthStoreContext.Provider value={store.current}>{children}</AuthStoreContext.Provider>
}

export function useAuthStore() {
  const store = useContext(AuthStoreContext)
  if (store === undefined) throw new Error('AuthStoreProvider is missing')

  return useStore(store)
}
