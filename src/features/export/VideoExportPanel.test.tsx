import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../three/chip3dEncoder', () => ({ isMp4ExportSupported: vi.fn(() => true) }))
vi.mock('../../three/chip3dRecorder', () => ({ recordTurntableMp4: vi.fn() }))

import { isMp4ExportSupported } from '../../three/chip3dEncoder'
import { recordTurntableMp4 } from '../../three/chip3dRecorder'
import { CAPTURE } from '../../visual/chip3d/chip3dCapture'
import { VideoExportPanel } from './VideoExportPanel'

const model = { pieces: [], center: [0, 0, 0], extent: [1, 1, 1], environment: {} } as never

beforeEach(() => {
  vi.mocked(isMp4ExportSupported).mockReturnValue(true)
  vi.mocked(recordTurntableMp4).mockReset()
})

describe('VideoExportPanel', () => {
  it('shows the unsupported notice when WebCodecs is unavailable', () => {
    vi.mocked(isMp4ExportSupported).mockReturnValue(false)
    render(<VideoExportPanel model={model} name="N1" />)
    expect(screen.getByText(/isn.t available/i)).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('records and downloads an MP4 named after the project', async () => {
    vi.mocked(recordTurntableMp4).mockResolvedValue(new Blob(['x'], { type: 'video/mp4' }))
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    let downloadedName = ''
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadedName = this.download
    })

    render(<VideoExportPanel model={model} name="N1 GREEN HORIZON" />)
    fireEvent.click(screen.getByRole('button', { name: /export turntable mp4/i }))

    await waitFor(() =>
      expect(recordTurntableMp4).toHaveBeenCalledWith(
        model,
        expect.objectContaining({
          spec: CAPTURE,
          onProgress: expect.any(Function),
        }),
      ),
    )
    await waitFor(() => expect(click).toHaveBeenCalled())
    expect(createUrl).toHaveBeenCalled()
    expect(revokeUrl).toHaveBeenCalled()
    expect(downloadedName).toBe('N1 GREEN HORIZON-turntable.mp4')

    createUrl.mockRestore()
    revokeUrl.mockRestore()
    click.mockRestore()
  })

  it('surfaces an error when recording fails', async () => {
    vi.mocked(recordTurntableMp4).mockRejectedValue(new Error('boom'))
    render(<VideoExportPanel model={model} name="N1" />)
    fireEvent.click(screen.getByRole('button', { name: /export turntable mp4/i }))
    expect(await screen.findByText(/failed/i)).toBeInTheDocument()
  })
})
