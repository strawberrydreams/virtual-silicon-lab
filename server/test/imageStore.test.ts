import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createFileImageStore } from '../src/images/fileImageStore'

const png = 'data:image/png;base64,AAAA'

let tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
  tempDirs = []
})

function tempRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'vsl-images-'))
  tempDirs.push(dir)
  return dir
}

describe('createFileImageStore', () => {
  it('stores a published PNG outside SQLite and reads it by public path', () => {
    const rootDir = tempRoot()
    const store = createFileImageStore({ rootDir })

    const path = store.savePublishedImage({
      chipId: 'chip-1',
      version: 2,
      kind: 'poster',
      dataUrl: png,
    })

    expect(path).toBe('/uploads/published/chip-1/v2-poster.png')
    expect(readFileSync(join(rootDir, 'published/chip-1/v2-poster.png')).byteLength).toBeGreaterThan(0)
    expect(store.readPublishedImage(path)?.byteLength).toBeGreaterThan(0)
    expect(store.readPublishedImage('/uploads/../secret.png')).toBeNull()
  })
})
