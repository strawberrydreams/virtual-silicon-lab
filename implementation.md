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
