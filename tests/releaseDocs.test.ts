import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readText(path: string) {
  return readFileSync(path, 'utf8')
}

describe('v12 release documentation', () => {
  it('updates the English README version line and v12 overview', () => {
    const readme = readText('README.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.10 v12')
    expect(readme).toContain('Version line: the `0.10` line of this repo corresponds to v12')
    expect(readme).toContain('**v12 Continuum Sync**')
    expect(readme).toContain('multi-device sync')
    expect(readme).toContain('Continuum Sync (v12)')
    expect(readme).toContain('docs/ops/v12-continuum-sync-qa.md')
  })

  it('updates the Korean README version line and v12 overview', () => {
    const readme = readText('README.kr.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.10 v12')
    expect(readme).toContain('`0.10` 라인은 v12(Continuum Sync)')
    expect(readme).toContain('**v12 Continuum Sync**')
    expect(readme).toContain('멀티 디바이스 동기화')
    expect(readme).toContain('Continuum Sync (v12)')
    expect(readme).toContain('docs/ops/v12-continuum-sync-qa.md')
  })

  it('ships a v12 QA release pack with final gate coverage', () => {
    const qa = readText('docs/ops/v12-continuum-sync-qa.md')

    expect(qa).toContain('# v12 Continuum Sync QA Release Pack')
    expect(qa).toContain('Multi-device round-trip')
    expect(qa).toContain('Anonymous stays local')
    expect(qa).toContain('First-login adoption')
    expect(qa).toContain('Offline')
    expect(qa).toContain('Sync status')
    expect(qa).toContain('Publish unchanged')
    expect(qa).toContain('Export parity')
    expect(qa).toContain('0.10 v12')
    expect(qa).toContain('npm test')
    expect(qa).toContain('npm run build')
    expect(qa).toContain('npm run typecheck:server')
  })
})
