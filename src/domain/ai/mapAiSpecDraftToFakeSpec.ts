import type { FakeSpec } from '../project'
import type { AiSpecDraft } from './aiSpecDraft'

const MAX_TEXT = 80
const MAX_DESCRIPTION = 280
const MAX_FEATURES = 6
const MAX_FEATURE_LEN = 80
const MAX_CORES = 4096

const DEFAULTS: FakeSpec = {
  brand: 'AI FOUNDRY',
  series: 'GEN-1',
  generation: 'AI-I',
  process: '0.5nm dream-etched',
  cores: 8,
  bandwidth: '4.2 TB/s',
  features: [],
  description: 'An AI-dreamed processor.',
}

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (trimmed === '') return fallback
  return trimmed.slice(0, max)
}

function cores(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULTS.cores
  return Math.max(0, Math.min(MAX_CORES, Math.floor(value)))
}

function features(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, MAX_FEATURE_LEN))
    .filter((item) => item !== '')
    .slice(0, MAX_FEATURES)
}

/**
 * Maps any AiSpecDraft to a domain-valid FakeSpec. Strings are trimmed and length-capped,
 * cores becomes a clamped non-negative integer, features is a bounded array of non-empty
 * trimmed strings, and missing/wrong-typed fields fall back to defaults — so adversarial AI
 * copy can never produce an invalid FakeSpec. The M1 valid-output guarantee.
 */
export function mapAiSpecDraftToFakeSpec(draft: AiSpecDraft): FakeSpec {
  return {
    brand: text(draft.brand, DEFAULTS.brand, MAX_TEXT),
    series: text(draft.series, DEFAULTS.series, MAX_TEXT),
    generation: text(draft.generation, DEFAULTS.generation, MAX_TEXT),
    process: text(draft.process, DEFAULTS.process, MAX_TEXT),
    cores: cores(draft.cores),
    bandwidth: text(draft.bandwidth, DEFAULTS.bandwidth, MAX_TEXT),
    features: features(draft.features),
    description: text(draft.description, DEFAULTS.description, MAX_DESCRIPTION),
  }
}
