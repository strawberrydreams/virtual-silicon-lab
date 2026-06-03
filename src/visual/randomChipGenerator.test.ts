import { describe, expect, it } from 'vitest'
import { clampBlockToDie } from '../features/editor/canvas/geometry'
import { generateRandomChipProject } from './randomChipGenerator'

describe('generateRandomChipProject', () => {
  it('generates deterministic project data from a seed', () => {
    expect(generateRandomChipProject('seed-a', 'project-a', 100)).toEqual(
      generateRandomChipProject('seed-a', 'project-a', 100),
    )
    expect(generateRandomChipProject('seed-b', 'project-b', 100).blocks).not.toEqual(
      generateRandomChipProject('seed-a', 'project-a', 100).blocks,
    )
  })

  it('keeps generated blocks within the die', () => {
    const project = generateRandomChipProject('bounded', 'bounded-project', 100)
    expect(project.blocks.length).toBeGreaterThanOrEqual(6)
    for (const block of project.blocks) {
      expect(clampBlockToDie(block, project.die)).toEqual({ x: block.x, y: block.y, w: block.w, h: block.h })
    }
  })
})
