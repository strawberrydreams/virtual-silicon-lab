import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useStore } from 'zustand'
import type { AuthApi } from '../features/account/authApi'
import { createAuthStore } from './authStore'

type Store = ReturnType<typeof createAuthStore>
const AuthStoreContext = createContext<Store | undefined>(undefined)

export function AuthStoreProvider({ children, api }: { children: ReactNode; api?: AuthApi }) {
  // Lazy useState keeps one stable store instance without reading a ref during
  // render (react-hooks/refs).
  const [store] = useState<Store>(() =>
    api === undefined ? createAuthStore() : createAuthStore(api),
  )

  useEffect(() => {
    void store.getState().init()
  }, [store])

  return <AuthStoreContext.Provider value={store}>{children}</AuthStoreContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook is intentionally colocated with its provider; fast-refresh boundary is acceptable
export function useAuthStore() {
  const store = useContext(AuthStoreContext)
  if (store === undefined) throw new Error('AuthStoreProvider is missing')

  return useStore(store)
}
