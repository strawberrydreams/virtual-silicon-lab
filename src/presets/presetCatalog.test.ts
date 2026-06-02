import { describe, expect, it } from 'vitest'
import { PRESET_CATALOG } from './presetCatalog'

describe('preset catalog', () => {
  it('ships six presets covering every visual theme', () => {
    expect(PRESET_CATALOG).toHaveLength(6)
    expect(new Set(PRESET_CATALOG.map((preset) => preset.theme))).toEqual(
      new Set(['neon', 'retro', 'military', 'keynote', 'mono']),
    )
  })

  it('keeps ids unique and preview metadata populated', () => {
    expect(new Set(PRESET_CATALOG.map((preset) => preset.id)).size).toBe(PRESET_CATALOG.length)
    for (const preset of PRESET_CATALOG) {
      expect(preset.name.length).toBeGreaterThan(0)
      expect(preset.tagline.length).toBeGreaterThan(0)
      expect(preset.previewBlocks.length).toBeGreaterThanOrEqual(3)
    }
  })
})
