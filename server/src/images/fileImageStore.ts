import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { decodePngDataUrl } from '../share/poster'

export type PublishedImageKind = 'die' | 'poster'

export type PublishedImageStore = {
  savePublishedImage(input: {
    chipId: string
    version: number
    kind: PublishedImageKind
    dataUrl: string
  }): string
  readPublishedImage(publicPath: string): Buffer | null
  deletePublishedImages(chipId: string): void
}

type FileImageStoreOptions = {
  rootDir: string
  publicPathPrefix?: string
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

export function createFileImageStore({
  rootDir,
  publicPathPrefix = '/uploads',
}: FileImageStoreOptions): PublishedImageStore {
  const root = resolve(rootDir)

  function publicPathToFilePath(publicPath: string): string | null {
    if (!publicPath.startsWith(`${publicPathPrefix}/`)) return null
    const relative = publicPath.slice(publicPathPrefix.length + 1)
    const segments = relative.split('/')
    if (segments.some((segment) => segment === '' || segment === '..')) return null
    const filePath = resolve(root, relative)
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) return null
    return filePath
  }

  return {
    savePublishedImage({ chipId, version, kind, dataUrl }) {
      const bytes = decodePngDataUrl(dataUrl)
      if (bytes === null) throw new Error(`${kind} image must be a PNG data URL.`)

      const publicPath = `${publicPathPrefix}/published/${safeSegment(chipId)}/v${version}-${kind}.png`
      const filePath = publicPathToFilePath(publicPath)
      if (filePath === null) throw new Error('Generated image path is invalid.')
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, bytes)
      return publicPath
    },

    readPublishedImage(publicPath: string) {
      const filePath = publicPathToFilePath(publicPath)
      if (filePath === null) return null
      try {
        return readFileSync(filePath)
      } catch {
        return null
      }
    },

    deletePublishedImages(chipId: string) {
      rmSync(join(root, 'published', safeSegment(chipId)), { recursive: true, force: true })
    },
  }
}
