export const CURRENT_SCHEMA_VERSION = 5 as const

export type DieShape = 'rect' | 'square' | 'circle' | 'hexagon'
export type StyleTheme = 'neon' | 'retro' | 'military' | 'keynote' | 'mono'
export type BlockCategory = 'real' | 'fantasy'

export type BlockType =
  | 'CPU'
  | 'GPU'
  | 'DSP'
  | 'SRAM'
  | 'Cache'
  | 'DAC'
  | 'ADC'
  | 'PLL'
  | 'IO'
  | 'USB'
  | 'EmotionEngine'
  | 'DreamSynth'
  | 'QuantumMemory'
  | 'ConsciousnessProcessor'
  | 'RealityDistortionUnit'
  | 'TimeCore'

export type Die = {
  shape: DieShape
  width: number
  height: number
  background: string
}

export type Block = {
  id: string
  type: BlockType
  category: BlockCategory
  x: number
  y: number
  w: number
  h: number
  rotation: number
  label?: string
  glow?: boolean
  colorOverride?: string
  imageDataUrl?: string
  zIndex: number
}

export type Decoration =
  | { id: string; kind: 'neonLine'; points: number[]; color: string; zIndex: number }
  | { id: string; kind: 'warningMark'; x: number; y: number; zIndex: number }
  | { id: string; kind: 'label'; x: number; y: number; text: string; zIndex: number }
  | { id: string; kind: 'sciFiObject'; assetKey: string; x: number; y: number; zIndex: number }

export type FakeSpec = {
  brand: string
  series: string
  generation: string
  process: string
  cores: number
  bandwidth: string
  features: string[]
  description: string
}

export type StudioContactStyle = 'minimal' | 'balanced' | 'dense'

export type StudioTileSettings = {
  detailDensity: number
  routeIntensity: number
  contactStyle: StudioContactStyle
}

export type StudioColorPaint =
  | { mode: 'solid'; color: string }
  | { mode: 'gradient'; from: string; to: string }

export type StudioColorTarget =
  | 'background'
  | 'package'
  | 'die'
  | 'block'
  | 'tile'
  | 'trace'
  | 'label'
  | 'mark'

export type StudioColorSettings = Record<StudioColorTarget, StudioColorPaint>

export type StudioSprayBlend = 'screen' | 'lighten' | 'overlay'

export type StudioSpray = {
  id: string
  x: number
  y: number
  radius: number
  color: string
  intensity: number
  blend: StudioSprayBlend
}

export type StudioStickerKind = 'badge' | 'label' | 'mascot' | 'warning'

export type StudioSticker = {
  id: string
  kind: StudioStickerKind
  x: number
  y: number
  text: string
  color: string
  rotation: number
}

export type StudioState = {
  layoutMode: 'global-reflow'
  detailMode: 'semi-auto'
  tileSettings: StudioTileSettings
  colorSettings: StudioColorSettings
  sprays: StudioSpray[]
  stickers: StudioSticker[]
}

export type RemixOrigin = {
  chipId: string
  slug: string
  title: string
}

export type Project = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  id: string
  name: string
  createdAt: number
  updatedAt: number
  die: Die
  blocks: Block[]
  decorations: Decoration[]
  theme: StyleTheme
  spec: FakeSpec
  studio: StudioState
  remixedFrom?: RemixOrigin
}
