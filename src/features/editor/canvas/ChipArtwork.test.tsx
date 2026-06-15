import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Project } from '../../../domain/project'
import { createProject } from '../../../domain/projectFactory'
import { ChipArtwork } from './ChipArtwork'

vi.mock('react-konva', async () => {
  function node(type: string) {
    return ({
      children,
      name,
      text,
      'data-testid': testId,
    }: {
      children?: import('react').ReactNode
      name?: string
      text?: string
      'data-testid'?: string
    }) => (
      <div data-konva={type} data-name={name} data-testid={testId}>
        {text}
        {children}
      </div>
    )
  }
  return {
    Circle: node('Circle'),
    Group: node('Group'),
    Image: node('Image'),
    Line: node('Line'),
    Rect: node('Rect'),
    RegularPolygon: node('RegularPolygon'),
    Shape: node('Shape'),
    Star: node('Star'),
    Text: node('Text'),
  }
})

describe('ChipArtwork studio layers', () => {
  it('renders studio sprays and stickers through the shared artwork path', () => {
    const project: Project = {
      ...createProject('Studio Artwork', 'studio-artwork', 100),
      studio: {
        ...createProject('Studio Artwork', 'studio-artwork', 100).studio,
        sprays: [
          {
            id: 'spray-1',
            x: 120,
            y: 120,
            radius: 90,
            color: '#ff70dc',
            intensity: 0.75,
            blend: 'screen',
          },
        ],
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge',
            x: 160,
            y: 140,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }

    render(<ChipArtwork project={project} />)

    expect(screen.getByText('STAR')).toBeInTheDocument()
    expect(document.querySelector('[data-name="studio-spray"]')).toBeInTheDocument()
    expect(document.querySelector('[data-name="studio-sticker"]')).toBeInTheDocument()
  })

  it('allows the editor to provide interactive studio item renderers', () => {
    const project: Project = {
      ...createProject('Studio Artwork', 'studio-artwork', 100),
      studio: {
        ...createProject('Studio Artwork', 'studio-artwork', 100).studio,
        sprays: [
          {
            id: 'spray-1',
            x: 120,
            y: 120,
            radius: 90,
            color: '#ff70dc',
            intensity: 0.75,
            blend: 'screen',
          },
        ],
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge',
            x: 160,
            y: 140,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
      },
    }

    render(
      <ChipArtwork
        project={project}
        renderStudioSpray={(spray) => <div data-testid={`interactive-${spray.id}`} />}
        renderStudioSticker={(sticker) => <div data-testid={`interactive-${sticker.id}`} />}
      />,
    )

    expect(screen.getByTestId('interactive-spray-1')).toBeInTheDocument()
    expect(screen.getByTestId('interactive-sticker-1')).toBeInTheDocument()
  })

  it('omits hidden render layers from the Konva artwork tree', () => {
    const project = createProject('Layer Visibility', 'layer-visibility', 100)

    render(
      <ChipArtwork
        project={project}
        layerVisibility={{
          M1: true,
          M2: false,
          M3: true,
          M4: true,
          M5: true,
          Label: true,
        }}
      />,
    )

    expect(document.querySelector('[data-name="chip-layer-micro"]')).toBeInTheDocument()
    expect(document.querySelector('[data-name="chip-layer-traces"]')).not.toBeInTheDocument()
  })
})
