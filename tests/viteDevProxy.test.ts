import { describe, expect, it } from 'vitest'
import config from '../vite.config'

describe('Vite local server proxy', () => {
  it('keeps the public share surface reachable through the frontend origin', () => {
    const resolved = typeof config === 'function' ? config({ command: 'serve', mode: 'test' }) : config
    const proxy = resolved.server?.proxy

    expect(proxy).toMatchObject({
      '/api': 'http://127.0.0.1:8787',
      '/s/': 'http://127.0.0.1:8787',
      '/uploads': 'http://127.0.0.1:8787',
    })
    expect(proxy).not.toHaveProperty('/s')
  })

  it('mirrors the share proxy in preview builds', () => {
    const resolved = typeof config === 'function' ? config({ command: 'serve', mode: 'test' }) : config
    const proxy = resolved.preview?.proxy

    expect(proxy).toMatchObject({
      '/api': 'http://127.0.0.1:8787',
      '/s/': 'http://127.0.0.1:8787',
      '/uploads': 'http://127.0.0.1:8787',
    })
    expect(proxy).not.toHaveProperty('/s')
  })
})
