# Virtual Silicon Lab — Implementation Notes

명세(`virtual_silicon_lab_v1.md`)를 구현하며 내린 결정·트레이드오프·주의점의 압축 기록.
마일스톤별 상세 TDD 단계는 git 히스토리에 있다.

## 확정한 기반 결정 (2026-06-02)

- **PNG 2종.** `die-only`(다이만 고해상도) + `poster`(배경·칩·타이포·스펙 시트 합성). poster는 에디터
  DOM을 캡처하지 않고 별도 export 전용 Konva Stage에서 합성한다.
- **출력 효과 = Konva 노드 설정.** `shadowBlur`/그라디언트/필터/blend만 사용. DOM/CSS 효과는 에디터 UI
  전용이며 `toDataURL()` 결과에 의존하지 않는다.
- **블록은 다이 경계를 넘지 못한다**(이동·리사이즈 모두).
- **데이터 모델은 단일 JSON, `schemaVersion`으로 마이그레이션.** 타입은 스케치이며 구현 중 조정하되
  export 가능 구조 + 타입 안정성은 유지.
- **마일스톤 분할 구현.** 로드맵 + 마일스톤별 계획 문서, npm, worktree `feature/foundation-slice`.

## M1 Foundation (2026-06-02)

- 사각 다이 수직 슬라이스: 프로젝트 CRUD, IndexedDB+localStorage 폴백, 블록 경계 clamp, 새로고침 복원.
- 결정: 도메인은 프레임워크 무관; 저장은 `ProjectRepository` 인터페이스로 추상화; 첫 슬라이스는 사각 다이만.
- 테스트 인프라: jsdom에 IndexedDB가 없어 `src/test/setup.ts`에 `fake-indexeddb/auto` 추가, 기본 repository는
  lazy 생성(import 부작용 제거). 번들 ~549kB로 500kB 경고 → route code-split은 후순위.

## M0 Reference Board (2026-06-03, 코드 없음)

- `docs/reference/` 텍스트 우선 보드: 3방향(die-shot / Sci-Fi UI / 키노트) + 5테마 토큰 + Hero 컴포지션
  A/B/C. 이미지 바이너리 대신 출처 링크 + 특성 서술 + 구체적 Konva 토큰으로 M3 입력화. 테마 액센트 예산
  확정(neon ≤2색, keynote·mono ≤1색).

## M2 Editor Core (2026-06-02)

- 순수 엔진(zustand/vanilla `editorStore`, 단위 테스트) / Konva 캔버스(브라우저 검증) 2단계 분리.
- 4형태 die clamp + 형태 전환 시 정사각화·재clamp; undo/redo(MAX_HISTORY 100, 선택은 히스토리 제외);
  자동저장은 영속화만(히스토리 불간섭); zoom/pan은 비영속 view 상태.
- `buildBlock`을 도메인으로 이동, zIndex `max+1`(M1 충돌 버그 수정). 새 `src/lib/`(무의존 debouncer).
- 회전은 이 시점 경계 계산에서 무시(미회전 AABB) → M6에서 회전 인식으로 보강. 육각형 grid clip 정렬 버그는
  `RegularPolygon` rotation 제거로 해결(브라우저서 발견). 결과: 14파일/43테스트.

## M3 Visual System (2026-06-03)

- 순수 `src/themes/`(5테마 토큰 + 그라디언트 빌더 + 스타일 리졸버) + Konva 렌더 전환.
- 테마 = 렌더타임 단일 소스(마이그레이션 불필요); `die.background`는 preset용 예약; 메모리 텍스처는 절차적
  Konva 격자(이미지 에셋 미사용). `createHeroChip` = 컴포지션 A(AURORA C-1).
- 3 게이트 브라우저 검증: 테마 일관 재색칠 / Hero를 M0 보드 기준 리뷰 / export PNG로 효과가 Konva 렌더
  확인. 결과: 20파일/74테스트.

## M4 Presets/Remix (2026-06-03)

- 순수 `src/presets/`(metadata 카탈로그 + blueprint factory). 6 프리셋(aurora-c1, neon-district-n9,
  field-unit-m7, lucid-88, monolith-io, solar-flare-x).
- 프리셋은 별도 저장 모델이 아니라 기존 `Project` JSON으로 materialize; source 불변(매 remix 새 ID/배열);
  스키마 변경 없음. 대시보드는 CSS 요약 카드(라이브 Konva stage 회피).
- 브라우저 검증: 6카드, AURORA/N-9/M-7 진입, N-9 mono 편집 후 복원 + 새 remix는 원본 neon 시작(불변성).
  결과: 23파일/81테스트.

## M5 Fake Specs + Dual PNG Export (2026-06-03)

- Task 0: M0~M4 리뷰 정리(glow가 colorOverride 추종, aurora-c1 불변성 가드, em-dash 프리셋명, 죽은
  `createHero` 제거 — M4의 "createHero 유지" 철회).
- 신뢰성 사전작업: autosave teardown flush; editor Stage를 다이 크기 이상으로(720 프리셋 클리핑 제거);
  shape+texture+label을 블록 단위 Group으로(z-order 완결).
- 공유 `ChipArtwork`를 에디터 + 2개 오프스크린 export Stage가 사용. die-only `pixelRatio:4`; poster
  `1600x900`@2 → `3200x1800`. fake spec 폼 + 예시 3종 + undo 가능 `setSpec`. Web Share + 다운로드 폴백.
- 결정: 스키마 변경 없음(`FakeSpec` 재사용); export는 Konva 전용(에디터 DOM/zoom/pan/selection 미상속);
  공유 취소는 추가 다운로드 안 함.
- 브라우저 검증: die `2880²`/`3680×2400`, poster `3200×1800`(`sips`); poster에 에디터 컨트롤 없음;
  AURORA/N-9/M-7 distinct. 결과: 28파일/94테스트.

## M6 Landing/QA/Deploy (2026-06-03)

- release-hardening 먼저: 사각/정사각 회전 인식 clamp(회전 모서리 extents로 origin clamp, 초과 시 비율 축소;
  원형/육각은 회전 무관 radial 유지), `BlockPalette` 16종 전체 노출(real/fantasy 분리).
- 랜딩 `/`(무로그인 Start Blank / Hero Preset / Open Projects), 대시보드 `/dashboard` polish(빈 상태,
  안정적 카드 높이, CRUD 유지). README + `netlify.toml`(SPA fallback) + demo GIF placeholder.
- 최종 Chrome QA(headless CDP): 첫 블록 186ms, 새로고침 persistence, AURORA poster 3200×1800, 150블록
  smoke, 앱 콘솔 에러 0(favicon 404 제외). 최종 리뷰: release blocker 없음. 결과: 30파일/102테스트.

## 병합 전 리뷰 수정 (2026-06-03)

브랜치 전체를 3영역 리뷰어로 재검토(만장일치 "수정 후 병합", Critical 없음). 발견사항은
`docs/superpowers/plans/2026-06-03-pre-merge-review-fixes.md`. Important 4건 수정:

- **Fix 1:** `EditorRoute` 3-state — 없는 `/editor/:id`는 "Project not found" + 대시보드 링크(무한 로딩
  제거), `get()` 거부 처리. 라우팅 테스트 추가.
- **Fix 2:** `migrateProject` 구조 검증; `migrateProjects()`가 손상 레코드 skip(불량 1건이 `list()` 전체를
  무너뜨리지 않음); `resilientProjectRepository`는 primary 실패 시 세션 동안 fallback 고정 + 에러 로깅
  (스테일 읽기 방지); localStorage save quota 로깅.
- **Fix 3:** `dataUrlToFile` malformed 가드; `shareFileOrDownload`가 취소(`AbortError`)는 추가 다운로드
  안 하고 실제 실패만 폴백; `sharePoster` try/catch.
- **Fix 4:** 데코레이션은 의도적 상단 오버레이로 유지(자기들끼리만 z-정렬), `ChipArtwork` 주석 명시.

Minor 항목은 fix 플랜 백로그. 결과: 30파일/112테스트, build green.

## 현재 상태

M0~M6 MVP + 병합 전 Important 수정 완료. `npm test` 30파일/112테스트, `npm run build` green
(Konva 500kB chunk 경고만). `feature/foundation-slice`는 fast-forward로 `main`에 병합 완료되었고,
v1 MVP는 완료 상태다. 다음 작업은 v2 방향 결정 후 별도 계획으로 시작한다.

## v2 계획 확정 (2026-06-03)

- v2는 **visual major release**로 확정. 범위는 웹 페이지 전체 디자인, 에디터 디자인, output image/poster
  디자인의 전면 개선이다. `images/` 폴더의 실제 칩 press visual을 품질 기준으로 삼고, v2 완료 기준은
  10개 hero chip + poster 세트가 같은 rubric을 통과하는 것이다.
- 초기 `docs/v2-questions.md`에는 backend/SQLite/account/board를 v2에 넣는 답변이 남아 있지만, 이후
  사용자 결정으로 v2에서는 제외한다. backend, SQLite, 계정/회원 CRUD, 게시판/gallery/ranking/contest는
  v3 이후 후보로 이동.
- 유지 결정: desktop web 전용, AI 없음, true 3D 없음, current 2D/Konva visual 품질 개선, single JSON
  schema 유지. single JSON schema를 버려야 할 정도의 변경은 구현 전에 사용자 확인이 필요하다.
- 신규 문서: `virtual_silicon_lab_v2.md`(v2 제품/범위 명세)와
  `docs/superpowers/plans/2026-06-03-v2-visual-major-roadmap.md`(마일스톤 구현 계획).

## V2-M0 Visual Audit & Direction (2026-06-03, 코드 없음)

- `images/` 14개 레퍼런스를 Apple premium product / Intel architecture slide / NVIDIA·Qualcomm glow
  product / raw die shot 4개 family로 정리했다. v2의 품질 기준은 "색을 더 많이 쓰는 것"이 아니라
  제한된 accent, 명확한 조명 방향, package/die/material 분리, macro·meso·micro density hierarchy다.
- 새 기준 문서:
  `docs/reference/v2-visual-audit.md`(레퍼런스별 관찰, family 규칙, anti-pattern, quality rubric),
  `docs/reference/v2-style-direction.md`(page theme token 계약, editor layout, chip layer, poster format),
  `docs/reference/v2-hero-set.md`(10개 hero chip/poster target).
- Page theme은 project JSON의 chip `StyleTheme`과 분리한다. `laboratory`/`anime`/`space`는 app shell과
  editor chrome의 mood를 바꾸는 preference이고, 기존 `neon`/`retro`/`military`/`keynote`/`mono`는
  chip rendering theme으로 유지한다.
- M3/M4 early gate는 AURORA M5(Apple식 premium one-accent), PANTHER SCALE(Intel식 architecture
  comparison), N1 GREEN HORIZON(NVIDIA식 product lighting) 3개로 정했다. 이 셋이 실패하면 나머지
  hero set 양산 전에 material/poster system을 고쳐야 한다.

## V2-M2 Editor Chrome Redesign (2026-06-03)

- 사용자 요청으로 M1(page theme system)을 건너뛰고 M2부터 진행했다. 따라서 `laboratory`/`anime`/`space`
  전환 기능은 아직 없고, editor chrome은 `--v2-*` CSS 변수와 fallback 값으로 구성했다. M1이 들어오면
  이 변수들을 page theme token으로 연결하면 된다.
- Editor shell을 3-zone desktop tool surface로 재구성: left creation rail, center product analysis stage,
  right inspector/export rail. 접근 가능한 landmark/region label을 추가해 테스트와 QA 기준으로 고정했다.
- `ChipStage`에는 Konva canvas 주변의 analysis frame, grid/readout, horizon lighting을 DOM chrome으로 추가했다.
  export 품질은 여전히 dedicated Konva stage에서 다루므로, 이 DOM chrome은 editor 전용 시각 환경이다.
- Toolbar는 segmented tool group으로 재구성하고 `aria-pressed`를 추가했다. 기존에 factory/store가 지원하지만
  toolbar에 없던 `sciFiObject` decoration을 `Object` 버튼으로 노출했다.
- 검증: `npm test -- src/features/editor src/stores/editorStore.test.ts` 9파일/51테스트, `npm run build` green.
  in-app Browser에서 AURORA preset editor 진입, three-zone shell/Object/export button DOM 확인, Object 버튼 클릭,
  screenshot으로 rails/stage frame/inspector 배치 확인.

## V2-M1 Page Theme System & App Shell (2026-06-03, M2 이후 보강)

- 순서 착오로 M2가 먼저 구현된 뒤 M1을 같은 브랜치에 추가했다. 호환 방식은 M2 editor shell에서 이미 쓰던
  `--v2-*` CSS 변수들을 M1 `pageThemes` token의 `cssVariables`로 공급하는 구조다. 따라서 editor chrome은
  hardcoded fallback을 유지하되 App root의 `data-page-theme`와 inline CSS variables를 우선 사용한다.
- `src/visual/pageThemes.ts`: `laboratory`/`anime`/`space` page theme token 계약 추가. page theme은 app shell
  preference이고 project JSON의 chip `StyleTheme`과 분리했다. schema migration 없음.
- `src/visual/pageThemeStore.ts`: `localStorage` 기반 `vsl.pageTheme` preference와 `useSyncExternalStore` hook.
  invalid persisted value는 `laboratory`로 fallback.
- App root에 `data-page-theme`와 corner theme switcher를 추가했고, landing/dashboard/preset card는 token 기반
  v2 app surface로 재정리했다. landing에는 first-viewport chip product signal(`Hero chip preview`, `Press Image
  Lab`)을 추가했다.
- 호환성 검증: visual/editor/app tests 통과, `npm run build` green. in-app Browser에서 `/` theme switch →
  `/dashboard` theme persistence → AURORA editor 진입까지 확인했고, M2 three-zone editor shell/Object command가
  `space` theme 아래에서도 유지됨을 확인했다.

## V2-M3 Chip Material Renderer (2026-06-03)

- `src/visual/materialRecipes.ts`를 추가해 chip `StyleTheme`별 package/substrate/die/trace/micro/glow/readout
  material recipe를 순수 함수로 분리했다. page theme과 project JSON은 건드리지 않고 기존 `StyleTheme`만 입력으로
  삼는다.
- `src/visual/chipLayers.ts`를 추가해 package, die base, micro tile, block surface, trace, readout, glass glow
  레이어를 프로젝트에서 절차적으로 생성한다. 이 모델은 저장 스키마가 아니라 렌더타임 projection이므로 migration은 없다.
- `ChipArtwork`는 기존 Die/Grid/Block/Decoration 공유 구조를 유지하면서 package carrier, micro detail, trace,
  readout, glass glow overlay를 추가했다. editor/export가 같은 `ChipArtwork`를 쓰므로 poster 품질도 같은 개선을
  받는다.
- 블록 내부 micro routing line은 `blockTexture`에 추가했다. memory cell 텍스처와 별개이며, 기존 block drag/select
  경로를 변경하지 않도록 `BlockArtwork` 내부 장식으로 제한했다.
