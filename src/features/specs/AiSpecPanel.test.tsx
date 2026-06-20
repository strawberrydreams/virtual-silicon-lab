import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createProject } from '../../domain/projectFactory'
import type { FakeSpec } from '../../domain/project'
import { AiApiError, type AiCopyApi } from './aiCopyApi'
import { AiSpecPanel } from './AiSpecPanel'

const SPEC: FakeSpec = {
  brand: 'NOVA',
  series: 'Z-1',
  generation: 'AI-I',
  process: '0.3nm',
  cores: 16,
  bandwidth: '9 TB/s',
  features: ['Lucid Cache'],
  description: 'Dreams in parallel.',
}

function renderPanel(api: AiCopyApi, onApply = vi.fn()) {
  render(<AiSpecPanel project={createProject('Chip', 'p1', 0)} onApply={onApply} api={api} />)
  return { onApply }
}

describe('AiSpecPanel', () => {
  it('generates, previews, and applies the spec', async () => {
    const api: AiCopyApi = { generateCopy: vi.fn().mockResolvedValue(SPEC) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate from this chip/i }))
    await waitFor(() => expect(screen.getByText('NOVA')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(onApply).toHaveBeenCalledWith(SPEC)
    // After applying, the preview is dismissed.
    expect(screen.queryByText('NOVA')).not.toBeInTheDocument()
  })

  it('discards the preview without applying', async () => {
    const api: AiCopyApi = { generateCopy: vi.fn().mockResolvedValue(SPEC) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate from this chip/i }))
    await waitFor(() => expect(screen.getByText('NOVA')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /discard/i }))
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByText('NOVA')).not.toBeInTheDocument()
  })

  it('shows a friendly message for a quota error and does not apply', async () => {
    const api: AiCopyApi = {
      generateCopy: vi.fn().mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many')),
    }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /generate from this chip/i }))
    await waitFor(() => expect(screen.getByText(/daily ai limit/i)).toBeInTheDocument())
    expect(onApply).not.toHaveBeenCalled()
  })
})
