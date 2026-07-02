# Virtual Silicon Lab 0.11 v13

[![English](https://img.shields.io/badge/README-English-0A66C2?style=for-the-badge)](README.md)

가상의 반도체 다이를 디자인하고, 고해상도 칩 PNG와 보도자료 스타일 포스터를 내보내는
로컬 우선(local-first) 크리에이티브 웹 앱입니다. EDA 툴이 아니며 실제 제조와는 무관합니다.
이 앱은 빠른 로컬 편집, 장난감 같은 칩 레이아웃, 3D 미리보기, 내보내기용 이미지를 만드는 데
초점을 둡니다. 현재 릴리스는 vertex handle로 자유형 다이를 편집할 수 있게 하면서 기존 이미지와
영상 내보내기를 유지합니다.

## 릴리스 개요

- **v1** — 첫 에디터, 기본 칩, 가짜 스펙, PNG 내보내기를 추가했습니다.
- **v2** — 앱 화면, 칩 이미지, 포스터 디자인을 더 보기 좋게 다듬었습니다.
- **v3** — 계정, 공개 갤러리, 공유 링크, 갤러리에서 내 프로젝트로 가져오기를 추가했습니다.
- **v4** — 좋아요, 댓글, 신고, 콘테스트, 리믹스 기록을 추가했습니다.
- **v5** — 초대 가입, 계정 보호, 온보딩, 관리자 도구를 추가했습니다.
- **v6** — 공개 페이지와 계정 페이지를 모바일에서 보기 쉽게 만들었습니다.
- **v7** — 3D 칩 보기와 브라우저 MP4 내보내기를 추가했습니다.
- **v8** — 칩 만들기, 이름, 스펙, 레이아웃 아이디어, 변형을 돕는 AI 기능을 추가했습니다.
- **v9** — 더 많은 다이 모양, 재질 느낌, 은은한 에디터 움직임을 추가했습니다.
- **v10** — 3D 카메라, 조명, 배경, 애니메이션, look preset 편집을 추가했습니다.
- **v11** — 모바일에서 사용할 수 있는 간단한 3D preset, 조명, 카메라 보기 편집을 추가했습니다.
- **v12** — 로그인한 사용자의 프로젝트가 여러 기기에서 이어지도록 sync를 추가했습니다.
- **v13** — Freeform 다이 편집과 vertex handle을 추가하고 2D, 3D, PNG, 포스터, MP4 출력을 맞췄습니다.

## 주요 기능

### 에디터 (로컬 우선)

- 로그인 없이 바로 시작; 프로젝트는 IndexedDB(로컬스토리지 폴백)에 저장됩니다.
- React + Konva 에디터: **다이 11종** — 기본 4종(rect/square/circle/hexagon), 파라메트릭 6종
  (octagon·rounded-rect·chamfered-rect·keyed·L-shape·plus), vertex handle을 가진 자유형 직선
  polygon — 그리드/스냅/줌/팬, 리사이즈/회전/순서 변경, undo/redo, 실제·판타지 블록 16종, 장식,
  페이지 테마.
- 페이지 테마 3종: `laboratory`, `anime`, `space`.
- 리믹스 가능한 프리셋 16종(v2 히어로 칩/포스터 10종 + 기본 프리셋 6종).
- AI 없이 동작하는 결정론적 랜덤 칩 생성기.
- 편집 가능한 가짜 스펙 시트 + 포스터 포맷 3종(`press-hero`, `architecture-slide`,
  `product-closeup`).
- 전용 Konva 스테이지에서 렌더링되는 PNG 내보내기 2종:
  - 다이 단독: `pixelRatio: 4`
  - 포스터: 논리 해상도 `1600x900` × `pixelRatio: 2` → 최종 `3200x1800`

### Deep Canvas 작도

- **파라메트릭 다이 형상** — 기본 4종에 더해 코드로 생성되는 6종. 형상은 항상 순수
  `resolveDieOutline`이 생성하며 사용자가 직접 그리지 않으므로 outline이 단순(자기 교차 없음)함을
  보장합니다. 커스터마이징은 슬라이더 파라미터(코너 반경·chamfer·notch 코너/크기·arm 폭)만 제공하며
  각 값은 정규화 후 안전 범위로 clamp됩니다.
- **하나의 outline, 네 소비자** — clamp·2D 렌더·3D 압출·내보내기가 모두 동일한
  `resolveDieOutline` + `outlineToPolygon`에서 형상 정보를 얻습니다. 블록 clamp는 "회전 적용 네
  모서리가 모두 폴리곤 내부" 규칙으로 일반화되어 concave 형상(L·plus·notch)도 자연스럽게 처리하고,
  형상/파라미터 변경 시 기존 블록을 하나의 undoable 커밋으로 live 재클램프합니다.
- **머티리얼 피니시** — 칩 레벨 피니시(matte/satin/gloss/metallic)가 하나의 공유 디스크립터로
  reduce되어 2D Konva 채움/그림자/글로우(내보내기 안전)와 3D PBR 머티리얼을 동시에 구동합니다.
  기본 피니시는 테마에서 파생되며, 선택적 **블록별 피니시 오버라이드**는 미지정 시 칩 피니시를
  상속합니다.
- **에디터 앰비언트 모션** — 절제된 글로우 펄스와 트레이스 시머를 단일 `requestAnimationFrame`이
  순수 시간 함수로 구동합니다. 에디터 캔버스 전용이며 에디터 토글이 있고, `prefers-reduced-motion`을
  존중하고(reduced-motion 시 기본 off), 밀도에 따라 graceful하게 강등해 ~60fps를 보호합니다.
  **내보내기는 항상 정적입니다:** export 스테이지는 canonical neutral frame을 렌더하므로 애니메이션
  transient가 PNG에 절대 도달하지 않습니다.

### 3D Authoring

- **저장되는 3D presentation** — 각 프로젝트는 camera, lighting, environment, animation을 위한
  선택적 `scene3d` 설정을 가질 수 있습니다. resolver는 순수 domain 코드라 동일한 authored scene이
  에디터·갤러리·공유 target·MP4 export에서 서버 route나 SQLite 변경 없이 동작합니다.
- **Camera / lighting / environment / animation controls** — 에디터 쇼케이스에서 현재 camera 저장/
  reset, 안전한 lighting mood + intensity, curated background/exposure/bloom 설정, 결정론적
  turntable/glow motion 조정이 가능합니다. 갤러리와 공유 뷰는 보기 전용으로 유지됩니다.
- **Look presets** — `Orbit hero`, `Inspection`, `Dramatic closeup`은 카메라·조명·환경·애니메이션·전체
  scene look preset을 undoable 에디터 명령으로 적용하며, 필요한 경우 작성된 animation은 보존합니다.
- **Export parity** — MP4는 live showcase와 같은 resolved scene descriptor를 사용합니다. 2D
  내보내기는 die 단독 `pixelRatio: 4`, poster `3200x1800`으로 고정됩니다.

### Mobile 3D Authoring

- 모바일 look preset·조명 chip·터치 카메라 저장/초기화를 제공합니다.
- **Store-backed 모바일 3D 표면** — 폰 너비 에디터 route는 2D canvas를 읽기 전용으로 유지하지만,
  3D showcase는 desktop과 같은 editor store, undoable command, autosave path를 사용합니다.
- **Curated 모바일 controls** — 모바일은 one-tap look preset, 조명 chip, touch orbit,
  `Save current view`, `Reset 3D default`를 제공하고, 정밀 lighting/environment/animation slider는
  desktop-only로 유지합니다.
- **Responsive control rail** — 모바일 showcase는 접근성 group label과 44px tap target을 가진 compact
  horizontal preset rail을 쓰며, desktop control rail은 변경하지 않습니다.
- **Round-trip parity** — 모바일에서 작성한 `scene3d`는 desktop과 같은 resolved scene descriptor로
  gallery, share, MP4에 흐릅니다. 내보내기 계약은 die 단독 `pixelRatio: 4`, poster `3200x1800`,
  MP4 `1280x720` / `30fps` / `8s`로 고정됩니다.

### Continuum Sync

- Opt-in, 로그인 전용: `SyncingRepository`가 로컬 저장/삭제를 서버에 미러링하고, `SyncEngine`이
  로그인 시점·주기 interval·탭 refocus에서 full-snapshot reconcile을 실행합니다(`updatedAt`
  last-write-wins, tombstone 삭제).
- 로컬 우선 유지: IndexedDB가 계속 source of truth이며 서버 호출은 best-effort입니다. 오프라인과
  익명 사용은 영향을 받지 않고, 첫 로그인은 기존 로컬 프로젝트를 업로드해 adoption합니다.
- Header badge가 syncing / synced / offline / error를 표시합니다. 2D 에디터, PNG/MP4 export,
  publish/gallery 표면은 변경하지 않습니다.

### Freeform Die Authoring

- 기존 다이 형상을 정규화된 직선 polygon으로 변환하는 자유형 다이 outline 작도를 추가합니다.
  곡선 편집은 의도적으로 제외했고, clamp와 export에 안전한 vertex 기반 모델만 제공합니다.
- vertex handle은 직접 이동 / 추가 / 삭제를 지원합니다. 모든 편집은 기존 shape 변경과 같은 undoable
  editor command path를 사용하고, polygon 변경 시 블록이 실시간으로 다시 clamp됩니다.
- 3D와 내보내기 parity를 유지합니다. 동일한 freeform polygon이 2D 렌더링, 3D extrusion, Die PNG,
  Poster PNG, MP4 export에 사용되며 서버 route, SQLite migration, publish schema, sync engine 변경은
  없습니다.

### AI 보조 생성

- **프롬프트 → 칩** — 대시보드에서 프롬프트를 입력하면 에디터에서 열리는 새 독립 로컬 프로젝트가
  생성됩니다.
- **Generate from this chip** — 현재 칩에서 입력 없이 AI 작명 + 가짜 스펙 카피를 생성하고, 단일
  undoable Apply 전에 미리보기합니다.
- **레이아웃 제안** — 항목별 "Suggest improvements" + Accept/Reject; Accept는 하나의 undoable 커밋.
- **변형(variations)** — 2~4개의 리테마 변형 생성; 카드별 Save가 새 독립 로컬 프로젝트를 만들고
  원본은 절대 변경하지 않습니다.
- 모든 AI 불변식은 동일한 순수 `mapAiDraftToProject` 매핑을 통과하므로 적대적 AI 출력도 잘못된
  프로젝트를 만들 수 없습니다. 결정론적 fake provider가 기본이며, 실제 Anthropic provider는 설정된
  경우에만 선택됩니다. 요청은 bound(프롬프트 2000자·블록 64개)되고 quota(사용자별 24h 쿼터 +
  production IP별 burst 제한)로 제한됩니다. `ANTHROPIC_API_KEY`는 서버 전용으로 클라이언트 번들에
  없습니다.

### 공유 & 커뮤니티

- 계정(회원가입/로그인, argon2id + 서명 세션 쿠키)과 명시적 publish 스냅샷 업로드.
- 공개 갤러리(`/gallery`)와 공유 링크(`/s/:slug`, OG/Twitter 메타 + 크롤러용 `poster.png`).
- 갤러리 상세에서 "내 프로젝트로 리믹스 가져오기" — 독립 편집 가능한 로컬 복제 생성.
- 리액션: 칩당 1인 1좋아요 + 평면 댓글 스레드 + 신고 버튼.
- 랭킹/트렌딩 정렬: `trending`(최근 7일) · `top`(전체) · `newest`.
- 콘테스트: 제출 → 투표 → 결과 단계, 자기 투표 차단, 결과 포디움.
- 리믹스 계보(lineage): 조상 spine + 직계 자식 추적, 공유 뷰어의 "Remixed from" 링크.

### 공개 런칭 준비

- **초대 코드 접근** — `VSL_ACCESS_MODE`로 `closed`/`invite`/`open` 3단계. `invite` 모드에서는
  회원가입에 초대 코드가 필요하고, 로그인·갤러리·공유 읽기는 영향받지 않습니다.
- **계정 보안** — 이메일 인증, 비밀번호 찾기/재설정(열거 방지), 비밀번호 변경·재설정 시 다른
  세션 무효화. 인증되지 않은 계정은 publish/리액션이 soft-gate로 차단(설정에 따라).
- **안전 / 모더레이션** — 사용자 밴/해제, 댓글 숨김·신고 큐, append-only 감사 로그.
- **관리자 운영 UI (`/admin`)** — `VSL_ADMIN_EMAILS`로 지정된 계정에 노출. 초대 코드 발급/
  목록/회수, 신고 칩 큐, 댓글 신고 큐(숨김·작성자 밴), 칩 숨김/해제·feature/unfeature·삭제,
  사용자 밴/해제, 감사 로그 조회를 모두 화면에서 처리합니다.
- **온보딩 / 첫 실행** — 로컬 첫 실행 체크리스트와 Featured 갤러리 행.
- **디스커버리 / SEO** — 공개 핸들 `/u/:handle` 프로필(공개·visible 칩만), 공개 share/profile
  URL만 담은 `robots.txt`·`sitemap.xml`.
- **운영 하드닝** — mutating `/api/*` rate-limit(+로그인/가입/비밀번호찾기/신고 민감 엔드포인트
  강화), 긴급 시 갤러리 전체 락다운(`VSL_GALLERY_LOCKDOWN`, 공개 읽기 410), SQLite online
  백업 스크립트(`server/scripts/backup.ts`).

## 시작하기

```bash
npm install
npm run dev -- --host 127.0.0.1   # 출력된 URL을 데스크탑 Chrome에서 열기
npm run dev:server                # v3/v4/v5/v8 API 서버 (http://127.0.0.1:8787)
npm test                          # 클라이언트 + 서버 단위 테스트 (vitest)
npm run test:client               # 클라이언트 테스트만
npm run test:server               # 서버 테스트만
npm run build                     # dist/에 정적 번들 생성
npm run verify:deploy             # 배포 전 build + server typecheck + 전체 테스트
```

관리자 UI를 로컬에서 확인하려면 `VSL_ADMIN_EMAILS`로 관리자 이메일을 지정하고 해당 이메일로
가입/로그인합니다. 초대 모드는 `VSL_ACCESS_MODE=invite`로 구동합니다.

```bash
VSL_ADMIN_EMAILS="admin@example.com" VSL_ACCESS_MODE="invite" npm run dev:server
```

AI 표면은 기본적으로 결정론적 fake provider로 동작합니다(키 불필요). 실제 provider를 사용하려면
`VSL_AI_PROVIDER=anthropic`와 서버 전용 `ANTHROPIC_API_KEY`를 설정합니다.

Konva와 에디터 런타임이 하나의 청크로 번들되어 Vite의 500kB 경고 기준을 초과합니다.
현재는 의도된 상태이며, 추후 코드 스플리팅으로 개선할 예정입니다.
