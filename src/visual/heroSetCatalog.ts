import { type BlockBlueprint, type DecorationBlueprint, materializeDecoration } from '../domain/blueprint'
import {
  CURRENT_SCHEMA_VERSION,
  type BlockType,
  type Die,
  type DieShape,
  type FakeSpec,
  type Project,
  type StyleTheme,
} from '../domain/project'
import type { PosterFormat } from '../features/export/posterCompositions'
import type { PageThemeName } from './pageThemes'

export type HeroSetId =
  | 'aurora-m5'
  | 'panther-scale'
  | 'n1-green-horizon'
  | 'snapdragon-frame'
  | 'crescent-blue'
  | 'pentium-density-map'
  | 'exynos-annotated-core'
  | 'serpent-tile-array'
  | 'lucid-mono-package'
  | 'orbital-dream-tile'

export type HeroSetDefinition = {
  id: HeroSetId
  name: string
  tagline: string
  referenceFamily: string
  pageTheme: PageThemeName
  theme: StyleTheme
  dieShape: DieShape
  posterFormat: PosterFormat
  materialIntent: string
  accent: string
  featured: boolean
  previewBlocks: BlockType[]
  die: Die
  blocks: BlockBlueprint[]
  decorations: DecorationBlueprint[]
  spec: FakeSpec
}

function real(type: BlockType, x: number, y: number, w: number, h: number): BlockBlueprint {
  return { type, category: 'real', x, y, w, h, rotation: 0, glow: false }
}

function fantasy(type: BlockType, x: number, y: number, w: number, h: number, colorOverride?: string): BlockBlueprint {
  return { type, category: 'fantasy', x, y, w, h, rotation: 0, glow: true, colorOverride }
}

export const HERO_SET_CATALOG: readonly HeroSetDefinition[] = [
  {
    id: 'aurora-m5',
    name: 'AURORA M5',
    tagline: 'Premium blueprint compute package',
    referenceFamily: 'Apple premium product',
    pageTheme: 'laboratory',
    theme: 'keynote',
    dieShape: 'rect',
    posterFormat: 'press-hero',
    materialIntent: 'graphite package, cyan edge bloom, monochrome blueprint die lines',
    accent: '#64d8ff',
    featured: true,
    previewBlocks: ['CPU', 'GPU', 'SRAM', 'Cache'],
    die: { shape: 'rect', width: 920, height: 600, background: 'v2-aurora-m5' },
    blocks: [
      real('CPU', 92, 90, 244, 164),
      real('GPU', 372, 90, 270, 164),
      real('SRAM', 686, 90, 144, 380),
      real('Cache', 92, 300, 244, 92),
      real('DSP', 372, 300, 126, 92),
      real('IO', 526, 300, 116, 92),
      real('ADC', 92, 430, 550, 56),
    ],
    decorations: [
      { kind: 'label', x: 92, y: 42, text: 'AURORA M5 // BLUEPRINT SILICON' },
      { kind: 'neonLine', points: [336, 172, 372, 172], color: '#64d8ff' },
      { kind: 'neonLine', points: [642, 172, 686, 172], color: '#64d8ff' },
    ],
    spec: {
      brand: 'AURORA',
      series: 'M5',
      generation: 'Premium Blueprint',
      process: '2nm graphite lithography',
      cores: 48,
      bandwidth: '1.6 TB/s',
      features: ['Cyan Edge Bloom', 'Blueprint Die Lines', 'Graphite Package'],
      description: 'A restrained product reveal package with a single cyan accent budget.',
    },
  },
  {
    id: 'panther-scale',
    name: 'PANTHER SCALE',
    tagline: 'Architecture scalability slide',
    referenceFamily: 'Intel architecture slide',
    pageTheme: 'laboratory',
    theme: 'mono',
    dieShape: 'rect',
    posterFormat: 'architecture-slide',
    materialIntent: 'metallic packages, violet die insets, strict comparison grid',
    accent: '#8b7cff',
    featured: true,
    previewBlocks: ['CPU', 'GPU', 'IO', 'Cache'],
    die: { shape: 'rect', width: 980, height: 560, background: 'v2-panther-scale' },
    blocks: [
      real('CPU', 78, 96, 180, 132),
      real('GPU', 298, 96, 180, 132),
      real('CPU', 518, 96, 180, 132),
      real('GPU', 738, 96, 164, 132),
      real('Cache', 78, 276, 396, 82),
      real('Cache', 518, 276, 384, 82),
      real('IO', 78, 404, 824, 68),
    ],
    decorations: [
      { kind: 'label', x: 78, y: 48, text: 'PANTHER SCALE // THREE TILE FAMILY' },
      { kind: 'neonLine', points: [258, 162, 298, 162, 478, 162, 518, 162], color: '#8b7cff' },
    ],
    spec: {
      brand: 'PANTHER',
      series: 'SCALE',
      generation: 'Tile Family',
      process: '3nm modular packaging',
      cores: 96,
      bandwidth: '3.2 TB/s',
      features: ['Variant Grid', 'Shared IO Fabric', 'Violet Tile Insets'],
      description: 'A strict architecture comparison slide built from one scalable layout family.',
    },
  },
  {
    id: 'n1-green-horizon',
    name: 'N1 GREEN HORIZON',
    tagline: 'Staged AI product lighting',
    referenceFamily: 'NVIDIA / Qualcomm glow product',
    pageTheme: 'space',
    theme: 'neon',
    dieShape: 'square',
    posterFormat: 'press-hero',
    materialIntent: 'graphite package, recessed die window, green circuit-floor glow',
    accent: '#4ade80',
    featured: true,
    previewBlocks: ['GPU', 'CPU', 'QuantumMemory', 'IO'],
    die: { shape: 'square', width: 760, height: 760, background: 'v2-n1-green-horizon' },
    blocks: [
      real('GPU', 138, 118, 484, 174),
      fantasy('QuantumMemory', 138, 328, 484, 88, '#4ade80'),
      real('CPU', 138, 452, 216, 126),
      real('DSP', 406, 452, 216, 126),
      real('IO', 94, 628, 572, 56),
    ],
    decorations: [
      { kind: 'label', x: 138, y: 74, text: 'N1 GREEN HORIZON' },
      { kind: 'neonLine', points: [380, 292, 380, 328], color: '#4ade80' },
      { kind: 'neonLine', points: [354, 515, 406, 515], color: '#22d3ee' },
    ],
    spec: {
      brand: 'NOVA',
      series: 'N1',
      generation: 'Green Horizon',
      process: '1.4nm AI reveal package',
      cores: 192,
      bandwidth: '7.8 PB/s',
      features: ['Green Horizon Light', 'AI Compute Slab', 'Circuit Floor Glow'],
      description: 'A staged product lighting chip for a product reveal, not a generic neon wallpaper.',
    },
  },
  {
    id: 'snapdragon-frame',
    name: 'SNAPDRAGON FRAME',
    tagline: 'Red translucent mechanical frame',
    referenceFamily: 'NVIDIA / Qualcomm glow product',
    pageTheme: 'anime',
    theme: 'retro',
    dieShape: 'square',
    posterFormat: 'product-closeup',
    materialIntent: 'black metal, red glass frame, orange label highlights, layered cutouts',
    accent: '#ef4444',
    featured: false,
    previewBlocks: ['CPU', 'Cache', 'SRAM', 'IO'],
    die: { shape: 'square', width: 760, height: 760, background: 'v2-snapdragon-frame' },
    blocks: [
      real('CPU', 252, 220, 256, 176),
      real('Cache', 128, 128, 504, 58),
      real('SRAM', 128, 430, 504, 66),
      real('IO', 128, 536, 108, 92),
      real('USB', 524, 536, 108, 92),
    ],
    decorations: [
      { kind: 'label', x: 222, y: 92, text: 'SNAPDRAGON FRAME' },
      { kind: 'warningMark', x: 610, y: 150 },
      { kind: 'neonLine', points: [236, 582, 524, 582], color: '#ef4444' },
    ],
    spec: {
      brand: 'REDLINE',
      series: 'FRAME',
      generation: 'Elite Closeup',
      process: '4nm red glass package',
      cores: 24,
      bandwidth: '980 GB/s',
      features: ['Red Glass Frame', 'Layered Cutouts', 'Gold Edge Label'],
      description: 'Depth comes from frame layers and highlights rather than background blur.',
    },
  },
  {
    id: 'crescent-blue',
    name: 'CRESCENT BLUE',
    tagline: 'Accelerator metric slide',
    referenceFamily: 'Intel architecture slide',
    pageTheme: 'space',
    theme: 'mono',
    dieShape: 'rect',
    posterFormat: 'architecture-slide',
    materialIntent: 'blue GPU die, dark package edge, translucent metric panels',
    accent: '#38bdf8',
    featured: false,
    previewBlocks: ['GPU', 'SRAM', 'Cache', 'IO'],
    die: { shape: 'rect', width: 960, height: 620, background: 'v2-crescent-blue' },
    blocks: [
      real('GPU', 74, 92, 520, 326),
      real('SRAM', 634, 92, 240, 72),
      real('Cache', 634, 196, 240, 72),
      real('DSP', 634, 300, 240, 72),
      real('IO', 74, 464, 800, 72),
    ],
    decorations: [
      { kind: 'label', x: 74, y: 46, text: 'CRESCENT BLUE // ACCELERATOR TILE' },
      { kind: 'neonLine', points: [594, 255, 634, 232], color: '#38bdf8' },
    ],
    spec: {
      brand: 'CRESCENT',
      series: 'BLUE',
      generation: 'Metric Slide',
      process: '5nm accelerator package',
      cores: 128,
      bandwidth: '4.4 TB/s',
      features: ['Metric Cells', 'Blue Die Crop', 'Context Memory'],
      description: 'A chip press slide where metric panels and silicon crop behave as one layout.',
    },
  },
  {
    id: 'pentium-density-map',
    name: 'PENTIUM DENSITY MAP',
    tagline: 'Stylized raw die density',
    referenceFamily: 'Raw die shot',
    pageTheme: 'laboratory',
    theme: 'neon',
    dieShape: 'rect',
    posterFormat: 'product-closeup',
    materialIntent: 'saturated blue-green die base, salmon memory slabs, dense crisp bus lines',
    accent: '#2dd4bf',
    featured: false,
    previewBlocks: ['CPU', 'SRAM', 'Cache', 'DSP'],
    die: { shape: 'rect', width: 980, height: 640, background: 'v2-pentium-density-map' },
    blocks: [
      real('CPU', 84, 70, 310, 250),
      real('DSP', 430, 70, 180, 116),
      real('ADC', 642, 70, 246, 116),
      real('SRAM', 430, 222, 458, 86),
      real('Cache', 84, 358, 804, 82),
      real('IO', 84, 482, 804, 72),
      real('PLL', 84, 586, 804, 34),
    ],
    decorations: [
      { kind: 'label', x: 84, y: 34, text: 'PENTIUM DENSITY MAP' },
      { kind: 'neonLine', points: [394, 195, 430, 128], color: '#fb7185' },
      { kind: 'neonLine', points: [610, 128, 642, 128], color: '#2dd4bf' },
    ],
    spec: {
      brand: 'DENSITY',
      series: 'MAP',
      generation: 'Raw Die Study',
      process: '180nm archival die scan',
      cores: 2,
      bandwidth: '12 GB/s',
      features: ['Dense Logic Noise', 'Salmon Memory Slabs', 'Crisp Bus Lines'],
      description: 'A structured stylized die shot that avoids random confetti.',
    },
  },
  {
    id: 'exynos-annotated-core',
    name: 'EXYNOS ANNOTATED CORE',
    tagline: 'Restrained callout die map',
    referenceFamily: 'Raw die shot',
    pageTheme: 'laboratory',
    theme: 'mono',
    dieShape: 'rect',
    posterFormat: 'architecture-slide',
    materialIntent: 'cyan and green traces on black die with thin callout labels',
    accent: '#22d3ee',
    featured: false,
    previewBlocks: ['CPU', 'GPU', 'DSP', 'IO'],
    die: { shape: 'rect', width: 920, height: 620, background: 'v2-exynos-annotated-core' },
    blocks: [
      real('CPU', 122, 116, 220, 160),
      real('GPU', 390, 116, 270, 160),
      real('DSP', 706, 116, 94, 160),
      real('SRAM', 122, 324, 678, 74),
      real('IO', 122, 444, 678, 78),
      real('PLL', 122, 552, 678, 42),
    ],
    decorations: [
      { kind: 'label', x: 122, y: 58, text: 'EXYNOS ANNOTATED CORE' },
      { kind: 'neonLine', points: [342, 196, 390, 196], color: '#22d3ee' },
      { kind: 'neonLine', points: [660, 196, 706, 196], color: '#4ade80' },
      { kind: 'warningMark', x: 820, y: 124 },
    ],
    spec: {
      brand: 'EXYNOS',
      series: 'CORE',
      generation: 'Annotated',
      process: '5nm mobile die',
      cores: 12,
      bandwidth: '820 GB/s',
      features: ['Thin Callouts', 'Cyan Trace Map', 'Perimeter Interfaces'],
      description: 'Callouts clarify the die structure without hiding the silicon layout.',
    },
  },
  {
    id: 'serpent-tile-array',
    name: 'SERPENT TILE ARRAY',
    tagline: 'Multi-chiplet package stage',
    referenceFamily: 'Intel architecture slide',
    pageTheme: 'space',
    theme: 'keynote',
    dieShape: 'rect',
    posterFormat: 'press-hero',
    materialIntent: 'cool blue silicon chiplets inside graphite package with subtle halo',
    accent: '#7dd3fc',
    featured: false,
    previewBlocks: ['CPU', 'GPU', 'IO', 'QuantumMemory'],
    die: { shape: 'rect', width: 980, height: 600, background: 'v2-serpent-tile-array' },
    blocks: [
      real('CPU', 92, 92, 244, 176),
      real('GPU', 374, 92, 244, 176),
      fantasy('QuantumMemory', 656, 92, 232, 176, '#7dd3fc'),
      real('IO', 92, 322, 386, 92),
      real('DSP', 516, 322, 372, 92),
      real('Cache', 92, 464, 796, 60),
    ],
    decorations: [
      { kind: 'label', x: 92, y: 46, text: 'SERPENT TILE ARRAY' },
      { kind: 'neonLine', points: [336, 180, 374, 180, 618, 180, 656, 180], color: '#7dd3fc' },
    ],
    spec: {
      brand: 'SERPENT',
      series: 'TILE',
      generation: 'Array',
      process: '2.5D chiplet package',
      cores: 80,
      bandwidth: '2.8 TB/s',
      features: ['Separated Chiplets', 'Graphite Carrier', 'Cool Silicon Tiles'],
      description: 'A dark stage product chiplet package with readable tile layering.',
    },
  },
  {
    id: 'lucid-mono-package',
    name: 'LUCID MONO PACKAGE',
    tagline: 'Quiet graphite package',
    referenceFamily: 'Apple premium product',
    pageTheme: 'laboratory',
    theme: 'mono',
    dieShape: 'square',
    posterFormat: 'press-hero',
    materialIntent: 'monochrome graphite, white edge highlight, ice-blue recessed die detail',
    accent: '#bfdbfe',
    featured: false,
    previewBlocks: ['CPU', 'SRAM', 'Cache', 'IO'],
    die: { shape: 'square', width: 760, height: 760, background: 'v2-lucid-mono-package' },
    blocks: [
      real('CPU', 188, 164, 384, 168),
      real('SRAM', 188, 368, 184, 86),
      real('Cache', 388, 368, 184, 86),
      real('DSP', 188, 490, 184, 82),
      real('IO', 388, 490, 184, 82),
    ],
    decorations: [
      { kind: 'label', x: 188, y: 116, text: 'LUCID MONO PACKAGE' },
      { kind: 'neonLine', points: [372, 411, 388, 411], color: '#bfdbfe' },
    ],
    spec: {
      brand: 'LUCID',
      series: 'MONO',
      generation: 'Package Study',
      process: '3nm graphite package',
      cores: 36,
      bandwidth: '1.2 TB/s',
      features: ['Ice Blue Detail', 'Quiet Typography', 'Recessed Die Window'],
      description: 'Minimal product imagery that remains detailed and premium.',
    },
  },
  {
    id: 'orbital-dream-tile',
    name: 'ORBITAL DREAM TILE',
    tagline: 'Hybrid space product closeup',
    referenceFamily: 'Hybrid premium/space product',
    pageTheme: 'space',
    theme: 'neon',
    dieShape: 'hexagon',
    posterFormat: 'product-closeup',
    materialIntent: 'black ceramic package, violet-cyan die, thin orbital readout lines',
    accent: '#a78bfa',
    featured: false,
    previewBlocks: ['DreamSynth', 'QuantumMemory', 'TimeCore', 'IO'],
    die: { shape: 'hexagon', width: 760, height: 760, background: 'v2-orbital-dream-tile' },
    blocks: [
      fantasy('DreamSynth', 242, 168, 276, 132, '#a78bfa'),
      fantasy('QuantumMemory', 176, 344, 408, 84, '#22d3ee'),
      fantasy('TimeCore', 242, 468, 276, 112, '#a78bfa'),
      real('IO', 260, 550, 240, 48),
      real('Cache', 260, 154, 240, 42),
    ],
    decorations: [
      { kind: 'label', x: 236, y: 126, text: 'ORBITAL DREAM TILE' },
      { kind: 'neonLine', points: [380, 300, 380, 344, 380, 428, 380, 468], color: '#a78bfa' },
      { kind: 'sciFiObject', assetKey: 'orbital-readout', x: 614, y: 182 },
    ],
    spec: {
      brand: 'ORBITAL',
      series: 'DREAM',
      generation: 'Tile',
      process: '1nm ceramic imagination package',
      cores: 64,
      bandwidth: '5.1 PB/s',
      features: ['Orbital Readouts', 'Violet Cyan Die', 'Fantasy Core Mix'],
      description: 'A space-themed closeup anchored by a concrete package and luminous die window.',
    },
  },
] as const

const HERO_SET_IDS = new Set<string>(HERO_SET_CATALOG.map((hero) => hero.id))

export function isHeroSetId(id: string): id is HeroSetId {
  return HERO_SET_IDS.has(id)
}

export function resolveHeroSetForProject(project: Project): HeroSetDefinition | undefined {
  const heroSetId = project.die.background.startsWith('v2-') ? project.die.background.slice(3) : ''
  if (!isHeroSetId(heroSetId)) return undefined
  return HERO_SET_CATALOG.find((candidate) => candidate.id === heroSetId)
}

export function createHeroSetProject(heroSetId: HeroSetId, id: string, now: number): Project {
  const hero = HERO_SET_CATALOG.find((candidate) => candidate.id === heroSetId)
  if (hero === undefined) throw new Error(`Unknown hero set: ${heroSetId}`)

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: hero.name,
    createdAt: now,
    updatedAt: now,
    die: { ...hero.die },
    blocks: hero.blocks.map((block, index) => ({ ...block, id: `${id}-block-${index}`, zIndex: index })),
    decorations: hero.decorations.map((decoration, index) =>
      materializeDecoration(decoration, `${id}-decoration-${index}`, index),
    ),
    theme: hero.theme,
    spec: { ...hero.spec, features: [...hero.spec.features] },
  }
}
