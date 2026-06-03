import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_PAGE_THEME } from './pageThemes'
import { createPageThemeStore, PAGE_THEME_STORAGE_KEY } from './pageThemeStore'

describe('pageThemeStore', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('starts with the default laboratory theme', () => {
    const store = createPageThemeStore()

    expect(store.getSnapshot()).toBe(DEFAULT_PAGE_THEME)
  })

  it('persists valid theme changes', () => {
    const store = createPageThemeStore()

    store.setTheme('space')

    expect(store.getSnapshot()).toBe('space')
    expect(localStorage.getItem(PAGE_THEME_STORAGE_KEY)).toBe('space')
    expect(createPageThemeStore().getSnapshot()).toBe('space')
  })

  it('falls back to laboratory when persisted value is invalid', () => {
    localStorage.setItem(PAGE_THEME_STORAGE_KEY, 'invalid')

    expect(createPageThemeStore().getSnapshot()).toBe('laboratory')
  })
})
