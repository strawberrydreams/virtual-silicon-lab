import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SyncStatusIndicator } from './SyncStatusIndicator'
import { createSyncStatusStore } from './syncStatusStore'

describe('SyncStatusIndicator', () => {
  it('renders nothing while idle', () => {
    const store = createSyncStatusStore()
    const { container } = render(<SyncStatusIndicator store={store} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows a labelled badge for each active status', () => {
    const cases: Array<['syncing' | 'synced' | 'offline' | 'error', string]> = [
      ['syncing', 'Syncing...'],
      ['synced', 'Synced'],
      ['offline', 'Offline'],
      ['error', 'Sync error'],
    ]
    for (const [status, label] of cases) {
      const store = createSyncStatusStore()
      store.setState({ status })
      const { unmount } = render(<SyncStatusIndicator store={store} />)
      const badge = screen.getByRole('status')
      expect(badge).toHaveTextContent(label)
      expect(badge).toHaveAttribute('data-status', status)
      unmount()
    }
  })
})
