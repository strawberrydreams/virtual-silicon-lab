import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createProject } from '../../domain/projectFactory'
import { StudioInspector } from './StudioInspector'

describe('StudioInspector', () => {
  it('edits the selected sticker', async () => {
    const onUpdateSticker = vi.fn()
    const project = {
      ...createProject('p', 'p1', 0),
      studio: {
        ...createProject('p', 'p1', 0).studio,
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge' as const,
            x: 120,
            y: 160,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }

    render(
      <StudioInspector
        project={project}
        selectedStudioItem={{ kind: 'sticker', id: 'sticker-1' }}
        onUpdateSticker={onUpdateSticker}
        onUpdateSpray={vi.fn()}
      />,
    )

    await userEvent.clear(screen.getByLabelText('Sticker text'))
    await userEvent.type(screen.getByLabelText('Sticker text'), 'WOW')
    await userEvent.clear(screen.getByLabelText('Sticker rotation'))
    await userEvent.type(screen.getByLabelText('Sticker rotation'), '15')

    expect(onUpdateSticker).toHaveBeenCalledWith('sticker-1', { text: 'WOW' })
    expect(onUpdateSticker).toHaveBeenCalledWith('sticker-1', { rotation: 15 })
    expect(screen.getByLabelText('Sticker x')).toHaveValue(120)
    expect(screen.getByLabelText('Sticker y')).toHaveValue(160)
  })

  it('changes the selected sticker kind', async () => {
    const onUpdateSticker = vi.fn()
    const project = {
      ...createProject('p', 'p1', 0),
      studio: {
        ...createProject('p', 'p1', 0).studio,
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge' as const,
            x: 120,
            y: 160,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }

    render(
      <StudioInspector
        project={project}
        selectedStudioItem={{ kind: 'sticker', id: 'sticker-1' }}
        onUpdateSticker={onUpdateSticker}
        onUpdateSpray={vi.fn()}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Warning' }))

    expect(onUpdateSticker).toHaveBeenCalledWith('sticker-1', { kind: 'warning' })
  })

  it('edits the selected spray', async () => {
    const onUpdateSpray = vi.fn()
    const project = {
      ...createProject('p', 'p1', 0),
      studio: {
        ...createProject('p', 'p1', 0).studio,
        sprays: [
          {
            id: 'spray-1',
            x: 240,
            y: 240,
            radius: 120,
            color: '#ff70dc',
            intensity: 0.72,
            blend: 'screen' as const,
          },
        ],
      },
    }

    render(
      <StudioInspector
        project={project}
        selectedStudioItem={{ kind: 'spray', id: 'spray-1' }}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={onUpdateSpray}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Overlay' }))
    expect(onUpdateSpray).toHaveBeenCalledWith('spray-1', { blend: 'overlay' })

    await userEvent.clear(screen.getByLabelText('Spray radius'))
    await userEvent.type(screen.getByLabelText('Spray radius'), '96')
    await userEvent.clear(screen.getByLabelText('Spray intensity'))
    await userEvent.type(screen.getByLabelText('Spray intensity'), '0.4')

    expect(onUpdateSpray).toHaveBeenCalledWith('spray-1', { radius: 96 })
    expect(onUpdateSpray).toHaveBeenCalledWith('spray-1', { intensity: 0.4 })
    expect(screen.getByLabelText('Spray x')).toHaveValue(240)
    expect(screen.getByLabelText('Spray y')).toHaveValue(240)
  })

  it('re-syncs sticker fields when the selected sticker changes from outside', () => {
    const base = {
      ...createProject('p', 'p1', 0),
      studio: {
        ...createProject('p', 'p1', 0).studio,
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge' as const,
            x: 120,
            y: 160,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }
    const { rerender } = render(
      <StudioInspector
        project={base}
        selectedStudioItem={{ kind: 'sticker', id: 'sticker-1' }}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Sticker text')).toHaveValue('STAR')

    const updated = {
      ...base,
      studio: {
        ...base.studio,
        stickers: [{ ...base.studio.stickers[0], text: 'NOVA', rotation: 20 }],
      },
    }
    rerender(
      <StudioInspector
        project={updated}
        selectedStudioItem={{ kind: 'sticker', id: 'sticker-1' }}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Sticker text')).toHaveValue('NOVA')
    expect(screen.getByLabelText('Sticker rotation')).toHaveValue(20)
  })

  it('shows an empty selection state', () => {
    render(
      <StudioInspector
        project={createProject('p', 'p1', 0)}
        selectedStudioItem={null}
        onUpdateSticker={vi.fn()}
        onUpdateSpray={vi.fn()}
      />,
    )

    expect(screen.getByText('Select a sticker or spray on the die.')).toBeInTheDocument()
  })
})
