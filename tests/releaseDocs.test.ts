import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readText(path: string) {
  return readFileSync(path, 'utf8')
}

describe('v11 release documentation', () => {
  it('updates the English README version line and v11 overview', () => {
    const readme = readText('README.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.9 v11')
    expect(readme).toContain('Version line: the `0.9` line of this repo corresponds to v11')
    expect(readme).toContain('**v11 Mobile 3D Authoring**')
    expect(readme).toContain('mobile look presets, lighting chips, and touch camera save/reset')
    expect(readme).toContain('Mobile 3D Authoring (v11)')
    expect(readme).toContain('docs/ops/v11-mobile-3d-authoring-qa.md')
  })

  it('updates the Korean README version line and v11 overview', () => {
    const readme = readText('README.kr.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.9 v11')
    expect(readme).toContain('`0.9` 라인은 v11(Mobile 3D Authoring)')
    expect(readme).toContain('**v11 Mobile 3D Authoring**')
    expect(readme).toContain('모바일 look preset·조명 chip·터치 카메라 저장/초기화')
    expect(readme).toContain('Mobile 3D Authoring (v11)')
    expect(readme).toContain('docs/ops/v11-mobile-3d-authoring-qa.md')
  })

  it('ships a v11 QA release pack with final gate coverage', () => {
    const qa = readText('docs/ops/v11-mobile-3d-authoring-qa.md')

    expect(qa).toContain('# v11 Mobile 3D Authoring QA Release Pack')
    expect(qa).toContain('Mobile look presets')
    expect(qa).toContain('Lighting chips')
    expect(qa).toContain('Camera touch authoring')
    expect(qa).toContain('Available fallback')
    expect(qa).toContain('Unavailable fallback')
    expect(qa).toContain('Round-trip')
    expect(qa).toContain('Share')
    expect(qa).toContain('MP4')
    expect(qa).toContain('Export parity')
    expect(qa).toContain('0.9 v11')
    expect(qa).toContain('VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173')
    expect(qa).toContain('/s/')
    expect(qa).toContain('npm test')
    expect(qa).toContain('npm run build')
    expect(qa).toContain('npm run typecheck:server')
    expect(qa).toContain('rg "three" dist/assets/index-*.js')
  })
})
