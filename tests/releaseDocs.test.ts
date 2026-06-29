import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readText(path: string) {
  return readFileSync(path, 'utf8')
}

describe('v10 release documentation', () => {
  it('updates the English README version line and v10 overview', () => {
    const readme = readText('README.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.8 v10')
    expect(readme).toContain('Version line: the `0.8` line of this repo corresponds to v10')
    expect(readme).toContain('**v10 3D Authoring**')
    expect(readme).toContain('camera, lighting, environment, animation, and full-scene look presets')
    expect(readme).toContain('3D Authoring (v10)')
    expect(readme).toContain('docs/ops/v10-3d-authoring-qa.md')
  })

  it('updates the Korean README version line and v10 overview', () => {
    const readme = readText('README.kr.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.8 v10')
    expect(readme).toContain('`0.8` 라인은 v10(3D Authoring)')
    expect(readme).toContain('**v10 3D Authoring**')
    expect(readme).toContain('카메라·조명·환경·애니메이션·전체 scene look preset')
    expect(readme).toContain('3D Authoring (v10)')
    expect(readme).toContain('docs/ops/v10-3d-authoring-qa.md')
  })

  it('ships a v10 QA release pack with final gate coverage', () => {
    const qa = readText('docs/ops/v10-3d-authoring-qa.md')

    expect(qa).toContain('# v10 3D Authoring QA Release Pack')
    expect(qa).toContain('Camera')
    expect(qa).toContain('Lighting')
    expect(qa).toContain('Environment')
    expect(qa).toContain('Animation')
    expect(qa).toContain('Look presets')
    expect(qa).toContain('Round-trip')
    expect(qa).toContain('MP4')
    expect(qa).toContain('VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173')
    expect(qa).toContain('/s/')
    expect(qa).toContain('npm test')
    expect(qa).toContain('npm run build')
    expect(qa).toContain('npm run typecheck:server')
    expect(qa).toContain('rg "three" dist/assets/index-*.js')
  })
})
