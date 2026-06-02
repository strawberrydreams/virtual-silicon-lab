// fake-indexeddb provides IndexedDB inside jsdom so tests that exercise the
// default project repository do not throw.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
