import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createHeroChip } from '../../domain/heroChip'
import { ExportPanel } from './ExportPanel'

vi.mock('./DieExportStage', async () => {
  const React = await import('react')
  return { DieExportStage: React.forwardRef(() => <div data-testid="die-stage" />) }
})

vi.mock('./PosterExportStage', async () => {
  const React = await import('react')
  return {
    PosterExportStage: React.forwardRef(({ format = 'press-hero' }: { format?: string }) => (
      <div data-testid="poster-stage" data-format={format} />
    )),
  }
})

describe('ExportPanel', () => {
  it('selects the poster format used by the hidden poster stage', async () => {
    render(<ExportPanel project={createHeroChip('aurora', 1)} />)

    expect(screen.getByRole('button', { name: 'Press Hero' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Product Closeup' }))

    expect(screen.getByRole('button', { name: 'Product Closeup' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('poster-stage')).toHaveAttribute('data-format', 'product-closeup')
  })
})
