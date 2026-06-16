# Virtual Silicon Lab 0.2 v4

가상의 반도체 다이를 디자인하고, 고해상도 칩 PNG와 보도자료 스타일 포스터를 내보내는
로컬 우선(local-first) 크리에이티브 웹 앱입니다. EDA 툴이 아니며 실제 제조와는 무관합니다.
v3·v4에서는 에디터의 로컬 우선 원칙을 그대로 유지한 채, 만든 칩을 공개·공유하고 서로
반응(좋아요·댓글)하며 콘테스트와 리믹스로 이어지는 커뮤니티 레이어를 추가했습니다.

## 릴리스 개요

- **v1 MVP** — 로컬 우선 에디터, 다이 4종, 프리셋/리믹스, 가짜 스펙 + 듀얼 PNG 내보내기, 랜딩.
- **v2 비주얼 메이저** — 페이지 셸·에디터 화면·칩 머티리얼 렌더러·포스터 출력을 프리미엄
  반도체 보도자료 이미지 방향으로 전면 재디자인. SoC Custom Studio도 이 흐름에서 추가.
- **v3 Share Core** — Node + TypeScript + SQLite 백엔드(`server/` 워크스페이스): 계정,
  publish 스냅샷 업로드, 공개 갤러리, 공유 링크, 갤러리 → 내 프로젝트 리믹스 가져오기.
  편집은 여전히 100% 로컬 우선이고 서버는 명시적 publish snapshot/PNG만 받습니다.
- **v4 Community** — 모더레이션 + 접근 게이트, 리액션(좋아요·댓글·신고), 랭킹/트렌딩,
  콘테스트, 리믹스 계보(lineage). 실제 공개 오픈은 별도 운영 게이트(`VSL_SIGNUPS_OPEN`)입니다.

## 주요 기능

### 에디터 (로컬 우선)

- 로그인 없이 바로 시작; 프로젝트는 IndexedDB(로컬스토리지 폴백)에 저장됩니다.
- React + Konva 에디터: 다이 4종(rect/square/circle/hexagon), 그리드/스냅/줌/팬,
  리사이즈/회전/순서 변경, undo/redo, 실제·판타지 블록 16종, 장식, 페이지 테마.
- 페이지 테마 3종: `laboratory`, `anime`, `space`.
- 리믹스 가능한 프리셋 16종(v2 히어로 칩/포스터 10종 + 기본 프리셋 6종).
- AI 없이 동작하는 결정론적 랜덤 칩 생성기.
- 편집 가능한 가짜 스펙 시트 + 포스터 포맷 3종(`press-hero`, `architecture-slide`,
  `product-closeup`).
- 전용 Konva 스테이지에서 렌더링되는 PNG 내보내기 2종:
  - 다이 단독: `pixelRatio: 4`
  - 포스터: 논리 해상도 `1600x900` × `pixelRatio: 2` → 최종 `3200x1800`

### 공유 & 커뮤니티 (v3·v4 서버)

- 계정(회원가입/로그인, argon2id + 서명 세션 쿠키)과 명시적 publish 스냅샷 업로드.
- 공개 갤러리(`/gallery`)와 공유 링크(`/s/:slug`, OG/Twitter 메타 + 크롤러용 `poster.png`).
- 갤러리 상세에서 "내 프로젝트로 리믹스 가져오기" — 독립 편집 가능한 로컬 복제 생성.
- 리액션: 칩당 1인 1좋아요 + 평면 댓글 스레드 + 신고 버튼.
- 랭킹/트렌딩 정렬: `trending`(최근 7일) · `top`(전체) · `newest`.
- 콘테스트: 제출 → 투표 → 결과 단계, 자기 투표 차단, 결과 포디움.
- 리믹스 계보(lineage): 조상 spine + 직계 자식 추적, 공유 뷰어의 "Remixed from" 링크.
- 모더레이션 + 접근 게이트: 비공개 베타 기본값, `/admin`에서 신고 검토·칩 숨김/삭제.

## 시작하기

```bash
npm install
npm run dev -- --host 127.0.0.1   # 출력된 URL을 데스크탑 Chrome에서 열기
npm run dev:server                # v3/v4 API 서버 (http://127.0.0.1:8787)
npm test                          # 클라이언트 + 서버 단위 테스트 (vitest)
npm run test:client               # 클라이언트 테스트만
npm run test:server               # 서버 테스트만
npm run build                     # dist/에 정적 번들 생성
npm run verify:deploy             # 배포 전 build + server typecheck + 전체 테스트
```

Konva와 에디터 런타임이 하나의 청크로 번들되어 Vite의 500kB 경고 기준을 초과합니다.
현재는 의도된 상태이며, 추후 코드 스플리팅으로 개선할 예정입니다.

## v3·v4 서버 배포 메모

v3·v4 서버는 Hono + SQLite 공유 레이어입니다. 에디터 프로젝트 저장은 여전히 브라우저 로컬 저장소가
권위이고, 서버는 사용자가 명시적으로 publish한 snapshot/PNG만 받습니다.

운영 필수 env:

- `NODE_ENV=production`
- `VSL_SESSION_SECRET`: 32자 이상의 랜덤 문자열. 누락/짧음이면 production startup이 실패합니다.
- `VSL_PUBLIC_BASE_URL`: 공개 서버 origin, 예: `https://chips.example.com`. share/gallery 이미지 절대 URL에 사용됩니다.

운영 선택 env:

- `PORT`: 기본 `8787`
- `VSL_DATA_DIR`: SQLite DB 위치. 기본은 `server/data`
- `VSL_UPLOAD_DIR`: publish PNG 파일 저장 위치. 기본은 `${VSL_DATA_DIR}/uploads`
- `VSL_UPLOAD_MAX_BYTES`: die/poster PNG 각각의 decoded byte 제한. 기본 8 MiB
- `VSL_RATE_LIMIT_WINDOW_MS`, `VSL_RATE_LIMIT_MAX`: mutating `/api/*` rate limit. 기본 60초/120회
- `VSL_SIGNUPS_OPEN`: 신규 가입 허용 여부 (`true`/`false`). **기본 `false`** (비공개 베타). 실제 공개 오픈은 이 값을 `true`로 켜는 운영 결정입니다. `false`여도 기존 계정 로그인·갤러리·공유는 정상 동작합니다.
- `VSL_ADMIN_EMAILS`: 콤마 구분 관리자 이메일 목록. 해당 이메일로 로그인한 계정이 `/admin` 모더레이션(신고 검토, 칩 숨김/삭제) 권한을 가집니다. 예: `a@x.com,b@y.com`

로컬 production smoke:

```bash
npm run verify:deploy
NODE_ENV=production \
VSL_SESSION_SECRET="replace-with-at-least-32-random-chars" \
VSL_PUBLIC_BASE_URL="http://127.0.0.1:8787" \
npm run start:server
```

새 publish PNG는 SQLite가 아니라 `VSL_UPLOAD_DIR` 아래 파일로 저장되고, DB에는 `/uploads/...` path만 남습니다.
기존 data URL row는 dual-read로 계속 서빙됩니다.
