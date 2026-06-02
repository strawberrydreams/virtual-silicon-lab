import { createHeroChip } from '../domain/heroChip'
import {
  CURRENT_SCHEMA_VERSION,
  type Block,
  type Decoration,
  type Die,
  type FakeSpec,
  type Project,
  type StyleTheme,
} from '../domain/project'
import type { PresetId } from './presetCatalog'

type BlockBlueprint = Omit<Block, 'id' | 'zIndex'>
type DecorationBlueprint =
  | Omit<Extract<Decoration, { kind: 'neonLine' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'warningMark' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'label' }>, 'id' | 'zIndex'>
  | Omit<Extract<Decoration, { kind: 'sciFiObject' }>, 'id' | 'zIndex'>

type PresetBlueprint = {
  name: string
  die: Die
  theme: StyleTheme
  blocks: BlockBlueprint[]
  decorations: DecorationBlueprint[]
  spec: FakeSpec
}

const BLUEPRINTS: Record<Exclude<PresetId, 'aurora-c1'>, PresetBlueprint> = {
  'neon-district-n9': {
    name: 'NEON DISTRICT N-9 - Reality Routing Array',
    die: { shape: 'hexagon', width: 720, height: 720, background: 'neon-indigo-spotlight' },
    theme: 'neon',
    blocks: [
      { type: 'IO', category: 'real', x: 285, y: 112, w: 150, h: 72, rotation: 0, glow: true },
      { type: 'EmotionEngine', category: 'fantasy', x: 250, y: 240, w: 220, h: 108, rotation: 0, glow: true, colorOverride: '#22d3ee' },
      { type: 'RealityDistortionUnit', category: 'fantasy', x: 176, y: 382, w: 168, h: 92, rotation: 0, glow: true, colorOverride: '#ff2bd6' },
      { type: 'GPU', category: 'real', x: 376, y: 382, w: 168, h: 92, rotation: 0, glow: true },
      { type: 'QuantumMemory', category: 'fantasy', x: 250, y: 492, w: 220, h: 58, rotation: 0, glow: true },
    ],
    decorations: [
      { kind: 'label', x: 268, y: 202, text: 'NEON DISTRICT N-9' },
      { kind: 'neonLine', points: [250, 294, 176, 428], color: '#22d3ee' },
      { kind: 'neonLine', points: [470, 294, 544, 428], color: '#ff2bd6' },
      { kind: 'warningMark', x: 176, y: 382 },
    ],
    spec: {
      brand: 'NEXUS',
      series: 'N-9',
      generation: 'Night Shift',
      process: '1nm neon deposition',
      cores: 256,
      bandwidth: '12.8 PB/s',
      features: ['Overclock Halo', 'Magenta Bus', 'Glitch Shield'],
      description: 'Routes reality after dark. Warranty void in direct sunlight.',
    },
  },
  'field-unit-m7': {
    name: 'FIELD UNIT M-7 - Temporal Control Module',
    die: { shape: 'rect', width: 920, height: 600, background: 'military-gunmetal' },
    theme: 'military',
    blocks: [
      { type: 'IO', category: 'real', x: 72, y: 92, w: 150, h: 88, rotation: 0, glow: false },
      { type: 'USB', category: 'real', x: 72, y: 206, w: 150, h: 88, rotation: 0, glow: false },
      { type: 'TimeCore', category: 'fantasy', x: 310, y: 190, w: 300, h: 176, rotation: 0, glow: true },
      { type: 'SRAM', category: 'real', x: 682, y: 92, w: 160, h: 88, rotation: 0, glow: false },
      { type: 'Cache', category: 'real', x: 682, y: 206, w: 160, h: 88, rotation: 0, glow: false },
      { type: 'PLL', category: 'real', x: 682, y: 320, w: 160, h: 88, rotation: 0, glow: false },
    ],
    decorations: [
      { kind: 'label', x: 310, y: 146, text: 'AEGIS // FIELD UNIT M-7' },
      { kind: 'warningMark', x: 624, y: 190 },
      { kind: 'warningMark', x: 624, y: 332 },
    ],
    spec: {
      brand: 'AEGIS',
      series: 'M-7',
      generation: 'Field Revision',
      process: '3nm hardened deployment',
      cores: 32,
      bandwidth: '2.4 TB/s',
      features: ['Rad-Hardened', 'Faraday Seal', 'Failover Core'],
      description: 'Slows time by 1.5x in hostile environments. Warranty applies in peacetime only.',
    },
  },
  'lucid-88': {
    name: 'LUCID-88 - Dream Synthesis Disc',
    die: { shape: 'circle', width: 720, height: 720, background: 'retro-phosphor' },
    theme: 'retro',
    blocks: [
      { type: 'DSP', category: 'real', x: 278, y: 136, w: 164, h: 82, rotation: 0, glow: true },
      { type: 'DreamSynth', category: 'fantasy', x: 238, y: 278, w: 244, h: 132, rotation: 0, glow: true },
      { type: 'SRAM', category: 'real', x: 166, y: 444, w: 164, h: 82, rotation: 0, glow: false },
      { type: 'DAC', category: 'real', x: 390, y: 444, w: 164, h: 82, rotation: 0, glow: false },
    ],
    decorations: [
      { kind: 'label', x: 288, y: 238, text: 'LUCID-88' },
      { kind: 'neonLine', points: [330, 485, 390, 485], color: '#d4af37' },
    ],
    spec: {
      brand: 'ONEIRIC',
      series: 'LUCID-88',
      generation: 'Cassette Future',
      process: '8-bit ceramic reverie',
      cores: 8,
      bandwidth: '88 GB/s',
      features: ['Warm Boot', 'Phosphor Cache', 'REM Oscillator'],
      description: 'Synthesizes dreams with the warmth of an aging terminal.',
    },
  },
  'monolith-io': {
    name: 'MONOLITH I/O - Signal Discipline Array',
    die: { shape: 'square', width: 720, height: 720, background: 'mono-editorial' },
    theme: 'mono',
    blocks: [
      { type: 'IO', category: 'real', x: 96, y: 110, w: 220, h: 94, rotation: 0, glow: false },
      { type: 'USB', category: 'real', x: 404, y: 110, w: 220, h: 94, rotation: 0, glow: false },
      { type: 'ADC', category: 'real', x: 96, y: 300, w: 220, h: 120, rotation: 0, glow: false },
      { type: 'DAC', category: 'real', x: 404, y: 300, w: 220, h: 120, rotation: 0, glow: false },
      { type: 'Cache', category: 'real', x: 178, y: 510, w: 364, h: 82, rotation: 0, glow: true },
    ],
    decorations: [
      { kind: 'label', x: 256, y: 252, text: 'MONOLITH // SIGNAL DISCIPLINE' },
      { kind: 'neonLine', points: [316, 360, 404, 360], color: '#9db4cf' },
    ],
    spec: {
      brand: 'MONOLITH',
      series: 'I/O',
      generation: 'Edition 01',
      process: '14nm editorial lithography',
      cores: 4,
      bandwidth: '640 GB/s',
      features: ['Quiet Bus', 'Reference Clock', 'Single-Hue Compliance'],
      description: 'Refuses unnecessary color and most unnecessary meetings.',
    },
  },
  'solar-flare-x': {
    name: 'SOLAR FLARE X - Emotion Telemetry Engine',
    die: { shape: 'rect', width: 920, height: 600, background: 'neon-magenta-horizon' },
    theme: 'neon',
    blocks: [
      { type: 'GPU', category: 'real', x: 80, y: 100, w: 250, h: 126, rotation: 0, glow: true },
      { type: 'EmotionEngine', category: 'fantasy', x: 362, y: 198, w: 300, h: 166, rotation: 0, glow: true, colorOverride: '#ff2bd6' },
      { type: 'DSP', category: 'real', x: 704, y: 100, w: 140, h: 104, rotation: 0, glow: true },
      { type: 'Cache', category: 'real', x: 704, y: 244, w: 140, h: 104, rotation: 0, glow: false },
      { type: 'QuantumMemory', category: 'fantasy', x: 80, y: 438, w: 764, h: 72, rotation: 0, glow: true },
    ],
    decorations: [
      { kind: 'label', x: 362, y: 152, text: 'SOLAR FLARE X' },
      { kind: 'neonLine', points: [330, 163, 362, 281], color: '#22d3ee' },
      { kind: 'neonLine', points: [662, 281, 704, 296], color: '#ff2bd6' },
    ],
    spec: {
      brand: 'HELIOGRAPH',
      series: 'X',
      generation: 'Coronal',
      process: '0.8nm solar etch',
      cores: 144,
      bandwidth: '9.6 PB/s',
      features: ['Mood Telemetry', 'Coronal Cache', 'Cyan Failover'],
      description: 'Measures emotion at unsafe clock speeds.',
    },
  },
}

function materializeDecoration(blueprint: DecorationBlueprint, id: string, zIndex: number): Decoration {
  if (blueprint.kind === 'neonLine') return { ...blueprint, points: [...blueprint.points], id, zIndex }
  return { ...blueprint, id, zIndex }
}

export function createPresetProject(
  presetId: PresetId,
  id: string = crypto.randomUUID(),
  now = Date.now(),
): Project {
  if (presetId === 'aurora-c1') return createHeroChip(id, now)

  const blueprint = BLUEPRINTS[presetId]
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: blueprint.name,
    createdAt: now,
    updatedAt: now,
    die: { ...blueprint.die },
    blocks: blueprint.blocks.map((block, index) => ({ ...block, id: `${id}-block-${index}`, zIndex: index })),
    decorations: blueprint.decorations.map((decoration, index) =>
      materializeDecoration(decoration, `${id}-decoration-${index}`, index),
    ),
    theme: blueprint.theme,
    spec: { ...blueprint.spec, features: [...blueprint.spec.features] },
  }
}
