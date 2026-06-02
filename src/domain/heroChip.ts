import { CURRENT_SCHEMA_VERSION, type Block, type Decoration, type Project } from './project'

const DIE = 720

export function createHeroChip(id: string = crypto.randomUUID(), now = Date.now()): Project {
  const blocks: Block[] = [
    { id: `${id}-cpu`, type: 'CPU', category: 'real', x: 86, y: 86, w: 158, h: 86, rotation: 0, glow: true, zIndex: 0 },
    { id: `${id}-gpu`, type: 'GPU', category: 'real', x: 475, y: 86, w: 158, h: 86, rotation: 0, glow: true, zIndex: 1 },
    { id: `${id}-pll`, type: 'PLL', category: 'real', x: 86, y: 461, w: 158, h: 72, rotation: 0, glow: true, zIndex: 2 },
    { id: `${id}-dac`, type: 'DAC', category: 'real', x: 475, y: 461, w: 158, h: 72, rotation: 0, glow: true, zIndex: 3 },
    { id: `${id}-mem`, type: 'QuantumMemory', category: 'fantasy', x: 72, y: 576, w: 576, h: 72, rotation: 0, glow: true, zIndex: 4 },
    { id: `${id}-core`, type: 'ConsciousnessProcessor', category: 'fantasy', x: 216, y: 288, w: 288, h: 130, rotation: 0, glow: true, zIndex: 5 },
  ]
  const decorations: Decoration[] = [
    { id: `${id}-name`, kind: 'label', x: 280, y: 44, text: 'AURORA C-1', zIndex: 0 },
  ]
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name: 'AURORA C-1 — Consciousness Processor',
    createdAt: now,
    updatedAt: now,
    die: { shape: 'square', width: DIE, height: DIE, background: 'keynote-graphite' },
    blocks,
    decorations,
    theme: 'keynote',
    spec: {
      brand: 'AURORA',
      series: 'C-1',
      generation: '3rd-gen',
      process: '0.5nm 영혼각인 (soul-etched)',
      cores: 88,
      bandwidth: '∞ TB/s',
      features: ['Dream Coherence Engine', 'Lucid Cache', 'Empathy Co-processor'],
      description: '의식을 88코어로 병렬 처리합니다. 부작용으로 가끔 자아를 가집니다.',
    },
  }
}
