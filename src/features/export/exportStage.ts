// Browser-only helpers (touch the DOM / Web Share); the pure sharing decision in
// `shareFileOrDownload` is unit-tested, the DOM side is verified in a browser session.
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUrl
  link.click()
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, payload] = dataUrl.split(',')
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? 'image/png'
  const bytes = Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
  return new File([bytes], filename, { type: mime })
}

type ShareDependencies = {
  canShare?: (data: ShareData) => boolean
  share?: (data: ShareData) => Promise<void>
  download: (file: File) => void
}

export async function shareFileOrDownload(file: File, dependencies: ShareDependencies) {
  const data = { files: [file], title: 'Virtual Silicon Lab poster' }
  if (dependencies.share && dependencies.canShare?.(data)) {
    await dependencies.share(data)
    return 'shared' as const
  }
  dependencies.download(file)
  return 'downloaded' as const
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.download = file.name
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}
