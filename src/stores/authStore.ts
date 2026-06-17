import { createStore } from 'zustand/vanilla'
import {
  type AccessMode,
  liveAuthApi,
  ServerUnreachableError,
  type AuthApi,
  type AuthUser,
} from '../features/account/authApi'

export type AuthStatus = 'unknown' | 'offline' | 'anonymous' | 'authenticated'

type AuthState = {
  status: AuthStatus
  user: AuthUser | null
  isAdmin: boolean
  accessMode: AccessMode
  init: () => Promise<void>
  signup: (input: {
    email: string
    displayName: string
    password: string
    inviteCode?: string
  }) => Promise<void>
  login: (input: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>
  deleteAccount: (password: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (input: { token: string; newPassword: string }) => Promise<void>
  setHandle: (handle: string) => Promise<void>
}

export function createAuthStore(api: AuthApi = liveAuthApi) {
  return createStore<AuthState>((set) => {
    async function authenticatedState(user: AuthUser) {
      try {
        const me = await api.me()
        if (me !== null) {
          return {
            status: 'authenticated' as const,
            user: me.user,
            isAdmin: me.isAdmin,
          }
        }
      } catch {
        // Login/signup already succeeded. Keep the user authenticated even if the
        // follow-up session metadata refresh is unavailable.
      }
      return { status: 'authenticated' as const, user, isAdmin: false }
    }

    return {
      status: 'unknown',
      user: null,
      isAdmin: false,
      accessMode: 'open',
      async init() {
        try {
          const [me, config] = await Promise.all([api.me(), api.serverConfig()])
          set(
            me === null
              ? {
                  status: 'anonymous',
                  user: null,
                  isAdmin: false,
                  accessMode: config.accessMode,
                }
              : {
                  status: 'authenticated',
                  user: me.user,
                  isAdmin: me.isAdmin,
                  accessMode: config.accessMode,
                },
          )
        } catch (error) {
          // accessMode keeps its previous value (default open) so a
          // transient /api/health error never locks new users out of signing up.
          set({
            status: error instanceof ServerUnreachableError ? 'offline' : 'anonymous',
            user: null,
            isAdmin: false,
          })
        }
      },
      async signup(input) {
        const user = await api.signup(input)
        set(await authenticatedState(user))
      },
      async login(input) {
        const user = await api.login(input)
        set(await authenticatedState(user))
      },
      async logout() {
        await api.logout()
        set({ status: 'anonymous', user: null, isAdmin: false })
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
        set({ status: 'anonymous', user: null, isAdmin: false })
      },
      async verifyEmail(token) {
        const user = await api.verifyEmail(token)
        set(await authenticatedState(user))
      },
      async forgotPassword(email) {
        await api.forgotPassword(email)
      },
      async resetPassword(input) {
        await api.resetPassword(input)
        set({ status: 'anonymous', user: null, isAdmin: false })
      },
      async setHandle(handle) {
        const user = await api.setHandle(handle)
        set({ user })
      },
    }
  })
}
