import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Project } from '../../domain/project'
import { createProject } from '../../domain/projectFactory'
import { GeneratedSpecPanel } from './GeneratedSpecPanel'

describe('GeneratedSpecPanel', () => {
  it('shows generated studio metrics and features', () => {
    const project: Project = {
      ...createProject('Generated Spec Chip', 'generated-spec', 100),
      blocks: [
        {
          id: 'dream',
          type: 'DreamSynth',
          category: 'fantasy',
          x: 16,
          y: 16,
          w: 160,
          h: 120,
          rotation: 0,
          glow: true,
          zIndex: 0,
        },
      ],
      studio: {
        ...createProject('Generated Spec Chip', 'generated-spec', 100).studio,
        stickers: [
          {
            id: 'sticker-1',
            kind: 'badge',
            x: 40,
            y: 40,
            text: 'STAR',
            color: '#f9f4ff',
            rotation: -8,
          },
        ],
        sprays: [
          {
            id: 'spray-1',
            x: 120,
            y: 120,
            radius: 120,
            color: '#ff70dc',
            intensity: 0.8,
            blend: 'screen',
          },
        ],
      },
    }

    render(<GeneratedSpecPanel project={project} />)

    expect(screen.getByRole('heading', { name: 'Generated Spec' })).toBeInTheDocument()
    expect(screen.getByText('Efficiency')).toBeInTheDocument()
    expect(screen.getByText('Thermals')).toBeInTheDocument()
    expect(screen.getByText('Complexity')).toBeInTheDocument()
    expect(screen.getByText('Silicon estimate')).toBeInTheDocument()
    expect(screen.getByText('Node')).toBeInTheDocument()
    expect(screen.getByText('Transistors')).toBeInTheDocument()
    expect(screen.getByText('Memory BW')).toBeInTheDocument()
    expect(screen.getByText(/GB\/s$/)).toBeInTheDocument()
    expect(screen.queryByText(/CUDA/)).not.toBeInTheDocument()
    expect(screen.getByText('Power estimate')).toBeInTheDocument()
    expect(screen.getByText(/ W$/)).toBeInTheDocument()
    expect(screen.getByText('Sticker-tuned signal layer')).toBeInTheDocument()
    expect(
      screen.queryByText(/fake|impossible|N1X|Pentium|8086|Grace|Blackwell/i),
    ).not.toBeInTheDocument()
  })
})
