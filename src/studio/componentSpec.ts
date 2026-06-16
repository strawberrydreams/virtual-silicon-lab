import type { Block, BlockType, Project } from '../domain/project'

export type ComponentSpecFamily =
  | 'general'
  | 'parallel'
  | 'memory'
  | 'signal'
  | 'interface'
  | 'clock'
  | 'converter'

export type ComponentSpecRow = {
  label: string
  value: string
}

export type ComponentSpec = {
  family: ComponentSpecFamily
  title: string
  subtitle: string
  rows: ComponentSpecRow[]
}

const MEMORY_TYPES = new Set<BlockType>(['SRAM', 'Cache', 'QuantumMemory'])
const PARALLEL_TYPES = new Set<BlockType>(['GPU', 'ConsciousnessProcessor', 'DreamSynth'])
const INTERFACE_TYPES = new Set<BlockType>([
  'IO',
  'USB',
  'RealityDistortionUnit',
  'EmotionEngine',
  'TimeCore',
])

export function deriveComponentSpec(block: Block, project: Project): ComponentSpec {
  if (PARALLEL_TYPES.has(block.type)) return parallelSpec(block, project)
  if (MEMORY_TYPES.has(block.type)) return memorySpec(block, project)
  if (block.type === 'DSP') return signalSpec(block, project)
  if (block.type === 'PLL') return clockSpec(block, project)
  if (block.type === 'ADC' || block.type === 'DAC') return converterSpec(block, project)
  if (INTERFACE_TYPES.has(block.type)) return interfaceSpec(block, project)
  return generalComputeSpec(block, project)
}

function parallelSpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const route = project.studio.tileSettings.routeIntensity
  const detail = project.studio.tileSettings.detailDensity
  const fantasyBoost = block.category === 'fantasy' ? 1.18 : 1
  const shaders = roundTo((640 + scale * 2048 + detail * 1024 + route * 512) * fantasyBoost, 128)
  const fp32 = round1((shaders / 1024) * (1.7 + detail * 0.9))
  const aiTops = Math.round((shaders / 1024) * (18 + route * 12 + detail * 16) * fantasyBoost)
  const localBandwidth = Math.round(96 + scale * 96 + route * 80)

  return {
    family: 'parallel',
    title: 'Parallel compute',
    subtitle:
      block.category === 'fantasy' ? 'Matrix fabric estimate' : 'Graphics and matrix fabric',
    rows: [
      { label: 'Shaders', value: `${shaders.toLocaleString()} cores` },
      { label: 'FP32', value: `${fp32} TFLOPS` },
      { label: 'AI', value: `${aiTops.toLocaleString()} TOPS` },
      { label: 'Local BW', value: `${localBandwidth.toLocaleString()} GB/s` },
    ],
  }
}

function memorySpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const route = project.studio.tileSettings.routeIntensity
  const detail = project.studio.tileSettings.detailDensity
  const typeMultiplier = block.type === 'Cache' ? 0.72 : block.type === 'QuantumMemory' ? 1.35 : 1
  const capacity = round1((2.5 + scale * 18 + detail * 6) * typeMultiplier)
  const bandwidth = Math.round(64 + capacity * 18 + route * 96)
  const latency = round1(Math.max(0.6, 4.2 - scale * 0.7 - detail * 1.1))
  const ports = Math.max(1, Math.min(8, Math.round(1 + scale * 2 + route * 3)))

  return {
    family: 'memory',
    title: 'Memory macro',
    subtitle: block.type === 'Cache' ? 'Low-latency cache slice' : 'On-die SRAM array',
    rows: [
      { label: 'Capacity', value: `${capacity} MB` },
      { label: 'Local BW', value: `${bandwidth.toLocaleString()} GB/s` },
      { label: 'Latency', value: `${latency} ns` },
      { label: 'Ports', value: `${ports} read/write` },
    ],
  }
}

function signalSpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const detail = project.studio.tileSettings.detailDensity
  const lanes = Math.max(2, Math.min(16, Math.round(2 + scale * 5 + detail * 4)))
  const throughput = Math.round(lanes * (14 + detail * 10))

  return {
    family: 'signal',
    title: 'Signal processor',
    subtitle: 'Streaming DSP fabric',
    rows: [
      { label: 'Lanes', value: `${lanes} SIMD` },
      { label: 'Throughput', value: `${throughput} GMAC/s` },
      { label: 'Clock', value: `${round1(0.8 + detail * 1.2)} GHz` },
      { label: 'Streams', value: `${Math.max(2, Math.round(lanes / 2))} real-time` },
    ],
  }
}

function interfaceSpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const route = project.studio.tileSettings.routeIntensity
  const lanes = Math.max(1, Math.min(8, Math.round(1 + scale * 2 + route * 4)))
  const rate = block.type === 'USB' ? 20 : block.type === 'IO' ? 16 : 24
  const throughput = Math.round(lanes * rate * (0.78 + route * 0.18))

  return {
    family: 'interface',
    title: 'Interface block',
    subtitle: 'SerDes and physical IO',
    rows: [
      { label: 'Protocol', value: protocolLabel(block.type) },
      { label: 'Lanes', value: `x${lanes}` },
      { label: 'Throughput', value: `${throughput} Gb/s` },
      { label: 'PHY power', value: `${round1(0.18 + lanes * 0.22 + route * 0.35)} W` },
    ],
  }
}

function clockSpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const detail = project.studio.tileSettings.detailDensity
  const rangeLow = 0.4 + scale * 1.2
  // A big PLL tile can push the low bound past the detail-driven ceiling; keep
  // the range ordered so the inspector never shows an inverted span.
  const rangeHigh = Math.max(rangeLow + 0.6, 2.2 + detail * 2.1)
  return {
    family: 'clock',
    title: 'Clock network',
    subtitle: 'PLL and timing islands',
    rows: [
      { label: 'Range', value: `${round1(rangeLow)}-${round1(rangeHigh)} GHz` },
      { label: 'Domains', value: `${Math.max(2, Math.round(2 + scale * 4))}` },
      { label: 'Jitter', value: `${round1(Math.max(0.8, 4.6 - detail * 2.2))} ps` },
      { label: 'Lock', value: `${Math.round(28 - detail * 10)} us` },
    ],
  }
}

function converterSpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const detail = project.studio.tileSettings.detailDensity
  const resolution = Math.max(8, Math.min(16, Math.round(8 + detail * 4 + scale * 2)))
  const sampleRate = round1((0.8 + scale * 1.6 + detail * 0.8) * (block.type === 'ADC' ? 1 : 0.85))
  return {
    family: 'converter',
    title: block.type === 'ADC' ? 'Analog capture' : 'Analog output',
    subtitle: 'Mixed-signal converter',
    rows: [
      { label: 'Resolution', value: `${resolution} bit` },
      { label: 'Rate', value: `${sampleRate} GS/s` },
      { label: 'ENOB', value: `${round1(resolution - 1.4 + detail * 0.5)} bit` },
      { label: 'Power', value: `${round1(0.3 + scale * 0.7)} W` },
    ],
  }
}

function generalComputeSpec(block: Block, project: Project): ComponentSpec {
  const scale = tileScale(block, project)
  const detail = project.studio.tileSettings.detailDensity
  const cores = Math.max(1, Math.min(16, Math.round(1 + scale * 4 + detail * 3)))
  return {
    family: 'general',
    title: 'General compute',
    subtitle: 'Control and scalar execution',
    rows: [
      { label: 'Cores', value: `${cores}` },
      { label: 'Clock', value: `${round1(0.7 + detail * 2.6)} GHz` },
      { label: 'Private cache', value: `${round1(0.5 + scale * 2.5)} MB` },
      { label: 'Power', value: `${componentPowerWatts(block, project)} W` },
    ],
  }
}

function protocolLabel(type: BlockType) {
  if (type === 'USB') return 'USB PHY'
  if (type === 'IO') return 'General IO'
  if (type === 'TimeCore') return 'Timing IO'
  if (type === 'EmotionEngine') return 'Sensor IO'
  if (type === 'RealityDistortionUnit') return 'Spatial IO'
  return 'Serial fabric'
}

function componentPowerWatts(block: Block, project: Project) {
  const route = project.studio.tileSettings.routeIntensity
  const categoryBase = block.category === 'fantasy' ? 0.9 : 0.6
  return round1(categoryBase + tileScale(block, project) * 1.4 + route * 0.55)
}

function tileScale(block: Block, project: Project) {
  const dieArea = Math.max(1, project.die.width * project.die.height)
  return Math.min(2.4, Math.max(0.35, (block.w * block.h) / Math.max(1, dieArea * 0.045)))
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}
