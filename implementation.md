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
