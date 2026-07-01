import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync('src/styles.css', 'utf8')

describe('mobile 3D authoring styles', () => {
  it('keeps touch orbit gestures from triggering page scroll on the WebGL viewer', () => {
    expect(styles).toMatch(/\.chip-3d-viewer,\s*\.chip-3d-viewer canvas\s*\{[^}]*touch-action:\s*none;/s)
  })

  it('uses compact mobile preset rails with 44px tap targets at the mobile breakpoint', () => {
    expect(styles).toMatch(/@media \(max-width:\s*767px\)[\s\S]*\.chip-3d-showcase--mobile-presets \.chip-3d-showcase__header\s*\{[\s\S]*overflow-x:\s*auto;/)
    expect(styles).toMatch(/@media \(max-width:\s*767px\)[\s\S]*\.chip-3d-showcase--mobile-presets \.chip-3d-look-presets,[\s\S]*\.chip-3d-showcase--mobile-presets \.chip-3d-lighting--presets\s*\{[\s\S]*flex-wrap:\s*nowrap;/)
    expect(styles).toMatch(/@media \(max-width:\s*767px\)[\s\S]*\.chip-3d-showcase--mobile-presets \.chip-3d-showcase__header button,[\s\S]*\.chip-3d-showcase--mobile-presets \.chip-3d-viewer__action,[\s\S]*\.chip-3d-showcase--mobile-presets \.chip-3d-viewer__play\s*\{[\s\S]*min-height:\s*44px;/)
  })
})
