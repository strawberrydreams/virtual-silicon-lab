# v7 / v8 로드맵 설계 — Visual Depth & AI-assisted Creation

- 작성일: 2026-06-18
- 상태: 사용자 승인된 목표 설계 (구현 계획은 별도 문서; v7·v8 모두 방향+마일스톤 개요. 상세
  bite-sized plan은 각 마일스톤 착수 직전 just-in-time으로 작성)
- 선행: v1 MVP, v2 Visual Major, SoC Custom Studio, v3 Share Core, v4 Community(M0~M4),
  v5 Public Launch(launch-ready), **v6 Mobile/Responsive(M0~M4, 0.4 라인) 완료** — v5/v6 외
  나머지는 모두 `main`에 머지. v6는 `v6-mobile-responsive` 브랜치에서 PR #5로 머지 완료.

## 배경 — 버전 번호 재정렬

2026-06-16 로드맵(`docs/superpowers/specs/2026-06-16-v5-v6-roadmap-design.md`)은 **v6를
"Visual Depth"(3D 쇼케이스·MP4·셰이더)** 로 잡았고, 모바일은 "v7 이후 후보"로 미뤘다. 그러나
이후 우선순위가 바뀌어 **모바일/반응형이 v6(0.4)로 먼저 출시**되었고, Visual Depth는 아직
구현되지 않은 채 개요(`docs/superpowers/plans/2026-06-16-v6-visual-depth-roadmap.md`)로만 남아 있다.

이 문서는 그 어긋남을 다음과 같이 정리한다.

| 항목 | 결정 |
|---|---|
| v7 방향 | **Visual Depth** — 기존 "v6 Visual Depth" 방향을 그대로 v7(0.5)로 재배치 |
| v8 방향 | **AI-assisted Creation** — 신규. 프롬프트→칩, 네이밍/스펙 카피, 레이아웃 제안, 리믹스 변형 |
| 기존 Visual Depth 개요 문서 | 내용은 보존하되 "v7로 재번호" 한 줄 주석을 추가하고 본 문서를 가리키게 함. 실제 재작성은 v7-M0 착수 시 |
| 계획 깊이 | v7·v8 모두 **방향+마일스톤 개요**. 상세 bite-sized plan은 각 마일스톤 착수 직전(v3~v6 선례) |
| 불변식 | local-first 편집(IndexedDB) 유지 · Konva 2D export 계약 불가침 · `src/domain/` 순수성 유지 — 신규는 모두 additive · 비주얼 품질 게이트 적용 · 관리자(`/admin`)는 데스크톱 전용 |

---

## v7 — "Visual Depth" (0.5)

### 한 줄 목표

2D Konva 편집을 그대로 두고, 완성한 칩을 **3D 쇼케이스(턴테이블/오빗) + 영상(MP4) export +
셰이더급 비주얼**로 한 단계 깊게 보여준다. 칩 미학을 극대화하는 v7 시그니처 비주얼 층이다.

### 핵심 원칙 (2026-06-16 설계에서 승계, 변경 없음)

- **2D가 source of truth.** 3D는 기존 serializable `Project` JSON에서 **파생되는 별도·additive
  렌더 경로**(Three.js)다. 편집 표면은 계속 Konva 2D이며, 정통 3D 편집은 비채택.
- **Konva 2D export 불변식 불가침.** die-only/poster PNG export는 그대로 Konva `toDataURL`
  (die `pixelRatio:4`, poster `3200x1800`). 3D 뷰·MP4는 **새 export 경로**로 추가될 뿐 기존 PNG
  계약을 바꾸지 않는다.
- **번들 격리.** Three.js/영상 인코더는 lazy-load·코드 분할로 격리(현재 이미 >500kB 청크 경고
  존재). 3D 뷰를 열지 않으면 코어 번들·에디터 2D 경로에 영향이 없어야 한다.
- **비주얼 품질 게이트.** 3D가 어설프면 의미가 없다 — M0 레퍼런스 보드 기준 수동 리뷰 유지.
- **파생 규약(2D→3D 매핑)이 핵심.** 파생 로직은 React/Konva 밖 순수 모듈로 두어 도메인/비주얼
  헬퍼처럼 유닛 테스트한다.

### 마일스톤 (개요 — 상세는 각 착수 시)

| 마일스톤 | 내용 |
|---|---|
| **v7-M0** | 3D 쇼케이스 기반(+ feasibility 스파이크 선행): Three.js 통합(동적 import), `Project`(die+blocks) → 레이어드/압출 3D 칩 모델 파생(순수 모듈), 옵셔널 orbit/turntable 뷰어(에디터 아님, 뷰). 2D→3D 매핑 계약 확립. **게이트:** 실제 칩이 JSON에서 알아볼 수 있게 3D로 렌더되고, 3D 뷰 미오픈 시 2D 경로·번들 무영향 |
| **v7-M1** | 3D Material & Lighting: 기존 `materialRecipes`/테마 토큰 → 3D PBR-ish 머티리얼·emissive glow·환경광. "한눈에 멋지게" 게이트의 핵심. **게이트:** 3D 쇼케이스가 수동 비주얼 품질 리뷰 통과 |
| **v7-M2** | Turntable & Animation: 카메라 턴테이블 + 미묘한 레이어/glow 루프 애니메이션. 순수 키프레임 로직은 테스트, 렌더는 브라우저 확인. **게이트:** 타깃 데스크톱에서 jank 없는 부드러운 루프 |
| **v7-M3** | MP4 / GIF Export(최난도 feasibility): 턴테이블/애니를 브라우저 인코딩(WebCodecs 우선, ffmpeg.wasm 폴백)으로 영상화 — 신규 export 경로, 인코더 lazy-load. **게이트:** 다운로드 가능한 올바른 해상도의 쇼케이스 영상, 기존 PNG export 불변 |
| **v7-M4** | 셰이더급 2D 강화(옵션): PixiJS/WebGL 필터 레이어로 2D 에디터/export glow·material 충실도 향상. 도입 여부는 착수 시 확정(M1~M3가 격차를 메우면 드롭 가능). **게이트:** Konva PNG export 계약 유지(편집 전용 DOM/CSS 효과가 export로 새지 않음) |
| **v7-M5/M6** | 통합·성능·QA: 3D 성능 예산 + 저사양 폴백(WebGL 불가 시 정적 포스터), 갤러리/공유에 3D 쇼케이스·MP4 노출, 최종 회귀+브라우저 QA. **게이트:** 게이트 green + 3D/인코더 코어 번들 분리 + local-first/Konva export 불변식 유지 |

### v7 완료 기준

- 실제 칩이 자신의 `Project` JSON에서 3D로 알아볼 수 있게 렌더되고, 3D 머티리얼/라이팅이 v2 미학과
  일관되게 프리미엄하다(비주얼 게이트 통과).
- 턴테이블 영상(MP4)을 다운로드할 수 있고, **기존 die-only/poster PNG export 계약은 불변**이다.
- Three.js/인코더가 코드 분할되어 3D 뷰를 열지 않는 한 코어 번들·에디터 2D·서버 부재 시 로컬
  편집/저장/export에 회귀가 없다.
- 갤러리/공유에서 3D 쇼케이스·영상을 만날 수 있다.
- `npm test`·`npm run build`·서버 typecheck·lint 모두 green.

---

## v8 — "AI-assisted Creation" (0.6)

### 한 줄 목표

2D 로컬-퍼스트 오써링 파이프라인 위에, **AI로 칩을 만들고 다듬는** 시그니처 창작 층을 얹는다.
프롬프트로 시작 칩을 생성하고, 이름/가짜 스펙 카피를 쓰고, 현재 칩에 레이아웃을 제안하고, 변형을
뽑는다 — 모두 서버 측이며, 결과물은 편집 가능한 **평범한 로컬 `Project`** 가 된다.

### 핵심 결정

- **AI는 `Project`를 직접 만들지 않는다.** 모델은 **제약된 중간 표현**(structured outputs —
  `output_config.format`의 json_schema, 혹은 tool use)을 반환하고, 서버가 이를 **기존 순수
  `src/domain/` factory**로 매핑해 유효한 `Project` JSON을 만든다. 따라서 잘못된 AI 출력이 invalid
  프로젝트를 만들 수 없고, `src/domain/`이 단일 진실원으로 남으며, **로컬-퍼스트가 유지**된다(AI는
  옵션 — 서버를 꺼도 에디터는 정상; 생성된 칩은 평범한 로컬 프로젝트가 됨).
- **전부 서버 측, 클라이언트는 API 키를 절대 보지 않는다.** Hono `server/` 워크스페이스에서
  공식 `@anthropic-ai/sdk`로 호출하고 `ANTHROPIC_API_KEY`는 서버 환경 변수로만 둔다. 프로바이더는
  인터페이스 뒤로 격리(v5 이메일 프로바이더 선례)하고, dev/test는 fake로 둬 결정론적으로 테스트한다.
- **모델 선택.** 프롬프트→레이아웃(가장 어렵고 structured)은 기본 `claude-opus-4-8`. 가벼운
  네이밍/스펙 카피는 비용 절감용으로 `claude-haiku-4-5`를 쓸 수 있게 설정 노출(owner 결정).
  structured output은 `output_config: {format: {type: "json_schema", schema}}`로 강제.
- **접근·비용 모델.** 인증(검증된 계정) + 기존 rate-limiter + **사용자별 일일 생성 쿼터**(신규,
  비용 상한). `invite`/공개 게이트 자세와 일관.
- **안전.** 사용자 프롬프트가 외부 LLM으로 나가므로 프롬프트 로깅 + 기존 모더레이션/안전 자세를
  적용한다. 거부/실패는 생성 플로우를 깨지 않게 설계(명확한 안내·폴백).
- **신규 외부 의존성은 Anthropic API 호출뿐.** 새 스키마는 쿼터/사용량 추적 + 프롬프트 기록용
  `012_ai_*` 마이그레이션. 편집/저장/export 경로에는 스키마 변경 없음.

### AI 기능 4종

1. **프롬프트 → 칩 레이아웃**(시그니처): 분위기 문장 입력 → die 형태·블록·장식·테마를 생성해
   유효한 `Project` JSON으로 emit, 이후 완전히 로컬 편집 가능.
2. **AI 네이밍 + 가짜 스펙 카피**(가장 가벼움, 첫 마일스톤): 기존 칩의 초현실 제품명·태그라인·가짜
   스펙 시트 생성.
3. **AI 레이아웃 제안**: 현재 칩 기준으로 블록 추가/재배치를 제안 → 사용자 수락/거절.
4. **AI 리믹스/변형**: 기존 칩에서 N개 스타일 변형(리컬러·리테마·재배치)을 새 로컬 프로젝트로 생성.

### 마일스톤 (개요 — 상세는 각 착수 시)

| 마일스톤 | 내용 |
|---|---|
| **v8-M0** | 서버 AI 기반: 프로바이더 인터페이스(+ dev/test fake), `@anthropic-ai/sdk` 통합, `012_ai_*` 마이그레이션(사용자별 일일 쿼터·사용량·프롬프트 기록), 인증+rate-limit+쿼터 가드, 중간 표현→`src/domain/` factory 매핑 계약. **게이트:** fake 프로바이더로 쿼터/가드 동작, 매핑이 항상 유효한 `Project` 생성 |
| **v8-M1** | AI 네이밍 + 가짜 스펙 카피(가장 작은 표면): 기존 칩 → 제품명/태그라인/가짜 스펙 생성, 에디터에서 수락/적용. **게이트:** 생성 카피가 기존 `FakeSpec`에 정상 반영, 서버 부재 시 무회귀 |
| **v8-M2** | 프롬프트 → 칩 레이아웃(시그니처): 분위기 문장 → 중간 표현 → factory → 유효 `Project`, "내 프로젝트로" 저장 후 로컬 편집. **게이트:** 잘못된/거부된 AI 출력이 invalid 프로젝트를 만들지 않음, 생성 칩이 die 클램프·z-order 등 도메인 불변식 충족 |
| **v8-M3** | AI 레이아웃 제안: 현재 칩 기준 블록 추가/재배치 제안 → 수락/거절 적용(undo 가능). **게이트:** 제안 적용/거절이 기존 편집 명령·undo 스택과 일관 |
| **v8-M4** | AI 리믹스/변형: 기존 칩 → N개 변형을 새 로컬 프로젝트로. **게이트:** 변형이 독립 편집 가능한 로컬 복제, 소스 불변 |
| **v8-M5** | QA·비용 하드닝: 쿼터/rate-limit 튜닝, 프롬프트 abuse 방어, 비용 모니터링, E2E(프롬프트→생성→편집→저장), 최종 게이트. **게이트:** 게이트 green + local-first 무회귀 |

### v8 완료 기준

- 검증된 계정이 **프롬프트 → 칩 생성 → 로컬 편집/저장**, 그리고 네이밍/스펙 카피·레이아웃 제안·
  리믹스 변형을 끊김 없이 수행한다.
- **모든 AI 출력은 `src/domain/` factory를 거쳐** 유효한 `Project`가 되고, 도메인 불변식(die
  클램프·z-order·schemaVersion)을 충족한다.
- 서버(또는 AI 프로바이더)를 끈 상태에서도 로컬 편집/저장/export에 회귀가 없다(local-first 유지).
- 사용자별 일일 쿼터 + rate-limit으로 비용이 상한되고, 프롬프트가 안전/모더레이션 자세 안에서 처리된다.
- `npm test`(서버 fake 프로바이더 포함)·`npm run build`·서버 typecheck·lint 모두 green.

---

## 공통 제외 / v9+ 후보로 유지

정통 3D 편집(편집 표면으로서) · 결제/수익화 · 양방향 동기화/멀티 디바이스 편집 · custom freeform
die 경로 · worldbuilding 페이지 · 모바일 칩 편집(터치 오써링)/PWA · 실제 EDA/GDSII/DRC/LVS/제조
호환(영구 제외).

## 다음 단계

1. 이 문서를 기준으로 **v7 로드맵 개요 계획**과 **v8 로드맵 개요 계획**을 writing-plans로 각각
   수립한다(기존 `2026-06-16-v6-visual-depth-roadmap.md` 개요 형식 미러링). bite-sized는 미작성.
2. v7-M0 착수 시 feasibility 스파이크 + 상세 plan을, v8-M0 착수 시 상세 plan을 별도로 작성한다.
3. 마일스톤마다 `implementation.md`에 결정/결과를 기록하고 `CLAUDE.md` Milestone Status를 갱신한다.
4. 기존 `2026-06-16-v6-visual-depth-roadmap.md`에 "v7로 재번호 — 본 문서 참조" 주석을 v7-M0
   착수 시 추가한다.
