import type { BlockType, Project } from '../domain/project'

export type StudioSpecMetrics = {
  compute: number
  bandwidth: number
  fantasy: number
  stability: number
  style: number
}

export type GeneratedStudioSpec = {
  metrics: StudioSpecMetrics
  features: string[]
  description: string
}

const COMPUTE_TYPES = new Set<BlockType>(['CPU', 'GPU', 'DSP', 'ConsciousnessProcessor', 'DreamSynth'])
const MEMORY_TYPES = new Set<BlockType>(['SRAM', 'Cache', 'QuantumMemory'])
const IO_TYPES = new Set<BlockType>(['DAC', 'ADC', 'PLL', 'IO', 'USB', 'EmotionEngine', 'RealityDistortionUnit', 'TimeCore'])

export function generateStudioSpec(project: Project): GeneratedStudioSpec {
  const blockCount = project.blocks.length
  const fantasyCount = project.blocks.filter((block) => block.category === 'fantasy').length
  const computeCount = countTypes(project, COMPUTE_TYPES)
  const memoryArea = areaForTypes(project, MEMORY_TYPES)
  const ioCount = countTypes(project, IO_TYPES)
  const dieArea = project.die.width * project.die.height
  const blockArea = project.blocks.reduce((sum, block) => sum + block.w * block.h, 0)
  const density = dieArea > 0 ? blockArea / dieArea : 0
  const sprayIntensity = project.studio.sprays.reduce((sum, spray) => sum + spray.intensity, 0)
  const stickerCount = project.studio.stickers.length

  const metrics: StudioSpecMetrics = {
    compute: clampMetric(28 + computeCount * 18 + blockCount * 2),
    bandwidth: clampMetric(24 + (memoryArea / Math.max(1, dieArea)) * 340 + ioCount * 5),
    fantasy: clampMetric(18 + fantasyCount * 24 + sprayIntensity * 12 + stickerCount * 5),
    stability: clampMetric(94 - Math.max(0, density - 0.34) * 130 - sprayIntensity * 13 - fantasyCount * 4),
    style: clampMetric(34 + stickerCount * 18 + sprayIntensity * 22 + project.studio.tileSettings.detailDensity * 22),
  }

  const features = buildFeatures(metrics, memoryArea, dieArea, stickerCount)
  return {
    metrics,
    features,
    description:
      metrics.fantasy > 70
        ? 'A deliberately impossible custom SoC with studio-tuned fantasy signal layers.'
        : 'A studio-generated SoC profile derived from tile layout, density, and decoration.',
  }
}

function countTypes(project: Project, types: Set<BlockType>) {
  return project.blocks.filter((block) => types.has(block.type)).length
}

function areaForTypes(project: Project, types: Set<BlockType>) {
  return project.blocks.filter((block) => types.has(block.type)).reduce((sum, block) => sum + block.w * block.h, 0)
}

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildFeatures(metrics: StudioSpecMetrics, memoryArea: number, dieArea: number, stickerCount: number) {
  const features: string[] = []
  if (metrics.compute > 50) features.push('Compute island mesh')
  if (memoryArea / Math.max(1, dieArea) > 0.08) features.push('Wide memory spine')
  if (metrics.fantasy > 70) features.push('Impossible fantasy fabric')
  if (stickerCount > 0) features.push('Sticker-tuned signal layer')
  if (metrics.style > 75) features.push('Custom studio finish')
  return features.length > 0 ? features : ['Studio generated layout']
}
