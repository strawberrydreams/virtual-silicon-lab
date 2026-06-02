import { describe, expect, it } from 'vitest'
import { createProject } from './projectFactory'
import { buildBlock } from './blockFactory'

describe('buildBlock', () => {
  it('creates a bounded fantasy block with the first z-index in an empty project', () => {
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
      rotation: 0,
      zIndex: 0,
    })
  })

  it('classifies known real blocks as real', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    expect(buildBlock(project, 'CPU', 'block-1').category).toBe('real')
  })

  it('assigns max(zIndex)+1 so z-index never collides after deletes', () => {
    const project = createProject('Dream Chip', 'project-1', 100)
    const withBlocks = {
      ...project,
      blocks: [
        { ...buildBlock(project, 'CPU', 'a'), zIndex: 5 },
        { ...buildBlock(project, 'GPU', 'b'), zIndex: 2 },
      ],
    }

    expect(buildBlock(withBlocks, 'SRAM', 'c').zIndex).toBe(6)
  })
})
