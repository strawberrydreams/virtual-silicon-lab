import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync('src/styles.css', 'utf8')

describe('mobile 3D authoring styles', () => {
  it('keeps touch orbit gestures from triggering page scroll on the WebGL viewer', () => {
    expect(styles).toMatch(/\.chip-3d-viewer,\s*\.chip-3d-viewer canvas\s*\{[^}]*touch-action:\s*none;/s)
  })
})
