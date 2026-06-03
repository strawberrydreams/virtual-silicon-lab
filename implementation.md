# Virtual Silicon Lab Implementation Notes

이 문서는 `virtual_silicon_lab_v1.md`를 구현하면서 명세에 없었던 결정, 변경 사항, 트레이드오프, 주의점을 지속적으로 기록한다.

## 2026-06-02 - 명세 보완

### 확정된 결정

- v1 PNG 출력은 두 종류를 제공한다.
  - `die-only PNG`: 칩 다이만 고해상도로 출력한다.
  - `poster PNG`: 배경, 칩, 타이포그래피, 가짜 스펙 시트를 포함한 홍보 포스터를 출력한다.
- export 결과에 포함되는 시각 효과는 Konva 렌더링 경로 안에서 구현한다.
  - 사용 대상: Konva 노드의 `shadowBlur`, 그라디언트, 필터, blend 설정.
  - DOM/CSS 효과는 에디터 UI 표현에만 사용할 수 있으며 PNG 결과물의 필수 요소로 의존하지 않는다.
- `poster PNG`는 별도의 export 전용 Konva Stage에서 합성한다. 에디터 Stage의 DOM 구조를 캡처하는 방식은 사용하지 않는다.
- v1 에디터에 기본 편집 UX를 포함한다.
  - undo/redo
  - 선택 삭제
  - 복제
  - 앞/뒤 순서 변경
  - 키보드 단축키
- 블록은 다이 경계를 넘어갈 수 없다. 이동과 리사이즈 모두 경계 제한을 적용한다.
- 구현 phase 순서는 권장안일 뿐이다. 검증과 구현 편의에 따라 재배치하거나 얇은 수직 슬라이스로 진행할 수 있다.

### 데이터 모델 원칙

- 문서의 TypeScript 타입은 초기 스케치이며 고정 계약이 아니다.
- 구현 과정에서 필요한 필드는 추가하거나 삭제할 수 있다.
- 저장된 로컬 프로젝트와의 호환성을 위해 `schemaVersion`을 저장하고, 구조 변경 시 마이그레이션을 함께 추가한다.
- 유연성을 위해 타입을 무제한으로 느슨하게 만들지는 않는다. 단일 JSON export 가능 구조와 타입 안정성을 유지한다.

### 트레이드오프

- DOM/CSS 기반 효과는 빠르게 만들기 쉽지만 Konva `toDataURL()` 출력에 자동 포함되지 않는다. 출력 품질과 일관성을 위해 export 대상 효과를 Konva 노드로 제한한다.
- 별도 poster export Stage는 구현량을 늘리지만 에디터 UI와 결과물 레이아웃을 분리할 수 있고, 고해상도 출력 결과를 예측 가능하게 만든다.
- 다이 경계 제한은 편집 자유도를 일부 줄이지만 v1 프리셋 품질과 결과물 완성도를 안정적으로 유지한다.

## 2026-06-02 - 구현 계획 수립

### 계획 구조

- 전체 MVP를 하나의 거대한 구현 작업으로 다루지 않고 독립적으로 검증 가능한 마일스톤으로 나눈다.
  - Foundation vertical slice
  - Editor core
  - Visual system
  - Presets and remixing
  - Fake specs and dual PNG export
  - Landing, QA, and static deployment
- 전체 로드맵은 `docs/superpowers/plans/2026-06-02-virtual-silicon-lab-mvp-roadmap.md`에 기록한다.
- 첫 번째 실행 계획은 `docs/superpowers/plans/2026-06-02-foundation-vertical-slice.md`에 기록한다.

### 구현 순서 결정

- 첫 번째 마일스톤은 `프로젝트 생성 → 에디터 진입 → 블록 배치 → 경계 제한 → 로컬 저장 → 새로고침 복원` 수직 슬라이스다.
- 원형·육각형 다이, 리사이즈, 회전, undo/redo는 첫 슬라이스의 파일 경계와 캔버스 동작을 확인한 뒤 Editor core 마일스톤에서 추가한다.
- 비주얼 시스템은 캔버스 코어 위에 추가한다. 첫 Hero 칩을 수동 검토한 뒤 프리셋을 확장한다.
- poster PNG는 편집기 DOM을 캡처하지 않고 별도의 export 전용 Konva Stage에서 합성한다.

### 환경 관련 결정

- 패키지 매니저는 npm을 사용한다.
- 현재 디렉터리는 Git 저장소가 아니다. 첫 구현 작업에서 `git init`을 실행한다.
- 첫 구현 전 Node.js 버전을 확인한다. 현재 Vite 공식 문서 기준으로 Node.js `20.19+` 또는 `22.12+`가 필요하다.

## 2026-06-02 - Foundation Task 1 진행

### 계획 보완

- `src/main.tsx`에서 `styles.css`를 import할 때 TypeScript가 Vite의 CSS 모듈 선언을 읽을 수 있도록 `tsconfig.app.json`에 `types: ["vite/client"]`를 추가했다.
- 첫 구현은 `feature/foundation-slice` 브랜치의 `.worktrees/foundation-slice` 격리 worktree에서 진행한다.
- `crypto.randomUUID()`의 반환 타입이 factory의 `id` 기본 인자 타입을 UUID 템플릿 리터럴로 좁히지 않도록 `id: string`을 명시했다. 로컬 JSON import와 테스트에서는 UUID 외의 안정적인 문자열 ID도 허용한다.

## 2026-06-02 - Foundation 체크포인트 1

### 완료

- Task 1: Vite, React, Tailwind CSS, Vitest 셋업과 최소 앱 셸
- Task 2: `schemaVersion` 기반 프로젝트 JSON 타입, factory, migration 진입점
- Task 3: IndexedDB 저장소, localStorage 저장소, resilient fallback adapter
- Task 4: 사각 다이용 grid snap과 블록 경계 제한 helper

### 재개 지점

- 다음 작업은 Foundation 계획의 Task 5 `Add Project Store And CRUD Commands`다.
- 체크포인트 기준 검증 명령은 `npm test`와 `npm run build`다.

## 2026-06-02 - Foundation Task 8 진행

### 빌드 관찰

- Konva와 editor route를 runtime에 연결한 뒤 production bundle이 약 549kB로 증가해 Vite의 500kB chunk 경고가 발생한다.
- Foundation vertical slice에서는 기능 검증을 우선한다. route 단위 code splitting은 MVP 성능 점검에서 초기 로딩이 문제가 될 때 도입한다.

## 2026-06-02 - Foundation vertical slice

### 구현 완료

- 로컬 프로젝트 dashboard와 사각 다이 editor slice를 추가했다.
- IndexedDB persistence와 localStorage fallback을 추가했다.
- in-app browser에서 로그인 없는 프로젝트 생성, `CPU`와 `DreamSynth` 배치, 사각 다이 경계 clamp, 새로고침 복원, dashboard 재진입 후 reopen을 검증했다.
- 브라우저 오류·경고 로그가 비어 있는 것을 확인했다.

### 결정 및 관찰

- 첫 slice는 사각 다이로 제한한다. 원형과 육각형 constraint는 기본 drag pipeline을 검증한 뒤 Editor core 마일스톤에서 추가한다.
- 직렬화 가능한 프로젝트 JSON만 저장 representation으로 유지한다.
- 신규 블록은 현재 동일한 `(32, 32)` 위치에서 시작해 연속 추가 시 겹친다. Foundation slice에서는 의도적으로 단순하게 유지하며, preset 배치와 editor placement UX를 다룰 때 개선한다.
- Konva block과 label은 현재 별도 노드다. label drag 동기화와 선택 UX는 Editor core 마일스톤에서 함께 정리한다.

### 다음 재개 지점

- Foundation vertical slice는 완료했다.
- 다음 작업은 Milestone 0 `Reference Board And Visual Direction` 또는 Milestone 2 `Editor Core`다. Milestone 0은 Milestone 2와 병행 가능하지만 Milestone 3 visual system 이전에는 반드시 완료한다.

## 2026-06-02 - 계획 검토 반영

### 테스트 인프라 결함 수정 (Foundation 계획)

- jsdom에는 IndexedDB 전역이 없다. 첫 계획의 `projectStoreContext.tsx`가 모듈 최상단에서 `defaultRepository`를 즉시 생성하면 `openDB()`가 import 시점에 동기적으로 throw하여 `App.test.tsx`와 `projectStoreContext.test.tsx`가 깨진다.
- 수정 1: `src/test/setup.ts`에 `fake-indexeddb/auto`를 전역으로 추가한다. `setupFiles`는 테스트 모듈보다 먼저 실행되므로 import 이전에 `indexedDB` 전역이 깔린다. 기본 repository 경로를 타는 `App.test.tsx`가 이걸로 해결된다.
- 수정 2: 기본 repository는 모듈 최상단 상수가 아니라 `createDefaultRepository()`로 lazy 생성하고, `ProjectStoreProvider`에서 `repository ?? createDefaultRepository()`로 최초 1회만 만든다. 모듈 import에 IO 부작용이 없어지고, repository를 주입하는 테스트는 기본 repository를 아예 만들지 않는다.

### 레퍼런스 보드 마일스톤 추가 (로드맵)

- 스펙이 명시한 "착수 전 레퍼런스 보드" 단계가 어떤 계획에도 없었다. 비주얼 품질이 곧 제품이고 아마추어 함정의 최대 방어책이므로, 코드가 없는 Milestone 0(레퍼런스 보드 + 테마별 비주얼 방향 노트 + Hero 칩 러프 컴포지션)을 추가한다.
- Milestone 0은 Milestone 3(비주얼 시스템) 이전에 완료하며 Milestone 1·2와 병행할 수 있다. 첫 Hero 칩 수동 리뷰는 이 보드를 기준으로 한다. Requirement Coverage 표에도 행을 추가했다.

## 2026-06-02 - Editor Core 계획 작성 및 프로젝트 메모리 추가

### 진행

- 로드맵 지시("Editor Core 구현 직전에 상세 계획 작성")에 따라 `docs/superpowers/plans/2026-06-02-editor-core.md`를 작성했다. 아직 구현은 시작하지 않았다.
- 구현 관련 문서(스펙·로드맵·계획·implementation.md)를 요약한 루트 `CLAUDE.md`를 추가했다.

### Editor Core 계획 설계 결정

- **엔진(순수, TDD) / 캔버스(브라우저 검증) 2단계 분리.** Phase A(Task 1~6)는 React·Konva 없이 단위 테스트 가능한 순수 로직(geometry, blockFactory, editorStore, debounce, shortcuts, viewport)으로, "모든 에디터 커맨드는 단위 테스트" 게이트를 충족한다. Phase B(Task 7)는 Konva 캔버스·툴바·훅·라우트 배선으로 브라우저에서 검증한다.
- **`buildBlock`을 `ChipStage.tsx` → `src/domain/blockFactory.ts`로 이동**하며 zIndex를 `blocks.length`에서 `max(zIndex)+1`(`nextZIndex`)로 고친다(M1 리뷰에서 지적한 충돌 버그). store가 Konva 컴포넌트를 import하지 않도록 하기 위함이기도 하다.
- **`editorStore`(zustand/vanilla)**: 단일 선택(`selectedBlockId`), 커맨드 단위 undo/redo 히스토리(`past`/`future`, MAX_HISTORY 100). 선택(`select`)은 히스토리에 안 쌓고, 자동저장은 영속화만 하며 히스토리를 건드리지 않는다.
- **새 boundary `src/lib/`** 추가(의존성 없는 범용 유틸 — debouncer). 로드맵 파일 경계에 없던 디렉터리라 여기 기록한다.
- **die 형태 전환 시 정규화**: rect 외 형태로 바꾸면 `width=height=min(w,h)`로 정사각화하고 모든 블록을 새 die에 재clamp. 원형/육각형 경계는 보수적 radial clamp(외접원이 die 원/육각형 내접원 안에 들어가도록)이며 회전은 경계 계산에서 무시한다.
- **zoom/pan은 휘발성 view 상태**로 `ChipStage` 로컬 state에만 두고 Project JSON에 저장하지 않는다.
- 키보드 단축키: undo `Cmd/Ctrl+Z`, redo `Cmd/Ctrl+Shift+Z`, delete `Delete/Backspace`, duplicate `Cmd/Ctrl+D`, 순서변경 `]`/`[`, 선택해제 `Esc`.

### 다음 재개 지점

- `docs/superpowers/plans/2026-06-02-editor-core.md`를 Task 1부터 task 단위로 구현한다. Task별 커밋, Phase B(Task 7)·Task 8에서 브라우저 검증.

## 2026-06-02 - Editor Core 구현 완료

### 구현 (Task 1~7)

- editor store(선택, undo/redo 히스토리, add/transform/delete/duplicate/reorder/setDieShape) 추가.
- 사각/정사각/원형/육각형 die clamp와 형태 전환 시 정규화(정사각화 + 블록 재clamp) 추가.
- zoom/pan/grid(형태별 clip)/snap, Transformer 리사이즈·회전, 에디터 툴바, 키보드 단축키, debounce 자동저장 추가.
- `buildBlock`을 `src/domain/blockFactory.ts`로 이동하고 zIndex를 `max+1`로 수정(M1 충돌 버그).

### 구현 중 발견·결정

- **새 boundary `src/lib/`**: 의존성 없는 debouncer 배치.
- **테스트 인프라 수정**: 이 프로젝트는 Vitest globals를 켜지 않아 React Testing Library 자동 cleanup이 등록되지 않는다. `EditorToolbar.test.tsx`처럼 한 파일에서 여러 번 render하면 DOM이 누적돼 "multiple elements"로 실패했다. `src/test/setup.ts`에 `afterEach(cleanup)`을 등록해 전역 해결(기존 1-render 테스트들은 누적이 없어 안 걸렸던 것).
- **육각형 clip 정렬 버그(브라우저 검증에서 발견)**: `RegularPolygon`에 `rotation={-90}`을 주면 flat-top으로 렌더되는데 grid clip 경로는 pointy-top이라 grid가 육각형 밖으로 새어나왔다. Konva 기본 `RegularPolygon`(회전 없음)이 clip 경로와 동일한 꼭짓점을 만들므로 `rotation`을 제거해 정렬.
- 단일 선택만 지원(멀티 선택 후순위). 회전은 경계 계산에서 무시(미회전 AABB로 clamp). zoom/pan은 Project에 저장하지 않는 비영속 view 상태.

### 브라우저 검증 (Task 8, Chrome via Playwright) — 직접 구동 확인

- 로그인 없이 New Project → 에디터 진입, 앱 콘솔 오류 0 (favicon 404만 존재).
- 팔레트 블록 추가 시 자동 선택 + 히스토리 생성(Undo 활성, 선택 커맨드 활성).
- 4형태 die 렌더 + grid가 형태에 맞게 clip + 형태 전환 시 블록이 안쪽으로 재clamp(원형·육각형).
- 키보드 `Ctrl/Cmd+Z` undo 동작(Undo/Redo 활성 전환 + 화면이 직전 형태로 복귀로 확인).
- 새로고침 후 die 형태와 블록이 IndexedDB에서 복원(히스토리는 설계대로 초기화).
- 150블록 추가에도 콘솔 오류 0, 즉시 응답.

### 단위 테스트로 커버(브라우저 좌표 조작이 어려워 스크립트 구동은 생략)

- 블록 드래그/리사이즈/회전 시 die 경계 clamp: `editorStore.transformBlock` + `clampBlockToDie`/`clampBlockToRect`/`clampBlockToRadial`.
- delete/duplicate/bringForward/sendBackward, undo/redo 히스토리, zoom 수학(`zoomAtPointer`), 단축키 resolver, debouncer.

### 검증 결과

- `npm test`: 14개 파일 / 43개 테스트 통과. `npm run build` 통과.

### 다음 재개 지점

- Editor Core(Milestone 2) 완료. 다음은 Milestone 0(레퍼런스 보드) 또는 Milestone 3(비주얼 시스템)이며, M3 착수 전 M0를 완료해야 한다. Milestone 3 착수 직전 `docs/superpowers/plans/2026-06-02-visual-system.md`를 작성한다.

## 2026-06-03 - Milestone 0 레퍼런스 보드 완료

### 산출물

- `docs/reference/README.md`: 보드 인덱스. 스펙이 지정한 3가지 방향(실제 die-shot 색·질감·격자 / Sci-Fi 게임 UI(Destiny·Star Citizen) / 애플 키노트 슬라이드)을 정리하고, 각 방향에서 뽑아낼 특성과 그것이 매핑되는 Konva 토큰을 기록했다. 전역 anti-reference(EDA 툴 외형 금지)도 명시했다.
- `docs/reference/visual-direction.md`: 5개 테마(`neon`/`retro`/`military`/`keynote`/`mono`)별 방향 노트. 각 테마마다 hex 팔레트, 글로우·대비 의도(Konva `shadowColor`/`shadowBlur`/`shadowOpacity`/blend 토큰), 배경, 장식 성격, 명시적 anti-reference 1개를 적었다. M3 theme 카탈로그의 토큰 출처다.
- `docs/reference/hero-compositions.md`: 첫 Hero 칩 러프 컴포지션 1(primary) + 2(alternate). primary는 "AURORA C-1 — Consciousness Processor"(keynote + 네온 액센트, 정사각 다이, 단일 bloom, die-shot 메모리 밴드)이며 M3에서 가장 먼저 만들고 이 보드 기준으로 리뷰한다. alternate B(neon, 육각형)·C(military, 사각)는 테마 시스템의 폭을 증명하는 역할이자 M6 큐레이션 Hero 후보다.

### 결정 및 트레이드오프

- **이미지 바이너리 대신 텍스트 우선 보드.** 로드맵이 "보드를 `docs/reference/`에 두거나 외부 보드를 링크"하는 것을 명시 허용한다. 터미널 에이전트가 이미지를 큐레이션하기보다, 레퍼런스 출처 링크 + 정밀한 특성 서술 + 거기서 도출한 구체적 Konva 토큰(hex, shadowBlur, blend)으로 보드를 구성했다. 이미지 더미보다 M3 코드에 직접 연결되어 구현 입력으로서 가치가 높다.
- 컴포지션 좌표는 다이 크기에 무관하도록 0~1 상대값으로 적었다. 블록 타입은 스펙의 real/fantasy 팔레트에서 골랐고, 판타지 블록을 각 컴포지션의 서사 앵커로 둔다.
- 테마별 액센트 예산을 정했다(neon ≤2색/칩, keynote·mono ≤1색). 아마추어 함정(레인보우 남발)의 1차 방어다.

### Acceptance gate 충족

- 레퍼런스 보드와 방향 노트가 존재하고 본 implementation.md에 기록됨. ✅
- M3 비주얼 작업과 첫 Hero 칩은 ad hoc 취향이 아니라 이 보드(특히 컴포지션 A와 `visual-direction.md` 토큰, README의 anti-reference)를 기준으로 리뷰한다. ✅
- M0은 코드가 없는 마일스톤이라 `npm test`/`npm run build` 변화는 없다(소스 미변경).

### 다음 재개 지점

- Milestone 0 완료. 다음은 Milestone 3 비주얼 시스템이다. 착수 직전 `docs/superpowers/plans/2026-06-02-visual-system.md`를 작성하고(로드맵 지시), `visual-direction.md` 토큰으로 theme 카탈로그를, 컴포지션 A로 첫 Hero 칩을 구현한 뒤 보드 기준 수동 리뷰를 통과해야 다음 단계로 넘어간다.

## 2026-06-03 - Milestone 3 계획 작성 + Phase A 구현

### 진행

- 로드맵 지시대로 `docs/superpowers/plans/2026-06-02-visual-system.md`를 작성했다(15개 task, M2의 순수 엔진 TDD + Konva 브라우저 검증 2단계 패턴). 토큰은 `docs/reference/visual-direction.md`, Hero 칩은 `hero-compositions.md` 컴포지션 A를 출처로 한다.
- **Phase A(Task 1~8, 순수 엔진, 단위 테스트) 완료·커밋:**
  - `src/themes/themeTokens.ts`: 5개 테마 토큰 카탈로그 + `resolveTheme`.
  - `src/themes/gradients.ts`: Konva 그래디언트 prop 빌더(`flattenStops`/`linearGradientProps`/`dieFillProps` — 원형·육각형은 중심 원점 기준 보정).
  - `src/themes/resolveStyle.ts`: 테마 기반 블록·장식 스타일 리졸버(`colorOverride` 우선, 판타지 블록은 accent 글로우 강화, neonLine은 additive blend).
  - `src/features/editor/canvas/blockTexture.ts`: 메모리 계열 블록 판별 + 절차적 메모리셀 격자(이미지 에셋 미사용).
  - `src/domain/decorationFactory.ts`: `buildDecoration`(다이 중심 기본값) + `nextDecorationZIndex`.
  - `src/domain/heroChip.ts`: `createHeroChip` = 컴포지션 A(keynote, 정사각 720, 6블록, 라벨, AURORA C-1 스펙).
  - 스토어: `editorStore.setTheme`/`addDecoration`(undo 가능, 동일 테마는 no-op), `projectStore.createHero`.
- 검증: `npm test` 20파일/71테스트 통과(M3 이전 14/43), `npm run build` 성공(559kB, 기존 chunk 경고 유지 — 회귀 아님).

### 다음 재개 지점

- **Phase B(Task 9~15)부터 재개**한다. 모두 Konva 렌더링/UI 배선이라 단위 테스트가 아닌 브라우저 검증 대상이다.
  - Task 9: 툴바 테마 picker + 장식 추가 버튼(EditorToolbar/EditorPage). `EditorToolbar.test.tsx`만 DOM 테스트.
  - Task 10~12: ChipStage를 테마 토큰 기반으로 — die/grid → 블록(글로우·메모리 텍스처) → 장식 렌더.
  - Task 13: 대시보드 "Load Hero Chip" → **Hero 칩을 M0 보드(컴포지션 A) 기준으로 수동 시각 리뷰**(M3 게이트). 미달이면 토큰/렌더 보정.
  - Task 14: 최소 die PNG export smoke test(`stage.toDataURL`)로 효과가 Konva에서 렌더됨을 확인(M3 게이트). 포스터/고DPI/공유는 M5.
  - Task 15: 전체 검증 + implementation.md/CLAUDE.md에 M3 완료 기록.

## 2026-06-03 - Milestone 3 비주얼 시스템 구현 완료

### 구현 (Phase B, Task 9~14 — Konva 렌더링/UI, 브라우저 검증)

- 툴바에 5개 테마 picker + 장식 추가 버튼(Neon Line/Warning/Label) 추가, `EditorPage`에서 `setTheme`/`addDecoration` 배선. `EditorToolbar.test.tsx`에 테마/장식 DOM 테스트 추가.
- `ChipStage`를 `project.theme` 기반으로 전환: die(형태별 그래디언트 + 스트로크 + 은은한 외곽 글로우), grid(테마 색), 블록(`resolveBlockStyle`로 fill/stroke/글로우, cornerRadius), 메모리 계열 블록의 절차적 셀 텍스처, 라벨(테마 text 색).
- `DecorationNode`로 4종 장식 렌더: neonLine(additive blend `lighter` + 글로우), warningMark(삼각형+`!`), label, sciFiObject(원형 fallback).
- 대시보드 "Load Hero Chip" → `projectStore.createHero` 배선. ChipStage에 stage ref + "Export PNG" 버튼(`stage.toDataURL({pixelRatio:2})` → 다운로드, `src/features/export/exportStage.ts`).

### 구현 중 결정·관찰

- **테마 = 렌더타임 단일 소스.** `project.theme`만 바뀌면 die/grid/블록/장식/라벨이 전부 재색칠된다. 마이그레이션 불필요. `die.background`는 현재 렌더러가 소비하지 않으며 preset 배경 변형용으로 예약(M4).
- **에디터 배경은 CSS ambiance**(테마 배경 stop). die-only PNG export는 이에 의존하지 않으며(`toDataURL`은 Konva canvas만 캡처), 포스터 배경은 M5 전용 export Stage가 담당한다.
- **이미지 에셋 미사용.** 메모리 어레이 텍스처는 절차적 Konva Rect 격자로 구현(스펙의 "Konva-native 효과만" 규칙 + 바이너리 에셋 회피). `Konva.Filters` 블러는 node.cache() 필요·jsdom 미검증이라 후순위 — `shadowBlur` + additive blend로 네온 룩 달성.
- **장식 삭제 UI는 미구현(YAGNI).** 잘못 추가한 장식은 Undo로 제거. 장식 선택/드래그/텍스트 편집은 후순위.
- export 버튼은 현재 전체 Stage(960×640)를 내보내 die 우측 여백이 포함된다. die-only crop·고DPI·포스터·공유는 M5.

### 브라우저 검증 (Chrome via Playwright) — 직접 구동 확인

- 로그인 없이 대시보드 → "Load Hero Chip" → 에디터 진입. 앱 콘솔 에러 0 (favicon 404만).
- **게이트 1 (테마 일관성):** keynote→neon 전환 시 die 그래디언트·스트로크·grid·블록·라벨·장식이 전부 일관되게 재색칠. 두 테마가 완전히 다른 세계로 보임.
- **게이트 2 (Hero 칩 M0 보드 리뷰):** AURORA C-1(컴포지션 A) = brushed-graphite 정사각 die + 중앙 ConsciousnessProcessor 부드러운 violet bloom + 실블록 약한 글로우(계층) + QuantumMemory 밴드 반복셀 텍스처(die-shot 질감) + AURORA C-1 라벨. premium·절제·on-brief, EDA 외형 아님.
- **게이트 3 (export smoke test):** Export PNG로 받은 래스터에 die 그래디언트·글로우·additive 네온 라인·경고 삼각형·메모리 텍스처·라벨이 모두 포함되고 DOM/CSS 크롬은 전무 → 효과가 Konva에서 렌더됨을 확인.
- 장식 4종(neonLine additive bloom, warning 삼각형, label, sciFiObject) 렌더 + 테마 따라 색 변화 + Undo 제거 동작.

### 검증 결과

- `npm test`: 20개 파일 / 74개 테스트 통과. `npm run build` 통과(565kB, 기존 chunk 경고 유지 — 회귀 아님).

### 다음 재개 지점

- Milestone 3(비주얼 시스템) 완료. 다음은 Milestone 4 프리셋/리믹스다. 착수 직전 `docs/superpowers/plans/2026-06-02-presets-and-remixing.md`를 작성한다(로드맵 지시). M3에서 만든 `createHeroChip`·테마 토큰·`resolveBlockStyle`이 프리셋 카탈로그의 출발점이 된다. 후속 Hero 칩(컴포지션 B neon 육각, C military)도 M4/M6에서 큐레이션한다.

## 2026-06-03 - Milestone 4 프리셋/리믹스 계획 작성

### 계획

- 로드맵 지시에 따라 `docs/superpowers/plans/2026-06-02-presets-and-remixing.md`를 작성했다.
- M4는 순수 프리셋 엔진(카탈로그 metadata + blueprint materialization + store command)과 대시보드 preview card/UI 배선, 브라우저 게이트로 나눈다.
- 프리셋은 6개를 제공한다: M3에서 검토한 `AURORA C-1`, 레퍼런스 보드의 alternate인 `NEON DISTRICT N-9`와 `FIELD UNIT M-7`, 추가 방향인 `LUCID-88`, `MONOLITH I/O`, `SOLAR FLARE X`.

### 결정 및 트레이드오프

- **저장 스키마 변경 없음.** 프리셋은 새로운 편집 모드가 아니라 기존 `Project` JSON으로 materialize한다. remix 결과는 새 project/block/decoration ID를 받고 기존 editor·autosave·export 경로를 그대로 사용한다.
- **source preset 불변.** 프리셋 blueprint는 저장하지 않고 읽기 전용 소스로 취급한다. remix 수정이 source를 바꾸지 않는 것을 순수 factory 테스트와 브라우저 흐름으로 검증한다.
- **대시보드 preview는 CSS 요약 카드.** 카드마다 Konva Stage를 추가하거나 bitmap thumbnail을 관리하지 않는다. 대시보드는 빠르게 유지하고, 전체 비주얼은 Remix 직후 기존 Konva editor에서 확인한다.
- **`createHero()`는 호환성을 위해 유지.** 대시보드의 M3 임시 `Load Hero Chip` 진입점은 preset gallery로 대체한다.

### 다음 재개 지점

- `docs/superpowers/plans/2026-06-02-presets-and-remixing.md`의 Task 1 `Preset metadata catalog`부터 TDD로 구현한다.
- task 단위 커밋을 유지하고, Phase B 완료 뒤 in-app Browser에서 6개 카드, N-9/M-7 시각 차이, remix source 불변성, IndexedDB 복원을 검증한다.

## 2026-06-03 - Milestone 4 Task 1 진행

### 완료

- `src/presets/presetCatalog.ts`에 6개 프리셋의 가벼운 metadata 카탈로그를 추가했다.
- 모든 비주얼 테마(`neon`, `retro`, `military`, `keynote`, `mono`)를 최소 1개 프리셋이 대표하고, 각 카드용 name/tagline/accent/die shape/preview block 정보를 저장한다.
- `AURORA C-1`, `NEON DISTRICT N-9`, `FIELD UNIT M-7`는 후속 Hero 후보로 `featured: true`를 표시했다.

### 결정

- 이 단계는 dashboard preview와 blueprint factory가 공유할 순수 metadata만 추가한다. 저장 `Project` 스키마는 변경하지 않는다.
- 전체 블록 배치, 장식, fake spec payload는 Task 2 `presetFactory.ts`에서 분리해 materialize한다. 카드 metadata가 편집 프로젝트 payload까지 떠안지 않도록 경계를 유지한다.

### 검증

- TDD RED: `presetCatalog.test.ts`가 `./presetCatalog` 모듈 부재로 실패하는 것을 확인했다.
- TDD GREEN: 집중 테스트 1파일 / 2테스트 통과.

### 다음 재개 지점

- M4 계획의 Task 2 `Blueprint materialization into independent projects`부터 시작한다.

## 2026-06-03 - Milestone 4 Task 2~5 진행

### 완료

- `src/presets/presetFactory.ts`: 6개 catalog entry를 기존 직렬화 가능 `Project` JSON으로 materialize하는 순수 factory를 추가했다.
  - `AURORA C-1`은 M3에서 수동 검토한 `createHeroChip()` composition을 재사용한다.
  - `NEON DISTRICT N-9`, `FIELD UNIT M-7`, `LUCID-88`, `MONOLITH I/O`, `SOLAR FLARE X`는 독립 blueprint로 추가했다.
- `projectStore.remixPreset()`: 새 project ID를 발급하고 repository에 저장한 뒤 dashboard 목록 맨 앞에 넣는다.
- `PresetCard`: metadata만 사용하는 CSS summary preview를 추가했다. 카드마다 Konva Stage나 bitmap thumbnail을 만들지 않는다.
- dashboard: M3 임시 `Load Hero Chip` 버튼을 6개 preset gallery로 대체했다. `New Project` 빈 캔버스 경로는 유지한다.

### 결정 및 관찰

- remix는 source preset을 복사한 독립 `Project`다. 일반 blueprint materialization은 project/block/decoration ID와 배열을 새로 만들고, AURORA도 기존 factory가 새 nested ID를 만든다.
- `projectStore.createHero()`는 M3 호환성과 테스트를 위해 유지하지만 dashboard에서 직접 노출하지 않는다. AURORA 진입은 이제 다른 프리셋과 동일한 Remix 경로를 사용한다.
- dashboard preview는 빠른 선택 보조물이며 export-quality 렌더가 아니다. full visual은 Remix 후 기존 Konva editor에서 즉시 확인한다.
- Task 2 계획 테스트의 bounded assertion을 보정했다. `clampBlockToDie()` 계약은 전체 `Block`이 아니라 `{ x, y, w, h }` geometry projection을 반환하므로, projection끼리 비교해야 한다.
- 저장 `Project` 스키마 변경은 없다. `die.background` 값은 M5 poster export stage가 사용할 visual-intent key로 계속 예약한다.

### 검증

- Task 2 TDD RED: `presetFactory` 모듈 부재 실패 확인. GREEN: 집중 3테스트 통과.
- Task 3 TDD RED: `remixPreset` command 부재 실패 확인. GREEN: store 집중 3테스트 통과.
- Task 4 TDD RED: `PresetCard` 모듈 부재 실패 확인. GREEN: DOM 집중 1테스트 통과.
- Task 5 TDD RED: dashboard에 Remix 버튼이 없어 gallery 테스트 실패 확인. GREEN: dashboard + card 집중 3테스트 통과.
- Task 5 browser smoke: dashboard에 6개 카드와 `New Project`가 렌더되고 console error가 비어 있는 것을 확인했다. 전체 acceptance 흐름은 Task 6에서 진행한다.

### 다음 재개 지점

- M4 계획의 Task 6 `Browser verification, project memory, and milestone checkpoint`부터 시작한다.
- in-app Browser에서 6개 카드, AURORA/N-9/M-7 editor 진입, N-9 source 불변성, IndexedDB refresh 복원, console error 부재를 검증한다.

## 2026-06-03 - Milestone 4 프리셋/리믹스 구현 완료

### 구현

- 새 순수 boundary `src/presets/`를 추가했다.
  - `presetCatalog.ts`: 6개 프리셋의 dashboard metadata.
  - `presetFactory.ts`: metadata id를 기존 직렬화 가능 `Project` JSON으로 materialize하는 blueprint factory.
- 6개 프리셋:
  - Hero 후보: `aurora-c1`, `neon-district-n9`, `field-unit-m7`.
  - 추가 방향: `lucid-88`, `monolith-io`, `solar-flare-x`.
- dashboard에 가벼운 CSS summary preview 카드 6개와 Remix action을 추가했다.
- `projectStore.remixPreset()`은 새 project ID를 발급하고 repository에 독립 프로젝트로 저장한 뒤 editor route로 연결한다.

### 결정 및 트레이드오프

- **프리셋은 별도 저장 모델이 아니다.** remix 시 기존 `Project` JSON으로 materialize하여 editor, autosave, IndexedDB, export 경로를 그대로 사용한다.
- **source preset은 불변이다.** 일반 blueprint는 매 remix마다 새 project/block/decoration ID와 배열을 만들고, AURORA는 새 nested ID를 만드는 M3 `createHeroChip()`을 재사용한다.
- **저장 schema 변경 없음.** preset provenance를 `Project`에 저장하지 않는다. 편집과 export에 필요하지 않으므로 migration도 없다.
- **dashboard preview는 CSS 요약 카드.** 6개 live Konva Stage나 bitmap thumbnail 관리 비용을 피하고, Remix 직후 기존 Konva editor에서 full visual을 보여준다.
- M3 호환성을 위해 `projectStore.createHero()`는 유지하지만 dashboard의 임시 `Load Hero Chip` 버튼은 제거했다.

### 브라우저 검증 (in-app Browser)

- dashboard에 6개 preset 카드가 별도 `Remix a preset` 섹션으로 렌더되고, 카드별 theme/die shape/accent/block label이 구분되며 `New Project` 빈 캔버스 경로도 유지됨을 확인했다.
- `AURORA C-1`: `Square / Keynote`, graphite die, 중앙 ConsciousnessProcessor bloom, memory band가 보이고 기존 편집 툴바를 그대로 사용한다.
- `NEON DISTRICT N-9`: `Hexagon / Neon`, cyan·magenta routing, EmotionEngine·RealityDistortionUnit anchor가 보인다.
- N-9 remix를 `Mono`로 변경하고 autosave 후 같은 editor URL을 새로고침했다. `Hexagon / Mono`와 mono 배경이 IndexedDB에서 복원되었다.
- dashboard에서 N-9를 다시 Remix했을 때 다른 project ID로 생성되고 원본 `Hexagon / Neon` 배경으로 시작했다. source preset 불변성을 UI 흐름으로 확인했다.
- `FIELD UNIT M-7`: `Rect / Military`, wide olive gunmetal, 낮은 glow, warning mark 중심 composition으로 N-9와 명확히 다른 세계로 보인다.
- 전체 흐름 동안 browser console error는 0개였다.

### 검증 결과

- `npm test`: 23개 파일 / 81개 테스트 통과.
- `npm run build`: 통과(574kB, 기존 chunk 경고 유지).

### 다음 재개 지점

- Milestone 4 완료. 다음은 Milestone 5 `Fake Specs And Dual PNG Export`다.
- 착수 직전 `docs/superpowers/plans/2026-06-02-specs-and-export.md`를 작성한다(로드맵 지시).

## 2026-06-03 - Milestone 5 계획 작성 및 구현 전 코드 리뷰

### 계획

- 로드맵 지시에 따라 `docs/superpowers/plans/2026-06-02-specs-and-export.md`를 작성했다.
- M5는 export 기능을 바로 덧붙이지 않고, 결과물 신뢰성에 직접 영향을 주는 회귀 수정 3개를 먼저 처리한다.
  - pending autosave를 editor teardown 전에 flush한다.
  - editor Stage를 현재 다이 크기 이상으로 잡아 `720x720` 프리셋 하단 클리핑을 제거한다.
  - 블록의 shape/texture/label을 블록 단위 그룹으로 렌더하여 앞/뒤 순서가 시각 전체에 적용되게 한다.
- 이후 fake spec 예시/폼, 순수 export layout, Web Share fallback helper, die-only 전용 Stage, poster 전용 Stage, editor export panel, 브라우저 acceptance gate 순서로 진행한다.

### 확정한 출력 계약

- `die-only PNG`: 다이 논리 크기를 그대로 사용하고 `pixelRatio: 4`로 캡처한다. 예: `720x720` 다이는 `2880x2880`, `920x600` 다이는 `3680x2400`.
- `poster PNG`: 논리 크기 `1600x900`, `pixelRatio: 2`, 최종 `3200x1800`.
- 두 exporter는 화면 밖에 마운트한 별도 Konva Stage를 사용한다. editor DOM, toolbar, selection overlay, transformer, zoom/pan 상태를 캡처하지 않는다.
- poster 공유는 파일 Web Share가 가능하면 `navigator.share({ files })`를 사용하고, 불가능하면 동일 poster PNG를 다운로드한다.
- 저장 schema는 바꾸지 않는다. 기존 `Project.spec: FakeSpec`를 폼과 poster layout의 단일 소스로 사용한다.

### 코드 리뷰에서 확인한 후속 부채

- 사각·정사각 다이의 경계 제한은 회전 각도를 고려하지 않는다. 회전한 블록의 모서리가 다이 밖으로 나갈 수 있다. M5 exporter 구조와 독립적이므로 release QA 전 editor hardening으로 처리한다.
- `BlockPalette`는 v1 `BlockType` 16종 중 6종만 노출한다. 프리셋에는 더 많은 타입이 들어가지만 사용자가 빈 캔버스에서 전 타입을 추가할 수 없다. release QA 전 palette 확장으로 처리한다.
- 두 항목은 이번 계획 문서 작성 체크포인트에서 코드 수정하지 않는다.

### 다음 재개 지점

- M5 코드는 아직 시작하지 않았다.
- `docs/superpowers/plans/2026-06-02-specs-and-export.md`의 Task 1 `Flush pending autosave work before teardown`부터 TDD로 구현한다.
- task 단위 커밋을 유지하고 각 체크포인트에서 멈춘다.

## 2026-06-03 - Milestone 5 완료 (Fake Specs + Dual PNG Export)

### 구현 요약 (Task 0~11)

- **Task 0 — M0~M4 코드 리뷰 정리:** 블록 glow가 `colorOverride`를 따르도록 수정([M2]), `aurora-c1` 불변성 가드 추가([M5]), 프리셋 이름 구분자를 em-dash로 통일([M4]), 죽은 `projectStore.createHero()`와 미사용 import 제거([M1]). → M4 로그의 "createHero 유지" 결정은 여기서 철회됨. AURORA는 `remixPreset('aurora-c1')` 경로만 사용한다.
- **Task 1 — autosave flush:** `createDebouncer`에 `flush()`를 추가하고, `useAutosave` cleanup이 `cancel()` 대신 `flush()`를 호출하여 debounce 창 안에서 이탈해도 마지막 편집이 저장된다.
- **Task 2 — 동적 editor Stage 크기:** `src/features/editor/canvas/artworkLayout.ts`의 `editorStageSize()`가 Stage를 다이 크기 이상(`max(960/640, die)`)으로 잡아 `720x720` 프리셋 하단 클리핑을 제거했다.
- **Task 3 — 공유 칩 아트워크 + 블록 단위 z-order:** `ChipArtwork.tsx`로 `DieShape`/`GridLines`/`DecorationNode`/`BlockArtwork`를 추출했다. `BlockArtwork`는 shape+texture+label을 하나의 Group으로 묶어 낮은 z 블록의 텍스처/라벨이 높은 z 블록 위로 새지 않는다. editor는 `renderBlock`으로 상호작용을 주입하고 exporter는 동일 컴포넌트를 정적으로 렌더한다. M3 smoke export 버튼은 제거했다.
- **Task 4 — fake spec 예시 + 스토어 명령:** `specExamples.ts`(AURORA C-1·AEGIS M-7·ONEIRIC LUCID-88) + `editorStore.setSpec()`(features 배열 복사, undo 가능).
- **Task 5 — fake spec 폼:** `FakeSpecForm.tsx`를 editor 우측 `<aside>`에 연결. features textarea는 로컬 raw 텍스트 + resync effect를 사용해 여러 줄 입력 중 줄바꿈이 유지된다(정규화는 `onChange`에만 적용).
- **Task 6 — export 치수:** `exportLayout.ts` — `DIE_EXPORT_PIXEL_RATIO=4`, `POSTER_EXPORT`(1600x900 @2 → 3200x1800), `dieExportSize`, `posterChipPlacement`.
- **Task 7 — Web Share helper:** `exportStage.ts`에 `dataUrlToFile`/`shareFileOrDownload`/`downloadFile`을 추가. 순수 분기(`shareFileOrDownload`)만 단위 테스트하고 DOM 측은 브라우저에서 검증한다.
- **Task 8/9 — 전용 export Stage:** `DieExportStage`(다이 크기), `PosterExportStage`(키노트 합성 — 배경/브랜드/타이틀/스케일된 칩 히어로/우측 스펙시트/푸터, Konva `Text`만). 둘 다 `ChipArtwork`를 재사용한다.
- **Task 10 — export 패널:** `ExportPanel.tsx`가 두 Stage를 화면 밖(`absolute left/top -10000`, `display:none` 아님)에 마운트하고 Download Die / Download Poster / Share Poster 버튼을 제공한다. die는 `toDataURL({pixelRatio:4})`, poster는 `{pixelRatio:2}`. 파일명은 `${project.name||'chip'}-die.png` / `-poster.png`.

### 결정 및 트레이드오프

- **칩 아트워크 단일 소스.** editor와 두 exporter가 `ChipArtwork`를 공유한다. poster는 그 위에 배경/타이포만 더한다. exporter는 editor의 zoom/pan/selection/Transformer를 상속하지 않는다.
- **DOM 캡처 금지 경계.** export Stage는 화면 밖 별도 Konva Stage다. `display:none`이 아니라 음수 좌표로 마운트해 canvas가 그려진 상태를 유지한다.
- **공유 취소는 추가 다운로드로 바꾸지 않는다.** `navigator.share`와 `canShare({files})`가 모두 가능할 때만 공유하고, 아니면 동일 poster를 다운로드한다.
- **schema 변경 없음.** 기존 `FakeSpec`을 폼·poster·예시의 단일 소스로 사용한다. migration 없음.

### 브라우저 검증 (in-app Browser, Chrome)

- AURORA C-1 remix: 720x720 다이 전체가 보이고 하단 QuantumMemory 밴드 클리핑 없음. 블록 선택 시 Transformer가 그룹 노드에 부착됨(Rect→Group 재배선 정상).
- FIELD UNIT M-7: brand/features(3줄)/description 편집 → 대시보드 이동 → 재오픈 + 하드 새로고침 후 편집값 전부 유지(spec ↔ setSpec ↔ autosave ↔ IndexedDB).
- 다운로드 raster 픽셀 검증(`sips`): AURORA die `2880x2880`, M-7 die `3680x2400`, poster `3200x1800`.
- poster PNG 내용 확인: 테마 배경, 완전한 칩 아트워크, 브랜드/타이틀/시리즈/PROCESS/CORES/BANDWIDTH/feature 목록/description/푸터 포함. toolbar, 블록 팔레트, selection outline, transformer 핸들, editor border, DOM UI 없음.
- AURORA(keynote square)·N-9(neon hexagon)·M-7(military rect) poster 3종이 시각적으로 명확히 구분되고 발표 가능한 수준이다. N-9에서 RealityDistortionUnit이 자신의 magenta override 색으로 glow하여 [M2] 수정이 시각적으로 확인됨(neon hue budget = cyan+magenta).
- `navigator.share`가 없는 컨텍스트(검증 중 share/canShare를 undefined로 덮어씀)에서 Share Poster 클릭 시 poster PNG 다운로드로 graceful하게 폴백됨.
- 전 과정 browser console error 0개(favicon 404 제외).

### 검증 결과

- `npm test`: 28개 파일 / 94개 테스트 통과.
- `npm run build`: 통과(574kB, 기존 chunk 경고 유지).

### 미해결 리뷰 부채 (M6 release QA 전 처리)

- 사각·정사각 다이 경계 제한이 회전 각도를 고려하지 않음(회전 블록 모서리가 다이 밖으로 나갈 수 있음).
- `BlockPalette`가 v1 `BlockType` 16종 중 6종만 노출.

### 다음 재개 지점

- Milestone 5 완료. 다음은 Milestone 6 `Landing, QA, And Static Deployment`다.
- 착수 직전 `docs/superpowers/plans/2026-06-02-landing-and-release.md`를 작성한다(로드맵 지시).

## 2026-06-03 - Milestone 6 계획 작성

### 계획

- 로드맵 지시에 따라 `docs/superpowers/plans/2026-06-02-landing-and-release.md`를 작성했다.
- M6는 최종 MVP 마일스톤이며, 구현 완료 후 별도 post-MVP 기능을 시작하지 않는다.
- 요청에 맞춰 첫 체크포인트를 3개 task로 제한한다.
  - Task 1: M6 계획 문서 작성.
  - Task 2: M5에서 남긴 release-hardening debt 중 사각/정사각 다이의 회전 블록 경계 제한을 해결.
  - Task 3: `BlockPalette`를 v1 전체 16개 블록 타입으로 확장.
- 랜딩 페이지, 대시보드 polish, README/static deploy, 최종 Chrome QA, 코드 리뷰와 머지 판단은 다음 체크포인트로 넘긴다.

### 결정 및 트레이드오프

- M6 시작을 랜딩 UI가 아니라 release-hardening으로 잡았다. 이미 M5 로그에 "M6 release QA 전 처리"로 명시한 두 부채가 있고, 둘 다 최종 acceptance gate의 편집 신뢰성에 직접 영향을 준다.
- 저장 schema 변경은 하지 않는다. 회전 clamp는 geometry/editorStore 내부 동작 수정이고, palette 확장은 UI 노출 범위 확장이다.
- 이번 체크포인트는 3개 task 단위 검증과 커밋 후 멈춘다. 이렇게 하면 이후 코드 리뷰 전에도 작은 단위로 되돌아보기 쉽다.

## 2026-06-03 - Milestone 6 Task 2 회전 clamp 보강

### 구현

- 사각/정사각 다이의 `clampBlockToRect()`가 블록의 `rotation`을 고려하도록 수정했다.
- 회전된 블록의 로컬 네 모서리를 원점 기준으로 회전한 뒤 axis-aligned extents를 계산하고, 그 extents 전체가 다이 내부에 들어오도록 블록 origin을 clamp한다.
- 회전 extents가 다이보다 큰 경우에는 기존 크기 제한처럼 블록 크기를 비율 축소해 들어갈 수 있는 크기로 만든다.
- `editorStore.transformBlock()`은 candidate rotation을 clamp 입력에 넘긴다. 복제와 die shape 변경은 기존처럼 전체 block 객체를 넘기므로 rotation이 함께 반영된다.

### 결정 및 트레이드오프

- Konva `Group`의 회전 기준이 현재 블록 origin이므로, geometry도 동일하게 origin 기준 회전 모서리를 사용한다. center-origin 회전으로 바꾸면 Transformer/drag 동작까지 같이 바꿔야 하므로 M6 hardening 범위를 넘긴다.
- 원형/육각형 clamp는 기존의 보수적 radial half-diagonal 방식을 유지한다. 회전해도 대각선 길이는 변하지 않으므로 이번 release debt의 핵심인 rect/square 모서리 이탈만 별도로 해결했다.

## 2026-06-03 - Milestone 6 Task 3 전체 블록 팔레트 노출

### 구현

- `BlockPalette`를 v1 `BlockType` 16종 전체로 확장했다.
  - real: `CPU`, `GPU`, `DSP`, `SRAM`, `Cache`, `DAC`, `ADC`, `PLL`, `IO`, `USB`
  - fantasy: `EmotionEngine`, `DreamSynth`, `QuantumMemory`, `ConsciousnessProcessor`, `RealityDistortionUnit`, `TimeCore`
- 팔레트는 real/fantasy 섹션으로 나눴고, 기존 `addBlock(type)` 경로는 그대로 유지한다.
- 좁은 desktop-first editor sidebar에서 긴 판타지 타입명이 버튼 밖으로 넘치지 않도록 버튼 font size와 line-height를 줄이고 sidebar에 `overflow-y-auto`를 적용했다.

### 결정 및 트레이드오프

- 검색/필터 UI는 추가하지 않았다. 16개 항목은 아직 단일 sidebar에서 충분히 스캔 가능하고, M6 첫 체크포인트 범위는 release-hardening debt 해결이므로 새 interaction surface를 늘리지 않았다.
- 버튼의 accessible name은 타입 문자열 그대로 유지했다. 테스트와 store command가 동일한 `BlockType` 계약을 공유하므로 추후 palette 리팩터링 때 회귀를 잡기 쉽다.

## 2026-06-03 - Milestone 6 Task 4 랜딩 route 추가

### 구현

- `/`를 기존 dashboard 대신 `LandingPage`로 연결하고, 기존 project dashboard는 `/dashboard`로 이동했다.
- 랜딩 첫 화면에서 로그인 없이 `Start Blank`, `Start Hero Preset`, hero preset 카드별 `Start from ...`, `Open Projects (n)`를 제공한다.
- hero chip 신호는 새 asset pipeline을 만들지 않고 `PRESET_CATALOG`의 featured preset 3개(AURORA C-1, NEON DISTRICT N-9, FIELD UNIT M-7)를 CSS mini-die preview로 렌더한다.

### 결정 및 트레이드오프

- M6 랜딩은 마케팅 페이지가 아니라 즉시 시작 표면으로 설계했다. 첫 화면에서 바로 빈 프로젝트 또는 검증된 프리셋 remix로 들어갈 수 있다.
- dashboard를 `/dashboard`로 분리했지만 project store와 create/remix/open 흐름은 그대로 유지한다. 저장 schema와 repository 변경은 없다.
- 실제 Konva thumbnail을 landing에 여러 개 마운트하지 않았다. dashboard preview와 같은 이유로 첫 로딩 비용을 낮추고, 편집/출력 품질은 기존 editor/export stage에서 보장한다.

## 2026-06-03 - Milestone 6 Task 5 대시보드 polish

### 구현

- dashboard header에 `/`로 돌아가는 `Back to Lab` 링크, local project count, preset count를 추가했다.
- local project empty state를 추가하고, 빈 상태에서도 blank project 시작 흐름을 유지했다.
- preset card와 project card에 안정적인 최소 높이를 부여해 이름/태그라인 길이에 따라 버튼 위치가 흔들리지 않도록 했다.
- 기존 create/open/duplicate/delete/remix command는 유지하고, project action 버튼에는 project name을 포함한 accessible label을 추가했다.

### 결정 및 트레이드오프

- dashboard는 랜딩보다 반복 사용 화면에 가깝기 때문에 hero식 장식보다 스캔 가능한 밀도를 우선했다.
- preset preview는 계속 CSS summary card로 유지한다. M4 결정처럼 6개 Konva stage를 dashboard에 올리는 비용은 release polish 범위에서 피한다.

## 2026-06-03 - Milestone 6 Task 6 README 및 정적 배포 설정

### 구현

- `README.md`를 추가해 제품 범위, 로컬 개발, 자동 검증, desktop Chrome QA checklist, demo GIF 캡처 경로, 정적 배포 방법을 기록했다.
- Netlify용 `netlify.toml`을 추가했다. `npm run build` 후 `dist`를 publish하고, SPA route(`/dashboard`, `/editor/:projectId`)가 새로고침 시 깨지지 않도록 모든 경로를 `/index.html`로 fallback한다.
- 실제 demo GIF는 최종 Chrome QA 이후 `docs/demo/virtual-silicon-lab-demo.gif`로 캡처하도록 `docs/demo/README.md` placeholder를 추가했다.

### 결정 및 트레이드오프

- GIF를 지금 생성하지 않았다. M6의 최종 QA와 코드 리뷰 전에는 UI가 추가로 바뀔 수 있으므로, 릴리스 안정화 후 캡처하는 편이 README와 실제 제품의 불일치를 줄인다.
- Netlify 설정만 추가했다. Vercel/GitHub Pages도 가능하지만 하나의 구체적 static hosting config를 두는 것이 release handoff에 충분하고, README에 다른 호스팅에서는 unknown route를 `index.html`로 fallback해야 한다고 명시했다.
