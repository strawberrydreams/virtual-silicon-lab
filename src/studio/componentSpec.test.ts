import { describe, expect, it } from 'vitest'
import type { Block, Project } from '../domain/project'
import { createProject } from '../domain/projectFactory'
import { deriveComponentSpec } from './componentSpec'

function projectWith(block: Block): Project {
  return {
    ...createProject('Component Spec', 'component-spec', 100),
    die: { shape: 'square', width: 760, height: 760, background: 'spec-test' },
    blocks: [block],
  }
}

function block(type: Block['type'], w: number, h: number): Block {
  return {
    id: `${type}-1`,
    type,
    category: ['EmotionEngine', 'DreamSynth', 'QuantumMemory', 'ConsciousnessProcessor', 'RealityDistortionUnit', 'TimeCore'].includes(type)
      ? 'fantasy'
      : 'real',
    x: 24,
    y: 24,
    w,
    h,
    rotation: 0,
    glow: false,
    zIndex: 0,
  }
}

function value(spec: ReturnType<typeof deriveComponentSpec>, label: string) {
  return spec.rows.find((row) => row.label === label)?.value
}

describe('deriveComponentSpec', () => {
  it('derives GPU-specific throughput numbers without product-class wording', () => {
    const small = block('GPU', 120, 90)
    const large = block('GPU', 260, 180)

    const smallSpec = deriveComponentSpec(small, projectWith(small))
    const largeSpec = deriveComponentSpec(large, projectWith(large))

    expect(smallSpec.family).toBe('parallel')
    expect(value(smallSpec, 'Shaders')).toMatch(/cores$/)
    expect(value(smallSpec, 'FP32')).toMatch(/TFLOPS$/)
    expect(value(smallSpec, 'AI')).toMatch(/TOPS$/)
    expect(Number.parseInt(value(largeSpec, 'Shaders') ?? '0', 10)).toBeGreaterThan(
      Number.parseInt(value(smallSpec, 'Shaders') ?? '0', 10),
    )
    expect(JSON.stringify(largeSpec)).not.toMatch(/N1X|Pentium|8086|Grace|Blackwell/i)
  })

  it('derives memory-specific capacity and local bandwidth for SRAM-like tiles', () => {
    const memory = block('SRAM', 240, 140)
    const spec = deriveComponentSpec(memory, projectWith(memory))

    expect(spec.family).toBe('memory')
    expect(value(spec, 'Capacity')).toMatch(/MB$/)
    expect(value(spec, 'Local BW')).toMatch(/GB\/s$/)
    expect(value(spec, 'Latency')).toMatch(/ns$/)
    expect(value(spec, 'Capacity')).not.toMatch(/CUDA|TOPS/)
  })

  it('keeps the PLL clock range ordered for a large tile with zero detail density', () => {
    const pll = block('PLL', 300, 200) // big enough that tileScale exceeds 1.5
    const project = projectWith(pll)
    project.studio = {
      ...project.studio,
      tileSettings: { ...project.studio.tileSettings, detailDensity: 0 },
    }

    const range = value(deriveComponentSpec(pll, project), 'Range')!
    const [low, high] = range.replace(' GHz', '').split('-').map(Number)
    expect(low).toBeLessThan(high)
  })

  it('derives interface-specific lane and throughput values for IO tiles', () => {
    const io = block('USB', 150, 90)
    const spec = deriveComponentSpec(io, projectWith(io))

    expect(spec.family).toBe('interface')
    expect(value(spec, 'Lanes')).toMatch(/x\d+/)
    expect(value(spec, 'Throughput')).toMatch(/Gb\/s$/)
    expect(value(spec, 'Protocol')).not.toMatch(/N1X|Pentium|8086|Grace|Blackwell/i)
  })
})
