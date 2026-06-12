import { createStore } from 'zustand/vanilla'
import {
  liveAuthApi,
  ServerUnreachableError,
  type AuthApi,
  type AuthUser,
} from '../features/account/authApi'

export type AuthStatus = 'unknown' | 'offline' | 'anonymous' | 'authenticated'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
  init: () => Promise<void>
  signup: (input: { email: string; displayName: string; password: string }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
}

export function createAuthStore(api: AuthApi = liveAuthApi) {
  return createStore<AuthState>((set) => ({
    status: 'unknown',
    user: null,
    async init() {
      try {
        const user = await api.me()
        set(user === null ? { status: 'anonymous', user: null } : { status: 'authenticated', user })
      } catch (error) {
        set({
          status: error instanceof ServerUnreachableError ? 'offline' : 'anonymous',
          user: null,
        })
      }
    },
    async signup(input) {
      const user = await api.signup(input)
      set({ status: 'authenticated', user })
    },
    async login(input) {
      const user = await api.login(input)
      set({ status: 'authenticated', user })
    },
    async logout() {
      await api.logout()
      set({ status: 'anonymous', user: null })
    },
    async updateDisplayName(displayName) {
      const user = await api.updateDisplayName(displayName)
      set({ user })
    },
    async changePassword(input) {
      await api.changePassword(input)
    },
    async deleteAccount(password) {
      await api.deleteAccount(password)
      set({ status: 'anonymous', user: null })
    },
  }))
}
