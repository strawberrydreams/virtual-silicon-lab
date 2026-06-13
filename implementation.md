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

## V2-M4 Poster Export Redesign (2026-06-03)

- `src/features/export/posterCompositions.ts`를 추가해 poster export를 `press-hero`, `architecture-slide`,
  `product-closeup` 3개 포맷으로 분리했다. 모든 포맷은 기존 `1600x900 @2`(`3200x1800`) raster 계약을 유지한다.
- `PosterExportStage`는 composition region을 기준으로 title/spec/chip/footer 배치를 계산한다. chip 렌더링은 M3의
  개선된 공유 `ChipArtwork`를 그대로 사용하므로 editor, die export, poster export 간 chip visual drift를 만들지 않는다.
- `ExportPanel`에 poster format selector를 추가했다. 다운로드/공유 파일명에는 선택 포맷을 포함해 같은 project에서
  여러 poster variant를 뽑아도 덮어쓰기 위험이 줄어든다.
- 결정: poster format은 project schema에 저장하지 않는 일시적 export UI state로 둔다. v3에서 gallery/account가 들어오면
  저장 가능한 export preset으로 승격할 수 있다.

## V2-M5 Hero Set Catalog & Random Generator (2026-06-03)

- `src/visual/heroSetCatalog.ts`에 M0 문서의 10개 v2 hero chip/poster target을 concrete preset blueprint로
  materialize했다. 각 hero는 page theme, chip theme, poster format, material intent, accent, preview blocks,
  fake spec, bounded block/decorations를 가진다.
- 기존 6개 v1/base preset은 `BASE_PRESET_CATALOG`로 유지하고, `PRESET_CATALOG`는 v2 hero 10개를 먼저 노출한 뒤
  base preset을 뒤에 붙인다. `PresetId`는 base id와 `HeroSetId`의 union이므로 기존 `aurora-c1` 등은 계속 remix 가능하다.
- `createPresetProject()`는 hero set id를 감지하면 `createHeroSetProject()`로 위임한다. project schema는 여전히
  `Project` 단일 JSON이며, hero-specific metadata(page theme/poster format/material intent)는 catalog metadata에만 있다.
- `src/visual/randomChipGenerator.ts`는 seed 기반 deterministic generator다. Dashboard의 `Random Chip` 버튼은 생성된
  local project를 즉시 저장하고 editor로 이동한다. 원형/육각 die에서는 radial clamp에 걸리지 않도록 안전 여백을 크게 잡았다.
- `docs/reference/v2-hero-set.md`의 final QA table을 pending에서 implemented로 갱신했다. 실제 pixel export fidelity는
  M3~M5 통합 브라우저 QA에서 다시 확인한다.

## V2-M6 Final QA & Release Pack (2026-06-03)

- 회귀 검증: `npm test` 39파일/146테스트 통과. `npm run build` 통과. Vite 500kB chunk warning은 기존 Konva/editor
  bundle warning으로 남아 있으며 v2 release blocker로 보지 않는다.
- Browser QA: `http://127.0.0.1:5173/`에서 landing identity, blank/overlay 없음, theme switcher
  `laboratory`/`anime`/`space`, dashboard 16 preset, `AURORA M5` remix, editor workspace/canvas/export controls,
  `Product Closeup` poster selector state, `Random Chip` 생성/진입, console error/warn 0을 확인했다.
- Export 계약: poster composition tests가 모든 format region을 `1600x900` logical canvas 안에 유지하고,
  `POSTER_EXPORT`는 `3200x1800` raster contract를 유지한다. 10개 hero set은 bounded editable `Project`로 전수
  materialize된다. Browser plugin의 canvas pixel sampling은 wrapper 한계로 직접 실행하지 못했으나, dedicated Konva
  stage DOM 및 export layout contract는 확인했다.
- 150-block smoke: `buildChipLayers` 테스트에 150-block case를 추가해 block surface/trace/micro tile 생성과 source
  immutability를 고정했다.
- 문서 release pack: README, CLAUDE.md, docs/demo/README.md를 v2 visual major 상태, hero set export 재현 절차,
  v3 deferred backlog에 맞게 갱신했다. 브랜치 병합은 아직 하지 않았다.

## V2 리뷰 수정: Hero Defaults & Die-only Export (2026-06-03)

- 코드 리뷰에서 발견한 `posterFormat/pageTheme` 런타임 미연결을 수정했다. persisted `Project` schema는 바꾸지 않고,
  v2 hero project의 `die.background`(`v2-${heroId}`)를 catalog id로 역조회하는 `resolveHeroSetForProject()`를 추가했다.
- `ExportPanel`은 hero project를 열 때 catalog의 `posterFormat`을 초기 선택값으로 사용한다. 예: `PANTHER SCALE`은
  `architecture-slide`가 자동 선택된다. project가 바뀌면 기본값도 다시 동기화한다.
- `EditorRoute`는 hero project 진입 시 catalog의 `pageTheme`을 app shell에 적용한다. 예: `N1 GREEN HORIZON`은
  `space` theme으로 자동 전환된다.
- die-only PNG 계약은 "die만 정확한 크기"로 확정했다. `ChipArtwork`에 `renderMode: 'full' | 'die-only'`를 추가하고,
  `DieExportStage`는 `die-only` 모드로 package carrier를 제외한다. poster/editor full artwork는 package layer를 유지한다.
- 검증: 관련 RED 테스트를 추가한 뒤 green 전환. 최종 `npm test` 40파일/151테스트, `npm run build` 통과.
  Browser QA에서 `PANTHER SCALE`의 `Architecture Slide` 자동 선택, `N1 GREEN HORIZON`의 `space` theme 자동 적용,
  console error/warn 0을 확인했다.

## V2 Polish QA Corrections (2026-06-06)

- `BlockBlueprint`/`DecorationBlueprint`와 `materializeDecoration()`을 `src/domain/blueprint.ts`로 분리했다.
  base preset과 v2 hero set이 같은 blueprint materialization 규칙을 공유하게 하려는 리팩터이며, 저장 스키마나
  runtime project JSON은 변경하지 않았다.
- dashboard project delete는 즉시 삭제에서 `window.confirm()` 확인 후 삭제로 바꿨다. 별도 modal system을 만들지 않고
  브라우저 기본 confirm을 사용한 이유는 release polish 범위에서는 accidental destructive action 방지가 목적이고,
  새 디자인 컴포넌트 추가보다 behavioral guard가 우선이었기 때문이다.
- hero project의 page theme 자동 적용은 project id당 1회로 제한했다. 이전 구현은 hero project가 리렌더될 때 사용자가
  직접 바꾼 page theme을 다시 hero default로 되돌릴 수 있었다. 이제 hero 진입 시 첫 fit만 적용하고, 이후 manual switch는
  유지한다.
- `product-closeup` poster composition에서 chip region과 spec column이 겹치지 않도록 chip width/spec x를 조정하고,
  wide die regression test를 추가했다. export raster 계약(`3200x1800`)과 format id 계약은 유지한다.
- v2 editor shell의 3-column grid를 `clamp()` 기반 rail + `minmax(0, 1fr)` center로 조정했다. common laptop
  width(1280~1366px)에서 inspector/export rail이 viewport 밖으로 잘리는 문제를 줄이는 trade-off로, center Konva 영역은
  내부 scroll surface가 담당하게 했다.
- trace routing은 회전된 block의 시각 중심을 사용하도록 수정했다. Konva block group이 `(x, y)` origin 기준으로
  rotation되므로 trace center도 local midpoint를 같은 rotation으로 변환해야 한다.
- random chip generator는 200 seed / 4 die shape bounds regression을 추가했다. M5에서 둔 radial safe margin이 실제로
  circle/hexagon clamp를 통과하는지 고정하기 위한 테스트다.
- `ChipArtwork` 내부 material recipe resolve 중복을 제거하고 recipe 타입을 명시했다. 시각 결과 변경 목적이 아니라
  renderer 내부 일관성과 불필요한 repeated resolve 제거가 목적이다.
- Browser QA: `http://127.0.0.1:5173/dashboard`에서 preset dashboard 로드, `PANTHER SCALE` remix → editor 진입,
  `Architecture Slide` hero default 선택, manual `Anime` page theme 전환 후 `Product Closeup` 선택 유지, 1280px/1366px
  editor 3-zone rail visibility, console error/warn 0을 확인했다. 실제 delete confirm 클릭은 browser action으로 local
  deletion flow를 여는 작업이라 QA에서는 생략했고, 취소 시 삭제하지 않는 동작은 component test로 고정했다.
- 검증: `git diff --check` clean, `npm test` 40파일/155테스트 통과, `npm run build` 통과. Vite 500kB chunk warning은
  기존 Konva/editor bundle 경고로 유지한다.

## V2 Direction Change: SoC Custom Studio 시작 (2026-06-07)

- 사용자 결정으로 v2 editor의 남은 방향을 EDA식 자유 배치 도구가 아니라 **Chip Custom Studio**로 전환한다.
  기술적으로 존재할 수 없는 칩도 만들 수 있어야 하며, tile 조립, Global reflow, sticker, spray, 디자인 기반 Fake Spec이
  기본 editor 경험이 된다.
- single JSON 원칙은 유지하지만, 구현 필요 시 `schemaVersion`을 올려 Project JSON 내부 구조를 진화시키기로 결정했다.
  이에 따라 `CURRENT_SCHEMA_VERSION`을 2로 올리고 `studio` 상태를 Project에 추가했다. legacy schema 1 project는
  migration에서 `studio` 기본값(`global-reflow`, `semi-auto`, 빈 sprays/stickers, balanced tile settings)을 채운다.
- `src/studio/globalReflow.ts`: drag-only block 이동 시 전체 die를 deterministic grid pack 방식으로 재배치하는 첫
  Global reflow engine을 추가했다. 아직 physics나 고급 packing은 아니며, 예측 가능성과 테스트 가능성을 우선한다.
- `src/studio/generatedSpec.ts`: block mix, fantasy 비율, memory area, sticker/spray 신호로 Compute/Bandwidth/Fantasy/
  Stability/Style metric과 feature text를 산출한다. 기존 FakeSpec form은 즉시 제거하지 않고 generated panel과 병행한다.
- `GeneratedSpecPanel`을 editor 우측 rail에 추가하고, left rail은 `Tiles / Stickers / Spray` Studio Kit 언어로 전환했다.
  `Sticker badge`/`Spray glow`는 undo 가능한 editor store command로 연결했으며, 새 tile 추가도 기본적으로
  Global reflow에 참여한다. 초기 sticker/spray 위치와 스타일은 아직 preset command 수준이다.
- `ChipArtwork`에 studio spray/sticker Konva layer를 추가했다. 이 컴포넌트는 editor와 die/poster export가 공유하므로,
  저장된 `studio.sprays`/`studio.stickers`는 export에도 같은 artwork path로 반영된다.
- 후속 slice에서 `selectedStudioItem`을 추가해 sticker/spray도 캔버스에서 직접 선택, drag, delete, duplicate할 수 있게 했다.
  우측 rail의 `Sticker / Spray Controls`는 선택된 sticker text/color/rotation 또는 spray color/radius/intensity를 편집한다.
  기존 `selectedBlockId`는 호환을 위해 유지하고, studio item 선택 시 block 선택을 clear하는 병행 모델을 택했다.
- `ChipArtwork`는 export 기본 렌더를 유지하면서 editor가 `renderStudioSpray`/`renderStudioSticker` hook을 주입할 수 있게
  확장했다. 이로써 editor에서는 draggable/Transformer 노드를 쓰고, export에서는 listening 없는 정적 artwork를 유지한다.
- block drag 중에는 store history를 오염시키지 않도록 `ChipStage` local preview blocks를 사용해 Global reflow 미리보기를
  보여주고, drag end에서만 기존 `transformBlock()`으로 commit한다. 고급 spring animation은 아직 아니지만, 배치가 drop
  전에도 움직이는 동적 reflow 방향으로 보강했다.
- 추가 검증: `npm test -- src/stores/editorStore.test.ts src/features/editor/BlockPalette.test.tsx src/features/editor/EditorPage.test.tsx src/features/specs/GeneratedSpecPanel.test.tsx src/features/editor/canvas/ChipArtwork.test.tsx`
  5파일/25테스트 통과. 새 tile add의 global reflow, sticker/spray add+undo, palette button wiring을 고정했다.
- 검증: `git diff --check` clean, `npm test` 44파일/165테스트 통과, `npm run build` 통과(Vite 500kB chunk warning
  유지). Browser QA에서 `/dashboard` → `AURORA M5` remix → editor 진입 후 `Tiles / Stickers / Spray`,
  `Generated Fake Spec`, Compute/Bandwidth/Fantasy/Stability/Style metrics, 기존 export controls 표시와 console
  error/warn 0을 확인했다.
- 체크포인트 재검증: `git diff --check` clean, `npm test` 44파일/169테스트 통과, `npm run build` 통과. Browser QA에서
  `/dashboard` → `AURORA M5` remix → editor 진입 후 `Sticker badge`, `Spray glow`, `DreamSynth`를 클릭했다.
  readout은 8 blocks로 갱신되고 Generated Fake Spec은 Compute/Bandwidth/Fantasy/Stability/Style `100/82/56/69/81`로
  재산출되었으며, sticker가 canvas에 표시되고 export controls가 유지되었다. console error/warn 0.
- 남은 slice 검증: RED 테스트 후 `npm test -- src/features/editor/EditorPage.test.tsx src/features/editor/StudioInspector.test.tsx src/stores/editorStore.test.ts src/features/editor/canvas/ChipArtwork.test.tsx`
  4파일/27테스트 통과, 전체 `npm test` 45파일/175테스트 통과, `npm run build` 통과. Browser QA는 별도 기록 예정.
- Browser QA: `http://127.0.0.1:5174/dashboard` → `AURORA M5` remix → editor 진입. `Sticker badge` 추가 후 text `WOW`,
  rotation `15`로 편집하고 canvas drag로 x/y `460/300 → 544/320` 갱신 확인. `Spray glow` 추가 후 radius `96`,
  intensity `0.4`로 편집하고 canvas drag로 x/y `368/240 → 448/304` 갱신 확인. `DreamSynth` 추가 후 readout `8 blocks`,
  Generated Fake Spec `100/82/52/73/74`, export controls 유지, console error/warn 0.

### SoC Studio — Tile Detail · Sticker Shapes 슬라이스 (2026-06-08) *(커밋 보류)*

- **schema v3.** `StudioSpray`에 `blend`(`screen`/`lighten`/`overlay`)를 추가하며 `CURRENT_SCHEMA_VERSION`을 3으로 올렸다.
  마이그레이션은 v1→기본 studio, v2/v3→`validateStudio` 통과 시 `cloneStudioState`로 정규화한다. `validateStudio`는
  `blend`를 요구하지 않고 `cloneStudioState`가 `blend ?? 'screen'`으로 backfill하므로, 기존 v2 프로젝트의 sticker/spray/
  tileSettings가 손실 없이 보존된다(마이그레이션 테스트로 고정).
- **`src/visual/tileDetail.ts` (pure).** semi-auto tile 설정을 렌더 노브로 사영한다: density→`microStep`(72→32)·
  `microOpacityScale`·`blockStride`, route→trace `width`/`opacity` scale, contactStyle→`contactCell`/`contactGap`.
  `chipLayers`(microTiles/traces)와 `BlockArtwork`(memory contact cells = `blockTexture.memoryCells`, micro lines =
  `blockMicroLines`)가 공유한다. `ChipArtwork`가 동일 `resolveTileDetail`로 detail을 만들어 export 정적 렌더에도 같은
  경로로 반영되므로 editor와 die/poster export가 일치한다.
- **`src/features/editor/canvas/stickerLayout.ts` (pure).** sticker kind별 고정 형태: badge=circle, mascot=star,
  warning=triangle, label=pill(텍스트 길이로 너비 산출). `ChipArtwork`의 `StudioStickerArtwork`가 form 분기로 Konva
  `Circle`/`Star`/`RegularPolygon`/`Rect`를 렌더한다. kind별 기본 text/color/rotation은 editorStore `STICKER_PRESETS`.
- **UI.** `TileSettingsPanel`(density/route 슬라이더 + Minimal/Balanced/Dense)을 우측 rail에 추가. `StudioInspector`에
  sticker kind 토글과 spray blend 토글을 추가했다.
- **editorStore.** `setTileSettings(patch)`는 density/route를 clamp01하고 단일 undo step으로 commit. `addSticker(kind?)`/
  `addSpray(color?)`로 인자화. undo coalescing 도입: 같은 `tag`(`update-sticker:<id>`, `update-spray:<id>`,
  `set-tile-settings`)의 연속 commit은 한 step으로 합치고, `select`/`undo`/`redo`에서 `resetCoalesce()`로 끊는다.
  sticker/spray duplicate의 +24 offset 로직은 `offsetStudioCopy` 헬퍼로 통합.
- **generatedSpec.** warning sticker→stability 감소, route intensity→bandwidth/style 증가, dense contact→compute 증가
  +stability 소폭 감소를 metric에 반영(모두 clampMetric 경유). 디자인 변화가 spec에 보이도록 연결.
- **globalReflow.** 다이 모양별 `packRegion`(rect/square=PADDING 사각, circle/hex=윤곽 내접 정사각)으로 packing 후,
  과밀 시 레이아웃을 균일 `scale`로 축소해 항상 경계 안에 무겹침으로 들어가게 했다(기존 bottom-row clamp 제거).
  `rotatedExtents`로 회전 블록의 AABB를 계산하고 `rotation`을 보존한다. circle/hex 테스트로 윤곽 내 유지를 고정.
- **ChipStage.** 공유 Transformer가 선택 종류에 적응: sticker=회전만, spray=리사이즈만(반지름), block=둘 다. drag 중에는
  dragged tile을 포인터에 고정하고 나머지만 global reflow preview(히스토리 미오염), drop에서만 commit.
- **검증.** `npm run build` 통과(`tsc -b` 포함, 알려진 Vite 500kB chunk warning 유지). `npm test` 48파일/203테스트 통과.
  Browser QA(`127.0.0.1:5180`, AURORA M5 remix): tile detail 최소(0/0/Minimal)↔최대(1/1/Dense)에서 배경 마이크로
  텍스처·트레이스·contact 격자가 뚜렷이 변하고 generated spec도 재산출(96/82/18/88/34 ↔ 100/100/18/82/64). die-export
  오프스크린 캔버스(1840×1200) meanLum 86.69→88.94, bright px 0.0058→0.0079로 export도 tile detail 반영 확인. sticker
  4종이 원/별/삼각형/pill로 구분 렌더, 각각 Transformer로 선택. console은 favicon 404 외 error/warn 0.
- **코드 리뷰(7-angle, 머지 차단 없음) → 경미 4건 모두 TDD로 수정 완료:**
  (1) 팔레트 "Star badge"→"**Round badge**"로 변경(badge는 circle이므로 라벨↔형태 정렬; 별은 "Mascot mark").
  (2) reflow 출력의 `rotation: block.rotation ?? 0` 방어 가드 추가(`Block.rotation`은 필수 `number`라 타입상 도달
  불가하지만, 손상된 영속 블록 대비 `fitExtents`의 기존 `?? 0`과 대칭). (3) `buildMicroTiles`에 `MAX_MICRO_TILES`(4000)
  상한 — 추정 타일 수가 초과하면 step을 키워 큰 다이 최대 density에서도 노드 폭주를 막음(일반 다이는 영향 없음).
  (4) `packRegion`의 원/육각 반지름을 `min(width,height)` 기준으로 변경(비정방형 다이도 윤곽 내 유지). 각 수정은
  RED 테스트 선작성 후 GREEN; 전체 `npm test` 48파일/203테스트 통과.

## V2 UX Polish: Tile Identity, Editor Finish Controls, Dashboard Preview, App Shell (2026-06-08)

- 사용자 요청으로 타일 식별성, editor 색상 컨트롤, 몰입 깨는 용어, dashboard local project preview,
  버튼 정렬, editor exit, header/footer를 한 번에 보강했다.
- **스키마 유지 결정:** `StyleTheme`, `BlockCategory`, `FakeSpec` 같은 내부 타입명은 기존 프로젝트 JSON,
  migration, tests, preset factory와 연결되어 있어 이번 작업에서 바꾸지 않았다. 대신 사용자 화면에 노출되는
  label을 `Cyan gradient`/`Amber solid`/`Graphite gradient` 등 단색·그라데이션 finish 언어로 바꿨다.
- **타일 디자인 차별화:** `blockTexture()` recipe를 추가해 CPU/GPU/DSP/IO/PLL/analog/speculative 계열이
  서로 다른 Konva overlay(central core, diagonal lanes, wave, edge pads, rings, ladders, pulse/bar/halo/fold/dial)를
  갖도록 했다. 기존 detail density/contact settings는 memory cell과 micro line 밀도에 계속 적용된다.
- **Dashboard preview trade-off:** Local Projects는 PresetCard와 같은 CSS mini chip preview를 재사용한다.
  실제 Konva Stage를 카드마다 렌더링하지 않아 dashboard 성능과 테스트 안정성을 유지하는 대신, 썸네일은
  축약 렌더다. editor/export의 실제 칩 렌더는 Konva `ChipArtwork`가 계속 담당한다.
- **용어 정리:** 화면 copy에서 `Fake Spec`, `Impossible Tiles`, `Fantasy` metric 등은 `Generated Spec`,
  `Speculative Tiles`, `Signal`로 교체했다. 내부 파일명/타입명은 호환성 때문에 그대로 두었다.
- **Layout:** App root에 site header/footer를 추가하고 editor에는 `/dashboard`로 가는 `Exit Editor` 링크를
  command deck에 배치했다. Header/footer 도입으로 editor rail/stage 높이는 `100vh` 대신 route area 기준
  `height: 100%` 계산을 사용한다.
- **Button alignment:** 공통 버튼, editor toolbar, project card action button에 `inline-flex` center alignment를
  적용해 텍스트가 시각적으로 가운데 오도록 했다.
- 검증: 전체 `npm test` 48파일/204테스트 green, `npm run build` green(기존 Vite 500kB chunk warning 유지).

## V2 Chip Realism + Element-Level Styling (2026-06-08)

- 사용자 요청으로 타일 선명도, 실제 SoC 주변부, header 내 theme switcher, 도형별 자유 배치 구역, 요소별 색상,
  tile custom image, CPU/memory/IO bus 표현을 한 slice로 보강했다.
- **schema v4.** `StudioState.colorSettings`를 추가하고 `Block.imageDataUrl`을 optional로 추가했다. v1/v2/v3 프로젝트는
  migration에서 v4 defaults를 backfill한다. 내부 `theme`은 여전히 material preset의 baseline으로 유지하되, 렌더 최종색은
  `colorSettings`가 우선한다.
- **요소별 색상.** `ColorSettingsPanel`에서 Background/Package/Die/Block/Tile/Bus/Label/Mark를 개별 선택하고 Solid 또는
  2-color Gradient를 설정한다. Gradient는 현재 die/package/background처럼 면이 있는 요소에 가장 크게 보이고, line/label
  계열은 첫 번째 색을 대표색으로 사용한다. 이 trade-off는 Konva line/text gradient 지원을 억지로 확대하지 않고 안정적인
  렌더를 우선한 결정이다.
- **Tile custom image.** 선택된 tile에 URL 또는 업로드 파일을 data URL로 저장할 수 있게 `BlockVisualPanel`을 추가했다.
  이미지는 block 내부 6px inset으로 렌더하고, tile texture/label은 계속 남겨 칩 UI와 조화를 유지한다.
- **Zone-aware reflow.** 기존 좌상단 단일 pack을 rect/square/circle/hex 공통 4-zone pack으로 바꿨다. target drag 위치에
  가까운 구역에 해당 tile을 유지하고, 기존 위치가 가까운 tile도 각 구역으로 나뉘어 들어간다. 완전한 floorplanner는 아니지만
  좌상단 강제 배치 문제를 제거하고 도형 내부 안전 영역 제약은 유지한다.
- **SoC realism.** `ChipArtwork` 공유 렌더 경로에 peripheral transistor/device arrays, dashed power/clock rails,
  CPU→memory/IO Manhattan bus layer를 추가했다. editor/die image/poster가 모두 같은 `ChipArtwork`를 사용하므로 export에도
  같은 실제 SoC 유사 요소가 반영된다. `images/` 레퍼런스의 raw die/기업 press visual처럼 die 내부 주변부 밀도와 bus hierarchy를
  늘리는 방향으로 맞췄다.
- **Theme switcher 위치.** L/A/S page theme 버튼은 fixed overlay에서 header 내부 우측 nav 옆으로 이동했다.
- **검증.** RED tests 후 전체 `npm test` 50파일/208테스트 green, `npm run build` green(기존 Vite 500kB chunk warning 유지).
  Browser QA(`127.0.0.1:5173`): `/dashboard`에서 Local Projects 23개가 Preset과 같은 mini chip preview를 렌더하고,
  L/A/S theme switcher가 header 내부에 있으며 화면 copy에 `Fake`/`Impossible` 단어가 노출되지 않음을 확인했다.
  `/editor/:id`에서는 `Exit Editor`, `Color / Gradient`, `Tile Visual` 패널과 Konva canvas 3개가 렌더되고, Tile gradient
  입력(`#123456`→`#abcdef`)과 custom SVG data URL 입력 후에도 console error 0, 버튼/패널 겹침 없음.

## Editor Reference Layout Plan + Checkpoint 1 (2026-06-08)

- 사용자 제공 reference image를 기준으로 editor 화면을 단계적으로 재구성하기로 했다. 계획 문서는
  `docs/superpowers/plans/2026-06-08-editor-reference-layout.md`에 저장했고, 사용자 지시에 따라 commit 단계는 제외했다.
- **Checkpoint policy.** 중요한 구간마다 멈추기 위해 4개 checkpoint로 분리했다: (1) shell structure, (2) library/toolbar
  fidelity, (3) inspector fidelity, (4) canvas chrome + visual QA. 이번 작업은 Checkpoint 1까지만 구현하고 멈춘다.
- **Checkpoint 1 scope.** store, migration, Konva renderer, export pipeline은 건드리지 않았다. `EditorPage`는 reference와
  같은 landmark 구조(`Editor top command bar`, `Editor canvas workspace`, `Editor status bar`)를 갖도록 재배치했다.
  `BlockPalette`는 `Editor mode rail` + `Library panel`로 분리하고 search/filter/custom tile affordance를 추가했다.
- **Trade-off.** mode rail button과 library filter는 이번 checkpoint에서 구조/시각 affordance만 제공한다. 실제 mode switching,
  search filtering, custom tile creation은 Checkpoint 2 이후 기능으로 남겼다. 이렇게 해야 기존 addBlock/addSticker/addSpray
  동작을 보존한 채 reference layout의 뼈대를 먼저 안정화할 수 있다.
- **검증.** RED tests로 새 landmark/search/filter 계약이 기존 구현에서 실패함을 확인한 뒤 구현했다. 이후
  `npm test -- src/features/editor/EditorPage.test.tsx src/features/editor/BlockPalette.test.tsx` 통과,
  전체 `npm test` 51파일/217테스트 통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지). commit은 만들지 않았다.

## Editor Reference Layout Checkpoint 2 (2026-06-08)

- **Library fidelity.** `BlockPalette`에 내부 `activeMode`, `filter`, `query` state를 추가했다. mode rail은 Library/Tiles/
  Decorate/Connect/Text/Layers/Settings의 active state를 유지하고, Library filter는 All/Hardware/Speculative별로 실제
  tile 목록을 필터링한다. Search는 controlled searchbox로 동작하며 `BlockType` 이름 기반 case-insensitive filtering을 한다.
- **Tile layout.** Hardware tile은 reference처럼 3열 dense card grid로 바꾸고, 긴 이름이 많은 Speculative tile은 1열 list로
  분리했다. 1280px 브라우저 QA에서 3열 speculative card가 긴 이름을 자르던 문제가 보여, speculative 전용 list CSS로 수정했다.
- **Toolbar fidelity.** `EditorToolbar`를 `Shape and finish controls` region과 `Editor operation strip` region으로 분리했다.
  operation strip에는 Select/Move/Rotate/Resize/Copy/Delete/Align/Distribute/Snap 계열 affordance를 추가했다. 기존
  store handler를 흔들지 않기 위해 Select/Move/Rotate/Resize/Align/Distribute/Snap은 이번 checkpoint에서 visual command이고,
  Copy/Duplicate/Delete/Forward/Backward/Undo/Redo/Decoration은 기존 handler에 연결했다.
- **Responsive correction.** Browser QA에서 toolbar row가 parent grid보다 넓게 계산되어 inspector 아래로 잘려 보였다. `.editor-center`
  직계 자식과 `.editor-toolbar`/`.editor-toolbar__row`에 `min-width: 0`, `width/max-width: 100%`, `box-sizing: border-box`를
  적용해 center column 안으로 강제했다.
- **검증.** RED tests 후 `npm test -- src/features/editor/BlockPalette.test.tsx src/features/editor/EditorToolbar.test.tsx`
  통과(14 tests), 전체 `npm test` 51파일/220테스트 통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지),
  `git diff --check` 통과. Browser QA(`127.0.0.1:5173/editor/:id`): mode/library/toolbar/status/canvas landmarks 렌더,
  Hardware↔Speculative filter click state 정상, canvas 3개 렌더, console error/warn 0. Browser runtime의 input `fill/type`
  경로가 virtual clipboard 오류를 냈기 때문에 검색 interaction은 unit test로 검증하고, browser에서는 필터 click을 interaction proof로 삼았다.
  commit은 만들지 않았다.

### Die-shot 리얼리즘 패스 P1–P4 (2026-06-08) *(커밋 보류)*

에디터가 "대시보드 카드"가 아니라 실제 SoC 다이 샷처럼 보이도록 `ChipArtwork` 렌더 경로를 강화했다. 레이아웃/크롬은
손대지 않았고(좌 팔레트/중앙 에디터/우 패널 유지), 모든 변경은 editor·export가 공유하는 `ChipArtwork`에만 들어가
die-only/poster export에도 동일 반영된다. 게임풍·과한 네온은 배제(텍스처 opacity 0.12–0.3, 테마 토큰 기반).

- **P1 — 블록 de-card.** `BlockArtwork`의 `cornerRadius` 6→2, 라벨을 13px → 10px 대문자·letter-spacing·opacity 0.66의
  etched 스타일로 축소, 인접 타일이 floorplan처럼 읽히도록 1px 다크 inner channel 추가. 기본 fill은 이미 dark navy
  (`#16253d`)라 유지, glow(sci-fi)도 유지. (순수 로직 없음 → 브라우저 검증)
- **P2 — 반복 패브리케이션 텍스처.** 순수 지오메트리 `blockTexture.ts`에 `standardCellRows`/`viaArray`/
  `routingChannels` 추가(RED→GREEN 단위 테스트). icon성 family를 반복 구조로 교체: compute=standard-cell rows+코어
  +H-tree, parallel=조밀한 수직 SIMD lane+희소 수평 rail, signal=파형 뒤 routing channel, memory=SRAM cell array.
  각 패턴은 **단일 `sceneFunc` Konva `Shape`**(한 번의 canvas fill/stroke)로 렌더해 밀도를 올려도 노드 폭주가 없고
  `toDataURL` export에 그대로 래스터된다(`MAX_MICRO_TILES` 정신 유지).
- **P3 — seal ring + fiducial.** `SealRingLayer`를 `DieShape` 직후에 삽입. 다이 모양별(rect/circle/hex)로 윤곽 안쪽에
  inset 이중 링 + rect는 코너 fiducial 십자. circle 다이(LUCID-88)에서 동심 링으로 렌더 확인. 기존 `SoCPeripheryLayer`
  (bond pad·rail)가 이미 edge 구조를 주므로 substrate 추가 조밀화는 클러터 회피 위해 보류.
- **P4 — Manhattan 버스 번들.** 순수 `busRouting.ts`의 `busBundle`(중심 정렬된 N개 평행 L-라우트 + elbow via,
  RED→GREEN 테스트). `BusInterconnectLayer`를 단일 대각선 → 평행 와이어 번들로 교체: memory bus=5와이어 굵게,
  io=2와이어 얇게, via는 작은 사각으로 표시. `LinePattern`은 polyline(꺾임)도 그리도록 일반화(2점 세그먼트 하위호환).
  버스 색은 `colors.trace`(우측 rail의 "Bus" 라벨).
- **검증.** 슬라이스마다 `npm test`+`npm run build` green; 최종 51파일/217테스트, build green(기존 500kB chunk warning).
  Browser QA: AURORA M5(rect)에서 CPU=cell rows, GPU=woven lanes, CACHE=SRAM array, CPU→CACHE memory bus가 평행
  번들로 보이고, LUCID-88(circle)에서 seal ring 동심 링 확인. console은 favicon 404 외 error/warn 0. 신규 순수 모듈/
  헬퍼는 TDD, Konva 렌더는 브라우저 검증(규약 준수).

## Editor Reference Layout Checkpoints 3-4 (2026-06-09)

- **Checkpoint 3 / inspector fidelity.** 오른쪽 rail을 `EditorInspectorRail`로 분리하고 reference 순서에 맞춰
  `Generated Spec` → `Selected Tile` → `Appearance` → `Layer Visibility` → advanced controls로 재구성했다. 기존
  color/gradient, tile image, generated spec form, export controls는 제거하지 않고 compact/advanced section 안에 유지했다.
- **Selected Tile.** `SelectedTilePanel`을 추가해 no-selection 상태와 selected block metrics(Type/Size/Utilization/Power)를
  표시한다. utilization/power는 현재 project state에서 즉시 계산하는 UI metric이며 저장 schema는 바꾸지 않았다.
- **Appearance grouping.** `TileSettingsPanel`, `ColorSettingsPanel`, `BlockVisualPanel`은 `Appearance` section 안으로
  묶었다. reference처럼 우측 상단은 분석/선택 정보를 먼저 보여 주고, 편집 도구는 그 아래에서 계속 접근 가능하게 한 결정이다.
- **Checkpoint 4 / canvas chrome.** `ChipStage`의 기존 Konva renderer와 transform handlers는 유지하고, Stage 바깥 DOM에
  coordinate gutters(A-P, 01-16), zoom controls, canvas status readouts(Autosaved/Grid/Snap/DRC/XY)를 추가했다.
  Zoom buttons는 editor view state(`scale`, `position`)만 조정하며 project JSON에는 저장하지 않는다.
- **Narrow viewport trade-off.** editor는 v2부터 desktop tool surface로 설계되어 있어 390px viewport에서는 1024px 작업면을
  가로 스크롤로 유지한다. Browser QA에서는 주요 landmark와 새 canvas chrome이 유지되고 console error/warn이 없는지 확인했다.
  reference 수준의 모바일 재배치는 별도 responsive redesign 범위로 남긴다.
- **검증.** RED→GREEN으로 `EditorPage.test.tsx`와 신규 `ChipStage.test.tsx`를 추가/갱신했다. 최종
  `npm test` 52파일/222테스트 통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지). Browser QA:
  `/dashboard`에서 `N1 GREEN HORIZON` remix로 `/editor/:id` 진입, inspector 순서/selected tile metrics/zoom 100→110%/
  coordinate workspace/status readouts 확인, desktop 및 390x844 viewport console error/warn 0. 사용자 지시대로 commit은
  만들지 않았다.

## Editor Reference Layout Review Fixes (2026-06-09)

- 코드 리뷰에서 찾은 P2 3건을 수정했다. (1) `SelectedTilePanel`은 `editor-inspector-card`를 공유하고, selected 상태 JSX를
  `.selected-tile-panel__info/name/category/metric/mini` 구조로 맞춰 CSS와 DOM이 어긋나지 않게 했다. 패널 레이아웃
  class 계약은 `SelectedTilePanel.test.tsx`로 고정했다.
- (2) stage/editor status에서 고정 시간(`12:41:33`)과 샘플 좌표(`345.2µm`, `678.9µm`)를 제거했다. 사용자가 stage 위치
  좌표와 pointer 좌표 모두 불필요하다고 확인했기 때문에 canvas status는 `VIEW`, `GRID`, `SNAP`, `DRC`만 표시한다.
  zoom 후 `VIEW 110%`로 갱신되는 regression test를 추가했다.
- (3) 레이어 가시성은 `ChipLayerVisibility` UI state로 구현했다. `LayerVisibilityPanel` 버튼이 `EditorPage` state를
  토글하고, `ChipStage`가 이를 `ChipArtwork`에 전달한다. `M1/M2/M3/M4/M5/Label`은 각각 micro/grid, trace/bus,
  blocks, decorations/studio items, substrate/periphery/glow, text labels/readouts에 대응한다. 저장 schema는 바꾸지 않았다.
- false affordance를 줄이기 위해 아직 연결되지 않은 `Add custom tile`, `Simulate`, Move/Rotate/Resize/Align/Distribute/Snap은
  disabled 처리했다. 실제 tile image customization은 기존 `BlockVisualPanel`로 유지한다.
- 검증: RED tests 추가 후 targeted 6파일/23테스트 통과, 전체 `npm test` 53파일/226테스트 통과, `npm run build` 통과
  (기존 Vite 500kB chunk warning 유지). Browser QA(`127.0.0.1:5174/editor/:id`): fixed timestamp/coordinate 문자열 없음,
  Add custom tile/Simulate disabled, M2 layer toggle `aria-pressed` true→false, console error/warn 0.

## Editor Reference Layout Review & Cleanup (2026-06-09)

- 현재 구현 전체를 코드 리뷰하고, 발견한 정리 항목과 사용자 결정 1건을 반영했다.
- **Render 코드 정리(P3).** (1) `BlockImageOverlay`의 image load 이펙트를 `addEventListener`/`removeEventListener` +
  cancelled 플래그로 교체해 stale 이미지·unmount 후 setState 가능성을 제거했다. (2) `DecorationNode`의 `neonLine`
  분기에서 항상 참이던 죽은 삼항식을 제거하고 `traceColor` 지역 변수로 단순화했다. (3) 렌더링에서 쓰지 않던
  `viaArray` export와 `BlockTexture.accent`/`TextureAccent`를 제거하고, 테스트는 `family`만 검증하도록 갱신했다.
  (4) `BlockArtwork`의 중복 `shouldShowLabel`을 제거했다.
- **Theme finish 라벨 단일화.** theme→라벨 맵이 EditorPage/MiniChipPreview/EditorToolbar 3곳에 중복돼 있어
  `src/visual/themeFinish.ts`(`THEME_FINISH_LABELS` + `chipFinishLabel`) 한 곳으로 통합하고 세 곳이 모두 이를 참조하도록
  바꿨다. dashboard/preset/command bar/toolbar 라벨 문자열이 더는 갈라지지 않는다.
- **WYSIWYG export(사용자 결정).** 레이어 가시성 토글이 PNG 익스포트에도 반영되도록 `layerVisibility`를
  `EditorInspectorRail` → `ExportPanel` → `DieExportStage`/`PosterExportStage` → `ChipArtwork`까지 전달했다.
  에디터와 익스포트가 `ChipArtwork`를 공유한다는 불변식을 레이어 토글까지 확장한 것이며, `layerVisibility`는 여전히
  비영속 UI state다(prop 미전달 시 `DEFAULT_LAYER_VISIBILITY`로 전체 표시).
- **검증.** `npm test` 53파일/225테스트 통과(`viaArray` 테스트 1건 제거로 226→225), `npm run build` 통과(기존 Vite
  500kB chunk warning 유지). Browser QA(`127.0.0.1:5173/editor/:id`, AURORA M5): 3-zone 레이아웃과 command bar의
  `Graphite gradient`/toolbar finish 라벨이 단일화 후에도 정상, console은 favicon 404 외 error/warn 0. Die PNG
  3680×2400, Poster 3200×1800으로 export contract 유지. WYSIWYG는 단일 변수(Layer 토글)로 검증: die PNG가
  all-on 2,198,596B → Label-off 2,141,671B로 달라져 토글이 익스포트 픽셀에 반영됨을 확인했다.

## Editor Fidelity W3+W1 — Cyan Blueprint Palette + Dense Floorplan (2026-06-09)

- 레퍼런스 이미지 픽셀 근접화 이니셔티브의 첫 청크(W3+W1)를 구현했다. 설계는
  `docs/superpowers/specs/2026-06-09-editor-reference-fidelity-design.md`, 플랜은
  `docs/superpowers/plans/2026-06-09-editor-fidelity-w3-w1-palette-density.md`. 셸 구조는 이미
  reference-layout에서 맞췄으므로 이번 작업은 칩 그림 밀도/팔레트 격차만 좁힌다.
- **W3 시안 블루프린트 팔레트.** `neon` 테마 토큰을 마젠타/퍼플 신스웨이브에서 정돈된 시안 블루프린트로
  재튜닝했다(background `#070d1c→#03050c`, dieFill `#0c1a30→#070f1d`, dieStroke `#2dd4ee`, gridColor `#123a57`,
  accents `['#22d3ee','#34d399','#fbbf24']` = 시안/그린/앰버). 마젠타 accent는 제거. `blockStroke.fantasy`는 유지.
  이는 neon 테마 칩 전체에 적용되는 의도된 전역 변경이다.
- **W3 fillerCell 레시피 토큰.** `ChipMaterialRecipe`에 `fillerCell{fill,stroke,accentColors,opacity}`를 추가하고
  테마 토큰에서 파생(`fill=dieFill[1]`, `stroke=gridColor`, `accentColors=accents`)하도록 했다. W1 필러 렌더러가 소비한다.
- **W1 밀집 플로어플랜.** 새 순수 모듈 `src/studio/floorplan.ts`의 `buildFillerCells(project)`가 다이의 빈 영역을
  결정적 절차적 매크로 셀(logic/sram/io)로 채운다. 빈 다이도 꽉 차 보이게 하는 일반 역량이며, **블록+다이에서 파생되는
  비영속 투영**이라 `schemaVersion` 변경/마이그레이션이 없다. `usableDieRegion`은 globalReflow의 packRegion 로직을 미러링해
  circle/hex 다이에서도 필러가 밖으로 나가지 않는다. 노드 수는 `MAX_FILLER_CELLS=600`으로 상한, 밀도는 detailDensity로
  셀 크기(120→64px)를 조절한다.
- **W1 렌더링.** `chipLayers.buildChipLayers`가 `fillerCells`를 모델에 포함하고, 공유 `ChipArtwork`에 M1-게이트 `FillerLayer`를
  GridLines 직후(실 블록/트레이스 아래)에 렌더한다. 기존 `CellPattern`/`memoryCells`/`standardCellRows`를 재사용한다. 공유
  컴포넌트라 die-only/poster 익스포트에 자동으로 동일 반영된다(Konva 프로브로 3개 스테이지 모두 `chip-layer-filler` 확인).
- **검증.** `npm test` 54파일/235테스트 통과(신규: themeTokens 2, materialRecipes 1, floorplan 6, chipLayers 1). `npm run build`
  통과(기존 Vite 500kB chunk warning 유지). Browser QA(`127.0.0.1:5179/editor/:id`): N1 GREEN HORIZON(square cyan) 다이가
  빈 영역에 시안/앰버 필러 매크로 셀로 채워지고 팔레트가 시안-온-네이비 블루프린트로 정돈됨, 실 블록 가독성 유지, console
  error/warn 0. 중앙부 wall-to-wall 밀도는 후속 W6(레퍼런스 프리셋)+W2(타일 내부 디테일) 몫이다.
- 사용자 지시대로 commit은 만들지 않았다. 다음은 W2(타일 내부 디테일 + 버스 라우팅).

## Editor Fidelity W2+W6 — Tile Labels + Bus Mesh + N1 Reference Floorplan (2026-06-09)

- 레퍼런스 픽셀 근접화 이니셔티브의 두 번째 청크(W2+W6). 플랜은
  `docs/superpowers/plans/2026-06-09-editor-fidelity-w2-w6-tiles-routing-preset.md`.
- **W2 2줄 타일 라벨.** `busBundle`이 이미 Manhattan(L자)이라 라우팅 자체는 재구현 불필요였고, 대신 (1) 순수
  `splitTileLabel(label,type)`(`artworkLayout.ts`)을 추가해 `\n` 구분 라벨을 대문자 title+sub로 분리하고, (2) `BlockArtwork`가
  title(10px) + sub(8px, 흐림) 2줄을 렌더하도록 했다. **스키마 변경 없음** — 기존 optional `Block.label`에 `\n`을 넣는 방식.
  `SelectedTilePanel`은 한 줄로 표시되며 HTML이 `\n`을 공백으로 접어 "GPU CLUSTER 12-CORE"로 보인다(2줄 분리는 W4 몫).
- **W2 버스 메시 확장.** 순수 `routedBusPairs(blocks)`(`busRouting.ts`)가 각 memory/io 타일을 가장 가까운 compute 타일에
  연결하는 쌍 목록을 만든다(별 하나 → 읽히는 메시). `BusInterconnectLayer`를 단일 source 방식에서 이 쌍 목록 소비로 재작성.
  memory는 굵은 5선 번들, io는 얇은 2선. N1에서 6쌍/12노드 렌더 확인.
- **W6 N1 GREEN HORIZON 레퍼런스 플로어플랜.** hero set의 N1을 5블록에서 이미지의 12블록 SoC 배치로 교체(3열×4행:
  CPU CLUSTER / NPU / GPU CLUSTER → MEMORY CTRL / L3 CACHE / ISP → PCIe 4.0 / DSP AUDIO / DISPLAY CTRL →
  MODEM / SECURITY ENCLAVE / I/O COMPLEX). `BlockType`에 없는 이름(NPU/ISP/MODEM/MEMORY CTRL 등)은 **타입=텍스처 family,
  이름=label** 로 매핑(NPU→ConsciousnessProcessor 보라, SECURITY ENCLAVE→RealityDistortionUnit 보라, ISP→DSP signal,
  MODEM→DAC analog, MEMORY CTRL→SRAM memory, DISPLAY CTRL→USB io). `real`/`fantasy` 헬퍼에 optional `label` 추가
  (다른 hero set은 무영향). 모든 블록은 760 다이의 28..732 안에 있어 기존 `clampBlockToDie` hero-bounds 테스트를 만족.
- **검증.** `npm test` 54파일/241테스트 통과(신규: artworkLayout 3, busRouting 2, heroSetCatalog 1). `npm run build` 통과
  (기존 Vite 500kB chunk warning 유지). Browser QA(`127.0.0.1:5179/editor/:id`, 신규 N1 리믹스): 12개 명명 블록이 3×4로
  다이를 꽉 채움, NPU·SECURITY ENCLAVE가 시안 필드 위 보라로 구분, 2줄 라벨(8-CORE/AI ENGINE/12-CORE/LPDDR5X/16MB/
  4K120/5G NR) 렌더, compute→memory/io 시안 직교 라우팅, W1 필러가 잔여 틈을 채움, console error/warn 0. 라벨/라우팅/블록은
  공유 `ChipArtwork` 경유라 die-only/poster 익스포트에 자동 반영.
- 사용자 지시대로 commit은 만들지 않았다. 다음은 W4(인스펙터 6지표·파워 스파크라인·선택 타일 상세) + W5(크롬 마감).

## Editor Fidelity W4+W5 — Inspector Metrics + Chrome Icons (2026-06-09)

- 레퍼런스 픽셀 근접화 이니셔티브의 세 번째 청크(W4+W5). 플랜은
  `docs/superpowers/plans/2026-06-09-editor-fidelity-w4-w5-inspector-chrome.md`.
- **W4 generated spec.** `generateStudioSpec`를 6개 지표(`compute`, `bandwidth`, `efficiency`, `stability`,
  `thermals`, `complexity`)와 `powerWatts`, 24-point deterministic `powerSeries`, `health`로 확장했다. 전부 현재
  project/block/studio state에서 파생되는 값이라 저장 schema 변경은 없다. 이전 `fantasy`/`style` 지표 참조는 제거했다.
- **W4 inspector panel.** `GeneratedSpecPanel`은 health badge, 6개 progress bar, power estimate value, SVG sparkline을
  렌더한다. `SelectedTilePanel`은 W2의 `splitTileLabel`을 재사용해 `GPU CLUSTER`/`12-CORE` 같은 2줄 이름을 HTML
  패널에서도 title/subname으로 보여 준다.
- **W5 chrome icons.** 새 `src/features/editor/icons.tsx`에 shared inline-SVG glyph를 추가하고, library tile buttons,
  primary tool buttons, command bar 버튼(undo/redo/simulate)에 연결했다. 타일 glyph는 `BlockType`의 texture family에
  맞춰 CPU/GPU/SRAM/IO 등 서로 다른 실루엣을 사용한다.
- **Trade-off.** command bar의 export 버튼과 우측 rail의 일부 advanced controls는 기존 interaction contract를 유지했다.
  이번 청크는 reference의 시각적 밀도와 정보 구조를 맞추는 범위였고, 아직 연결되지 않은 기능 버튼은 이전 cleanup에서
  disabled 처리한 상태를 유지한다.
- **Health 산식 보정.** 리뷰 중 N1 레퍼런스 플로어플랜이 정상적인 고밀도 SoC임에도 `Critical`로 판정되는 문제를 발견했다.
  고밀도 자체보다 스프레이/경고/비정상 장식이 안정성에 더 큰 영향을 주도록 산식을 조정하고,
  `n1-green-horizon`이 `Healthy` 분석 band에 남는 regression test를 추가했다.
- **검증.** `npm test` 55파일/243테스트 통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지),
  `rg -n "metrics\\.fantasy|metrics\\.style" src` 무결성 확인(no matches). Browser QA(`127.0.0.1:5174`에서
  N1 GREEN HORIZON remix): 6개 지표(`100/100/79/86/66/75`), `Healthy` badge, power sparkline, library tile glyph
  16개, tool icon 6개, command icon 3개 렌더 확인, `Fake`/`Impossible` 같은 몰입 깨는 단어 없음, console error/warn 0.
- 사용자 지시대로 commit은 만들지 않았다.

## Editor Convenience UI Fixes — Panel Scroll, Mode Rail, Text Fit, SoC Detail (2026-06-09)

- **좌우 편집 메뉴 스크롤.** editor shell을 viewport 안에 고정하고(`height: calc(100vh - 96px)`, `overflow: hidden`),
  좌측 creation rail과 우측 inspector rail만 `overflow-y: auto` + `overscroll-behavior: contain`으로 스크롤되게 정리했다.
  Browser QA 기준 body/html scrollHeight는 clientHeight와 같고, left/right rail만 내부 scrollHeight가 더 크다.
- **좌측 mode rail 동작화.** `LB/TL/DC/CN/TX/LY/ST`를 죽은 버튼이 아닌 mode 전환으로 만들었다. `Library`는 전체,
  `Tiles`는 tile library, `Decorate`는 sticker/spray, `Connect`는 `addDecoration('neonLine')`, `Text`는
  `addDecoration('label')` 작업을 제공한다. `Layers`/`Settings`는 우측 inspector의 해당 조정 위치를 안내하는
  mode panel을 보여 준다. 저장 schema 변경은 없다.
- **텍스트 라벨 overflow 보정.** 브라우저에서 `button`, topbar readout, segmented controls, selected-tile metric에 대해
  `scrollWidth > clientWidth` / `scrollHeight > clientHeight`를 측정했다. topbar readout은 최소 폭과 wrapping을 조정했고,
  color target/contact style segmented buttons는 rail 폭에 맞게 2열/작은 tracking으로 보정했다. 타일 카드 라벨은
  `SRAM`, `Cache` 같은 짧은 이름이 글자 단위로 깨지지 않도록 tile-label 전용 nowrap/ellipsis 규칙을 분리했다.
- **SoC 도면 디테일.** `buildChipLayers`에 비영속 `fabricDetails`(edge pad arrays, dashed power rails, via clusters)를
  추가하고 `ChipArtwork`에 `chip-layer-fabric-detail`로 렌더했다. 기존 `fillerCells`, Manhattan bus, layer visibility를
  유지하면서 실제 SoC 도면 느낌을 강화하는 파생 projection이다.
- **검증.** RED→GREEN: `BlockPalette.test.tsx`가 mode별 콘텐츠/작업을 검증하고, `chipLayers.test.ts`가
  `padArray`/`powerRail`/`viaCluster` 파생 detail을 검증한다. 최종 `npm test` 55파일/245테스트 통과, `npm run build`
  통과(기존 Vite 500kB chunk warning 유지), `git diff --check` 통과. Browser QA(`127.0.0.1:5173`, N1 editor,
  1280×720): body/html 전체 스크롤 없음, left/right rail 내부 스크롤, mode rail 전환 및 CN/TX 액션 확인, overflow 요소
  0건, console error/warn 0. 스크린샷은 `/tmp/editor-convenience-final.png`.
- 사용자 지시대로 commit은 만들지 않았다.

## Editor Realistic SoC Spec Estimates (2026-06-09)

- **범위.** v2 마지막 변경사항으로 우측 `Generated Spec` 패널에 현실적인 실리콘 추정 섹션을 추가했다. 전체 UI와 다이
  블루프린트는 더 건드리지 않고, 기존 0-100 분석 지표 아래에 `Silicon estimate`만 확장했다.
- **실측 앵커.** 하한은 8086급 x86(수만 트랜지스터, 1MB 주소 공간, MHz 단위 클럭, HMOS/마이크론급 공정)으로,
  상한은 N1X/Grace-Blackwell-class AI SoC(수십B 트랜지스터, 4-5nm급, 수백 GB/s 메모리 대역폭, AI TOPS/TFLOPS급)
  로 잡았다. N1X는 2026-06-09 기준 공개 확정 스펙이 아니라 보도·루머 기반이므로 UI에서는 `N1X-class AI SoC`
  로 표시하고 정확한 제품 데이터가 아닌 class estimate로 취급한다. NVIDIA GB10/DGX Spark의 `1 PFLOP FP4`,
  `273 GB/s`는 상한 감각을 맞추는 보조 앵커로 사용했다.
- **산식.** `generateStudioSpec(project)`가 기존 저장 schema를 변경하지 않고 `silicon` projection을 파생한다.
  `compute/gpu/memory/io` 타일 수, block density, route intensity, contact style, detail density, speculative tile 비율을
  하나의 era score로 합성하고, 트랜지스터 수/메모리 대역폭/다이 면적은 선형 보간이 아니라 로그 보간으로 계산한다.
  그래서 8086→modern 격차처럼 지수적으로 벌어지는 값은 자연스럽게 커지고, 작은 배치 변경은 제한적인 수치 변화로 남는다.
- **표시값.** 패널은 class, process node, transistor count, die area, CPU core count, CUDA-style GPU core estimate,
  AI TOPS, memory bandwidth, peak clock, power estimate를 보여 준다. N1 GREEN HORIZON 브라우저 검증 기준 값은
  `N1X-class AI SoC`, `4 nm`, `55B`, `250 mm²`, `20 cores`, `6,656 CUDA`, `1,029 TOPS`, `313 GB/s`, `4.1 GHz`,
  `62.7 W`다. 단일 CPU 타일만 둔 sparse 배치는 `8086-class x86`, 마이크론급 node, 1 core, GPU 0, sub-GB/s bandwidth,
  AI 0으로 떨어지는 regression test를 추가했다.
- **UI trade-off.** 긴 class label이 우측 패널 폭에서 잘리지 않도록 값 텍스트만 줄바꿈 가능하게 두고, 라벨은 기존
  uppercase one-line 스타일을 유지했다. Spec 텍스트는 수치 중심이라 기존 사이버네틱 톤의 분석 바와 병행해도 과장된
  마케팅 문구처럼 보이지 않도록 했다.
- **검증.** RED→GREEN: `generatedSpec.test.ts`에 sparse 8086-class와 N1X-class 상한 테스트를 추가하고,
  `GeneratedSpecPanel.test.tsx`가 `Silicon estimate`/Node/Transistors/Memory BW/Power 단위를 검증한다. 최종
  `npm test` 55파일/246테스트 통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지), `git diff --check`
  통과. Browser QA(`127.0.0.1:5173`, N1 editor): 우측 Spec 값 렌더, 버튼/Spec 텍스트 overflow 0건, console error/warn 0.
  스크린샷은 `/tmp/editor-realistic-spec-final.png`.
- 사용자 지시대로 commit은 만들지 않았다.

## Editor Component-Level Spec Estimates (2026-06-10)

- **범위.** CPU 외 부품도 각자 다른 단위의 스펙을 보여 달라는 요청을 반영했다. 전체 SoC의 `Silicon estimate`는 유지하되,
  선택된 타일 패널에 `Component spec` 블록을 추가해 GPU/RAM/IO/DSP/PLL/ADC/DAC 등이 타입별 산식으로 다른 row를 렌더한다.
- **제품명성 class wording 제거.** UI에 특정 제품 또는 시대가 직접 연상되는 class label이 노출되지 않도록
  `N1X-class AI SoC`, `Pentium-class CPU`, `8086-class x86` 계열 문구를 `High-density AI profile`,
  `Scalar compute profile`, `Legacy logic profile` 같은 일반 profile 문구로 교체했다. 패널 row label도 `Class`에서
  `Profile`로 바꿨다. 소스 UI 문자열에서 `N1X|Pentium|8086|Grace|Blackwell`은 테스트의 금지어 matcher에만 남는다.
- **부품별 산식.** 새 순수 모듈 `src/studio/componentSpec.ts`의 `deriveComponentSpec(block, project)`가 저장 schema 변경 없이
  현재 block/project/tileSettings에서 스펙을 파생한다. GPU/AI류는 shaders, FP32 TFLOPS, AI TOPS, local BW를 계산하고,
  SRAM/Cache/RAM류는 capacity, local BW, latency, ports를 계산한다. IO/USB류는 protocol, lanes, throughput, PHY power,
  DSP는 SIMD lanes/GMAC/s, PLL은 range/domains/jitter/lock, ADC/DAC는 resolution/sample rate/ENOB/power를 사용한다.
- **UI trade-off.** `Component spec`은 선택 타일 패널 전체 폭을 쓰도록 grid-column span 처리했다. 처음에는 mini preview 옆
  좁은 컬럼 내부에 들어가 `Capacity`/`Local BW` 같은 라벨 overflow가 발생했으나, 브라우저 검증 후 전체 폭으로 이동해
  overflow를 제거했다. 기존 기본 metric(Type/Size/Utilization/Power) 4행 계약은 유지했다.
- **검증.** RED→GREEN: `componentSpec.test.ts`를 추가해 GPU/SRAM/USB 타입별 단위와 금지어 부재를 검증하고,
  `SelectedTilePanel.test.tsx`가 GPU/SRAM component spec 렌더를 고정한다. `generatedSpec.test.ts`와
  `GeneratedSpecPanel.test.tsx`는 제품명성 class wording 제거를 검증하도록 갱신했다. 최종 `npm test` 56파일/252테스트
  통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지). Browser QA(`127.0.0.1:5173`, N1 editor): GPU 추가 시
  `Parallel compute` rows(`Shaders`, `FP32`, `AI`, `Local BW`), SRAM 추가 시 `Memory macro` rows(`Capacity`, `Local BW`,
  `Latency`, `Ports`) 표시, 금지어 0건, component/spec/button overflow 0건, console error/warn 0. 스크린샷은
  `/tmp/editor-component-spec-visible.png`.
- 사용자 지시대로 commit은 만들지 않았다.

## Studio Analysis Microcopy and Input Guard Cleanup (2026-06-10)

- **Health 기준 명시/보정.** `Studio Analysis` health는 `stability`와 `thermals` 중심으로 판정한다. 현재 기준은
  `stability < 45` 또는 `thermals > 86`이면 `Critical`, `stability < 64` 또는 `thermals > 74`이면 `Watch`, 그 외는
  `Healthy`다. 다만 빈 다이가 높은 기본 stability 때문에 `Healthy`로 보이는 것은 의미상 맞지 않아 `blockCount === 0`이면
  `Watch`로 별도 처리하고 `No active tile layout` feature를 표시하도록 했다.
- **Spec Sheet 코어 입력 guard.** Advanced `Spec Sheet`의 `Cores` number input에 `min=0`을 추가하고,
  입력값을 `Math.max(0, Math.floor(value))`로 정규화한다. 붙여넣기나 programmatic change로 `-12`가 들어와도 저장되는
  spec은 `cores: 0`이다.
- **GPU 단위 중립화.** `Silicon estimate`의 GPU row에서 특정 기업 API/플랫폼을 연상시키는 `CUDA` 단위를 제거하고
  `shader cores`로 교체했다. 이 변경은 현재 UI에 보이는 GPU 총량 표시에만 해당하며, component-level GPU spec의
  `Shaders` row는 기존처럼 일반 `cores` 단위를 유지한다.
- **검증.** RED→GREEN: 빈 다이 health/feature, Spec Sheet 음수 core clamp, `GeneratedSpecPanel`의 `CUDA` 미노출 테스트를
  추가했다. 최종 `npm test` 58파일/267테스트 통과, `npm run build` 통과(기존 Vite 500kB chunk warning 유지). Browser QA:
  새 프로젝트는 `Watch` + `No active tile layout`, N1 remix의 GPU row는 `6,656 shader cores`, Advanced `Cores`에 `-12`
  입력 시 실제 value는 `0`, console error/warn 0.
- 사용자 지시대로 commit은 만들지 않았다.

## V3-M0 워크스페이스/서버 골격 (2026-06-12)

- **범위/구조.** npm workspaces로 전환했다(루트는 클라이언트 앱을 그대로 유지, `server/` 워크스페이스 추가).
  클라이언트 vitest는 `server/**`를 exclude 해 서로의 스위트를 침범하지 않는다.
- **스택 확정.** Hono + @hono/node-server v2 + better-sqlite3, ORM 없음, tsx dev 런타임, tsc는 typecheck 전용(noEmit).
  TS6에서 `baseUrl`이 TS5101 하드 에러라 `paths`만 사용한다.
- **domain 공유.** 코드 이동 없이 `@domain/*` alias(tsconfig paths + vitest alias)로 `src/domain/`을 재사용한다.
  `/api/health`가 `CURRENT_SCHEMA_VERSION`을 반환해 배선을 런타임에서 증명하고, `migrateProject(unknown)`를 M2 publish
  업로드 검증 진입점으로 고정했다(스모크 테스트).
- **마이그레이션 러너.** `schema_migrations` 북키핑, 이미 적용된 분 skip, 마이그레이션당 단일 트랜잭션(롤백 보장),
  중복 id 사전 거부. 트랜잭션 내 `PRAGMA foreign_keys`가 no-op이라는 SQLite 제약을 주석으로 명시했다. production
  마이그레이션 목록은 M0에서 의도적으로 비웠다(M1에서 `001_users` 추가).
- **검증.** 클라이언트 58파일/267테스트 + 서버 4파일/11테스트, `npm run build` green(기존 chunk warning 유지),
  서버 typecheck clean. `npm run dev:server` + curl로 `{"ok":true,"projectSchemaVersion":4}` 응답 및
  `server/data/vsl.sqlite` 생성 확인(데이터 디렉토리는 gitignore).

## V3-M1 계정 (2026-06-13)

- **세션 모델.** JWT 없이 서버 세션을 확정했다. 32바이트 `base64url` 랜덤 토큰을 발급하고 DB에는
  `sha256(token)`만 저장하며, 쿠키는 Hono signed cookie(`vsl_session`, HttpOnly, SameSite=Lax,
  `VSL_SESSION_SECRET` HMAC 서명)로 raw 토큰을 운반한다. TTL 30일 고정 만료, 만료 행은 조회 시 lazy 삭제.
  로그아웃/탈퇴/비밀번호 변경 시 세션 무효화가 단순한 DELETE로 끝난다(스펙이 JWT를 배제한 이유 그대로).
- **비밀번호.** `@node-rs/argon2`(prebuilt N-API)로 argon2id, OWASP 기준(m=19456KiB, t=2, p=1).
  패키지의 const enum `Algorithm`이 ambient라 `isolatedModules`에서 사용 불가 → 숫자 상수로 대체하고
  해시 접두사(`$argon2id$`) 테스트로 알고리즘을 고정했다.
- **스키마/API.** `001_accounts` 마이그레이션(users UNIQUE email + sessions FK ON DELETE CASCADE).
  엔드포인트: `POST /api/auth/signup·login·logout`, `GET/PATCH/DELETE /api/me`. 비밀번호 변경은
  `currentPassword` 필수 + 본인 외 전 세션 무효화, 탈퇴는 비밀번호 재확인 후 FK cascade.
  에러 계약을 `{ error: { code, message } }`로 고정했다(코드: INVALID_INPUT, EMAIL_TAKEN,
  INVALID_CREDENTIALS, UNAUTHORIZED, WRONG_PASSWORD) — 이후 v3 엔드포인트 공통.
- **클라이언트.** Vite dev proxy(`/api` → 8787)로 dev에서도 same-origin 쿠키(CORS 불필요).
  `authStore`(vanilla Zustand)는 `unknown|offline|anonymous|authenticated` 4상태로, 서버 부재를
  에러가 아닌 `offline` 정상 상태로 취급한다. `/account` 라우트(로그인/가입/프로필 관리)와 헤더
  계정 링크(로그인 시 displayName 표시)를 추가했고, 패널은 `--v2-*` 페이지 테마 변수만 사용한다.
- **브라우저 게이트에서 잡은 버그.** 백엔드가 죽으면 프록시(Vite dev proxy, 프로덕션 nginx)가 fetch를
  실패시키지 않고 **502/503/504 응답**을 돌려줘 offline 판정이 누락됐다. `authApi`가 게이트웨이 상태
  코드를 `ServerUnreachableError`로 매핑하도록 수정(RED→GREEN 테스트 포함).
- **검증.** 클라이언트 62파일/296테스트 + 서버 12파일/54테스트, build green(기존 chunk warning),
  서버 typecheck clean. curl 스모크(가입 201 → `/api/me` → 로그아웃 204 + 쿠키 삭제). Browser QA:
  서버 다운 시 offline 패널 + 대시보드/로컬 편집 무회귀, 가입→이름 변경→비밀번호 변경→로그아웃→새
  비밀번호 로그인→탈퇴→재로그인 401 에러 표시까지 전 플로우, 3개 페이지 테마 모두 정상 렌더.
- rate limit, Secure 쿠키 플래그, 프로덕션 secret 강제는 계획대로 V3-M6(보안 기본기)로 미뤘다.

## V3-M2 Publish 파이프라인 (2026-06-13)

- **서버 스키마/API.** `002_published_chips` 마이그레이션을 추가했다. published record는 계정(`owner_user_id`)에
  귀속되고 로컬 `source_project_id`와 1:1이다. 재퍼블리시는 같은 row를 갱신하며 `version`만 증가하고, slug는 최초
  publish 때 생성된 값을 유지한다. 엔드포인트: `POST /api/published-chips`, `GET/PATCH/DELETE
  /api/published-chips/source/:sourceProjectId`.
- **검증 경계.** 업로드 snapshot은 M0에서 고정한 shared domain `migrateProject(unknown)`로만 통과시킨다.
  `title`(1~120자), `isPublic` boolean, die/poster PNG data URL shape를 서버에서 검증하고 실패는 M1의
  `{ error: { code, message } }` 계약(`INVALID_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`)으로 반환한다.
- **클라이언트.** `publishApi`는 auth API와 같은 502/503/504 gateway mapping을 사용해 share server 부재를
  `ServerUnreachableError`로 다룬다. `PublishPanel`을 editor inspector/export rail에 추가했고, 기존 hidden
  `DieExportStage`/`PosterExportStage`의 `toDataURL()` 결과를 snapshot 업로드에 사용한다. 로그인 전/서버 offline
  상태에서는 local editing unaffected 메시지만 보여준다.
- **트레이드오프.** 원래 v3 설계의 "PNG는 디스크 파일 저장, DB는 metadata" 운영 형태는 M6 배포 패키징/업로드 제한
  작업으로 미뤘다. M2에서는 API와 UX flow를 빨리 고정하기 위해 PNG data URL을 SQLite TEXT로 저장한다. public gallery/share
  link가 붙는 M3/M4는 `dieImageUrl`/`posterImageUrl` 응답 필드만 의존하게 해, M6에서 파일 URL로 바꿔도 client view
  계약 변경을 최소화한다.
- **검증.** RED→GREEN: publish migration/validation/service/routes, publish API, publish panel tests를 추가했다.
  targeted server suite 16파일/74테스트, targeted client publish/editor suite 4파일/17테스트 통과.

## V3-M3 공개 갤러리 (2026-06-13)

- **서버 공개 조회.** M2의 `published_chips` 테이블을 재사용하고, unauthenticated read-only API
  `GET /api/gallery`, `GET /api/gallery/:slug`를 추가했다. 목록/상세 모두 `is_public = 1`만 반환하며,
  private/unpublished/missing slug는 같은 404(`NOT_FOUND`)로 처리한다. 목록은 `updated_at DESC` 최신순이고
  owner display name + poster URL을 포함한다.
- **상세 데이터 계약.** detail 응답은 poster/die image URL과 함께 published snapshot의 `project` JSON을 반환한다.
  클라이언트 상세 페이지는 이 snapshot의 fake spec(`brand`, `series`, `process`, `cores`, `bandwidth`, `features`,
  `description`)을 표시한다. 서버는 여전히 snapshot을 변형하지 않는다.
- **클라이언트 갤러리.** `galleryApi`는 M1/M2와 같은 502/503/504 gateway mapping을 사용한다. `/gallery`는 public
  poster grid, `/gallery/:slug`는 poster-first detail + spec sheet로 구현했다. App header에 `Gallery` 링크를 추가했고,
  detail에서 hero-set project가 감지되면 기존 v2 page theme을 적용한다.
- **범위 제한.** M3는 “볼 수 있는 공개 갤러리”까지만 구현한다. 로그인 없는 공유 viewer `/s/:slug`와 OG 메타 이미지는
  M4, 갤러리/공유 링크에서 로컬 프로젝트로 가져오는 remix import는 M5 범위로 유지한다. M2의 data URL 저장
  trade-off도 그대로 소비하며, 파일 기반 이미지 저장 전환은 M6에서 처리한다.
- **검증.** RED→GREEN: gallery server routes, gallery API, GalleryPage, GalleryDetailPage, App routing tests를 추가했다.
  targeted server gallery 1파일/3테스트, targeted client gallery/app 4파일/20테스트 통과.
