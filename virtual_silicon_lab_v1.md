# Virtual Silicon Lab (가칭) — 가상 반도체 창작 웹 플랫폼 요구사항 v1

> 이 문서는 구현 에이전트(Claude Code / Codex)가 바로 빌드 계획을 세울 수 있도록
> **v1(즉시 구현) / 후순위(post-MVP) / 제외**를 명확히 분리한 스펙이다.
> 각 기능에는 구현 방법, AI 단독 구현 난이도, 완료 기준(acceptance)을 함께 적는다.

---

## 0. TL;DR (에이전트가 먼저 읽을 것)

- **무엇:** 가상의 반도체 칩 다이를 2D 캔버스에서 조립·꾸미고, 고해상도 칩 이미지와 홍보 포스터(PNG)로 내보내는 **창작 도구**. 실제 제조·동작은 일절 고려하지 않는다.
- **본질:** "EDA 툴"이 아니라 **"칩 미감을 위한 크리에이티브 플랫폼(가상 칩판 Dribbble)"**. 게임 아님.
- **톤:** 진지한 연구소가 아니라 **병맛·초현실·Sci-Fi 창작** 우선. 핵심 매력은 "의식 프로세서 / 꿈 신스" 같은 판타지 블록과 웃긴 가짜 스펙 시트.
- **타겟:** 칩의 미감·아이디어를 좋아하지만 **EE 실무자는 아닌 사람**. (회로 로직에 진심인 사람은 이미 Cadence를 써봤으므로 타겟 아님.)
- **목적:** 취미/포트폴리오 프로젝트. → **"완성"과 "한눈에 멋진 비주얼"이 최우선.** 기능 폭보다 완성도.
- **엔진 결정:** **웹 유지(확정).** Unity 검토했으나 코어가 2D 캔버스+이미지 익스포트라 웹이 정답. Unity는 실시간 3D/게임플레이로 피벗할 때만 재검토.
- **MVP 빌드 스택:** Vite + React + Zustand + Konva + Tailwind, **백엔드 없음**, 정적 호스팅. 저장은 IndexedDB(localStorage 폴백).

---

## 1. 제품 정의

### 한 줄 설명
> 사용자가 "꿈의 반도체"를 2D로 조립·연출하고, 테크 키노트 같은 홍보 이미지로 내보내는 창작 웹 도구.

### 핵심 원칙 (우선순위 순)
1. **완성 가능성 > 기능 수.** 1인 + AI로 끝까지 갈 수 있는 범위만 v1.
2. **시각 품질이 곧 제품.** 글로우/네온/금속질감/익스포트가 아마추어 같으면 전부 실패. 엔지니어링 자원의 절반 이상을 여기에.
3. **5분 안에 멋진 칩.** 빈 캔버스가 아니라 프리셋·스타일 테마에서 시작.
4. 실제 제조 가능성·동작 가능성은 **무시**. 원형 다이, 비대칭, 의식 프로세서 등 전부 허용.
5. 톤은 **병맛·창작·Sci-Fi 유머**가 메인. "기업 연구소 진지함"은 흉내내지 않는다.

### 디자인 레퍼런스 (Cadence/Synopsys EDA 외형 ❌)
- 실제 die shot(다이 현미경 사진)의 색·질감·격자감
- Sci-Fi 게임 UI (Destiny / Star Citizen 메뉴류)
- 애플 실리콘 키노트 슬라이드 (다크 배경 + 발광 + 미니멀 타이포)
> **착수 전 레퍼런스 보드부터 모을 것.** 디자인 방향의 기준점이자 아마추어 함정의 최대 방어책.

---

## 2. 타겟 사용자

### 핵심 타겟 (한 줄로 좁힘)
- **칩의 미감·세계관·아이디어를 좋아하지만 EE 실무자는 아닌 사람.**
- 구체: 얼리어답터, 레트로 컴퓨팅 팬, Sci-Fi 창작자/세계관 빌더, 컨셉 아티스트, 하드웨어 취미인, 신스/오디오 애호가.

### 타겟 아님
- 회로 로직 정합성을 원하는 전자공학 실무자 (그들은 진짜 EDA를 쓴다).

---

## 3. 기능 분류 (★ 핵심 산출물)

표기:
- **AI 난이도** = "Claude Code/Codex 단독 구현" 기준. *낮을수록* 안전.
  - 🟢 안전 (웹에 레퍼런스 많고 결과를 눈으로 바로 검증 가능)
  - 🟡 주의 (사람이 디자인/디버깅 방향을 짚어줘야 함)
  - 🔴 위험 (좌초 가능성 높음)

### 3.1 v1 — 즉시 구현 (MVP)

| 기능 | 구현 방법 | AI 난이도 |
|---|---|---|
| 로그인 없이 즉시 시작 | 라우팅만, 인증 없음 | 🟢 |
| 프로젝트 생성/복제/삭제 | Zustand 상태 + IndexedDB 영속화 | 🟢 |
| 자동 저장 / 로컬 저장 | IndexedDB(idb 라이브러리), debounce 저장 | 🟢 |
| 칩 에디터 캔버스 | Konva: 줌/팬/그리드/스냅 | 🟢 |
| 다이 형태 | 사각형·정사각형·원형·육각형 (프리셋 형태) | 🟢 |
| 블록 배치 (현실 블록) | CPU/GPU/DSP/SRAM/Cache/DAC/ADC/PLL/IO/USB — Konva 노드, 드래그/리사이즈. 블록은 다이 경계 밖으로 이동·리사이즈되지 않도록 제한 | 🟢 |
| 블록 배치 (판타지 블록) | Emotion Engine/Dream Synth/Quantum Memory/Consciousness Processor/Reality Distortion Unit/Time Core | 🟢 |
| 기본 편집 UX | undo/redo, 선택 삭제, 복제, 앞/뒤 순서 변경, 키보드 단축키 | 🟢 |
| **프리셋 조립형 (파라메트릭/리믹스)** | 멋진 베이스 칩에서 시작 → 블록·색·배치 변형. **v1의 중심.** | 🟢 |
| **스타일 테마 원클릭** | 네온/레트로/밀리터리/키노트 등 테마 선택 시 다이 전체 톤 통일. **최대 차별점.** | 🟢 |
| 장식: 글로우/네온 라인/금속 질감/라벨/경고 마크 | 출력 대상 효과는 **Konva 노드의** `shadowBlur`, 그라디언트, 필터, blend 설정으로 구현. 셰이더 미사용. DOM/CSS 효과는 에디터 UI에만 사용 | 🟡 |
| 가짜 스펙 시스템 | 폼 입력(브랜드/시리즈/세대/가짜 공정/코어 수/대역폭/특수 기능/설명). 병맛 스펙 시트 자동 레이아웃. 예시 시트 동봉. | 🟢 |
| **PNG 내보내기 2종 (고해상도/고DPI)** | `die-only PNG`: 칩 다이만 출력. `poster PNG`: 별도의 export 전용 Konva Stage에서 배경·칩·타이포·가짜 스펙 시트를 합성. `toDataURL({pixelRatio})` → 다운로드 | 🟡 |
| 이미지 공유 버튼 | PNG 다운로드 + Web Share API(가능 시). **서버 불필요.** | 🟢 |
| Hero 칩 3~5개 큐레이션 | 직접 만든 모범 예시 + 랜딩/README 상단 노출 (포트폴리오 핵심) | 🟢 |

### 3.2 후순위 — post-MVP (v1 완성 후, 여유/욕심 생기면)

| 기능 | 구현 방법 | AI 난이도 | 미루는 이유 |
|---|---|---|---|
| 자유 설계형(커스텀 다이/사이즈 직접) | Konva 커스텀 패스 | 🟡 | v1은 프리셋으로 "5분 멋진 칩" 달성이 우선. 자유 설계는 공허해지기 쉬움 |
| 셰이더 비주얼 (glitch, 블룸, 고급 글로우) | PixiJS 필터 또는 Three.js shader | 🟡 | 셰이더는 에러 없이 "이상하게" 나와서 디버깅이 사람 의존. Konva 기본 효과의 한계가 보일 때 도입 |
| 간단 시뮬레이션 (전력 흐름/활성화 애니메이션) | CSS keyframe + SVG path animation | 🟡 | 효과는 좋으나 핵심 아님. 일부는 CSS로 가능 |
| 프로젝트 공유 (편집 가능 링크/리믹스) | Supabase(DB+스토리지), 공유 ID | 🟡 | 백엔드 도입 필요. 리텐션 효과는 여기서 나오지만 취미/포폴엔 과함 |
| 가짜 3D 뷰 (isometric 기울임+그림자+패럴랙스) | 2D 트릭(CSS transform) | 🟢 | "진짜 3D 없이 3D 느낌". 진짜 Three.js 전에 이걸로 충분 |
| 커뮤니티 (갤러리/랭킹/콘테스트) | Supabase + 별도 페이지 | 🟡 | 공유 인프라 선행 필요 |
| AI 랜덤/프롬프트 칩 생성, 스타일 추천 | API 연동 | 🟡 | 부가 기능 |
| 칩 세계관/시리즈 설정 페이지 | 메타데이터 모델 확장 | 🟢 | 리텐션 보조 |
| 반응형/모바일 | Tailwind 브레이크포인트 | 🟡 | v1은 데스크탑 우선 |

### 3.3 제외 (v1에서 손대지 말 것)

| 기능 | 제외 이유 |
|---|---|
| **진짜 3D 뷰어 (Three.js 실 3D)** | 🔴 카메라/라이팅/지오메트리 디버깅이 좌초 1순위. 원하면 "가짜 3D"(3.2)로 대체 |
| MP4 턴테이블 / 애니메이션 익스포트 | 3D + 인코딩 의존, 무거움 |
| 로그인/계정 | v1 인증 불필요(로컬 저장) |
| GDSII / DRC / LVS / 타이밍 분석 / 합성 / 제조 호환성 | 이 프로젝트는 엔지니어링 툴이 아님. 영구 제외 |

---

## 4. 데이터 모델 (구현 착수용 스케치)

> 아래 타입은 고정 계약이 아니라 출발점이다. 실제 구현 과정에서 필드는 추가·삭제할 수 있다.
> IndexedDB에 저장한 기존 프로젝트를 안전하게 읽을 수 있도록 `schemaVersion`을 두고 필요 시 마이그레이션한다.

```ts
type Project = {
  schemaVersion: number
  id: string
  name: string
  createdAt: number
  updatedAt: number
  die: Die
  blocks: Block[]
  decorations: Decoration[]
  theme: StyleTheme          // 원클릭 테마
  spec: FakeSpec             // 가짜 스펙 시트
}

type Die = {
  shape: 'rect' | 'square' | 'circle' | 'hexagon'
  width: number
  height: number
  background: string         // 색/그라디언트/질감 프리셋 키
}

type Block = {
  id: string
  type: BlockType            // 'CPU' | 'GPU' | ... | 'ConsciousnessProcessor' | ...
  category: 'real' | 'fantasy'
  x: number; y: number; w: number; h: number; rotation: number
  label?: string
  glow?: boolean
  colorOverride?: string
  zIndex?: number
}

type Decoration =
  | { id: string; kind: 'neonLine'; points: number[]; color: string; zIndex?: number }
  | { id: string; kind: 'warningMark'; x: number; y: number; zIndex?: number }
  | { id: string; kind: 'label'; x: number; y: number; text: string; zIndex?: number }
  | { id: string; kind: 'sciFiObject'; assetKey: string; x: number; y: number; zIndex?: number }

type StyleTheme = 'neon' | 'retro' | 'military' | 'keynote' | 'mono'

type FakeSpec = {
  brand: string; series: string; generation: string
  process: string           // 예: "0.5nm 영혼각인"
  cores: number; bandwidth: string
  features: string[]; description: string
}
```

> 데이터는 처음부터 **단일 JSON으로 export 가능한 구조**로 둘 것. (후속 프로젝트 공유/리믹스가 이 구조 위에서 동작.)
> 타입 안정성은 유지하되, 구현 중 요구사항이 구체화되면 타입과 마이그레이션을 함께 갱신한다.

---

## 5. 권장 기술 스택

### v1 (백엔드 없음, 정적 배포)
- **빌드:** Vite (Next.js 불필요 — SSR/서버 기능 안 씀)
- **UI:** React + TypeScript + Tailwind CSS
- **상태:** Zustand
- **캔버스:** **Konva** (레이어/노드 모델이 칩 블록에 적합, 익스포트 깔끔. Fabric.js 대신 권장)
- **저장:** IndexedDB (`idb`), 폴백 localStorage
- **호스팅:** Vercel / Netlify / GitHub Pages (정적)

### post-MVP에서 추가
- **공유/커뮤니티:** Supabase (DB + 스토리지)
- **고급 비주얼:** PixiJS(2D 셰이더 필터) 또는 Three.js(가짜/진짜 3D)

---

## 6. 권장 빌드 순서 (에이전트용 phase)

> 아래 순서는 권장안이다. 구현 편의와 검증 효율에 따라 phase를 재배치하거나 얇은 수직 슬라이스로 진행해도 된다.

1. **Phase 0 — 기반:** Vite+React+TS+Tailwind+Zustand 셋업, 라우팅, IndexedDB 영속화, 프로젝트 CRUD.
2. **Phase 1 — 캔버스 코어:** Konva 캔버스, 줌/팬/그리드/스냅, 다이 형태 4종, 블록 드래그/리사이즈/회전, 다이 경계 제한, 기본 편집 UX.
3. **Phase 2 — 비주얼(★최우선 품질):** Konva 노드 기반 글로우·네온·금속질감, 스타일 테마 원클릭, 장식(라벨/경고/네온 라인).
4. **Phase 3 — 프리셋:** 파라메트릭 프리셋 칩 5~8종, 리믹스(프리셋에서 시작→변형).
5. **Phase 4 — 스펙 & 익스포트:** 가짜 스펙 시트 폼+레이아웃, die-only PNG, export 전용 Konva Stage 기반 poster PNG, 이미지 공유 버튼.
6. **Phase 5 — 마감:** Hero 칩 3~5개 큐레이션, 랜딩 페이지, README + 데모 GIF.

> Phase 2의 비주얼 품질이 미달이면 다음 Phase로 넘어가지 말 것. 이 프로젝트는 비주얼이 곧 제품이다.

---

## 7. MVP 완료 기준 (Acceptance)

- [ ] 로그인 없이 진입해 30초 내 첫 블록 배치 가능
- [ ] 프리셋에서 시작해 **5분 내** 발표 자료급 칩 1개 완성 가능
- [ ] 스타일 테마 1클릭으로 다이 전체 톤이 일관되게 바뀜
- [ ] 글로우/네온이 "아마추어 같지 않게" 보임 (Hero 칩 기준 통과)
- [ ] 판타지 블록 + 병맛 가짜 스펙 시트로 "웃기고 멋진" 결과 생성 가능
- [ ] undo/redo, 선택 삭제, 복제, 앞/뒤 순서 변경이 동작
- [ ] 블록을 이동·리사이즈해도 다이 경계 밖으로 나가지 않음
- [ ] 고해상도 die-only PNG와 poster PNG 내보내기 + 공유 버튼 동작
- [ ] 새로고침/재방문 후에도 프로젝트 보존 (IndexedDB)
- [ ] 데스크탑 Chrome에서 끊김 없는 UX

---

## 8. 비기능 요구사항
- 데스크탑 우선 (반응형은 후순위)
- 자동 저장 필수
- 부드러운 캔버스 인터랙션 (60fps 목표)

---

## 9. 면책 조항
이 플랫폼은 가상의 반도체 창작 및 시각화만을 목적으로 한다. 여기서 만든 레이아웃은 실제 반도체 제조·엔지니어링에 사용할 수 없다.
