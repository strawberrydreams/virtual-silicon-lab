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
      sprays: [{ id: 'spray-1', x: 20, y: 20, radius: 160, color: '#ff70dc', intensity: 0.8, blend: 'screen' }],
      stickers: [{ id: 'sticker-1', kind: 'badge', x: 80, y: 80, text: 'STAR', color: '#f9f4ff', rotation: -8 }],
    }

    const spec = generateStudioSpec(project)

    expect(spec.metrics.fantasy).toBeGreaterThan(80)
    expect(spec.metrics.style).toBeGreaterThan(80)
    expect(spec.features).toContain('Sticker-tuned signal layer')
    expect(spec.description).toContain('speculative')
  })

  it('lowers stability for a warning sticker compared with a badge sticker', () => {
    const blocks = [block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')]
    const badge = withBlocks(blocks)
    badge.studio = {
      ...badge.studio,
      stickers: [{ id: 's1', kind: 'badge', x: 40, y: 40, text: 'STAR', color: '#fff', rotation: 0 }],
    }
    const warning = withBlocks(blocks)
    warning.studio = {
      ...warning.studio,
      stickers: [{ id: 's1', kind: 'warning', x: 40, y: 40, text: '!', color: '#f55', rotation: 0 }],
    }

    expect(generateStudioSpec(warning).metrics.stability).toBeLessThan(
      generateStudioSpec(badge).metrics.stability,
    )
  })

  it('raises bandwidth as route intensity rises', () => {
    const blocks = [block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')]
    const quiet = withBlocks(blocks)
    quiet.studio = { ...quiet.studio, tileSettings: { ...quiet.studio.tileSettings, routeIntensity: 0 } }
    const loud = withBlocks(blocks)
    loud.studio = { ...loud.studio, tileSettings: { ...loud.studio.tileSettings, routeIntensity: 1 } }

    expect(generateStudioSpec(loud).metrics.bandwidth).toBeGreaterThan(generateStudioSpec(quiet).metrics.bandwidth)
  })

  it('raises compute for a denser contact style', () => {
    const blocks = [block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')]
    const minimal = withBlocks(blocks)
    minimal.studio = { ...minimal.studio, tileSettings: { ...minimal.studio.tileSettings, contactStyle: 'minimal' } }
    const dense = withBlocks(blocks)
    dense.studio = { ...dense.studio, tileSettings: { ...dense.studio.tileSettings, contactStyle: 'dense' } }

    expect(generateStudioSpec(dense).metrics.compute).toBeGreaterThan(generateStudioSpec(minimal).metrics.compute)
  })

  it('reduces stability when the die is overcrowded and heavily sprayed', () => {
    const crowdedBlocks = Array.from({ length: 10 }, (_, index) =>
      block(`tile-${index}`, index % 2 === 0 ? 'CPU' : 'RealityDistortionUnit', index % 2 === 0 ? 'real' : 'fantasy', 180, 120),
    )
    const project = withBlocks(crowdedBlocks)
    project.studio = {
      ...project.studio,
      sprays: [
        { id: 'spray-1', x: 20, y: 20, radius: 180, color: '#ff70dc', intensity: 0.9, blend: 'screen' },
        { id: 'spray-2', x: 300, y: 220, radius: 180, color: '#70eeff', intensity: 0.9, blend: 'screen' },
      ],
    }

    const spec = generateStudioSpec(project)

    expect(spec.metrics.stability).toBeLessThan(50)
  })
})
