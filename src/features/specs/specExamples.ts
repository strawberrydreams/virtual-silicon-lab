import type { FakeSpec } from '../../domain/project'

export type SpecExample = {
  id: 'aurora-c1' | 'aegis-m7' | 'oneiric-lucid-88'
  label: string
  spec: FakeSpec
}

export const SPEC_EXAMPLES: readonly SpecExample[] = [
  {
    id: 'aurora-c1',
    label: 'AURORA C-1',
    spec: {
      brand: 'AURORA',
      series: 'C-1',
      generation: '3rd-gen',
      process: '0.5nm soul-etched',
      cores: 88,
      bandwidth: 'infinity TB/s',
      features: ['Dream Coherence Engine', 'Lucid Cache', 'Empathy Co-processor'],
      description: 'Parallel consciousness processing with occasional self-awareness.',
    },
  },
  {
    id: 'aegis-m7',
    label: 'AEGIS M-7',
    spec: {
      brand: 'AEGIS',
      series: 'M-7',
      generation: 'Field Revision',
      process: '3nm hardened deployment',
      cores: 32,
      bandwidth: '2.4 TB/s',
      features: ['Rad-Hardened', 'Faraday Seal', 'Failover Core'],
      description: 'Slows time by 1.5x in hostile environments.',
    },
  },
  {
    id: 'oneiric-lucid-88',
    label: 'ONEIRIC LUCID-88',
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
]
