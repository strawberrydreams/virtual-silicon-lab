import { describe, expect, it } from 'vitest'
import { createProject } from '../../../domain/projectFactory'
import { buildBlock } from './ChipStage'

describe('buildBlock', () => {
  it('creates a bounded fantasy block at the next z-index', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    const block = buildBlock(project, 'DreamSynth', 'block-1')

    expect(block).toMatchObject({
      id: 'block-1',
      type: 'DreamSynth',
      category: 'fantasy',
      x: 32,
      y: 32,
      w: 192,
      h: 112,
      zIndex: 0,
    })
  })
})
