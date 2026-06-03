import { describe, expect, it, vi } from 'vitest'
import { dataUrlToFile, shareFileOrDownload } from './exportStage'

describe('shareFileOrDownload', () => {
  const file = new File(['poster'], 'chip-poster.png', { type: 'image/png' })

  it('shares a file when the browser supports file sharing', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const download = vi.fn()
    await shareFileOrDownload(file, { canShare: () => true, share, download })
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Virtual Silicon Lab poster' })
    expect(download).not.toHaveBeenCalled()
  })

  it('downloads when file sharing is unavailable', async () => {
    const download = vi.fn()
    await shareFileOrDownload(file, { download })
    expect(download).toHaveBeenCalledWith(file)
  })

  it('does not download when the user cancels the share sheet', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
    const download = vi.fn()
    const result = await shareFileOrDownload(file, { canShare: () => true, share, download })
    expect(result).toBe('cancelled')
    expect(download).not.toHaveBeenCalled()
  })

  it('falls back to download when sharing throws a real error', async () => {
    const share = vi.fn().mockRejectedValue(new Error('share failed'))
    const download = vi.fn()
    const result = await shareFileOrDownload(file, { canShare: () => true, share, download })
    expect(result).toBe('downloaded')
    expect(download).toHaveBeenCalledWith(file)
  })
})

describe('dataUrlToFile', () => {
  it('throws a clear error on a malformed data URL', () => {
    expect(() => dataUrlToFile('not-a-data-url', 'chip.png')).toThrow('Malformed data URL')
  })

  it('decodes a valid PNG data URL into a File', () => {
    const file = dataUrlToFile('data:image/png;base64,AAAA', 'chip.png')
    expect(file).toBeInstanceOf(File)
    expect(file.type).toBe('image/png')
    expect(file.name).toBe('chip.png')
  })
})
