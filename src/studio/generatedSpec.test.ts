import { describe, expect, it } from 'vitest'
import type { Block, Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import { generateStudioSpec } from './generatedSpec'

function withBlocks(blocks: Block[]): Project {
  return {
    ...createProject('Spec Chip', 'spec-chip', 100),
    die: { shape: 'rect', width: 600, height: 420, background: 'spec-test' },
    blocks,
  }
}

function block(id: string, type: Block['type'], category: Block['category'], w = 120, h = 80): Block {
  return {
    id,
    type,
    category,
    x: 16,
    y: 16,
    w,
    h,
    rotation: 0,
    glow: category === 'fantasy',
    zIndex: 0,
  }
}

describe('generateStudioSpec', () => {
  it('raises compute and bandwidth from compute and memory tile mix', () => {
    const spec = generateStudioSpec(
      withBlocks([
        block('cpu', 'CPU', 'real'),
        block('gpu', 'GPU', 'real'),
        block('memory', 'QuantumMemory', 'fantasy', 320, 80),
      ]),
    )

    expect(spec.metrics.compute).toBeGreaterThan(50)
    expect(spec.metrics.bandwidth).toBeGreaterThan(55)
    expect(spec.features).toContain('Compute island mesh')
    expect(spec.features).toContain('Wide memory spine')
  })

  it('raises fantasy and style from fantasy tiles, sprays, and stickers', () => {
    const project = withBlocks([
      block('dream', 'DreamSynth', 'fantasy'),
      block('emotion', 'EmotionEngine', 'fantasy'),
    ])
    project.studio = {
      ...project.studio,
      sprays: [{ id: 'spray-1', x: 20, y: 20, radius: 160, color: '#ff70dc', intensity: 0.8 }],
      stickers: [{ id: 'sticker-1', kind: 'badge', x: 80, y: 80, text: 'STAR', color: '#f9f4ff', rotation: -8 }],
    }

    const spec = generateStudioSpec(project)

    expect(spec.metrics.fantasy).toBeGreaterThan(80)
    expect(spec.metrics.style).toBeGreaterThan(80)
    expect(spec.features).toContain('Sticker-tuned signal layer')
    expect(spec.description).toContain('impossible')
  })

  it('reduces stability when the die is overcrowded and heavily sprayed', () => {
    const crowdedBlocks = Array.from({ length: 10 }, (_, index) =>
      block(`tile-${index}`, index % 2 === 0 ? 'CPU' : 'RealityDistortionUnit', index % 2 === 0 ? 'real' : 'fantasy', 180, 120),
    )
    const project = withBlocks(crowdedBlocks)
    project.studio = {
      ...project.studio,
      sprays: [
        { id: 'spray-1', x: 20, y: 20, radius: 180, color: '#ff70dc', intensity: 0.9 },
        { id: 'spray-2', x: 300, y: 220, radius: 180, color: '#70eeff', intensity: 0.9 },
      ],
    }

    const spec = generateStudioSpec(project)

    expect(spec.metrics.stability).toBeLessThan(50)
  })
})
