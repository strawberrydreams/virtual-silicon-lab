import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function readText(path: string) {
  return readFileSync(path, 'utf8')
}

describe('v13 release documentation', () => {
  it('keeps the English README concise and focused on the current release', () => {
    const readme = readText('README.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.11 v13')
    expect(readme).toContain('The current release adds **Freeform** die editing')
    expect(readme).toContain('**v13** — Added Freeform die editing')
    expect(readme).toContain('### Freeform Die Authoring')
    expect(readme).toContain('vertex handles')
    expect(readme).toContain('docs/ops/v13-freeform-qa.md')
    expect(readme).not.toContain('Version line: the `0.11` line')
    expect(readme).not.toContain('v3·v4 added')
    expect(readme).not.toContain('### Freeform Die Authoring (v13)')
    expect(readme).not.toContain('### 3D Authoring (v10)')
    expect(readme).not.toContain('## Launch Status')
    expect(readme).not.toContain('## v3·v4·v5·v8 Server Deploy Notes')
  })

  it('keeps the Korean README concise and focused on the current release', () => {
    const readme = readText('README.kr.md')

    expect(readme).toContain('# Virtual Silicon Lab 0.11 v13')
    expect(readme).toContain('현재 릴리스는 vertex handle로 자유형 다이를 편집')
    expect(readme).toContain('**v13** — Freeform 다이 편집')
    expect(readme).toContain('### Freeform Die Authoring')
    expect(readme).toContain('vertex handle')
    expect(readme).toContain('docs/ops/v13-freeform-qa.md')
    expect(readme).not.toContain('`0.11` 라인은 v13(Freeform)')
    expect(readme).not.toContain('v3·v4에서')
    expect(readme).not.toContain('### Freeform Die Authoring (v13)')
    expect(readme).not.toContain('### 3D Authoring (v10)')
    expect(readme).not.toContain('## 런칭 상태')
    expect(readme).not.toContain('## v3·v4·v5·v8 서버 배포 메모')
  })

  it('ships a v13 QA release pack with final gate coverage', () => {
    const qa = readText('docs/ops/v13-freeform-qa.md')

    expect(qa).toContain('# v13 Freeform QA Release Pack')
    expect(qa).toContain('Freeform conversion')
    expect(qa).toContain('Vertex add / move / delete')
    expect(qa).toContain('Block re-clamp')
    expect(qa).toContain('2D rendering')
    expect(qa).toContain('3D showcase')
    expect(qa).toContain('Die PNG')
    expect(qa).toContain('Poster PNG')
    expect(qa).toContain('MP4 export')
    expect(qa).toContain('No server or sync change')
    expect(qa).toContain('0.11 v13')
    expect(qa).toContain('npm test')
    expect(qa).toContain('npm run build')
    expect(qa).toContain('npm run test:client')
  })
})
