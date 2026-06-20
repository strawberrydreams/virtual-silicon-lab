# Virtual Silicon Lab 0.6 v8

가상의 반도체 다이를 디자인하고, 고해상도 칩 PNG와 보도자료 스타일 포스터를 내보내는
로컬 우선(local-first) 크리에이티브 웹 앱입니다. EDA 툴이 아니며 실제 제조와는 무관합니다.
v3·v4에서 에디터의 로컬 우선 원칙을 유지한 채 공개·공유·반응(좋아요·댓글)·콘테스트·리믹스
커뮤니티 레이어를 추가했고, v5에서는 실제 공개(public launch)에 대비한 초대 접근·계정 보안·
안전/모더레이션·온보딩·디스커버리·운영 하드닝을 더했으며, v6에서는 공개 읽기·계정 표면과
에디터 읽기 전용 미리보기를 모바일에 대응(반응형)시켰고, **v7에서는 완성된 칩을 파생 3D 쇼케이스
(턴테이블 오빗 + 브라우저 MP4 내보내기)로 보여주는 비주얼 뎁스(Visual Depth)** 레이어를 더했습니다.

> 버전 표기: 이 저장소의 `0.5` 라인은 v7(비주얼 뎁스) 작업에 해당합니다(`0.4` 라인은 v6 모바일/반응형,
> `0.3` 라인은 v5 공개 런칭 준비). 2D Konva 작도·PNG 내보내기 계약은 그대로이며, 3D는 직렬화된 프로젝트
> 스냅샷에서 파생되는 추가(additive) 렌더 경로입니다. 실제 공개 게이트는 아직 켜지지 않았습니다 —
> production 전환은 별도 운영 결정(아래 "런칭 상태" 참고)입니다.

## 릴리스 개요

- **v1 MVP** — 로컬 우선 에디터, 다이 4종, 프리셋/리믹스, 가짜 스펙 + 듀얼 PNG 내보내기, 랜딩.
- **v2 비주얼 메이저** — 페이지 셸·에디터 화면·칩 머티리얼 렌더러·포스터 출력을 프리미엄
  반도체 보도자료 이미지 방향으로 전면 재디자인. SoC Custom Studio도 이 흐름에서 추가.
- **v3 Share Core** — Node + TypeScript + SQLite 백엔드(`server/` 워크스페이스): 계정,
  publish 스냅샷 업로드, 공개 갤러리, 공유 링크, 갤러리 → 내 프로젝트 리믹스 가져오기.
  편집은 여전히 100% 로컬 우선이고 서버는 명시적 publish snapshot/PNG만 받습니다.
- **v4 Community** — 모더레이션 + 접근 게이트, 리액션(좋아요·댓글·신고), 랭킹/트렌딩,
  콘테스트, 리믹스 계보(lineage).
- **v5 Public Launch (준비 완료, 미공개)** — 초대 코드 기반 접근, 계정 보안(이메일 인증·
  비밀번호 재설정), 안전/모더레이션 하드닝(밴·댓글 숨김·감사 로그·관리자 운영 UI), 온보딩/
  첫 실행, 디스커버리/SEO/공개 프로필, 운영 하드닝(rate-limit·갤러리 락다운·SQLite 백업).
- **v6 Mobile/Responsive** — 768px 브레이크포인트 + 모바일 내비 드로어로 공개 읽기 표면
  (랜딩·갤러리·상세·프로필·공유 뷰어)과 계정/대시보드를 모바일 단일 컬럼으로 재배치하고,
  에디터는 모바일에서 읽기 전용 미리보기(작도는 데스크톱)로 분기. 관리자(`/admin`)는
  데스크톱 전용으로 범위 외. 360/390px 모바일 QA 통과(`docs/ops/mobile-qa.md`).
- **v7 Visual Depth** — 직렬화 프로젝트 스냅샷에서 파생한 lazy 풀스크린 Three.js 3D 쇼케이스를
  에디터와 공개 갤러리가 공유. PBR/PMREM/ACES/bloom 머티리얼, 턴테이블/글로우 애니메이션, 에디터 전용
  결정적 1280×720 MP4 내보내기, WebGL 부재/400-piece 초과 시 포스터로 폴백하는 admission 예산.
  서버 렌더 공유 뷰어는 client JS 없이 갤러리 3D로 링크. Three·recorder·`mp4-muxer`는 lazy 청크에만
  남고 schema/migration/API/업로드 변경 없음. 3D 쇼케이스 QA: `docs/ops/3d-showcase-qa.md`.

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

### 공개 런칭 준비 (v5 서버 + 관리자 UI)

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
npm run dev:server                # v3/v4/v5 API 서버 (http://127.0.0.1:8787)
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

Konva와 에디터 런타임이 하나의 청크로 번들되어 Vite의 500kB 경고 기준을 초과합니다.
현재는 의도된 상태이며, 추후 코드 스플리팅으로 개선할 예정입니다.

## 런칭 상태

v5는 **launch-ready, not live** 상태입니다. 자동 게이트(`npm test`, `npm run build`,
server typecheck, lint)는 모두 green이고, 관리자 운영 UI와 invite → 인증 → publish → 모더레이션
→ 밴 → 프로필/SEO → 재설정 플로우는 단위·통합 테스트와 브라우저 QA로 검증되었습니다. 실제
production 전환(`VSL_ACCESS_MODE=invite`)은 배포 환경 구축 + 소유자 go/no-go 이후의 운영 동작으로
남겨져 있습니다. 운영 문서는 `docs/ops/`(런북·백업/복원·QA 체크리스트)에 있습니다.

> 이메일 주의: 현재 서버는 콘솔 출력용 `ConsoleEmailProvider`만 사용합니다. 이메일 인증·비밀번호
> 재설정 링크가 **서버 로그에만 출력**되며 실제 발송되지 않습니다. 실제 공개 런칭 시에는 진짜
> 이메일 provider(SMTP/SES/Postmark 등) 구현이 필요합니다. 로컬 콘솔 테스트·브라우저 QA에는
> 현재 상태로 충분합니다.

## v3·v4·v5 서버 배포 메모

서버는 Hono + SQLite 공유 레이어입니다. 에디터 프로젝트 저장은 여전히 브라우저 로컬 저장소가
권위이고, 서버는 사용자가 명시적으로 publish한 snapshot/PNG만 받습니다. SQLite는 로컬 파일에
직접 쓰므로 **영속 디스크가 있는 호스트**가 필요합니다(순수 서버리스 부적합).

운영 필수 env:

- `NODE_ENV=production`
- `VSL_SESSION_SECRET`: 32자 이상의 랜덤 문자열. 누락/짧음이면 production startup이 실패합니다.
- `VSL_PUBLIC_BASE_URL`: 공개 서버 origin, 예: `https://chips.example.com`. share/gallery 이미지 절대 URL에 사용됩니다.

접근 / 안전 env:

- `VSL_ACCESS_MODE`: `closed` | `invite` | `open`. **기본 `closed`**. `invite`가 v5 런칭 모드입니다.
  (레거시 `VSL_SIGNUPS_OPEN`도 폴백으로 해석: `true`→`open`, 그 외→`closed`. 신규는 `VSL_ACCESS_MODE` 사용 권장.)
- `VSL_ADMIN_EMAILS`: 콤마 구분 관리자 이메일 목록. 해당 이메일로 로그인한 계정이 `/admin` 운영
  권한(초대 코드·댓글/칩 모더레이션·밴·감사 로그)을 가집니다. 예: `a@x.com,b@y.com`
- `VSL_REQUIRE_VERIFIED_PUBLISH`: 이메일 인증 전 publish/리액션 차단 여부(`true`/`false`).
  **production 기본 `true`**, 개발 기본 `false`.
- `VSL_GALLERY_LOCKDOWN`: 갤러리/Featured/상세/프로필/share/poster를 일괄 잠그는 긴급 스위치
  (`true`면 공개 읽기 410). 기본 `false`.

운영 선택 env:

- `PORT`: 기본 `8787`
- `VSL_DATA_DIR`: SQLite DB 위치. 기본은 `server/data` (DB 파일: `server/data/vsl.sqlite`)
- `VSL_UPLOAD_DIR`: publish PNG 파일 저장 위치. 기본은 `${VSL_DATA_DIR}/uploads`
- `VSL_UPLOAD_MAX_BYTES`: die/poster PNG 각각의 decoded byte 제한. 기본 8 MiB
- `VSL_RATE_LIMIT_WINDOW_MS`, `VSL_RATE_LIMIT_MAX`: mutating `/api/*` rate limit. 기본 60초/120회
  (로그인·가입·비밀번호찾기·신고 엔드포인트는 production에서 자동으로 더 엄격하게 제한됩니다)

로컬 production smoke:

```bash
npm run verify:deploy
NODE_ENV=production \
VSL_SESSION_SECRET="replace-with-at-least-32-random-chars" \
VSL_PUBLIC_BASE_URL="http://127.0.0.1:8787" \
VSL_ACCESS_MODE="invite" \
VSL_ADMIN_EMAILS="admin@example.com" \
npm run start:server
```

새 publish PNG는 SQLite가 아니라 `VSL_UPLOAD_DIR` 아래 파일로 저장되고, DB에는 `/uploads/...` path만 남습니다.
기존 data URL row는 dual-read로 계속 서빙됩니다.

백업(라이브/WAL 안전, online backup):

```bash
npx tsx server/scripts/backup.ts server/data/vsl.sqlite backups
sqlite3 backups/<file>.bak "PRAGMA integrity_check;"   # 기대값: ok
```

`backups/`는 git에서 제외됩니다. 복원·운영 절차는 `docs/ops/backup-restore.md`,
`docs/ops/launch-runbook.md`를 참고하세요.
