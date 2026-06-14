import { describe, expect, it, vi, afterEach } from 'vitest'
import { liveModerationApi } from './moderationApi'

afterEach(() => vi.restoreAllMocks())

describe('moderationApi', () => {
  it('lists reports for a status', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ reports: [{ id: 'r1' }] }), { status: 200 }),
    )
    const reports = await liveModerationApi.listReports('open')
    expect(reports).toEqual([{ id: 'r1' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/reports?status=open', expect.any(Object))
  })

  it('throws on a non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'FORBIDDEN', message: 'no' } }), { status: 403 }),
    )
    await expect(liveModerationApi.listReports('open')).rejects.toThrow()
  })
})
