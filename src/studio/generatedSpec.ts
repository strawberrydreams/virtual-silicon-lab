import type { BlockType, Project } from '../domain/project'

export type StudioSpecMetrics = {
  compute: number
  bandwidth: number
  efficiency: number
  stability: number
  thermals: number
  complexity: number
}

export type StudioHealth = 'healthy' | 'warn' | 'critical'

export type RealisticSiliconSpec = {
  classLabel:
    | 'Legacy logic profile'
    | 'Scalar compute profile'
    | 'Desktop SoC profile'
    | 'Mobile SoC profile'
    | 'High-density AI profile'
  processNodeNm: number
  transistorCountBillion: number
  dieAreaMm2: number
  cpuCores: number
  gpuCores: number
  aiTops: number
  memoryBandwidthGBs: number
  cacheMB: number
  peakClockGHz: number
  tdpWatts: number
}

export type GeneratedStudioSpec = {
  metrics: StudioSpecMetrics
  silicon: RealisticSiliconSpec
  powerWatts: number
  powerSeries: number[]
  health: StudioHealth
  features: string[]
  description: string
}

const COMPUTE_TYPES = new Set<BlockType>([
  'CPU',
  'GPU',
  'DSP',
  'ConsciousnessProcessor',
  'DreamSynth',
])
const MEMORY_TYPES = new Set<BlockType>(['SRAM', 'Cache', 'QuantumMemory'])
const IO_TYPES = new Set<BlockType>([
  'DAC',
  'ADC',
  'PLL',
  'IO',
  'USB',
  'EmotionEngine',
  'RealityDistortionUnit',
  'TimeCore',
])
const GPU_TYPES = new Set<BlockType>(['GPU', 'ConsciousnessProcessor', 'DreamSynth'])

const POWER_SERIES_LENGTH = 24

export function generateStudioSpec(project: Project): GeneratedStudioSpec {
  const blockCount = project.blocks.length
  const fantasyCount = project.blocks.filter((block) => block.category === 'fantasy').length
  const glowCount = project.blocks.filter((block) => block.glow).length
  const computeCount = countTypes(project, COMPUTE_TYPES)
  const gpuCount = countTypes(project, GPU_TYPES)
  const memoryArea = areaForTypes(project, MEMORY_TYPES)
  const ioCount = countTypes(project, IO_TYPES)
  const dieArea = project.die.width * project.die.height
  const blockArea = project.blocks.reduce((sum, block) => sum + block.w * block.h, 0)
  const density = dieArea > 0 ? blockArea / dieArea : 0
  const sprayIntensity = project.studio.sprays.reduce((sum, spray) => sum + spray.intensity, 0)
  const stickerCount = project.studio.stickers.length
  const warningCount = project.studio.stickers.filter(
    (sticker) => sticker.kind === 'warning',
  ).length
  const decorationCount = project.decorations.length
  const tile = project.studio.tileSettings
  const routeIntensity = clamp01(tile.routeIntensity)
  const contactDensity =
    tile.contactStyle === 'dense' ? 1 : tile.contactStyle === 'minimal' ? 0 : 0.5

  const metrics: StudioSpecMetrics = {
    compute: clampMetric(28 + computeCount * 18 + blockCount * 2 + contactDensity * 10),
    bandwidth: clampMetric(
      24 + (memoryArea / Math.max(1, dieArea)) * 340 + ioCount * 5 + routeIntensity * 18,
    ),
    efficiency: clampMetric(
      96 -
        Math.max(0, density - 0.58) * 70 -
        Math.max(0, blockCount - 12) * 1.4 -
        sprayIntensity * 7 -
        routeIntensity * 6,
    ),
    stability: clampMetric(
      96 -
        Math.max(0, density - 0.72) * 40 -
        sprayIntensity * 18 -
        fantasyCount * 3 -
        contactDensity * 4 -
        warningCount * 7,
    ),
    thermals: clampMetric(
      22 +
        computeCount * 5 +
        glowCount * 3 +
        sprayIntensity * 10 +
        contactDensity * 4 +
        density * 14,
    ),
    complexity: clampMetric(
      20 +
        blockCount * 3 +
        fantasyCount * 5 +
        routeIntensity * 12 +
        decorationCount * 2 +
        stickerCount * 3,
    ),
  }

  const silicon = buildSiliconSpec({
    blockCount,
    computeCount,
    gpuCount,
    memoryArea,
    ioCount,
    dieArea,
    density,
    fantasyCount,
    routeIntensity,
    detailDensity: clamp01(tile.detailDensity),
    contactDensity,
  })
  const powerWatts = silicon.tdpWatts
  const powerSeries = buildPowerSeries(metrics, powerWatts)
  const health = resolveHealth(metrics, blockCount)
  const features = buildFeatures(
    metrics,
    memoryArea,
    dieArea,
    stickerCount,
    fantasyCount,
    blockCount,
  )

  return {
    metrics,
    silicon,
    powerWatts,
    powerSeries,
    health,
    features,
    description:
      fantasyCount > 1 || metrics.complexity > 70
        ? 'A speculative custom SoC with studio-tuned signal layers and expressive routing.'
        : 'A studio-generated SoC profile derived from tile layout, density, and decoration.',
  }
}

function countTypes(project: Project, types: Set<BlockType>) {
  return project.blocks.filter((block) => types.has(block.type)).length
}

function areaForTypes(project: Project, types: Set<BlockType>) {
  return project.blocks
    .filter((block) => types.has(block.type))
    .reduce((sum, block) => sum + block.w * block.h, 0)
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

// Round to N significant digits so legacy-era values (e.g. 0.0055 GHz) keep
// their magnitude instead of collapsing to 0 like fixed-decimal rounding would.
function roundSig(value: number, digits: number) {
  if (value === 0) return 0
  const scale = Math.pow(10, digits - 1 - Math.floor(Math.log10(Math.abs(value))))
  return Math.round(value * scale) / scale
}

function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function logLerp(from: number, to: number, amount: number) {
  return Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * amount)
}

function processNodeForScore(score: number) {
  if (score >= 86) return 4
  if (score >= 72) return 5
  if (score >= 58) return 7
  if (score >= 46) return 14
  if (score >= 34) return 45
  if (score >= 24) return 180
  if (score >= 18) return 600
  return Math.round(logLerp(3000, 1000, clamp01(score / 18)))
}

function classLabelForScore(score: number): RealisticSiliconSpec['classLabel'] {
  if (score >= 82) return 'High-density AI profile'
  if (score >= 62) return 'Mobile SoC profile'
  if (score >= 42) return 'Desktop SoC profile'
  if (score >= 18) return 'Scalar compute profile'
  return 'Legacy logic profile'
}

function buildSiliconSpec({
  blockCount,
  computeCount,
  gpuCount,
  memoryArea,
  ioCount,
  dieArea,
  density,
  fantasyCount,
  routeIntensity,
  detailDensity,
  contactDensity,
}: {
  blockCount: number
  computeCount: number
  gpuCount: number
  memoryArea: number
  ioCount: number
  dieArea: number
  density: number
  fantasyCount: number
  routeIntensity: number
  detailDensity: number
  contactDensity: number
}): RealisticSiliconSpec {
  const memoryRatio = dieArea > 0 ? memoryArea / dieArea : 0
  const eraScore = Math.min(
    100,
    computeCount * 8 +
      gpuCount * 15 +
      memoryRatio * 110 +
      density * 30 +
      blockCount * 1.4 +
      routeIntensity * 10 +
      detailDensity * 10 +
      contactDensity * 5 +
      fantasyCount * 6,
  )
  const era = clamp01(eraScore / 100)
  const classLabel = classLabelForScore(eraScore)
  const legacy = classLabel === 'Legacy logic profile'
  const processNodeNm = processNodeForScore(eraScore)
  const transistorRaw = logLerp(0.000029, 55, era)
  const transistorCountBillion =
    transistorRaw < 1 ? roundSig(transistorRaw, 2) : round1(transistorRaw)
  const dieAreaMm2 = Math.round(lerp(33, 245, Math.pow(era, 0.78)) * (0.88 + density * 0.18))
  const cpuCores = legacy
    ? 1
    : Math.min(20, Math.max(1, Math.round(1 + computeCount * 2 + era * 8 + contactDensity * 2)))
  const gpuCores =
    gpuCount === 0 ? 0 : roundTo(512 + era * 4096 + gpuCount * 768 + fantasyCount * 256, 128)
  const aiTops = gpuCores === 0 ? 0 : Math.round((gpuCores / 6144) * 950 * (0.48 + era * 0.52))
  const memoryBandwidthGBs = legacy
    ? roundSig(logLerp(0.008, 0.6, Math.max(0.05, era)), 2)
    : Math.round(
        Math.min(
          320,
          logLerp(0.6, 273, era) + memoryRatio * 80 + ioCount * 3 + routeIntensity * 26,
        ),
      )
  const cacheMB = legacy ? 0 : round1(Math.min(96, memoryRatio * 100 + era * 8 + blockCount * 0.12))
  const peakClockGHz = legacy
    ? roundSig(logLerp(0.005, 0.012, Math.max(0.05, era)), 2)
    : round1(lerp(0.09, 4.1, Math.pow(era, 0.62)))
  const tdpWatts = legacy
    ? round1(lerp(1, 2, era))
    : round1(
        Math.min(
          65,
          4 + era * 40 + computeCount * 1.2 + gpuCount * 2.5 + density * 7 + routeIntensity * 4,
        ),
      )

  return {
    classLabel,
    processNodeNm,
    transistorCountBillion,
    dieAreaMm2,
    cpuCores,
    gpuCores,
    aiTops,
    memoryBandwidthGBs,
    cacheMB,
    peakClockGHz,
    tdpWatts,
  }
}

// Deterministic decorative telemetry trace for the POWER ESTIMATE sparkline:
// a fixed-length series in [0,1] seeded by the metrics so it is stable per design.
function buildPowerSeries(metrics: StudioSpecMetrics, powerWatts: number): number[] {
  const seed =
    metrics.compute + metrics.bandwidth * 2 + metrics.thermals * 3 + Math.round(powerWatts * 10)
  return Array.from({ length: POWER_SERIES_LENGTH }, (_, index) => {
    const wave = Math.sin((index + seed) * 0.7) * 0.28 + Math.sin((index + seed) * 0.23) * 0.16
    return clamp01(0.5 + wave)
  })
}

function resolveHealth(metrics: StudioSpecMetrics, blockCount: number): StudioHealth {
  if (blockCount === 0) return 'warn'
  if (metrics.stability < 45 || metrics.thermals > 86) return 'critical'
  if (metrics.stability < 64 || metrics.thermals > 74) return 'warn'
  return 'healthy'
}

function buildFeatures(
  metrics: StudioSpecMetrics,
  memoryArea: number,
  dieArea: number,
  stickerCount: number,
  fantasyCount: number,
  blockCount: number,
) {
  const features: string[] = []
  if (blockCount === 0) features.push('No active tile layout')
  if (metrics.compute > 50) features.push('Compute island mesh')
  if (memoryArea / Math.max(1, dieArea) > 0.08) features.push('Wide memory spine')
  if (fantasyCount > 1) features.push('Speculative signal fabric')
  if (stickerCount > 0) features.push('Sticker-tuned signal layer')
  if (metrics.complexity > 75) features.push('Dense studio routing')
  return features.length > 0 ? features : ['Studio generated layout']
}
