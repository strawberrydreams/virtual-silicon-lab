# V4-M0 모더레이션 기본기 + 접근 게이트 설계 (2026-06-14)

- 작성일: 2026-06-14
- 상태: 사용자 승인된 목표 설계 (구현 계획은 별도 writing-plans 문서)
- 선행: v3 "Share Core" (V3-M0–M6) — `main`에 머지 완료 (PR #1 `f978e51`)
- 상위 방향: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md` (v4 "Community" 방향 합의)

## 한 줄 목표

v3 서버(Hono + SQLite + accounts + published_chips) 위에 **공개 오픈 전 안전장치**를 얹는다:
신규 가입을 끌 수 있는 접근 게이트, env 기반 관리자 롤, 칩 숨김/삭제 관리자 액션, 신고
데이터 모델 + 관리자 검토 큐. 유저용 신고 *버튼*·좋아요·댓글은 V4-M1.

## 배경 / 현재 상태

- v3는 **배포 가능 상태**까지 완료했고 실제 공개 오픈은 v4 시작 시 별도 게이트로 결정한다
  (로드맵 결정). V4-M0의 "공개 오픈 결정 게이트"는 **접근 제어 메커니즘**(코드)으로 구현한다 —
  명시적으로 열기 전까지 외부 신규 가입을 막는다.
- 서버는 이미 `VSL_*` 환경변수 기반 런타임 설정(`VSL_SESSION_SECRET`, `VSL_PUBLIC_BASE_URL`,
  `VSL_UPLOAD_DIR`, 프로덕션 rate limit 등)과 트랜잭션-세이프 마이그레이션 러너를 갖는다.
- 인증: 서명된 `vsl_session` 쿠키(raw token의 sha256을 SQLite에 저장), argon2id 해시.
  `users`·`sessions`·`published_chips` 테이블 존재. **롤(role) 개념은 아직 없다.**
- 공개 갤러리/공유 뷰어 쿼리는 이미 private/unpublished 칩을 제외한다. M0는 여기에
  모더레이션 필터를 더한다.
- M0 시점에 모더레이션 대상으로 존재하는 콘텐츠는 **published_chips 뿐**이다(댓글/좋아요는 M1).

## 핵심 결정 (브레인스토밍 확정)

1. **이번 브레인스토밍 범위 = V4-M0 단독.** v4는 마일스톤별로 따로 설계한다. M1(반응)·M2(랭킹)·
   M3(콘테스트)·M4(lineage)는 각자 스펙→플랜 사이클을 별도로 돈다.
2. **공개 오픈 게이트 = 접근 제어 메커니즘 (B).** 운영 문서 결정이 아니라 코드 기능으로 구현한다.
3. **접근 게이트 형태 = 단일 가입 잠금 플래그 (A).** `VSL_SIGNUPS_OPEN` env 하나로 신규 가입만
   막는다. 초대 코드/갤러리 전체 잠금은 채택하지 않는다(M0엔 과함, 익명 갤러리는 v3 핵심 가치).
4. **관리자 롤 = env 기반 관리자 이메일 (A).** `VSL_ADMIN_EMAILS`. DB 스키마 변경 없이 런타임 파생.
   `users.role` 컬럼·승격 경로는 만들지 않는다(단일 자체호스팅 운영자 가정).
5. **신고 범위 = 관리자 도구 + reports 테이블/큐 + 신고 생성 API까지 M0 (A).** 유저용 신고 *버튼*만
   M1로 미룬다. 모더레이션 인프라를 한 번만 만들고, M1은 그 위에 버튼만 얹는다.
6. **유저 차단(ban)은 M0 범위 밖.** 가입이 닫혀 있어 인구가 통제되고 칩 삭제로 충분. YAGNI.

## 접근 게이트 — `VSL_SIGNUPS_OPEN`

- 기본값 **`false`**(비공개 베타가 안전한 기본). `true`로 켜는 것이 곧 "공개 오픈" 운영 행위.
- `false`일 때 `POST /api/auth/signup`은 기존 `{ error: { code, message } }` 계약으로 거절한다
  (`code: "signups_closed"`). **로그인·퍼블리시·갤러리·공유는 영향 없음.**
- 헬스/설정 엔드포인트가 `signupsOpen`을 노출 → 클라이언트가 가입 폼을 숨기고 "비공개 베타"
  안내를 표시한다. 서버가 신뢰 경계이므로 **클라이언트 숨김과 무관하게 서버에서도 차단**한다.

## 관리자 롤 — `VSL_ADMIN_EMAILS`

- 콤마 구분 이메일 목록. 로그인 세션 유저의 이메일이 목록에 있으면 admin이다.
- **DB 스키마 변경 없음**(런타임 파생). `GET /api/me` 응답에 **`isAdmin: boolean`**을 추가해
  클라이언트가 관리자 메뉴 노출을 판단한다.
- 모든 관리자 API는 서버에서 admin 세션을 재검증하고 비-admin은 **403**으로 거절한다.
- 이메일 비교는 대소문자/트림 정규화(기존 가입 이메일 정규화 규칙과 동일)를 따른다.

## 데이터 모델 — `003_moderation` 마이그레이션

기존 트랜잭션-세이프 마이그레이션 러너 패턴을 사용한다. 두 변경:

### (a) `published_chips`에 모더레이션 상태 추가

- `moderation_status TEXT NOT NULL DEFAULT 'visible'` — 값은 `'visible' | 'hidden'`
- `hidden_at` (nullable), `hidden_by` (nullable, admin user id), `hidden_reason` (nullable TEXT)
- 기존 공개 갤러리/공유 뷰어 쿼리에 **`moderation_status = 'visible'`** 필터를 추가한다
  (private/unpublished 필터와 함께).

### (b) `reports` 테이블 신설

```text
reports(
  id                 TEXT PRIMARY KEY,
  published_chip_id  TEXT NOT NULL  FK→published_chips(id) ON DELETE CASCADE,
  reporter_user_id   TEXT           FK→users(id) ON DELETE SET NULL  (nullable; 탈퇴 대비),
  reason             TEXT,
  status             TEXT NOT NULL DEFAULT 'open'  -- 'open' | 'resolved' | 'dismissed'
  created_at         TEXT NOT NULL,
  resolved_at        TEXT,
  resolved_by        TEXT           FK→users(id) ON DELETE SET NULL  (nullable)
)
```

## 모더레이션 의미론

- **숨김(hide)** = 되돌릴 수 있는 관리자 플래그. `moderation_status='hidden'`으로 갤러리·공유에서
  제외한다(공유 뷰어는 "현재 볼 수 없는 칩" 응답). **소유자의 로컬 프로젝트는 무관**(local-first).
  unhide로 되돌릴 수 있다.
- **삭제(delete)** = published_chip 행 + 업로드된 PNG 파일(`VSL_UPLOAD_DIR`)을 제거한다. 서버 측
  영구 삭제. **소유자 로컬 프로젝트는 남는다**(local-first). M2/M6의 기존 삭제·파일정리 로직을
  재사용하고 인가 경로만 admin용으로 추가한다.
- 두 액션 모두 admin 전용. 행위자(`hidden_by` / 삭제 로그)를 기록하되 **별도 audit 로그 테이블은
  만들지 않는다**(M0 YAGNI).

## API

기존 `{ error: { code, message } }` 계약을 따른다. admin 엔드포인트는 모두 admin 세션 필요,
비-admin은 403.

| 메서드/경로 | 인가 | 설명 |
|---|---|---|
| `POST /api/reports` | 인증 유저 | published_chip 신고 생성 (**M0에 포함**, M1이 버튼으로 호출) |
| `GET /api/admin/reports?status=open` | admin | 검토 큐 (칩 메타 + 신고 사유 조인, open 우선) |
| `PATCH /api/admin/reports/:id` | admin | `resolved` / `dismissed` 전환 |
| `POST /api/admin/published-chips/:id/hide` | admin | 숨김 |
| `POST /api/admin/published-chips/:id/unhide` | admin | 숨김 해제 |
| `DELETE /api/admin/published-chips/:id` | admin | 관리자 강제 삭제(행 + 파일) |

`GET /api/me`에 `isAdmin: boolean` 추가. 헬스/설정 응답에 `signupsOpen: boolean` 추가.

## 클라이언트

- **`/admin` 라우트** (admin 세션 전용; 비-admin은 진입 시 not-authorized 뷰). v2 페이지 테마
  (`--v2-*`)로 스타일한다.
  - 신고 큐(open 우선) + 각 항목에서 숨김/삭제/신고처리 액션.
  - 전체 published 칩 모더레이션 목록(숨김 토글).
- 헤더: `isAdmin`일 때만 Admin 링크 노출.
- 가입 폼: `signupsOpen=false`면 폼을 숨기고 "비공개 베타" 안내 표시.
- **유저용 신고 버튼(칩 상세)은 M0 범위 밖** — M0에선 `POST /api/reports` 엔드포인트만 만든다.

## 에러 처리 / 불변식

- 접근 게이트·admin 인가는 **서버가 단일 진실**이다(클라이언트 UI 숨김은 편의일 뿐).
- 모더레이션은 **서버 측 published 레코드에만** 작용하고 소유자 로컬 데이터는 불변이다
  (local-first 계약 유지).
- 잘못된 입력(없는 칩 id, 잘못된 status 값, 권한 없음)은 명확한 `{ error: { code, message } }`로
  거절한다.

## 테스트 원칙

- 기존 컨벤션(TDD, Vitest, Konva는 브라우저 검증) 유지.
- 서버 통합 테스트(임시 SQLite):
  - 가입 게이트: `VSL_SIGNUPS_OPEN=false` → 가입 403(`signups_closed`), `=true` → 성공.
  - admin 인가: 비-admin이 admin 엔드포인트 호출 시 403; admin은 성공.
  - 숨김이 공개 갤러리·공유 뷰어에서 제외됨(unhide 시 복귀).
  - 신고 생성 → 큐 조회 → resolve/dismiss 전환.
  - admin 삭제가 DB 행 + 업로드 파일을 함께 제거.
- domain schema 검증(`migrateProject`) 회귀 유지.
- 클라이언트 단위 테스트: `isAdmin` 파생, 가입 폼·Admin 링크 노출 로직. `/admin` 페이지는
  컨벤션대로 브라우저 검증.

## 완료 기준

- `VSL_SIGNUPS_OPEN=false`에서 신규 가입이 막히고 기존 흐름(로그인/퍼블리시/갤러리/공유/리믹스)
  무회귀.
- admin이 `/admin`에서 신고를 보고 칩을 숨김/삭제할 수 있고, 숨긴 칩이 갤러리·공유에서 사라진다.
- `npm test`(client + server)와 `npm run build`가 모두 green.
- 공개 오픈 게이트는 `VSL_SIGNUPS_OPEN=true` 전환 + 배포 문서 기록으로 수행(별도 운영 결정).

## 명시적 비범위 (이후 마일스톤/버전)

- 유저용 신고 버튼·좋아요·댓글 → V4-M1
- 랭킹/트렌딩 → V4-M2 · 콘테스트 → V4-M3 · 리믹스 계보 트리 → V4-M4
- 유저 차단(ban)/정지, 초대 코드, 갤러리 전체 잠금, 별도 audit 로그 테이블, `users.role` 컬럼

## 다음 단계

1. 이 문서를 기준으로 **V4-M0 구현 계획**(writing-plans)을 수립한다.
2. 마일스톤 진행 시 기존 컨벤션대로 `implementation.md`에 결정/결과를 기록하고 CLAUDE.md의
   Milestone Status를 갱신한다.
