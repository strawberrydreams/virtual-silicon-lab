import type { BlockType, DieShape, StyleTheme } from '../domain/project'
import { HERO_SET_CATALOG, type HeroSetId } from '../visual/heroSetCatalog'

export type BasePresetId =
  | 'aurora-c1'
  | 'neon-district-n9'
  | 'field-unit-m7'
  | 'lucid-88'
  | 'monolith-io'
  | 'solar-flare-x'

export type PresetId = BasePresetId | HeroSetId

export type PresetMetadata = {
  id: PresetId
  name: string
  tagline: string
  theme: StyleTheme
  dieShape: DieShape
  accent: string
  featured: boolean
  previewBlocks: BlockType[]
}

export const BASE_PRESET_CATALOG: readonly PresetMetadata[] = [
  {
    id: 'aurora-c1',
    name: 'AURORA C-1',
    tagline: 'Consciousness Processor',
    theme: 'keynote',
    dieShape: 'square',
    accent: '#a06bff',
    featured: true,
    previewBlocks: ['CPU', 'GPU', 'ConsciousnessProcessor', 'QuantumMemory'],
  },
  {
    id: 'neon-district-n9',
    name: 'NEON DISTRICT N-9',
    tagline: 'Reality routing after dark',
    theme: 'neon',
    dieShape: 'hexagon',
    accent: '#22d3ee',
    featured: true,
    previewBlocks: ['IO', 'EmotionEngine', 'RealityDistortionUnit', 'GPU'],
  },
  {
    id: 'field-unit-m7',
    name: 'FIELD UNIT M-7',
    tagline: 'Temporal control for hostile environments',
    theme: 'military',
    dieShape: 'rect',
    accent: '#f4a000',
    featured: true,
    previewBlocks: ['IO', 'USB', 'TimeCore', 'SRAM'],
  },
  {
    id: 'lucid-88',
    name: 'LUCID-88',
    tagline: 'Warm phosphor dream synthesis',
    theme: 'retro',
    dieShape: 'circle',
    accent: '#ffb000',
    featured: false,
    previewBlocks: ['DSP', 'DreamSynth', 'SRAM', 'DAC'],
  },
  {
    id: 'monolith-io',
    name: 'MONOLITH I/O',
    tagline: 'Editorial-grade signal discipline',
    theme: 'mono',
    dieShape: 'square',
    accent: '#9db4cf',
    featured: false,
    previewBlocks: ['IO', 'USB', 'ADC', 'DAC'],
  },
  {
    id: 'solar-flare-x',
    name: 'SOLAR FLARE X',
    tagline: 'Overclocked emotion telemetry',
    theme: 'neon',
    dieShape: 'rect',
    accent: '#ff2bd6',
    featured: false,
    previewBlocks: ['GPU', 'EmotionEngine', 'DSP', 'Cache'],
  },
]

export const PRESET_CATALOG: readonly PresetMetadata[] = [
  ...HERO_SET_CATALOG.map((hero): PresetMetadata => ({
    id: hero.id,
    name: hero.name,
    tagline: hero.tagline,
    theme: hero.theme,
    dieShape: hero.dieShape,
    accent: hero.accent,
    featured: hero.featured,
    previewBlocks: [...hero.previewBlocks],
  })),
  ...BASE_PRESET_CATALOG,
]
