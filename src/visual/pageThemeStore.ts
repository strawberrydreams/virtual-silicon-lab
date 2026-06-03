import { useSyncExternalStore } from 'react'
import { DEFAULT_PAGE_THEME, isPageThemeName, type PageThemeName } from './pageThemes'

export const PAGE_THEME_STORAGE_KEY = 'vsl.pageTheme'

type Listener = () => void

function readStoredTheme(): PageThemeName {
  try {
    const value = localStorage.getItem(PAGE_THEME_STORAGE_KEY)
    return isPageThemeName(value) ? value : DEFAULT_PAGE_THEME
  } catch {
    return DEFAULT_PAGE_THEME
  }
}

export function createPageThemeStore() {
  let current = readStoredTheme()
  const listeners = new Set<Listener>()

  function emit() {
    for (const listener of listeners) listener()
  }

  return {
    getSnapshot: () => current,
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setTheme(theme: PageThemeName) {
      current = theme
      try {
        localStorage.setItem(PAGE_THEME_STORAGE_KEY, theme)
      } catch {
        // Theme persistence is a preference; UI should still update if storage is unavailable.
      }
      emit()
    },
  }
}

export const pageThemeStore = createPageThemeStore()

export function usePageTheme(): [PageThemeName, (theme: PageThemeName) => void] {
  const theme = useSyncExternalStore(
    pageThemeStore.subscribe,
    pageThemeStore.getSnapshot,
    () => DEFAULT_PAGE_THEME,
  )
  return [theme, pageThemeStore.setTheme]
}
