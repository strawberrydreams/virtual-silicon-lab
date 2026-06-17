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

## V3-M4 공유 링크 (2026-06-13)

- **서버 공유 뷰어.** JSON API 경계와 HTML 렌더링을 섞지 않으려고 신규 `server/src/share/` 모듈로 분리했다
  (`baseUrl`/`poster`/`viewer`/`routes`). `GET /s/:slug`는 M3의 공개 전용 `getPublicPublishedChipBySlug`를
  재사용해 공개 칩이면 OG/Twitter 메타가 들어간 독립 HTML 200, 비공개/없음/언퍼블리시는 noindex 404 HTML을
  반환한다. `GET /s/:slug/poster.png`는 저장된 poster data URL을 디코딩해 `image/png` 바이트로 서빙하며
  (`Cache-Control: public, max-age=300`), 이 절대 URL이 `og:image`/`twitter:image`가 된다. 서버는 여전히
  snapshot을 변형하지 않는다.
- **절대 URL / 보안.** `resolvePublicBaseUrl(requestUrl, configuredBase?)`는 `VSL_PUBLIC_BASE_URL` env 우선,
  없으면 요청 origin에서 유도한다(프로덕션 도메인 확정은 M6). 서버 렌더 HTML의 모든 사용자 입력(title, spec 필드,
  ownerDisplayName)과 메타 속성 값은 `escapeHtml`로 이스케이프해 HTML/속성 주입을 차단한다. 미리보기 카드의 핵심
  비주얼은 포스터 PNG(3200×1800)가 담당하고, 뷰어 본문은 v2 톤 인라인 CSS로 어설프지 않게 담았다.
- **클라이언트.** publish API 직렬화에 서버 권위의 `shareUrl`(공개면 `${base}/s/${slug}`, 비공개면 `null`)을
  추가하고 `publishApi`의 `PublishedChip` 타입에 반영했다. `PublishPanel`은 공개 퍼블리시 상태일 때만 share URL +
  Copy Link 버튼을 노출하고, 클립보드 복사 실패 시 수동 복사 안내로 폴백한다. 비공개/오프라인/로그인 전에는 미표시.
- **범위 제한.** M4는 공개 칩 공유 링크까지만 구현한다. 비공개 언리스트 공유/share token, 갤러리 상세의 복사 버튼은
  비범위다. remix 가져오기는 M5, 파일 기반 이미지 저장·업로드 크기 제한·rate limit·Secure 쿠키·프로덕션
  `VSL_PUBLIC_BASE_URL` 확정은 M6에서 처리한다. M2의 data URL 저장 trade-off도 그대로 소비한다.
- **검증.** RED→GREEN: share base-url/poster/viewer 단위 테스트, share 라우트 통합 테스트, publish API의 공개 전용
  shareUrl 테스트, publishApi/PublishPanel 클라이언트 테스트를 추가했다. 전체 `npm test` 클라이언트 67파일/325테스트,
  서버 19파일/91테스트 통과, `npm run build`는 기존 Vite 청크 경고만 남기고 green.
- **브라우저 QA.** 임시 SQLite + `VSL_PUBLIC_BASE_URL`로 서버를 띄우고 `<`·`>`·`"`가 든 제목으로 공개 칩을
  퍼블리시해 확인: `shareUrl`이 설정 base 기준 절대 URL로 반환되고, `/s/:slug`는 200 `text/html`로 og:title/
  og:image(절대)/twitter:card 메타와 함께 렌더되며 제목/스펙이 모두 이스케이프(`&lt;C-1&gt; &quot;Hero&quot;`)된다.
  `/s/:slug/poster.png`는 `image/png` + `Cache-Control`로 실제 PNG 바이트를 서빙한다. 없는 slug는 viewer/poster 모두
  404, PATCH로 비공개 전환하면 `shareUrl`이 null이 되고 `/s/:slug`는 noindex "Chip not found" 404가 된다. 뷰어 비주얼은
  포스터-퍼스트 다크/시안 레이아웃으로 어설프지 않게 렌더됨을 스크린샷으로 확인했다.

## V3-M5 리믹스 가져오기 (2026-06-13)

- **서버 변경 없음.** M3 갤러리 상세 API(`GET /api/gallery/:slug`)가 이미 published snapshot의 `project` JSON을
  반환하므로 import는 새 서버 엔드포인트 없이 클라이언트에서 완결된다. M4 공유 뷰어의 "Remix this chip"
  플레이스홀더만 실제 `/gallery/:slug` 링크로 교체했다(공유 링크 → SPA 갤러리 상세 → 거기서 리믹스, 단일 경로).
- **도메인 순수 import.** `src/domain/remixImport.ts`의 `importRemixedProject(snapshot, id, now)`는
  `migrateProject(snapshot)`로 구버전 스냅샷을 현재 스키마로 마이그레이트한 뒤(스펙: 가져오기 시점 마이그레이션)
  `structuredClone`으로 깊게 복제하고 새 `id`/`{name} Remix`/`createdAt·updatedAt = now`를 부여한다. 입력 스냅샷은
  변형하지 않으며, Project에는 서버 연결 식별자가 없어 새 id만으로 publish 독립성이 확보된다. **스키마 변경 없음**
  (schemaVersion bump 없음). provenance/lineage는 v4 범위라 저장하지 않는다 — preset remix와 동일 철학.
- **스토어/클라이언트.** `projectStore.remixImport`는 `remixPreset`와 동형(저장 + 목록 맨 앞 추가). 갤러리 상세
  페이지에 "Remix into my projects" 버튼을 추가하고(칩 로드 상태에서만 표시), App의 `GalleryDetailRoute`가
  `remixImport` 호출 + `/editor/:id` 네비게이션을 주입한다(`ProjectDashboard`의 remix 동선과 동일). import는 순수
  로컬 동작이라 로그인 불필요.
- **검증.** RED→GREEN: 도메인 import(마이그레이트/독립 복제/이름/throw), 스토어 remixImport, GalleryDetailPage 버튼,
  App end-to-end(갤러리→리믹스→에디터), 서버 viewer CTA 링크 테스트를 추가했다. 전체 `npm test` 클라이언트
  68파일/333테스트, 서버 19파일/91테스트 통과, `npm run build`는 기존 Vite 청크 경고만 남기고 green.
- **브라우저 QA.** 임시 서버 + Vite(`/api` 프록시)로 공개 칩을 퍼블리시한 뒤 `/gallery/:slug`에서 "Remix into my
  projects" 클릭 → `/editor/<새 uuid>`로 새 로컬 프로젝트가 열리고, 전체 새로고침한 대시보드에 "Nebula N-7 Remix"
  (rect / Cyan gradient, 독립 로컬 프로젝트)가 첫 번째로 유지됨을 확인했다. 공유 뷰어 `/s/:slug`의 "Remix this chip"
  링크가 `/gallery/:slug`로 향함도 확인.

## V3-M6 배포 하드닝 1차 (2026-06-13)

- **범위.** M6 전체(배포 패키징 + 파일 기반 PNG 저장 + 최종 회귀 QA) 중 먼저 서버 운영 안전장치를 구현했다.
  계획 파일은 `docs/superpowers/plans/2026-06-13-v3-m6-deploy-packaging-qa.md`로 추가했고, 파일 기반 이미지 저장은
  DB shape/share poster/galleries에 영향이 커서 별도 M6 체크포인트로 분리했다. 따라서 이 항목은 M6 완료가 아니라
  하드닝 1차 완료 기록이다.
- **런타임 설정.** `server/src/config.ts`의 `loadRuntimeConfig`가 `NODE_ENV=production`에서
  `VSL_SESSION_SECRET`(32자 이상)과 http(s) `VSL_PUBLIC_BASE_URL`을 필수화한다. 개발 모드에서는 기존 local-friendly
  insecure fallback secret을 유지하되 `usedInsecureDevelopmentSecret`으로 `index.ts`가 명시 경고를 출력하게 했다.
  production config는 `secureCookies: true`, 기본 rate limit `120 req / 60s`, PNG decoded byte limit 8 MiB를 제공한다.
- **쿠키/Rate limit.** `createApp`에 `secureCookies`, `uploadMaxBytes`, `rateLimit` 옵션을 추가했다. signed
  `vsl_session` 쿠키는 옵션이 true일 때만 `Secure`를 붙여 dev/test http 환경을 깨지 않는다. `server/src/rateLimit.ts`는
  in-memory fixed-window limiter이고, mutating `/api/*`(`POST`/`PATCH`/`DELETE`)에만 적용한다. key는 IP +
  method + path라 public gallery/share read path는 제한하지 않는다. 초과 시 `429 RATE_LIMITED`와 `Retry-After`를 반환한다.
- **업로드 제한.** `validatePublishInput`이 die/poster PNG data URL의 decoded byte size를 계산해 기본 8 MiB(테스트/런타임
  override 가능)를 넘으면 기존 `INVALID_INPUT` 경로로 거절한다. 아직 저장 방식은 SQLite TEXT data URL 그대로이며,
  파일 기반 저장 전환은 다음 M6 체크포인트에서 처리한다.
- **검증.** RED→GREEN: runtime config, secure cookie, upload size validation, mutating API rate-limit route tests를
  추가했다. targeted server suite `npm run test --workspace server -- config rateLimitRoutes authSignup publishValidation`
  통과(4파일/17테스트). 추가로 `npm run typecheck --workspace server`, 전체 `npm test`(클라이언트 68파일/333테스트,
  서버 21파일/98테스트), `npm run build`가 통과했다. build는 기존 대형 chunk 경고만 남는다.

## V3-M6 배포 패키징/QA 완료 (2026-06-13)

- **파일 기반 PNG 저장.** `003_published_chip_image_paths` migration으로 `die_image_path`/`poster_image_path`
  nullable 컬럼을 추가했다. 새 publish는 `server/src/images/fileImageStore.ts`가 `VSL_UPLOAD_DIR`(기본
  `${VSL_DATA_DIR}/uploads`) 아래 `published/<chipId>/v<version>-die|poster.png`로 PNG를 저장하고, 기존
  `die_image_data_url`/`poster_image_data_url` 컬럼에는 빈 문자열만 남긴다. API 계약은 유지한다:
  `dieImageUrl`/`posterImageUrl`은 data URL legacy row면 기존 값을, file-backed row면 `VSL_PUBLIC_BASE_URL`
  또는 요청 origin 기준 절대 `/uploads/...` URL을 반환한다.
- **Dual-read/serving.** 기존 data URL row는 그대로 읽히며, file-backed row는 `/uploads/*` 정적 route와
  `/s/:slug/poster.png`에서 `imageStore.readPublishedImage(path)`로 읽는다. `/s/:slug/poster.png` URL 자체는
  유지해 OG/Twitter 메타와 기존 share viewer 계약을 바꾸지 않았다. unpublish는 해당 chip upload directory를 best-effort로
  삭제한다.
- **배포 문서/스크립트.** 루트 scripts에 `test:server`, `typecheck:server`, `start:server`, `verify:deploy`를 추가했고,
  server workspace에는 watch 없는 `start`를 추가했다. README에 production 필수 env(`NODE_ENV=production`,
  32자 이상 `VSL_SESSION_SECRET`, http(s) `VSL_PUBLIC_BASE_URL`), 선택 env(`VSL_DATA_DIR`, `VSL_UPLOAD_DIR`,
  upload/rate limit), local production smoke 명령을 기록했다.
- **최종 QA.** 임시 DB/업로드 디렉터리로 서버+Vite를 띄워 브라우저에서 signup → hero preset editor → publish
  snapshot → make public → gallery detail → remix import → 새 editor route → local field edit를 확인했다.
  publish 후 SQLite row는 legacy data URL 컬럼이 빈 문자열이고 path 컬럼이 `/uploads/published/.../v1-*.png`였으며,
  파일은 실제 업로드 디렉터리에 생성됐다. 갤러리 poster는 backend 절대 `/uploads/...` URL을 사용했고, 공유 viewer는
  `/s/:slug/poster.png`를 유지했다. 해당 poster endpoint는 `image/png`, 1,386,441 bytes, 3200×1800 PNG로 확인.
  브라우저 console warn/error 0.

## V3 전체 코드 리뷰 후속 수정 (2026-06-14)

- **재발행 시 orphan 이미지 정리.** `fileImageStore`는 `published/<chipId>/v<version>-...png`처럼 버전 stamped
  파일을 쓰는데, 재발행은 DB path 컬럼만 새 버전으로 옮기고 이전 버전 파일은 디스크에 영원히 남겨 매 재발행마다
  PNG 2개가 누수됐다(immutable cache용 버전 파일명 패턴 자체는 올바르므로 유지). `upsertPublishedChip`이
  file image store + 기존 row가 있을 때 새 파일을 쓰기 직전 `deletePublishedImages(id)`로 이전 버전 파일을
  먼저 비우도록 수정했다. 첫 발행은 디렉터리가 없어 무영향(`rmSync` force no-op). 회귀 테스트는
  `publishService.test.ts`에 재발행 후 v1 파일이 사라지고 v2 파일만 남는지로 추가했다.
- **검토했으나 미수정(배포-준비 단계 허용 trade-off).** rate limiter `buckets` Map은 idle eviction이 없으나 키가
  (ip,method,path)당 1개라 요청당 증가가 아니고 신뢰 프록시 뒤 배포 전제이므로 유지. `x-forwarded-for`를 그대로
  신뢰하는 것도 동일 전제(공개 런칭 전, 프록시 뒤 배포)로 유지. slug는 `randomUUID` 8자 suffix가 붙어 `UNIQUE`
  충돌이 사실상 불가능함을 확인했다.

## V4-M0 모더레이션 기본기 + 접근 게이트 (2026-06-14)

스펙: `docs/superpowers/specs/2026-06-14-v4-m0-moderation-access-gate-design.md` ·
플랜: `docs/superpowers/plans/2026-06-14-v4-m0-moderation-access-gate.md`. v4 "Community"의 첫 마일스톤으로,
v3 서버 위에 공개 오픈 전 안전장치를 얹었다. 브레인스토밍에서 확정한 4개 결정(접근 게이트=가입 잠금 플래그,
관리자 롤=env 이메일, 신고 인프라+관리자 도구는 M0·유저 신고 버튼은 M1, 유저 ban은 범위 밖)을 그대로 구현했다.

- **접근 게이트(`VSL_SIGNUPS_OPEN`).** config 레이어 기본값을 **`false`**(비공개 베타가 안전한 기본)로 두고,
  `createApp`의 dep 기본값은 `true`로 유지해 기존 서버 테스트가 깨지지 않게 했다(rateLimit이 config-on/createApp-off인
  기존 패턴과 동일). 닫힘이면 `POST /api/auth/signup`이 `403 { code: "SIGNUPS_CLOSED" }`로 거절하고, 로그인·퍼블리시·
  갤러리·공유는 무영향. `/api/health`가 `signupsOpen`을 노출해 클라이언트가 가입 폼을 게이팅한다(서버가 신뢰 경계라
  UI 숨김과 무관하게 서버도 차단). 에러 코드는 코드베이스 컨벤션(UPPER_SNAKE)에 맞춰 `signups_closed`→`SIGNUPS_CLOSED`로
  통일했다(코드 리뷰 지적 반영).
- **관리자 롤(`VSL_ADMIN_EMAILS`).** 콤마 구분 이메일을 trim·lowercase 정규화해 파싱하고, 로그인 세션 유저의 이메일이
  목록에 있으면 admin. DB 스키마 변경 없이 런타임 파생(`isAdminEmail` 순수 헬퍼, `server/src/moderation/adminAuth.ts`).
  `GET /api/me`가 `isAdmin`을 반환한다.
- **데이터 모델(`004_moderation`).** `published_chips`에 `moderation_status`(기본 `visible`)·`hidden_at`·`hidden_by`·
  `hidden_reason`을 추가하고, `reports` 테이블(`published_chip_id` FK CASCADE, `reporter_user_id`/`resolved_by` FK SET NULL,
  `status` CHECK open/resolved/dismissed)을 신설했다. 공개 갤러리/공유 쿼리(`listPublicPublishedChips`,
  `getPublicPublishedChipBySlug`)에 `moderation_status = 'visible'` 필터를 더했다(share viewer는 후자를 재사용하므로 자동 적용).
- **모더레이션 서비스/라우트.** `server/src/moderation/service.ts`에 `createReport`/`listReports`/`resolveReport`/
  `hideChip`/`unhideChip`/`adminDeleteChip`/`listChipsForModeration`를 publish/service 스타일(row 타입·`toX` 매퍼·주입된
  `now`)로 구현했다. `hideChip`도 `unhideChip`처럼 `updated_at`을 갱신해 admin 목록의 `updated_at DESC` 정렬을 일관화
  (코드 리뷰 반영). 라우트(`routes.ts`)는 유저용 `POST /api/reports`와 admin 전용 `/api/admin/*`(report 큐/resolve,
  칩 hide/unhide/delete, 모더레이션 목록)을 노출한다. admin 가드는 `routes.use('/admin/*', ...)` 미들웨어 하나로 추출해
  6개 핸들러의 401/403 중복을 제거했다(코드 리뷰 반영). 인가 우선순위: 익명→401, 비-admin→403.
- **클라이언트.** authStore에 `isAdmin`·`signupsOpen`을 추가하고 `init()`이 `me`+`/api/health`를 `Promise.all`로 함께
  읽는다. 에러 시 `signupsOpen`은 직전 값(기본 true)을 유지하는 fail-open(주석으로 명시). 가입 폼은 `signupsOpen=false`면
  안내 문구로 대체하되 로그인 폼은 유지(`AnonymousPanels`). admin 전용 `/admin` 페이지(신고 큐+칩 모더레이션, 주입 가능한
  `api` prop)와 `isAdmin`일 때만 보이는 헤더 Admin 링크를 추가했다. admin 액션 실패는 기존 alert 영역에 노출(코드 리뷰 반영).
  **알려진 마이너:** 인-세션 로그인 직후 Admin 링크는 다음 `init()`/리로드에서 나타난다(login은 `isAdmin`을 세팅하지 않음).
- **테스트/QA.** 서버 28 files / 128 tests, 클라이언트 69 files / 339 tests, `npm run build` green(기존 Vite chunk 경고만).
  브라우저 QA(임시 SQLite, 가입 열림→admin/normal 가입, `/admin` 큐+칩 렌더, 라이브 Hide로 칩 hidden 전환; 가입 닫힘
  재시작→가입 폼이 "Sign-ups are currently closed" 안내로 대체·로그인 폼 유지)와 실 HTTP 검증(신고→큐→숨김→갤러리 404→
  숨김 해제→갤러리 200, admin 인가 200/403/401, 닫힘 서버의 가입 403·로그인 200) 통과. 콘솔 에러는 미로그인 `/api/me`
  401×2 + favicon 404의 기존 베이스라인뿐.
- **명시적 비범위(M1+).** 유저용 신고 버튼·좋아요·댓글, 랭킹/콘테스트/lineage, 유저 ban, 초대 코드, 갤러리 전체 잠금,
  별도 audit 로그 테이블, `users.role` 컬럼.

## V4-M1 리액션 (좋아요 + 댓글 + 신고 버튼) (2026-06-15)

스펙: `docs/superpowers/specs/2026-06-14-v4-m1-reactions-design.md` ·
플랜: `docs/superpowers/plans/2026-06-14-v4-m1-reactions.md`. M0의 모더레이션 인프라 위에 첫 커뮤니티 상호작용을 얹었다.
좋아요·플랫 댓글·신고 버튼(M0의 `POST /api/reports` 재사용) 세 가지가 공개 갤러리 칩에 붙는다. 모두 서버 측 퍼블리시
데이터에만 작용하고 로컬-퍼스트(IndexedDB 편집)는 손대지 않았다.

- **데이터 모델(`005_reactions`).** `likes`(복합 PK `(published_chip_id, user_id)`로 유저당 칩 1회 좋아요 강제,
  `idx_likes_user`)와 `comments`(`id` PK, `idx_comments_chip(published_chip_id, created_at)`) 두 테이블을 추가했다.
  둘 다 칩·유저 삭제 시 CASCADE. 신고는 M0의 `reports` 테이블을 그대로 쓴다(신규 테이블 없음).
- **리액션 서비스(`server/src/reactions/service.ts`).** publish/service 스타일(row 타입·`toX` 매퍼·주입된 `now`)로
  좋아요(`isChipReactable`/`likeChip`/`unlikeChip`/`countLikes`/`hasUserLiked`/`getLikeState`)와
  댓글(`createComment`/`listComments`/`getCommentMeta`/`deleteComment`)을 구현했다. 좋아요는 `INSERT OR IGNORE`로 멱등.
  `isChipReactable`은 `is_public = 1 AND moderation_status = 'visible'`만 통과시켜 hidden/private/없는 칩의 리액션을 차단.
- **리액션 라우트(`server/src/reactions/routes.ts`, `/api` 마운트).** 좋아요 `POST/DELETE /api/published-chips/:id/like`
  (인증 필수, 401), 댓글 `GET`(공개)·`POST`(인증, 빈/1000자 초과 400)·`DELETE`(작성자 본인 또는 M0 `isAdminEmail` admin만,
  타인 비-admin은 403). 리액션 불가 칩은 404. M0의 `getSessionUser`·`isAdminEmail`을 재사용한다.
- **갤러리 노출.** `listPublicPublishedChips`/`getPublicPublishedChipBySlug` SELECT에 상관 서브쿼리로
  `like_count`/`comment_count`를 더하고 `PublicGalleryChip`에 `likeCount`/`commentCount`를 추가했다. 갤러리 라우트는
  요약에 `likeCount`, 상세에 `commentCount`+`likedByMe`를 직렬화한다. 상세 핸들러를 `async`로 바꿔 선택적 세션을 읽어
  `likedByMe`를 계산(미로그인은 false).
- **클라이언트.** `reactionsApi`(좋아요/댓글 CRUD + `reportChip`=M0 신고 재사용, 주입 가능)와 `galleryApi` 타입 확장
  (`GalleryChipSummary.likeCount`, `GalleryChipDetail.commentCount`/`likedByMe`)을 추가했다. 갤러리 상세 페이지에
  좋아요(♥ 토글)·신고(누르면 "Reported" 비활성)·플랫 댓글 스레드(작성자/admin Delete, 미로그인은 안내 문구)를 붙이고,
  그리드 카드에 좋아요 수(♥ n)를 표시했다. `useAuthStore`로 로그인/`isAdmin`을 읽는다 — 기존 갤러리 상세 테스트는
  provider 없이 렌더했으므로 `renderDetail`을 `AuthStoreProvider`+주입 fake `reactions`로 감쌌다(어서션은 불변, 플랜에
  없던 갭 보강).
- **테스트/QA.** 서버 32 files / 144 tests, 클라이언트 70 files / 342 tests, `npm run build` green(기존 Vite chunk 경고만).
  브라우저 QA(임시 SQLite + 시드 공개 칩): 미로그인→좋아요 수+"Sign in to react"·컨트롤 비활성·댓글 목록 가시; 일반 유저→
  좋아요 토글(♡0→♥1), 댓글 작성→목록 반영·본인 Delete 버튼, 신고→"Reported"; admin(`admin@test.com`)→타인 댓글 Delete
  성공·신고가 `/admin` open 큐에 노출; 그리드 카드 ♥1; 서버 정지→갤러리 오프라인 상태·로컬 편집기 정상(로컬-퍼스트 회귀)
  모두 통과. 콘솔 에러는 미로그인 `/api/me` 401·서버 정지 시 502·favicon 404의 기존 베이스라인뿐.
- **명시적 비범위(M2+).** 댓글 신고/스레딩/수정, 댓글 hide, admin 댓글 큐, 랭킹/콘테스트/remix lineage.

## V4-M2 랭킹/트렌딩 (2026-06-15)

스펙: `docs/superpowers/specs/2026-06-15-v4-m2-ranking-design.md` ·
플랜: `docs/superpowers/plans/2026-06-15-v4-m2-ranking.md`. M1의 likes/comments timestamp를 재사용해 공개 갤러리에
`Trending`/`Top`/`Newest` 정렬을 붙였다. M2는 순수 read-side 변경이라 **마이그레이션 없음**.

- **정렬 산식.** `GallerySort = 'trending' | 'top' | 'newest'`를 서버 publish service에 추가했다. `top`은 all-time
  `likes + comments`, `trending`은 `now() - 7일` rolling window의 `likes + comments`, `newest`는 `updated_at DESC`.
  점수 가중치는 좋아요와 댓글을 동일하게 1로 두었다. 동점은 `updated_at DESC` recency tie-break로 cold-start 갤러리에서도
  안정적으로 보이게 했다. cutoff 경계는 `created_at >= cutoff` inclusive.
- **SQL/read 계약.** `listPublicPublishedChips(db, { sort, now, limit })`가 상관 서브쿼리로 `total_score`/`weekly_score`를
  계산한다. 정렬별 `ORDER BY`는 typed literal map에서만 선택해 query param injection 여지를 만들지 않았다. 기존 공개 필터
  `is_public = 1 AND moderation_status = 'visible'`와 `likeCount`/`commentCount` 응답 계약은 유지한다. score 값은 응답에
  노출하지 않는다.
- **라우트/클라이언트.** `GET /api/gallery?sort=`를 추가하고, `top`/`newest`/`trending` 외 값은 lenient하게
  `trending`으로 기본 처리한다. 클라이언트 `galleryApi.list(sort?)`는 query param을 전달하고, `GalleryPage` 기본 상태는
  `trending`이다. 갤러리 상단에는 `Trending`/`Top`/`Newest` segmented control을 추가했고 `aria-pressed`로 active sort를
  노출한다. sort 변경 시 API를 다시 호출한다.
- **검증.** RED→GREEN: server ranking service(Top/Trending/Newest/default/cutoff), gallery route query param, client
  galleryApi param forwarding, GalleryPage sort control tests를 추가했다. 전체 `npm test` 통과: 클라이언트 70파일/344테스트,
  서버 33파일/150테스트. `npm run build` 통과(기존 대형 chunk 경고만).
- **브라우저 QA.** 임시 SQLite에 A/B/C 공개 칩을 시드해 기본 Trending=A first(최근 likes), Top=B first(오래된 likes 다수),
  Newest=C first(updated_at 최신)을 확인했다. Sort 버튼의 `aria-pressed`가 Top/Newest 클릭 시 이동했고, 카드 like count도
  유지됐다. 서버를 끈 뒤 `/gallery`는 offline 상태를 보여줬고, `/`에서 Start Blank로 로컬 에디터가 정상 진입해 local-first
  회귀도 통과. 브라우저 console warn/error 0(서버 정지 중 Vite proxy ECONNREFUSED 로그는 의도된 offline QA 신호).
- **명시적 비범위(M3+).** time-decay, score cache/materialized view, personalization, pagination, score UI, contests,
  remix lineage.

## V4-M3 콘테스트 시작: DB 스키마 (2026-06-15)

스펙: `docs/superpowers/specs/2026-06-15-v4-m3-contests-design.md` ·
플랜: `docs/superpowers/plans/2026-06-15-v4-m3-contests.md`. M3 구현은 계획서 Task 1부터 시작했다. 현재 범위는
서버 DB 기반과 contest CRUD/read 서비스이며, 라우트/클라이언트 화면은 아직 들어가지 않았다.

- **데이터 모델(`006_contests`).** `contests`, `contest_entries`, `contest_votes`를 추가했다. 콘테스트 status는
  `draft`/`submission`/`voting`/`results` CHECK로 제한하고 기본값은 `draft`. `created_by`는 관리자 유저 삭제 시 기록을
  보존하기 위해 `ON DELETE SET NULL`로 두었다.
- **참가/투표 제약.** `contest_entries`는 `(contest_id, owner_user_id)`와 `(contest_id, published_chip_id)` UNIQUE로
  한 유저가 한 콘테스트에 하나의 공개 칩만 제출하고, 같은 공개 칩이 중복 제출되지 않게 했다. `contest_votes`는
  `(contest_id, voter_user_id)` primary key로 유저당 콘테스트 1표를 강제한다.
- **삭제 동작.** 콘테스트 삭제 시 entries/votes가 cascade되고, entry 삭제(철회) 시 해당 vote가 cascade되도록 테스트로
  고정했다. 이는 phase 전환이나 withdraw 서비스 구현 전에 DB 무결성을 먼저 보장하려는 선택이다.
- **검증.** RED: `npm test --workspace server -- contestsMigration`가 테이블 없음으로 실패. GREEN:
  `npm test --workspace server -- contestsMigration migrations` 통과(2 files / 8 tests). 계획서의 commit 단계는 기존
  V4-M2 미커밋 변경이 남아 있어 실행하지 않았다.
- **Contest CRUD/read 서비스(Task 2).** `server/src/contests/service.ts`를 추가해 `createContest`/`updateContest`/
  `deleteContest`/`getContestStatus`/`listPublicContests`/`getContestDetail`/`getMyVote`를 구현했다. 공개 목록은 draft를
  숨기고 `created_at DESC`로 정렬한다. 계획서 예시의 정렬 주석이 모순되어 있었으므로, 계획서 하단 note의 정정대로
  `['B', 'A']`를 기대값으로 테스트했다. 서비스 테스트 setup은 `created_by` FK 때문에 `admin` 유저를 seed한다.
  Detail은 draft를 `null`로 숨기고, entries는 `vote_count DESC, created_at ASC` 순서로 rank를 계산한다.
- **검증.** RED: `npm test --workspace server -- contestsService`가 `../src/contests/service` 없음으로 실패. GREEN:
  `npm test --workspace server -- contestsService` 통과(1 file / 5 tests). Task 2의 commit 단계도 위와 같은 이유로
  실행하지 않았다.

## V4-M3 콘테스트 완료 (2026-06-15)

M3의 남은 작업을 완료해 공개 contest lifecycle을 서버/클라이언트에 연결했다. 중간 milestone commit은 하지 않고,
사용자 요청에 따라 기존 M2+M3 foundation을 먼저 커밋한 뒤 남은 M3 작업은 통합 follow-up으로 정리했다.

- **4단계 수동 lifecycle.** `draft`/`submission`/`voting`/`results`는 admin이 직접 전환한다. 스케줄러/날짜 필드는
  넣지 않았다. 공개 list/detail은 draft를 숨기고, 잘못된 phase의 entry/vote 요청은 `409 WRONG_PHASE`로 응답한다.
- **서버 모듈/라우트.** `server/src/contests/routes.ts`를 `/api`에 mount했다. Admin contest CRUD는
  `/api/admin/contests`에서 처리하되 moderation sub-app의 `/admin/*` middleware와 겹치지 않도록 각 handler가 inline
  `readAdmin` guard를 사용한다. Public endpoints는 `/api/contests`, `/api/contests/:id`; user endpoints는
  `/api/contests/:id/entries`, `/api/contests/:id/vote`.
- **Entry/vote 규칙.** Entry는 `submission` phase에서만 가능하고, 본인의 public+visible published chip만 허용한다.
  DB UNIQUE로 contest당 유저 1개 entry와 chip 중복 제출을 막는다. Vote는 `voting` phase에서만 가능하고
  contest당 유저 1표를 `ON CONFLICT` replace로 갱신한다. Self-vote는 `403 SELF_VOTE`, retract는 `DELETE vote`.
- **Read-side results.** 결과는 materialized table 없이 `contest_votes` 집계로 계산한다. Detail entries는
  `vote_count DESC, created_at ASC`로 정렬하고 rank를 부여하며, client는 `results` phase에서 top-3 podium을 렌더한다.
- **Entry picker source.** `GET /api/published-chips/mine`을 추가해 현재 유저의 public+visible published chips만 반환한다.
  응답은 client가 바로 사용할 수 있도록 `posterImageUrl`로 직렬화한다.
- **클라이언트.** `src/features/contests/contestsApi.ts`, `ContestsPage`, `ContestDetailPage`를 추가하고 App nav/routes에
  `/contests`와 `/contests/:id`를 연결했다. Detail page는 submission entry picker, withdraw, voting vote/unvote,
  own-entry 표시, results podium을 phase별로 렌더한다. AdminPage에는 contest create/status/delete panel을 추가했다.
  별도 admin-list endpoint가 없으므로 새 draft는 create 응답 id를 로컬 state에 append해 즉시 전환 가능하게 했다.
- **검증.** RED→GREEN으로 service entries/votes, contest routes, `/published-chips/mine`, `contestsApi`,
  `ContestDetailPage` tests를 추가했다. 전체 `npm test` 통과: client 72 files / 352 tests, server 36 files / 173 tests.
  `npm run build` 통과(기존 Vite >500 kB chunk 경고만), `npm run typecheck --workspace server` 통과.
- **브라우저 QA.** 임시 DB/업로드 디렉터리로 server+Vite를 띄워 admin signup→contest create→submission 전환→public
  contests 노출→A/B 유저 entry→voting 전환→B가 A entry에 vote→results podium(A #1, B #2)을 확인했다. Header의
  Contests nav, admin panel controls, entry picker, own-entry "Your entry", `Voted` pressed state가 확인됐다. Local-first
  회귀로 `/`에서 Start Blank 후 editor 진입도 확인했다. 브라우저 console warn/error 0.
- **알려진 기존 이슈.** Admin으로 sign out 후 일반 유저 signup 시 header의 Admin 링크가 남는 auth store reset 문제가 보였다.
  M0 때 기록된 `isAdmin` 세팅/리셋 계열의 기존 auth 상태 문제이며, 이번 M3 contest backend authorization은 서버 guard가
  별도로 강제한다. M3 범위에서는 수정하지 않았다.

## V4-M4 리믹스 계보 시작: 도메인 스키마 v5 (2026-06-15)

스펙: `docs/superpowers/specs/2026-06-15-v4-m4-remix-lineage-design.md` ·
플랜: `docs/superpowers/plans/2026-06-15-v4-m4-remix-lineage.md`. M4 구현은 도메인 schema carrier부터 시작했다.
현재 범위는 local-first `Project`가 remix provenance를 publish 시점까지 운반할 수 있게 만드는 기반이며, 서버
`007_remix_lineage`와 gallery lineage UI는 아직 들어가지 않았다.

- **스키마 v5.** `CURRENT_SCHEMA_VERSION`을 4에서 5로 올리고, `RemixOrigin`(`chipId`/`slug`/`title`)과
  `Project.remixedFrom?` 선택 필드를 추가했다. `chipId`는 서버 published chip FK용 내구성 키이고, `slug`/`title`은
  UI 링크와 표시용으로 함께 운반한다.
- **Migration 호환성.** `migrateProject`의 supported source versions에 v4를 명시적으로 추가했다. v4 프로젝트는
  current v5로 승격되며 `remixedFrom`은 undefined로 남는다. current-version 프로젝트에 `remixedFrom`이 있으면 기존
  spread migration 경로가 그대로 보존한다.
- **검증.** RED: `npm run test:client -- src/domain/project.test.ts`가 schemaVersion 4/5 차이로 실패했고,
  `npm run test:client -- src/domain/projectMigration.test.ts`가 v4 unsupported로 실패했다. GREEN:
  `npm run test:client -- src/domain/project.test.ts src/domain/projectFactory.test.ts src/domain/projectMigration.test.ts`
  통과(3 files / 11 tests). M4는 진행 중이라 아직 커밋하지 않았다.
- **빌드 보정.** schemaVersion literal `4`를 직접 쓰던 `src/studio/floorplan.test.ts` fixture는
  `CURRENT_SCHEMA_VERSION`로 교체했다. 전체 `npm test` 통과: client 73 files / 356 tests, server 36 files / 173 tests.
  `npm run build` 통과(기존 Vite >500 kB chunk 경고만).

## V4-M4 리믹스 계보 구현 완료(검증 제외) (2026-06-15)

사용자 요청에 따라 M4의 남은 구현을 모두 반영하되, 이번 패스에서는 테스트/빌드/브라우저 QA와 커밋을 실행하지 않았다.
따라서 아래 내용은 구현 상태 기록이며, green 상태 증명은 후속 검증 패스가 필요하다.

- **Origin threading.** `importRemixedProject(snapshot, id, now, origin?)`가 optional `RemixOrigin`을 받아 새 local project의
  `remixedFrom`에 기록한다. `projectStore.remixImport(snapshot, origin?)`와 `GalleryDetailPage`/`App`의 `onRemix` contract도
  함께 변경해 gallery detail에서 `{ chipId, slug, title }` origin이 editor/import/publish 경로까지 전달된다.
- **DB parent pointer.** `007_remix_lineage` migration을 추가해 `published_chips.remixed_from_chip_id` nullable self-FK를 만들고
  `ON DELETE SET NULL` 및 `idx_published_chips_remixed_from` index를 둔다. 부모 chip id가 서버에 없으면 publish 실패 대신
  `NULL`을 저장한다.
- **Publish 저장.** `PublishedChip`/row mapper/API serialization에 `remixedFromChipId`를 추가했다. `upsertPublishedChip`는
  `input.project.remixedFrom?.chipId`를 실제 `published_chips.id`로 resolve해 insert/update 모두에 저장한다.
- **Read-side lineage.** `getChipLineage(db, slug)`는 target이 public+visible일 때만 ancestor chain과 direct children을 반환한다.
  ancestor는 root-first로 정렬하고, private/hidden parent를 만나면 `{ hidden: true }` placeholder를 하나 추가한 뒤 climb을
  중단한다. children과 `childCount`는 public+visible direct child만 센다. 별도 cache/materialized view는 만들지 않았다.
- **API/Share.** `GET /api/gallery/:slug/lineage`를 추가해 `posterImageUrl`까지 직렬화한다. `/s/:slug` share viewer는 visible
  direct parent가 있을 때만 `Remixed from {title}` gallery 링크를 렌더한다.
- **Client lineage UI.** `galleryApi.getLineage(slug)`와 `ChipLineage` 타입을 추가했다. `GalleryDetailPage`는 chip detail 로딩 후
  lineage를 lazy-load하고, 실패해도 detail 화면은 유지한다. ancestor spine, private placeholder, direct child thumbnail grid를
  `gallery-lineage*` CSS로 추가했다.
- **테스트 파일.** domain/store/server/client 테스트를 추가/수정했지만, 이번 요청이 "검증은 하지 마세요"였기 때문에 새 테스트와
  전체 suite는 실행하지 않았다. 다음 검증 패스에서는 `npm test`, `npm run build`, `npm run typecheck --workspace server`,
  그리고 browser QA acceptance gate를 실행해야 한다.

## V4-M4 리믹스 계보 검증 완료 (2026-06-15)

M4 전체 검증을 수행하고, 발견된 테스트 mock 문제를 수정했다. `src/app/App.test.tsx`의 gallery detail fetch mock이
새 `/api/gallery/:slug/lineage` 요청에도 detail 응답을 반환해 `lineage.ancestors`가 없는 객체가 들어가던 것이 원인이었다.
mock을 endpoint별로 분기해 lineage에는 `{ ancestors: [], children: [], childCount: 0 }`를 반환하도록 수정했다.

- **자동 검증.** `npm test` 통과: client 73 files / 362 tests, server 38 files / 184 tests. `npm run build` 통과
  (기존 Vite >500 kB chunk 경고만). `npm run typecheck --workspace server` 통과.
- **브라우저 QA.** Vite dev server와 QA용 API server를 띄워 A→B→C 계보 데이터를 생성했다. `/gallery/B`에서
  `Alpha Parent Valid` ancestor와 B의 child `Gamma Grandchild Valid` thumbnail 로딩을 확인했고, `/gallery/A`에서
  `Beta Child Valid` child count 1, `/gallery/C`에서 root-first ancestor `Alpha Parent Valid → Beta Child Valid`를
  확인했다. `/s/B` share viewer는 `Remixed from Alpha Parent Valid` 링크를 렌더했다.
- **Visibility/delete gate.** A를 private으로 전환하면 B의 ancestor가 `a private chip` placeholder로 표시되고 parent title은
  숨겨졌다. A 삭제 후 `ON DELETE SET NULL`에 따라 B의 ancestor는 사라지고 direct child `Gamma Grandchild Valid`만 남았다.
- **Local-first 회귀.** API server를 내린 상태에서 `/`의 `Start Blank`로 editor 진입이 가능했고, Publish panel은 offline
  상태를 표시하면서 local editing은 유지됐다. 브라우저 console warn/error 0.

## 전체 코드베이스 리뷰 (Parts 1–4, 2026-06-15)

ESLint + Prettier 베이스라인을 세우고(Part 1), 의존성 방향(core → editor/visual → feature pages → server)대로 4개
파트로 나눠 리뷰했다. 정확성/보안 버그는 TDD로 수정, behavior-preserving cleanup은 기존 green suite 기준, 대형 구조
리팩터는 제안만 logged(실행 안 함). 각 파트 findings 문서는
`docs/superpowers/reviews/2026-06-15-part-{1,2,3,4}-*.md`(+ codex 교차 리뷰 4건). **주의:** 이 implementation.md 로그
섹션은 브랜치 전환 중 untracked 로컬 편집이 유실되어 위 review 문서들로부터 재구성한 것이다(권위 있는 원본은 review 문서).

### Part 1 — Tooling Baseline + Core Data Spine

configs · `domain/` · `storage/` · `lib/` · `test/`. 도메인 purity · `CURRENT_SCHEMA_VERSION` 단일 출처 · 마이그레이션
규율 · sticky-fallback 불변식 모두 확인. **수정:** 1.1(P1) `localStorageProjectRepository.readAll`이 corrupt top-level
blob(invalid JSON·non-array)에 degrade 없이 throw → "list()에서 corrupt는 skip" 불변식 위배, JSON.parse 가드 + array
요구로 수정(TDD 2건, `75a55b5`). 1.2/1.3(P1) `schemaVersion:3` input·migrate idempotency characterization 테스트
부재 → 추가(`2b9b3e9`). **logged P2:** 1.4 `FANTASY_TYPES`가 `BlockType` union과 병행유지 → `BLOCK_CATALOG` 단일출처,
1.5 마이그레이션이 top-level shape만 검증(요소 내부 통과) → 요소 단위 deep validation, 1.6 `neonLine color:''` 센티넬
→ 명명 상수. lint 베이스라인 22건은 각 소유 파트로 분배(Part 1 범위 hit 0건); Prettier 1회 기계적 baseline(`bb9134b`).

### Part 2 — Editor Engine, Canvas & Visual System

`stores/` · `features/editor`(+`canvas/`) · `themes/` · `visual/` · `presets/` · `studio/` · `features/specs` ·
`features/export`. export-effect 불변식(Konva node 설정만, DOM/CSS 없음·serializable data만 합성)·clamp 4-shape·
pure-helper 분리·undo/redo selection 수명 모두 확인. **P0 없음.** lint 주도 P1 6건 수정: 2.1/2.2 store context의
`useRef` Provider value(`react-hooks/refs`) → `useState(()=>createStore())` 안정 인스턴스 + context-hook colocation은
documented disable(`abc05f3`). 2.3 prop의 로컬 미러를 effect에서 동기 재설정(`set-state-in-effect`) → render-phase 파생
(specs `066fac9` · inspector `54495ad` · export `a165bbe`). 2.4 `BlockImageOverlay`의 도달불가 `setImage(null)` 분기
제거(`2b48019`). 2.5 미사용 React import 제거(`126cc93`). 2.6 dormant exhaustive-deps disable는 2.3 재작성으로 제거.
**logged P2:** 2.7 `authStore.login/signup`이 `isAdmin/signupsOpen` 미갱신, 2.8 die-geometry 중복(rotation-AABB 3 +
inscribed-region 2) → `lib/dieGeometry`, 2.9 `ChipArtwork.tsx`(1565줄) per-layer 분할.

### Part 3 — Community Pages · API Clients · App Shell

`app/` · `features/{gallery,contests,admin,account,publish,projects,landing}` + 각 `*Api.ts`. **P0 없음.** lint 주도
P1 4건: 3.1 App `EditorRoute`의 동기 `setProject('loading')` → render-phase 이동 + reactive state 대신 안정
`store.get`에 키잉(`26d259c`). 3.2 gallery/contests/publish fetch effect의 동기 loading 리셋 → render-phase 파생
(`25def57`). 3.3 AdminPage mount fetch(옮길 동기 setState 없는 명령형 async)는 근거 주석 + documented disable
(`cad073b`). 3.4 테스트 미사용 `*ApiError` import 제거(`9ff1b85`). **logged P2:** 3.5 v3/v4 API 클라 두 갈래 컨벤션 +
중복(~150줄) → 공유 `apiFetch` + typed `ApiError` 통합, 3.6(= 2.7) authStore login isAdmin 갱신. 리뷰 종료 시점
`npm run lint` 전체 clean(documented disable 3개 active).

### Part 4 — Server (`@vsl/server`)

`server/src/` 전체(infra · accounts · publish · moderation · reactions · contests · share · images). 도메인 경계
(`@domain/*`만)·마이그레이션 `001~007` 전수 테스트·argon2id OWASP·세션 sha256-at-rest+서명쿠키+lazy expiry·admin 가드
(moderation `/admin/*` 서브앱 + contests inline = 상호 방어선)·access gate·public-query 필터링·프로덕션 config 안전·
에러 계약·SQL 파라미터화 확인. **P1 1건 수정(TDD):** 4.1 `getContestDetail` entry 쿼리가 `is_public`/`moderation_status`
필터 없이 JOIN → 참가 후 hide/private된 칩이 비인증 `GET /api/contests/:id`로 공개 노출(gallery/share/reactions/lineage가
막는 누출). 실패 테스트 선작성 후 entry JOIN에 `AND p.is_public = 1 AND p.moderation_status = 'visible'` 추가(`f2d169b`).
`listPublicContests` 정수 카운트는 신원 노출 없어 의도적 유지. **logged P2:** 4.2 rate-limiter buckets Map 미정리(메모리
누수), 4.3 로그인 타이밍 기반 이메일 enumeration(더미 해시 권장), 4.4 publish 트랜잭션 내부 파일 I/O(롤백 비안전),
4.5 `publish/service.ts`(441줄) 3분할. **게이트:** lint clean, client 370 / server 185(+1) green, server typecheck +
build green.

### 확장성 백로그 (deferred P2 모음)

후속 우선순위 후보(이번 리뷰 미실행): **1.4** `BLOCK_CATALOG` 단일출처 · **1.5** 요소 단위 deep validation ·
**1.6** `neonLine` 센티넬 명명 · **2.8** `lib/dieGeometry` 통합 · **2.9** `ChipArtwork` 분할 · **2.7=3.6**
authStore login isAdmin 재파생 · **3.5** 6개 API 클라 `apiFetch`+typed `ApiError` 통합 · **4.2** rate-limiter prune ·
**4.3** 로그인 타이밍 하드닝 · **4.4** publish 이미지 I/O 트랜잭션 밖으로 · **4.5** `publish/service.ts` 분할.

## V5-M0 Invite-Code Access — Checkpoint 1 (2026-06-17)

사용자 요청에 따라 V5 M0-M6 계획 진행도를 확인한 뒤, 첫 중단점은 **M0 서버 backbone + authStore contract**로 정했다.
이 지점은 DB/access gate/API/store 계약이 green이고, signup/admin UI polish와 M1-M6는 아직 들어가지 않은 상태라
검토/방향 전환 비용이 낮다. 현재 V5-M1~M6는 계획만 존재하며 구현은 시작하지 않았다.

- **진행도 판단.** V5 계획 문서(`2026-06-16-v5-*.md`)는 작성되어 있었지만, 코드에는 `VSL_SIGNUPS_OPEN` 기반
  boolean gate만 남아 있었다. HEAD는 `main`과 동일한 `v5-public-launch` 브랜치였고 작업트리는 깨끗했다.
- **DB/access gate.** migration `008_invite_codes`를 추가했다: `invite_codes` 테이블과 `users.invited_via_code`.
  `RuntimeConfig`는 `accessMode: 'closed' | 'invite' | 'open'`을 사용한다. `VSL_ACCESS_MODE`가 우선이고,
  미설정 시 legacy `VSL_SIGNUPS_OPEN=true`는 `open`, 그 외는 `closed`로 fallback한다.
- **Invite service/API.** `server/src/invites/`에 code generation/validation/service/routes를 추가했다.
  redemption은 `UPDATE ... used_count = used_count + 1 WHERE used_count < max_uses AND not expired` 단일 statement로
  guard한다. Admin route는 기존 cookie session + admin email guard를 재사용한다.
- **Signup 연결.** `/api/auth/signup`은 `closed`에서 403, `open`에서 기존처럼 가입, `invite`에서 `inviteCode` 없거나
  invalid/exhausted/expired이면 `INVALID_INVITE`를 반환한다. 성공 시 `used_count`를 올리고 user row에
  `invited_via_code`를 기록한다.
- **Client contract.** `/api/health`와 `authApi`/`authStore`는 `signupsOpen` 대신 `accessMode`를 사용한다.
  `AccountPage`는 `closed`에서 기존 closed notice를 유지하고, `invite`에서 invite code input을 signup payload에 포함한다.
- **남긴 범위.** M0의 admin page invite-code management panel과 브라우저 QA는 다음 체크포인트로 남겼다. 서버 admin
  endpoints는 존재하지만, `AdminPage` UI에는 아직 노출하지 않았다. M1 안전/모더레이션, M2 이메일 보안, M3 온보딩,
  M4 profile/SEO, M5 ops hardening, M6 gate flip은 모두 untouched.
- **검증.** RED 확인 후 GREEN: targeted server `invitesMigration accessModeConfig invitesService signupGate invitesRoutes
  health config` 7파일/24테스트 통과, targeted client `authApi authStore AccountPage` 4파일/34테스트 통과. 전체
  `npm test` 통과(client 74파일/380테스트, server 42파일/201테스트), `npm run build` 통과(기존 Vite 500kB chunk warning),
  `npm run typecheck:server` 통과, `git diff --check` clean.

## V5-M1 Safety & Moderation — Checkpoint 1 (2026-06-17)

V5-M1은 범위가 넓어서 첫 중단점을 **server safety foundation**으로 제한했다. 이번 체크포인트는 `009_safety`
migration, append-only audit log helper, ban/unban core, 그리고 계정 로그인/세션 조회 ban guard까지다. Publish/like/comment
write-action 차단, comment report/hide queue, admin route audit wiring, client admin UI는 다음 체크포인트로 남겼다.

- **Migration.** `009_safety`를 추가했다: `users.banned_at/banned_reason`, `comments.hidden_at/hidden_by`,
  `reports.comment_id`, `audit_log`. `reports.published_chip_id`는 계획대로 `NOT NULL` 유지라 comment report도 chip context를
  함께 들고 가는 구조를 후속 Task 5에서 구현하면 된다.
- **Audit helper.** `server/src/moderation/auditLog.ts`에 `recordAudit`/`listAudit`를 추가했다. `admin_user_id`는 FK라
  테스트도 실제 admin user seed 후 기록하도록 조정했다. 아직 admin mutation route에 연결하지 않았으므로 audit table은
  foundation 상태다.
- **Ban core.** `server/src/moderation/bans.ts`에 `banUser`/`unbanUser`/`isUserBanned`를 추가했다. ban은 user row를
  업데이트하고 기존 sessions를 삭제한다. `verifyCredentials`는 banned user를 invalid credentials처럼 처리하고,
  `getSessionUser`는 세션 revocation race 대비 `banned_at` guard도 직접 확인한다.
- **Trade-off.** `banUser`/`unbanUser`의 `adminId`와 `unbanUser`의 `now`는 M1 후속 audit wiring에서 필요해질 계약이라
  유지했다. 현재 checkpoint에서는 lint를 위해 명시적으로 `void` 처리했다.
- **남은 M1.** 다음은 banned user의 publish/like/comment route 차단, comment report/hide/public exclusion, admin audit
  route wiring, client AdminPage ban/comment/audit surface, browser QA 순서로 진행하면 된다.
- **검증.** RED: `safetyMigration auditLog bans`가 migration/module 부재로 실패. GREEN: targeted
  `npm run test --workspace server -- safetyMigration auditLog bans authSession` 4파일/8테스트 통과. 이후 전체
  `npm test` 통과(client 74파일/380테스트, server 45파일/205테스트), `npm run build` 통과(기존 Vite 500kB chunk warning),
  `npm run typecheck:server` 통과. lint에서 unused future-parameter 2건을 발견해 `void` 처리했고, `npm run lint` 및
  `git diff --check` 통과.

## V5-M1 Safety & Moderation — Server Completion (2026-06-17)

M1의 남은 서버 surface를 구현했다. Client admin UI와 browser QA는 아직 남아 있지만, 서버 acceptance의 핵심인
ban write-block, comment moderation, audit logging은 API/서비스 테스트로 고정됐다.

- **Banned write guard.** `getSessionUserWithStatus()`를 추가해 일반 auth read는 기존처럼 banned user를 null 처리하되,
  write routes는 stale signed session이 남은 race에서도 `403 ACCOUNT_BANNED`를 반환할 수 있게 했다. `publishRoutes`와
  `reactionsRoutes`의 publish/visibility/delete/like/comment write path가 `requireActiveUser()`를 사용한다.
- **Comment moderation.** `reports.comment_id`를 활용해 `createCommentReport()`, `listCommentReports()`,
  `hideComment()`, `unhideComment()`를 추가했다. Public `listComments()`는 `hidden_at IS NULL`만 반환한다.
- **Admin routes + audit.** `/api/admin/users/:id/ban|unban`, `/api/admin/comment-reports`,
  `/api/admin/comments/:id/hide`, `/api/admin/audit-log`를 추가했다. chip hide/unhide/delete, report resolve/dismiss,
  comment hide, ban/unban은 모두 `audit_log`에 actor/action/target/detail을 기록한다.
- **Fixture correction.** Route tests에서 stale session을 검증할 때 raw token cookie를 넣으면 Hono signed-cookie 검증을
  통과하지 못한다. 실제 signup cookie를 유지한 채 user row만 banned로 바꾸는 방식으로 race/stale-session 경로를 테스트했다.
- **검증.** RED: publish/reactions/moderation targeted suite가 새 route/service 부재와 hidden-comment 누출로 실패.
  GREEN: `npm run test --workspace server -- publishRoutes reactionsRoutes reactionsService moderationService moderationRoutes`
  5파일/43테스트 통과. 서버 전체 `npm run test --workspace server` 45파일/213테스트 통과, `npm run typecheck:server`
  통과, `npm run lint` 통과.

## V5-M2 Account Security — Server Completion (2026-06-17)

M2는 먼저 서버 보안 계약을 끝냈다. Client verify/reset 페이지와 unverified banner는 후속 client polish로 남아 있지만,
이메일 인증·비밀번호 재설정·verified write gate의 API와 DB 동작은 테스트로 고정됐다.

- **Migration.** `010_account_security`를 추가했다: `users.email_verified_at`,
  `email_verification_tokens`, `password_reset_tokens`. 토큰 테이블은 session과 같은 sha256-at-rest 패턴을 쓴다.
- **Email provider.** `server/src/email/provider.ts`에 `EmailProvider`, `ConsoleEmailProvider`, `FakeEmailProvider`를 추가했다.
  dev 서버는 console provider를 주입하고, 테스트는 fake provider sent mailbox를 검사한다. 현재 production provider selection은
  아직 console 기본이며, 실제 provider fail-fast는 배포 config 세부화 때 보강 여지가 있다.
- **Token flow.** `issueToken()`/`consumeToken()`은 raw token을 한 번만 반환/소비하고 DB에는 hash만 저장한다. expired token도
  consume 시 삭제한다.
- **Email verification.** Signup 후 verification token을 발급해 `/verify-email?token=...` 링크를 발송한다. 발송 실패는
  signup 실패로 전파하지 않고 log만 남긴다. `POST /api/auth/verify-email`은 token을 single-use consume하고
  `email_verified_at`을 설정한다. `/api/me` user payload에는 `emailVerified`가 포함된다.
- **Password reset.** `forgot-password`는 알려진 email에만 reset mail을 보내지만 항상 `{ ok: true }`를 반환해 enumeration을
  막는다. `reset-password`는 token+new password를 검증하고 password hash를 교체하며 모든 기존 session을 revoke한다.
- **Soft gate.** `requireVerifiedPublish`가 true면 publish와 comment write는 미인증 계정에 `403 EMAIL_UNVERIFIED`를 반환한다.
  기존 M1 `requireActiveUser()`에 ban guard와 email guard가 함께 있다.
- **검증.** RED: `accountSecurityMigration emailProvider accountTokens verifyEmail passwordReset publishRoutes reactionsRoutes`
  suite가 모듈/migration/soft-gate 부재로 실패. GREEN: 같은 targeted suite 7파일/28테스트 통과. 서버 전체
  `npm run test --workspace server` 50파일/221테스트 통과, `npm run typecheck:server` 통과, `npm run lint` 통과,
  `npm run build` 통과(기존 Vite 500kB chunk warning).

## V5-M2 Account Security — Client Completion (2026-06-17)

서버 계정 보안 계약을 클라이언트에 연결했다. 새 화면은 기존 `AccountPage` visual language를 재사용하고, local-first
편집 경로와 분리했다.

- **Auth contract.** `AuthUser.emailVerified`를 필수 필드로 승격하고 `verifyEmail`/`forgotPassword`/`resetPassword`를
  `authApi`와 `authStore`에 추가했다. `resetPassword` 성공 후에는 기존 세션이 서버에서 revoke되므로 클라이언트도 anonymous
  state로 돌린다.
- **Routes.** `/verify-email`, `/forgot-password`, `/reset-password`를 추가했다. 토큰은 query string에서 읽고, missing token은
  error panel로 처리한다.
- **Account UI.** Sign-in panel에서 reset mail 요청을 직접 보낼 수 있게 했다. 서버가 enumeration 방지를 위해 항상 성공 응답을
  주므로 UI도 "존재하면 발송" 메시지만 보여준다. 미인증 사용자는 profile panel 상단에 publish 전 email verification 필요 banner를
  본다.
- **Trade-off.** Verification mail 재발송 endpoint는 spec의 최소 launch gate에는 없어서 추가하지 않았다. 재발송은 운영자가
  필요성을 확인한 뒤 별도 endpoint로 넣는 편이 낫다.
- **검증.** RED: targeted client tests가 API method/page/banner/reset button 부재로 실패. GREEN:
  `npm run test:client -- src/features/account/authApi.test.ts src/features/account/AccountPage.test.tsx
  src/stores/authStore.test.ts src/stores/authStoreContext.test.tsx src/app/App.test.tsx
  src/features/publish/PublishPanel.test.tsx src/features/gallery/GalleryDetailPage.test.tsx
  src/features/admin/AdminPage.test.tsx` 7파일/51테스트 통과.

## V5-M3 Onboarding & First-Run (2026-06-17)

신규 사용자 첫 실행과 curated gallery entry point를 구현했다. 서버 featured slice와 클라이언트 onboarding/empty-state slice는
각각 별도 커밋 단위로 나눴다.

- **Featured curation.** `011_featured` migration으로 `published_chips.featured_at`과 DESC index를 추가했다.
  `setFeatured()`/`listFeaturedChips()`는 public+visible chip만 노출하고 newest-featured 순서로 정렬한다. Admin
  `feature`/`unfeature` route는 `audit_log`에 `feature_chip`/`unfeature_chip`을 기록한다.
- **Featured UI.** Gallery는 `/api/gallery/featured`를 별도로 읽어 non-empty일 때만 Featured row를 표시한다. Public gallery
  list sort와 독립 fetch로 두어 featured failure가 전체 gallery를 막지 않게 했다.
- **First-run state.** `vsl.onboarding` localStorage key와 vanilla Zustand store로 editor coachmark dismissal을 per-device
  저장한다. 서버 user flag로 동기화하지 않는 결정은 v5 launch 범위와 local-first 원칙에 맞췄다.
- **Editor coachmark.** DOM overlay는 editor UI 전용이며 export stage와 project JSON에는 영향을 주지 않는다. Overlay wrapper는
  pointer-events를 끄고 panel만 클릭 가능하게 해 canvas interaction을 불필요하게 막지 않는다.
- **Starter chips.** Dashboard empty state에 featured preset 3개를 직접 시작하는 CTA를 추가했다. 기존 preset grid도 유지하므로
  신규 사용자와 기존 사용자의 흐름을 분기시키지 않는다.
- **검증.** RED: `featuredMigration featuredService galleryRoutes moderationRoutes` 및 client
  `onboardingStore GalleryPage ProjectDashboard AdminPage` targeted tests가 부재 기능으로 실패. GREEN:
  server targeted 4파일/20테스트 통과, client targeted
  `onboardingStore GalleryPage galleryApi GalleryDetailPage ProjectDashboard AdminPage moderationApi App` 8파일/42테스트 통과.

## V5-M4 Discovery, SEO & Profiles (2026-06-17)

공개 사용자 identity surface와 crawler-facing endpoint를 추가했다. Handle은 signup 필수가 아니라 account page에서 선택하는
optional profile id로 유지했다.

- **Handle schema.** `012_profiles_seo` migration으로 `users.handle`과 partial unique index를 추가했다. 여러 NULL handle은
  허용하고 non-null handle만 unique enforcement한다.
- **Validation.** Handle은 lowercase normalize, `^[a-z0-9_]{3,24}$`, reserved word denylist로 제한한다. Reserved list에는
  route namespace(`admin`, `api`, `gallery`, `s`, `u`, `account`, `contests`, `uploads`, `sitemap`, `robots`, `profiles`,
  `published-chips`, `health`)를 포함했다.
- **Profile API.** `PATCH /api/me/handle`은 auth required, taken handle은 `409 HANDLE_TAKEN`. `GET /api/profiles/:handle`은
  banned user와 private/hidden chips를 제외하고 public+visible chips만 반환한다.
- **SEO.** `robots.txt`는 sitemap URL을 노출하고, `sitemap.xml`은 public+visible `/s/:slug`와 non-banned `/u/:handle`만 per-request
  생성한다. 초기 규모가 작아 캐시/배치 생성은 넣지 않았다.
- **Client.** `/u/:handle` route, `ProfilePage`, `profileApi`를 추가했다. AccountPage에는 public handle picker와 handle 설정 후
  public profile link를 추가했다. `AuthUser`는 server payload와 맞춰 `handle: string | null`을 가진다.
- **검증.** RED: server `profilesMigration profileHandle profilesRoutes seoRoutes`, client `profileApi ProfilePage AccountPage App`
  tests가 부재 기능으로 실패. GREEN: server targeted 4파일/5테스트 통과, client targeted 9파일/58테스트 통과.

## V5-M5 Launch Hardening & Ops (2026-06-17)

런치 전 서버 correctness/ops debt를 처리했다. 위험도가 큰 리팩터는 characterization test를 먼저 둔 기존 gallery ranking suite와
새 regression tests로 방어했다.

- **Gallery scoring query.** `listPublicPublishedChips()`의 per-row correlated subquery를 grouped CTE(`like_counts`,
  `comment_counts`)로 바꿨다. `top`/`trending`/`newest` ordering과 cutoff 포함 규칙은 기존 `galleryRanking` suite로 유지 확인했다.
- **Rate limit hardening.** Limiter bucket에 `windowMs`를 저장하고 check마다 expired bucket을 prune한다. Production config는
  login/signup/forgot-password/report에 더 낮은 per-endpoint overrides를 기본 제공한다.
- **Password reset contract fix.** Client가 보내는 `newPassword`를 서버가 수락하도록 고쳤고, 기존 `password` field도 호환으로 남겼다.
- **Login timing.** Unknown email path도 고정 Argon2id dummy hash를 검증해 user-existing path와 verifier call shape를 맞췄다.
- **Publish image I/O.** `upsertPublishedChip()`은 DB row write를 먼저 commit하고, image store write/delete는 commit 이후 수행한다.
  DB FK/constraint 실패 시 image store는 호출되지 않는다. File image write 실패 시 DB row에는 data URL fallback이 남는다.
- **Gallery lockdown.** `VSL_GALLERY_LOCKDOWN`/`galleryLockdown` kill switch를 추가했다. Public gallery list/featured는 empty list,
  gallery detail/profile/share/poster reads는 410으로 단락한다. Owner-scoped editing/publish APIs는 건드리지 않는다.
- **Backup ops.** `backupDatabase()` helper와 `server/scripts/backup.ts` CLI, `docs/ops/backup-restore.md` runbook을 추가했다.
- **검증.** RED: `rateLimit rateLimitRoutes passwordReset galleryLockdown backup loginTiming publishService config` targeted tests가
  부재 기능/계약 불일치로 실패. GREEN:
  `npm run test --workspace server -- config rateLimit rateLimitRoutes passwordReset galleryRanking galleryLockdown backup loginTiming publishService`
  10파일/32테스트 통과.

## V5-M6 Launch QA & Gate-Flip Checkpoint (2026-06-17)

M6는 코드/운영 게이트를 invite launch 직전까지 완료하고, 실제 production `VSL_ACCESS_MODE=invite` 전환은 사용자
명시 승인 지점으로 남겼다. 이 체크포인트는 "launch-ready, not live" 상태다.

- **Launch-flow E2E.** `server/test/launchFlow.test.ts`를 추가해 invite-mode bootstrap admin signup, admin invite mint,
  invited user verification, verified publish, gallery exposure, second user like/comment, comment report/hide, audit log,
  ban/login/react 차단, public handle/profile, sitemap, forgot/reset session revocation을 한 테스트에서 검증한다.
- **RED에서 찾은 gap.** 처음 작성한 flow는 기존 구현만으로 통과했다. 운영 큐 요구를 더 정확히 반영해 "reported comment를
  admin이 hide하면 관련 open comment reports가 resolved 처리되고 audit에 `report_resolved`가 남는다"는 기대를 추가했고,
  RED를 확인했다. `resolveOpenReportsForComment()`를 추가하고 comment-hide route에서 hide + report resolve audit를 함께
  기록하도록 고쳐 GREEN으로 만들었다.
- **Gate fixes.** 전체 gate에서 TypeScript/lint 문제가 드러났다. `ForgotPasswordForm` 누락 복원, `RuntimeConfig.rateLimit`
  overrides 타입 반영, gallery lockdown 410 status union 보강, publish service 미사용 변수 제거, ProfilePage의 effect 내
  동기 `setState` 제거를 수행했다.
- **Ops docs.** `docs/ops/launch-runbook.md`에는 access mode, invite 운영, account trust, moderation/audit, gallery lockdown,
  backup/restore, load smoke, launch go/no-go를 정리했다. `docs/ops/launch-qa-checklist.md`는 자동 gate 완료와 manual
  browser/production sign-off 대기 항목을 분리했다.
- **Load smoke.** in-memory API smoke(500 users, 500 chips, 2,500 likes, 1,000 comments, 30 runs)는 gallery trending
  p95 1.063ms, top p95 0.860ms, newest p95 0.635ms, detail/profile/sitemap p95 0.504ms 이하로 통과했다.
- **검증.** RED: `npm run test --workspace server -- launchFlow`가 reported comment queue 잔존으로 실패. GREEN:
  `npm run test --workspace server -- launchFlow moderationRoutes moderationService auditLog` 4파일/21테스트 통과.
  최종 gate: `npm test` client 77파일/395테스트 + server 61파일/238테스트 통과, `npm run build` 통과(기존 Vite
  >500kB chunk warning 유지), `npm run typecheck --workspace server` 통과, `npm run lint` 통과.
- **남은 체크포인트.** Browser 도구가 현재 세션에 노출되지 않아 manual browser QA는 문서 checklist에 pending으로 남겼다.
  실제 production gate flip(`VSL_ACCESS_MODE=invite`), live `/api/health` 확인, 첫 invite batch mint는 사용자 명시
  go/no-go 이후 수행한다.

## V5-M6 Admin Operations — Browser QA (2026-06-17)

이전 체크포인트에서 pending이던 admin operations UI(초대코드/댓글/유저/감사 로그)의 manual browser QA를 Playwright로
완료했다. `VSL_ADMIN_EMAILS=admin@vsl.test`, `VSL_ACCESS_MODE=open`으로 dev:server + client를 띄우고 admin 계정으로
검증했다.

- **Admin 접근.** admin 이메일로 가입하면 헤더에 `/admin` 링크가 노출되고 `/admin`이 Moderation 페이지를 렌더한다.
  비-admin은 기존대로 차단(코드/테스트 유지). nav의 "Admin" 라벨 2개는 버그가 아니라 `AccountNavLink`가 로그인 시
  displayName("Admin")을 표시한 우연이며 첫 링크는 `/account`, 둘째가 `/admin`이다.
- **초대코드.** max uses 5 / expiry 7d / note로 생성 → 목록에 `0/5 used · note · expires` 표기, 폼 리셋, Revoke 시
  목록에서 사라짐("No invite codes yet")을 확인.
- **유저 밴.** ban reason 입력 후 owner 밴 → "owner banned" 표기 + 버튼 "Unban owner" 토글, Unban으로 원복.
  서버 service에 추가한 `ownerUserId`/`ownerBannedAt`이 올바른 대상에 적용됨을 확인.
- **칩 모더레이션.** Hide → "hidden" + "Unhide" 토글, Unhide로 원복.
- **감사 로그.** 위 액션들이 newest-first로 즉시 기록됨: `hide_chip` → `ban_user`(detail에 사유 "QA: spam content"
  포함) → `unban_user` → `unhide_chip`. 각 항목에 targetType/targetId/timestamp 표기. invite revoke는 moderation
  route가 아니라 audit 미기록(설계대로).
- **댓글 신고 큐.** dev DB에 신고된 댓글이 없어 빈 상태("No reported comments")만 확인. hide/ban-author 동작은
  `AdminPage.test.tsx` + `launchFlow.test.ts`가 커버한다.
- **상태 원복.** QA로 변경한 dev DB 상태(PANTHER SCALE chip, M2 Browser owner)는 모두 visible/unbanned로 복구하고
  테스트 invite는 revoke했다. 콘솔 에러는 미로그인 `/api/me` 401과 favicon 404뿐(무해).

## V5-M6 Production-Build Verify + Go-Sequence Dress Rehearsal (2026-06-17)

런칭 게이트 flip 전 잔여 항목을 production 빌드에서 확인하고, 런북 "On go" 시퀀스를 로컬 prod 번들로 드레스
리허설했다. **실제 production 배포 환경은 이 워크스페이스에 없으므로**, 실제 flip(런타임 `VSL_ACCESS_MODE=invite`)은
배포 + owner go/no-go 이후의 인프라 동작으로 남는다.

- **Preview proxy 추가.** `vite.config.ts`에 `preview.proxy`(`/api` → `127.0.0.1:8787`)를 추가해 `vite preview`로
  서빙한 production 번들이 API에 닿게 했다(prod-build QA 상시 활용 목적의 영구 추가).
- **Verify page (prod build).** dev에서 StrictMode 이중호출로 "Verification Failed"를 잘못 띄우던 항목을 prod 번들에서
  재확인: 새 토큰 → "Email Verified", 재사용 토큰 → "Verification Failed". dev 전용 아티팩트는 prod에서 재현되지 않음.
- **Backup.** `npx tsx server/scripts/backup.ts server/data/vsl.sqlite backups`로 라이브(WAL) DB online backup 생성,
  `PRAGMA integrity_check`=ok, 핵심 테이블 row 확인. `backups/`는 `.gitignore`에 추가. `backup-restore.md`의 잘못된 DB
  경로(`virtual-silicon-lab.sqlite` → 실제 `server/data/vsl.sqlite`)를 수정하고 integrity-check/WAL sidecar 제거 절차를 보강.
- **Go-sequence 리허설(invite 모드, prod 번들).** ① `VSL_ACCESS_MODE=invite` 재시작 → ② `/api/health`가
  `"accessMode":"invite"` 반환(직접/preview proxy 모두) → ③ 가입 폼에 Invite Code 필드 필수화 확인 → ④ admin UI로 첫
  invite 발급(`ANXTNBS24CPI`, max 1, "launch batch 1") → ⑤ 해당 코드로 신규 가입 성공, invite 1/1 소진 확인 → ⑥ admin
  moderation(feature/unfeature) 수행, audit에 `feature_chip`/`unfeature_chip` 기록. 칩/owner 상태는 원복.
- **남은 것.** production 서버 호스팅(+`VSL_SESSION_SECRET`/`VSL_PUBLIC_BASE_URL`/영속 `VSL_DATA_DIR`·`VSL_UPLOAD_DIR`,
  런북 line 32대로 admin invite seed), owner go/no-go, 그 환경에서 `VSL_ACCESS_MODE=invite` 설정 + live `/api/health` 확인.

## V6-M0 Responsive Foundation (2026-06-18)

v6 "Mobile/Responsive"의 첫 마일스톤. 데스크톱 전용 뷰포트 바닥을 제거하고, 이후 v6 전 마일스톤이 의존할 768px
브레이크포인트 프리미티브와 모바일 헤더 내비게이션을 마련했다. **별도 모바일 라우트 트리 없이** 기존 단일 컴포넌트
트리를 반응형으로 리플로우하는 방향(스펙대로 DB/마이그레이션/신규 API 변경 없음).

- **단일 브레이크포인트 상수.** `src/lib/breakpoints.ts`에 `MOBILE_MAX_WIDTH = 767` + `MOBILE_MEDIA_QUERY =
  '(max-width: 767px)'`를 두어 CSS 미디어쿼리와 JS 훅이 같은 경계를 공유. `src/lib/`는 프레임워크 무관·무의존
  규칙대로 React import 없음.
- **`useIsMobile()` 훅.** `src/app/useIsMobile.ts` — `matchMedia`로 뷰포트를 반응형 구독, lazy `useState`
  초기화 + `change` 이벤트 구독으로 갱신. CSS가 스타일링을 담당하므로 이 훅은 "구조적으로 모바일 분기가 필요한"
  소수 지점(드로어 auto-close; M3 에디터 read-only 프리뷰)용. jsdom에 `matchMedia`가 없어 `src/test/setup.ts`에
  **데스크톱 기본**(`matches:false`) 스텁을 추가 — 기존 테스트 동작 보존, 훅 자체 테스트는 케이스별 override.
- **뷰포트 바닥 제거.** `src/styles.css` `body`의 `min-width: 1024px` 삭제. CSS-only 변경이라 grep + build로 검증.
- **모바일 내비게이션 드로어.** `SiteHeader`에 햄버거 토글(`aria-label` Open/Close menu,
  `aria-controls="primary-nav"`, `aria-expanded`) + `nav#primary-nav[data-open]`. 데스크톱은 가로 nav, `<768px`에서만
  토글 노출 + 고정 드로어. 뷰포트가 데스크톱으로 돌아오면 effect로 auto-close, Escape로도 닫힘. 링크 선택 시
  `onNavigate=closeMenu`로 자동 닫힘(`AccountNavLink`/`AdminNavLink`에 옵셔널 `onNavigate` prop 추가).
- **계획 대비 수정 2건.**
  ① 백드롭 버튼이 토글과 `aria-label="Close menu"`를 공유해 `getByRole` 충돌 → 백드롭은 장식적 dismiss 오버레이이므로
  `aria-hidden="true"`로 접근성 트리에서 제외(토글이 이미 라벨된 닫기 동작 제공).
  ② `react-hooks/set-state-in-effect` 린트가 두 effect의 setState를 지적 → 둘 다 뷰포트 외부 상태 동기화의 정당한
  사례라 `AdminPage.tsx`의 기존 관행대로 사유 주석과 함께 `eslint-disable-next-line` 적용.
- **게이트.** `npm test`(client 80 files/412 tests + server 62 files/241 tests), `npm run build`(알려진 >500kB 청크
  경고만), `npm run lint` 모두 green. 모바일 뷰포트 시각 확인은 V6-M4 QA로 이월. 브랜치 `v6-mobile-responsive`,
  M1–M4 잔여이므로 미병합.

## V6-M1 Public Read Surfaces (2026-06-18)

공개 read 표면(랜딩 `/`, 갤러리 리스트 `/gallery`, 갤러리 상세 `/gallery/:slug`, 공개 프로필 `/u/:handle`,
서버 렌더 share viewer `/s/:slug`)을 폰에서 가로 스크롤 없이 리플로우. **순수 CSS 리플로우** — 컴포넌트 구조/JS
변경 없음, 모든 신규 모바일 규칙은 `@media (max-width: 767px)`(V6-M0 브레이크포인트와 일치). M1–M4 계획 4건을
이번에 한꺼번에 작성(`docs/superpowers/plans/2026-06-18-v6-m1..m4-*.md`).

- **랜딩.** `.v2-landing__hero`가 `minmax(430px,0.9fr) minmax(560px,1.1fr)`(≈990px 최소폭)라 폰에서 하드
  가로 스크롤을 유발 → `<768px`에서 1열·`min-height:auto`·패딩 축소, 타이틀 `clamp(2.1rem,9vw,3.35rem)`,
  hero preview frame `min-height:360px`, featured 그리드/카드 1열, action 버튼 full-width.
- **갤러리 리스트 + 프로필.** 두 표면이 `gallery-grid`/`gallery-card`/`gallery-page__hero`를 공유 → 한 블록으로
  처리. 그리드는 이미 `auto-fit minmax(280px,1fr)`로 collapse되지만 `<768px`에서 명시적 1열 + hero 상단 패딩
  축소, featured row 1열.
- **갤러리 상세.** 기존 `@media (max-width: 860px)`(hero 1열 + spec 2열) 아래에 `767px` 블록 추가: spec 그리드
  1열, hero 패딩 축소, comment form 세로 스택.
- **share viewer(서버).** `server/src/share/viewer.ts`의 `BASE_STYLE`에 `@media (max-width:767px)` 추가
  (`.grid` 1열, `.wrap` 패딩 축소, h1 26px, `.cta` 세로 스택) — `renderViewerHtml`/`renderNotFoundHtml` 공통
  적용, OG/`poster.png` 동작 불변. emitted HTML에 `@media` 포함을 `shareHelpers.test.ts`로 문자열 assert(TDD).
- **게이트.** `npm test`(client 80 files/414 tests + server 62 files/242 tests), `npm run build`(알려진 청크
  경고만), `npm run typecheck --workspace server`, `npm run lint` 모두 green. 모바일 시각 확인은 V6-M4 QA로 이월. (M1)

## V6-M2 Account & Dashboard (2026-06-18)

계정/로그인(`/account` + verify/reset/forgot 상태), 프로젝트 대시보드(`/dashboard`), 온보딩/first-run을 폰에서
리플로우. 순수 CSS + Tailwind prefix만 — 컴포넌트 구조/JS 변경 없음.

- **대시보드.** `.v2-preset-grid`/`.v2-project-grid`가 `repeat(3, minmax(0,1fr))`라 360px에서 3열은 판독 불가
  → `@media (max-width: 767px)`에서 1열, `.v2-dashboard__header` 좌우 패딩 1.25rem(랜딩과 동일 거터),
  `.v2-preset-card` `min-height:auto`. `.v2-dashboard__inner`는 `max-width:1240px`(floor 아님)라 이미 폰에 맞음.
  new/random 액션은 `.v2-action-row`의 `flex-wrap`으로 이미 줄바꿈됨.
- **계정 페이지.** 이미 Tailwind 반응형(`max-w-3xl`, 입력 `w-full`, 2단은 `md:grid-cols-2`로 기본 1열). 두 최상위
  래퍼 `mx-auto max-w-3xl px-6 py-10`을 `px-4 py-8 ... sm:px-6 sm:py-10`로 변경해 폰 거터만 축소(데스크톱 불변).
  spec이 허용한 already-Tailwind 컴포넌트의 Tailwind prefix 사용(`sm`=640px). verify/reset/forgot도 같은 래퍼라
  함께 커버. AccountPage 테스트 16개 green(문자열 변경이라 동작 영향 없음).
- **온보딩.** first-run `FirstRunCoachmarks`는 **데스크톱 에디터 전용**이고 이미 `@media (max-width: 760px)`에서
  static 배치로 리플로우됨(styles.css:2872). 모바일 에디터(V6-M3)는 coachmark를 렌더하지 않음. 대시보드/계정의
  first-run 안내 텍스트는 Task 1/2로 리플로우 → M2에 신규 온보딩 코드 불필요(확인만).
- **게이트.** `npm test`(client 80 files/414 tests + server 62 files/242 tests), `npm run build`(알려진 청크
  경고만), `npm run typecheck --workspace server`, `npm run lint` 모두 green. 모바일 시각 확인은 V6-M4 QA로 이월. (M2)

## V6-M3 Editor Read-Only Mobile Preview (2026-06-18)

모바일에서 `/editor/:id`가 Konva 저작 셸 대신 **읽기 전용 미리보기**(공유 artwork 렌더 + fake spec + die/poster
export + share link + "Edit on desktop" CTA)를 렌더. 데스크톱 저작은 불변. v6의 유일한 구조적 마일스톤.

- **분기 위치.** `App.tsx`의 `EditorRoute`에서 `useIsMobile()`로 분기 — `EditorPage` **mount 전에** 결정해
  에디터의 stateful 훅(`useAutosave`/`useEditorShortcuts`/editor store)이 모바일에서 mount되지 않게 함(Rules of
  Hooks 준수). spec 문구는 "EditorPage가 분기를 렌더"였으나, EditorPage가 훅을 먼저 호출하므로 조기 return이
  불가 → 라우트에서 분기하는 것이 올바른 React 구조(효과는 동일).
- **`MobileChipPreview`.** `DieExportStage`와 동일한 `ChipArtwork project renderMode="die-only"` 경로를 재사용하되
  컨테이너 폭에 맞춰 `scale = width / die.width`로 표시 전용 Stage 렌더(`ResizeObserver`로 폭 측정). **export
  stage가 아님** — die `pixelRatio:4`/poster `3200x1800` raster 계약은 `ExportPanel`의 오프스크린 stage에 그대로.
  jsdom canvas 부재로 컨벤션대로 유닛테스트 제외(별도 파일이라 상위 테스트가 mock).
- **`MobileEditorPreview`.** 미리보기 + fake spec 섹션 + `PublishPanel`(게시 시 share link 복사) + `ExportPanel`
  (die/poster PNG) + "Edit on desktop" CTA 조합. `{ project }`만 받고 `persist` 미수신 → 로컬 JSON 읽기 전용,
  **로컬-퍼스트/비변형 보존**, DOM 스크레이프 없음. 컴포넌트 테스트는 Konva child·두 패널을 mock하고 spec/CTA 구조 assert(TDD).
- **App 레벨 테스트.** `App.test.tsx`는 `EditorPage`를 모듈 mock하므로, `MobileEditorPreview`도 모듈 mock하고
  "Remix N1 GREEN HORIZON"으로 프로젝트 seed + mobile `matchMedia` stub → `/editor/<id>`가 "Chip preview"를
  렌더하고 "Chip editor workspace"는 렌더하지 않음을 확인(데스크톱 기본 테스트들은 그대로 EditorPage mock 사용).
- **CSS.** `.mobile-editor-preview*`(1열·중앙·여유 패딩). 정의상 모바일 전용 표면이라 미디어쿼리 밖 기본 스타일.
- **게이트.** `npm test`(client 81 files/416 tests + server 62 files/242 tests), `npm run build`(알려진 청크
  경고만), `npm run typecheck --workspace server`, `npm run lint` 모두 green. Konva 표시/시각 확인은 V6-M4 QA로 이월. (M3)
