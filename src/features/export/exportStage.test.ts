import { describe, expect, it, vi } from 'vitest'
import { shareFileOrDownload } from './exportStage'

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
})
