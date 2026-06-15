import { describe, expect, it } from 'vitest'
import type { Block, Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import { createHeroSetProject } from '../visual/heroSetCatalog'
import { generateStudioSpec } from './generatedSpec'

function withBlocks(blocks: Block[]): Project {
  return {
    ...createProject('Spec Chip', 'spec-chip', 100),
    die: { shape: 'rect', width: 600, height: 420, background: 'spec-test' },
    blocks,
  }
}

function block(
  id: string,
  type: Block['type'],
  category: Block['category'],
  w = 120,
  h = 80,
): Block {
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

  it('raises complexity from fantasy tiles, sprays, and stickers', () => {
    const project = withBlocks([
      block('dream', 'DreamSynth', 'fantasy'),
      block('emotion', 'EmotionEngine', 'fantasy'),
    ])
    project.studio = {
      ...project.studio,
      sprays: [
        {
          id: 'spray-1',
          x: 20,
          y: 20,
          radius: 160,
          color: '#ff70dc',
          intensity: 0.8,
          blend: 'screen',
        },
      ],
      stickers: [
        {
          id: 'sticker-1',
          kind: 'badge',
          x: 80,
          y: 80,
          text: 'STAR',
          color: '#f9f4ff',
          rotation: -8,
        },
      ],
    }
    const spec = generateStudioSpec(project)
    expect(spec.metrics.complexity).toBeGreaterThan(45)
    expect(spec.features).toContain('Sticker-tuned signal layer')
    expect(spec.description).toContain('speculative')
  })

  it('lowers stability for a warning sticker compared with a badge sticker', () => {
    const blocks = [block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')]
    const badge = withBlocks(blocks)
    badge.studio = {
      ...badge.studio,
      stickers: [
        { id: 's1', kind: 'badge', x: 40, y: 40, text: 'STAR', color: '#fff', rotation: 0 },
      ],
    }
    const warning = withBlocks(blocks)
    warning.studio = {
      ...warning.studio,
      stickers: [
        { id: 's1', kind: 'warning', x: 40, y: 40, text: '!', color: '#f55', rotation: 0 },
      ],
    }
    expect(generateStudioSpec(warning).metrics.stability).toBeLessThan(
      generateStudioSpec(badge).metrics.stability,
    )
  })

  it('raises bandwidth as route intensity rises', () => {
    const blocks = [block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')]
    const quiet = withBlocks(blocks)
    quiet.studio = {
      ...quiet.studio,
      tileSettings: { ...quiet.studio.tileSettings, routeIntensity: 0 },
    }
    const loud = withBlocks(blocks)
    loud.studio = {
      ...loud.studio,
      tileSettings: { ...loud.studio.tileSettings, routeIntensity: 1 },
    }
    expect(generateStudioSpec(loud).metrics.bandwidth).toBeGreaterThan(
      generateStudioSpec(quiet).metrics.bandwidth,
    )
    expect(generateStudioSpec(loud).silicon.memoryBandwidthGBs).toBeGreaterThan(
      generateStudioSpec(quiet).silicon.memoryBandwidthGBs,
    )
  })

  it('maps a sparse single-CPU layout to legacy silicon numbers without product-class wording', () => {
    const project = withBlocks([block('cpu', 'CPU', 'real', 80, 52)])
    project.studio = {
      ...project.studio,
      tileSettings: { detailDensity: 0, routeIntensity: 0, contactStyle: 'minimal' },
    }

    const spec = generateStudioSpec(project)

    expect(spec.silicon.classLabel).toBe('Legacy logic profile')
    expect(spec.silicon.processNodeNm).toBeGreaterThanOrEqual(1000)
    expect(spec.silicon.transistorCountBillion).toBeLessThan(0.01)
    expect(spec.silicon.cpuCores).toBe(1)
    expect(spec.silicon.gpuCores).toBe(0)
    expect(spec.silicon.memoryBandwidthGBs).toBeLessThan(1)
    expect(spec.silicon.aiTops).toBe(0)
    // Legacy values are tiny but must survive rounding: the panel renders them
    // as "N MHz" / "N GB/s", and a stored 0 would display as a dead chip.
    expect(spec.silicon.peakClockGHz).toBeGreaterThan(0)
    expect(spec.silicon.memoryBandwidthGBs).toBeGreaterThan(0)
    expect(spec.silicon.transistorCountBillion).toBeGreaterThan(0)
  })

  it('reports a clean chip as healthy and an overcrowded sprayed chip as not healthy', () => {
    const clean = generateStudioSpec(
      withBlocks([block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')]),
    )
    expect(clean.health).toBe('healthy')

    const crowdedBlocks = Array.from({ length: 10 }, (_, index) =>
      block(
        `tile-${index}`,
        index % 2 === 0 ? 'CPU' : 'RealityDistortionUnit',
        index % 2 === 0 ? 'real' : 'fantasy',
        180,
        120,
      ),
    )
    const crowded = withBlocks(crowdedBlocks)
    crowded.studio = {
      ...crowded.studio,
      sprays: [
        {
          id: 'spray-1',
          x: 20,
          y: 20,
          radius: 180,
          color: '#ff70dc',
          intensity: 0.9,
          blend: 'screen',
        },
        {
          id: 'spray-2',
          x: 300,
          y: 220,
          radius: 180,
          color: '#70eeff',
          intensity: 0.9,
          blend: 'screen',
        },
      ],
    }
    const spec = generateStudioSpec(crowded)
    expect(spec.metrics.stability).toBeLessThan(50)
    expect(spec.health).not.toBe('healthy')
  })

  it('does not report an empty die as healthy', () => {
    const spec = generateStudioSpec(withBlocks([]))

    expect(spec.health).toBe('warn')
    expect(spec.features).toContain('No active tile layout')
  })

  it('keeps the dense N1 reference floorplan in a healthy analysis band', () => {
    const spec = generateStudioSpec(createHeroSetProject('n1-green-horizon', 'n1', 100))
    expect(spec.health).toBe('healthy')
    expect(spec.metrics.efficiency).toBeGreaterThanOrEqual(70)
    expect(spec.metrics.stability).toBeGreaterThanOrEqual(75)
    expect(spec.metrics.thermals).toBeLessThanOrEqual(72)
    expect(spec.metrics.complexity).toBeGreaterThanOrEqual(65)
    expect(spec.silicon.classLabel).toBe('High-density AI profile')
    expect(spec.silicon.processNodeNm).toBeLessThanOrEqual(5)
    expect(spec.silicon.transistorCountBillion).toBeGreaterThanOrEqual(35)
    expect(spec.silicon.cpuCores).toBeGreaterThanOrEqual(12)
    expect(spec.silicon.gpuCores).toBeGreaterThanOrEqual(4000)
    expect(spec.silicon.memoryBandwidthGBs).toBeGreaterThanOrEqual(200)
    expect(spec.silicon.tdpWatts).toBeGreaterThanOrEqual(35)
    expect(spec.silicon.tdpWatts).toBeLessThanOrEqual(65)
  })

  it('does not expose product-like class wording in generated silicon labels', () => {
    const labels = [
      generateStudioSpec(withBlocks([block('cpu', 'CPU', 'real', 80, 52)])).silicon.classLabel,
      generateStudioSpec(createHeroSetProject('n1-green-horizon', 'n1', 100)).silicon.classLabel,
    ]

    expect(labels.join(' ')).not.toMatch(/N1X|Pentium|8086|Grace|Blackwell/i)
  })

  it('derives a positive power estimate and a deterministic 24-point sparkline in [0,1]', () => {
    const project = withBlocks([block('cpu', 'CPU', 'real'), block('gpu', 'GPU', 'real')])
    const spec = generateStudioSpec(project)
    expect(spec.powerWatts).toBeGreaterThan(0)
    expect(spec.powerSeries).toHaveLength(24)
    for (const point of spec.powerSeries) {
      expect(point).toBeGreaterThanOrEqual(0)
      expect(point).toBeLessThanOrEqual(1)
    }
    expect(generateStudioSpec(project).powerSeries).toEqual(spec.powerSeries)
  })
})
