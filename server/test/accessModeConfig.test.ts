import { describe, expect, it } from 'vitest'
import { loadRuntimeConfig } from '../src/config'

const productionBase = {
  NODE_ENV: 'production',
  VSL_SESSION_SECRET: '0123456789abcdef0123456789abcdef',
  VSL_PUBLIC_BASE_URL: 'https://vsl.example',
}

describe('accessMode config', () => {
  it('reads VSL_ACCESS_MODE directly', () => {
    expect(loadRuntimeConfig({ VSL_ACCESS_MODE: 'invite' }).accessMode).toBe('invite')
    expect(loadRuntimeConfig({ VSL_ACCESS_MODE: 'open' }).accessMode).toBe('open')
  })

  it('defaults to closed when no access env is set', () => {
    expect(loadRuntimeConfig({}).accessMode).toBe('closed')
  })

  it('falls back from legacy VSL_SIGNUPS_OPEN', () => {
    expect(loadRuntimeConfig({ VSL_SIGNUPS_OPEN: 'true' }).accessMode).toBe('open')
    expect(loadRuntimeConfig({ VSL_SIGNUPS_OPEN: 'false' }).accessMode).toBe('closed')
  })

  it('rejects an unknown mode', () => {
    expect(() =>
      loadRuntimeConfig({ ...productionBase, VSL_ACCESS_MODE: 'maybe' }),
    ).toThrow(/VSL_ACCESS_MODE/)
  })
})
