import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { AiApiError, AiServerUnreachableError } from '../specs/aiCopyApi'
import { AiLayoutSuggestionsPanel } from './AiLayoutSuggestionsPanel'
import type { AiSuggestApi } from './aiSuggestApi'

const SUGGESTIONS = [
  { type: 'Cache', reason: 'pair with CPU', x: 0.5, y: 0.5, w: 0.2, h: 0.2 },
  { type: 'GPU', reason: 'add compute', x: 0.2, y: 0.5, w: 0.2, h: 0.2 },
]

function renderPanel(api: AiSuggestApi, onApply = vi.fn()) {
  render(
    <AiLayoutSuggestionsPanel
      project={createProject('Chip', 'p1', 0)}
      onApply={onApply}
      api={api}
    />,
  )
  return { onApply }
}

describe('AiLayoutSuggestionsPanel', () => {
  it('suggests, then accepts one suggestion and removes it', async () => {
    const api: AiSuggestApi = { generateSuggestions: vi.fn().mockResolvedValue(SUGGESTIONS) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByText(/pair with CPU/i)).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /^accept$/i })[0])
    expect(onApply).toHaveBeenCalledWith(SUGGESTIONS[0])
    expect(screen.queryByText(/pair with CPU/i)).not.toBeInTheDocument()
    expect(screen.getByText(/add compute/i)).toBeInTheDocument()
  })

  it('rejects a suggestion without applying it', async () => {
    const api: AiSuggestApi = { generateSuggestions: vi.fn().mockResolvedValue(SUGGESTIONS) }
    const { onApply } = renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByText(/pair with CPU/i)).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /^reject$/i })[0])
    expect(onApply).not.toHaveBeenCalled()
    expect(screen.queryByText(/pair with CPU/i)).not.toBeInTheDocument()
  })

  it('shows a friendly message on a quota error', async () => {
    const api: AiSuggestApi = {
      generateSuggestions: vi.fn().mockRejectedValue(new AiApiError('QUOTA_EXCEEDED', 'too many')),
    }
    renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByText(/daily ai limit/i)).toBeInTheDocument())
  })

  it('shows an inline message when the AI server is unreachable', async () => {
    const api: AiSuggestApi = {
      generateSuggestions: vi.fn().mockRejectedValue(new AiServerUnreachableError()),
    }
    renderPanel(api)

    fireEvent.click(screen.getByRole('button', { name: /suggest improvements/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/unreachable/i))
  })
})
