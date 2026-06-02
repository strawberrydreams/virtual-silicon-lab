// fake-indexeddb provides IndexedDB inside jsdom so tests that exercise the
// default project repository do not throw.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// This project does not enable Vitest globals, so React Testing Library's
// automatic cleanup is not registered. Register it here so component renders do
// not leak between tests.
afterEach(() => {
  cleanup()
})
