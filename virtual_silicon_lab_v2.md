# Virtual Silicon Lab — 요구사항 v2

v2는 v1 MVP의 기능 폭을 크게 늘리는 버전이 아니라, **웹 페이지 전체 디자인 + 에디터 디자인 + 출력 이미지 디자인을 전면 개선하는 visual major release**다. 목표는 `images/` 레퍼런스처럼 실제 반도체 기업이 보도자료에 사용할 법한 hero chip과 poster를 만들 수 있는 수준까지 시각 품질을 끌어올리는 것이다.

## v2 제품 목표

1. **웹 페이지의 전반적 디자인 향상.** 랜딩, 프로젝트 대시보드, 에디터, export 패널이 하나의 고급 시각 제품처럼 보여야 한다.
2. **칩 다이 편집 화면의 디자인 향상.** editor 자체가 실제 칩/패키지 press visual을 다루는 고급 실험실 도구처럼 보여야 한다.
3. **출력 이미지 디자인 변경.** die-only와 poster export가 v1의 "캔버스 캡처" 느낌을 넘어서, 기업 보도자료용 product image/architecture slide처럼 보여야 한다.
4. **10개 hero chip + poster 세트 완성.** v2 완료 시 10개 세트가 같은 품질 기준을 통과해야 한다.

## 기준 레퍼런스

`images/` 폴더의 실제 칩 관련 이미지들을 v2의 품질 기준으로 사용한다.

- Apple M 시리즈: 검은 패키지, 절제된 조명, 고급 제품 사진 톤, 제한된 색상.
- Intel architecture/tile 이미지: 어두운 배경, 패키지/다이 분해도, 발표 슬라이드형 정보 구조.
- NVIDIA/MediaTek 이미지: 강한 초록 glow, 회로 바닥, angled chip hero composition.
- Qualcomm Snapdragon 이미지: 빨강/검정, 투명한 구조 레이어, badge 중심 제품 이미지.
- Die shot 이미지들: 실제 반도체 다이처럼 보이는 타일 밀도, 미세 선, 금속/실리콘 질감.

레퍼런스는 그대로 복제하는 대상이 아니라, **조명, 물성, 밀도, 구도, 대비, 배경 처리, 타이포 위계**를 추출하는 기준이다.

## 확정 범위

### 포함

- 데스크탑 웹 UI 전면 재디자인.
- 랜딩/대시보드/에디터/export 흐름의 visual system 재구성.
- 페이지 테마 전환: `laboratory`, `anime`, `space`.
- 기본 페이지 테마: `laboratory`.
- 에디터 canvas 주변 환경 개선: stage frame, inspector, toolbar, preview, material controls, status/readout.
- 현재 Konva 기반 칩 렌더링 품질 개선.
- 2D texture/material/preset 품질 개선.
- 향후 Three.js 같은 진짜 3D 도입이 가능하도록 renderer 경계를 정리.
- 출력 poster layout 전면 개선.
- AI 없이 동작하는 random chip generator.
- 10개 curated hero chip + poster 세트.
- `implementation.md`에 v2 구현 중 결정, trade-off, 보류사항 지속 기록.

### 제외

- 모바일/반응형 지원.
- 진짜 3D 렌더링.
- AI 생성/추천.
- 결제/수익화.
- 실제 반도체 제조/EDA 호환성.
- 백엔드, SQLite, 로그인/회원가입/회원정보 수정/회원탈퇴, 회원 CRUD.
- 게시판, gallery, ranking, contest, 공개 커뮤니티 기능.
- 공개 서비스 운영.

초기 `docs/v2-questions.md`에는 백엔드/게시판을 v2에 포함한다는 답변이 남아 있지만, 이후 결정으로 v2는 visual/design 범위만 다루고 백엔드/계정/게시판은 v3 이후로 연기한다.

## 유지할 계약

- 저장/내보내기 모델은 일단 **단일 JSON schema**를 유지한다.
- 단일 JSON schema를 버리거나 저장 구조를 크게 바꾸려면 구현 전에 사용자에게 확인한다.
- local-first 구조와 IndexedDB/localStorage fallback은 유지한다.
- export는 editor DOM 캡처가 아니라 dedicated Konva stage 기반이어야 한다.
- v1 기능은 더 나은 UX를 위해 바꿀 수 있지만, 프로젝트 생성/저장/편집/export의 기본 흐름은 깨지면 안 된다.

## 디자인 방향

### Page Themes

- `laboratory`: 기본 테마. 어두운 graphite/black 바탕, 고급 실험실 장비, 차가운 cyan/white readout, 정돈된 도구 UI.
- `anime`: 과장된 edge light, 선명한 accent, mecha/interface 감성. 장식은 강하되 작업 흐름을 가리지 않는다.
- `space`: deep black, orbit/stellar lighting, 넓은 배경감, glass/metal panel.

페이지 테마는 app shell, 랜딩, dashboard, editor chrome의 분위기를 바꾸며, 칩 자체의 die visual theme과는 분리한다. 단, 둘이 충돌하지 않도록 shared token bridge를 둔다.

### Chip Visual

- 칩은 단순 컬러 블록의 배열이 아니라 package/substrate/die/metal line/micro tile/glow/readout layer가 겹친 물체처럼 보여야 한다.
- 진짜 3D는 하지 않지만, 2D 안에서 조명 방향, 그림자, bevel, depth cue, reflection, material texture를 사용한다.
- 실제 다이를 세세히 묘사할 필요는 없다. 사용자가 느끼기에 "진짜 칩 관련 press image"처럼 보이면 된다.

### Editor Visual

- editor는 결과물을 만드는 도구이면서 그 자체로 멋있어야 한다.
- viewport는 "하얀 작업 캔버스"가 아니라 제품 촬영/분석 stage처럼 보여야 한다.
- toolbar/side panel/export panel은 기능을 가리지 않는 밀도 높은 tool surface여야 한다.
- cards 안에 cards를 중첩하거나 landing-page hero처럼 과하게 설명하는 UI는 피한다.

### Poster Visual

- poster는 세 종류의 press format을 지원하는 방향으로 설계한다.
  - `press-hero`: 제품 사진형 hero chip.
  - `architecture-slide`: Intel식 구조 설명/스펙 슬라이드.
  - `product-closeup`: Qualcomm/NVIDIA식 가까운 칩 제품 이미지.
- 모든 poster 효과는 export stage에서 재현되어야 한다.
- poster는 `3200x1800` 출력 기준에서 글자, 선, glow, 배경이 선명해야 한다.

## v2 완료 기준

- 데스크탑 Chrome에서 랜딩 → 대시보드 → 프리셋/랜덤 생성 → 에디터 편집 → poster export 흐름이 끊기지 않는다.
- `laboratory`, `anime`, `space` 페이지 테마가 주요 화면에서 작동한다.
- editor 화면이 `images/` 레퍼런스의 chip press visual과 같은 시각 언어를 가진다.
- 10개 hero chip + poster 세트가 품질 rubric을 통과한다.
- die-only와 poster export가 DOM 의존 효과 없이 Konva output으로 품질을 유지한다.
- `npm test`와 `npm run build`가 통과한다.

## 품질 Rubric

각 hero chip/poster는 아래 항목을 통과해야 한다.

- **Composition:** 칩이 첫눈에 주인공으로 읽히고, crop/scale/angle이 어색하지 않다.
- **Material:** package, die, metal, glow가 서로 다른 물성으로 보인다.
- **Density:** 다이가 빈 블록 배열처럼 보이지 않고 충분한 미세 구조를 가진다.
- **Lighting:** 조명 방향과 shadow/glow가 일관적이다.
- **Typography:** poster text가 제품 보도자료처럼 정돈되어 있고, 칩을 방해하지 않는다.
- **Theme Fit:** page theme과 chip/poster theme이 충돌하지 않는다.
- **Export Fidelity:** 브라우저 화면과 exported PNG 사이에 치명적 차이가 없다.

## v3 이후 후보

- 백엔드 + SQLite.
- 계정/회원 CRUD.
- 게시판/gallery/ranking/contest.
- 공개 공유 링크.
- 모바일 viewer/editor.
- 진짜 3D/Three.js renderer.
- AI prompt 기반 생성.
