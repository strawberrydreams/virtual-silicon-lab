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

## 2026-06-02 - 계획 검토 반영

### 테스트 인프라 결함 수정 (Foundation 계획)

- jsdom에는 IndexedDB 전역이 없다. 첫 계획의 `projectStoreContext.tsx`가 모듈 최상단에서 `defaultRepository`를 즉시 생성하면 `openDB()`가 import 시점에 동기적으로 throw하여 `App.test.tsx`와 `projectStoreContext.test.tsx`가 깨진다.
- 수정 1: `src/test/setup.ts`에 `fake-indexeddb/auto`를 전역으로 추가한다. `setupFiles`는 테스트 모듈보다 먼저 실행되므로 import 이전에 `indexedDB` 전역이 깔린다. 기본 repository 경로를 타는 `App.test.tsx`가 이걸로 해결된다.
- 수정 2: 기본 repository는 모듈 최상단 상수가 아니라 `createDefaultRepository()`로 lazy 생성하고, `ProjectStoreProvider`에서 `repository ?? createDefaultRepository()`로 최초 1회만 만든다. 모듈 import에 IO 부작용이 없어지고, repository를 주입하는 테스트는 기본 repository를 아예 만들지 않는다.

### 레퍼런스 보드 마일스톤 추가 (로드맵)

- 스펙이 명시한 "착수 전 레퍼런스 보드" 단계가 어떤 계획에도 없었다. 비주얼 품질이 곧 제품이고 아마추어 함정의 최대 방어책이므로, 코드가 없는 Milestone 0(레퍼런스 보드 + 테마별 비주얼 방향 노트 + Hero 칩 러프 컴포지션)을 추가한다.
- Milestone 0은 Milestone 3(비주얼 시스템) 이전에 완료하며 Milestone 1·2와 병행할 수 있다. 첫 Hero 칩 수동 리뷰는 이 보드를 기준으로 한다. Requirement Coverage 표에도 행을 추가했다.
