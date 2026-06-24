import { CURRENT_SCHEMA_VERSION, type Project } from './project'
import { defaultFinishForTheme } from './material/chipFinish'
import { createDefaultStudioState } from './studioDefaults'

export function createProject(
  name: string,
  id: string = crypto.randomUUID(),
  now = Date.now(),
): Project {
  const theme = 'neon'
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    die: { shape: 'rect', width: 960, height: 640, background: 'grid-cyan' },
    blocks: [],
    decorations: [],
    theme,
    finish: defaultFinishForTheme(theme),
    spec: {
      brand: 'NOCTURNE',
      series: 'ONEIRIC',
      generation: 'I',
      process: '0.5nm soul engraving',
      cores: 8,
      bandwidth: '4.2 TB/s',
      features: ['Lucid cache'],
      description: 'A processor for synthetic dreams.',
    },
    studio: createDefaultStudioState(),
  }
}
