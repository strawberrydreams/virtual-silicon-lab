# V4-M3 콘테스트 (주제 공모 → 출품 → 투표 → 결과 발표) 설계 (2026-06-15)

- 작성일: 2026-06-15
- 상태: 사용자 승인된 목표 설계 (구현 계획은 별도 writing-plans 문서)
- 선행: V4-M0 모더레이션/접근 게이트, V4-M1 반응, V4-M2 랭킹 (브랜치 `v4-community`, 미머지)
- 상위 방향: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md` (v4 "Community", M3 = 콘테스트)
- 브랜치: 모든 v4 마일스톤(M0–M4)은 `v4-community`에 쌓는다.

## 한 줄 목표

관리자가 **주제를 공모**하고, 유저가 자신의 공개 칩을 **출품**하고, 유저가 출품작에 **투표**하고,
**결과(상위 입상작)를 키노트 포스터 톤 화면으로 발표**하는 콘테스트 루프를 v3/M0–M2 인프라 위에
올린다. 콘테스트는 전부 서버 측 published 데이터에만 작용하고 local-first 계약(오프라인 로컬 편집)은
불변이다.

## 배경 / 현재 상태

- M0가 관리자 롤(`isAdminEmail` + `VSL_ADMIN_EMAILS`)과 모듈 로컬 `/admin/*` 가드 미들웨어 패턴을
  만들었다. M3의 관리자 전용 콘테스트 운영은 이 패턴을 그대로 재사용한다.
- M1이 "유저당 1행" 토글(`likes` 복합 PK)과 "공개+visible 칩에만 반응"(`isChipReactable`) 패턴,
  그리고 새 모듈(`server/src/reactions/`) = `service.ts`(row 타입·`toX` 매퍼·주입된 `now`) + `routes.ts`
  (`/api` 마운트) 구조를 확립했다. 투표는 좋아요와 같은 "유저당 1행" 토글 패턴을 재사용한다.
- 공개 갤러리 API는 published 칩의 `id`/`slug`/`title`/포스터 URL/소유자 표시명을 직렬화한다.
  콘테스트 출품작 카드는 같은 요약 정보를 보여준다.
- 출품 후보(내 공개 칩) 목록 엔드포인트는 아직 없다 — M3에서 작은 `GET /api/published-chips/mine`를
  추가한다.
- 서버는 변이 `/api/*`에 rate limit(M0/V3-M6)을 이미 적용한다. 투표/출품은 "유저당 1행" 제약과
  단계 가드로 어뷰즈를 통제한다.
- **스케줄러/크론은 없다.** 단계 전환은 관리자가 수동(PATCH)으로 한다.

## 핵심 결정 (브레인스토밍 확정)

1. **단계 = `draft → submission → voting → results` 4단계.** `draft`만 비공개(관리자 준비용),
   나머지 셋은 공개. 전환은 **관리자 수동**(크론 없음). 날짜 컬럼은 두지 않는다(YAGNI — 단계가 곧 상태).
2. **콘테스트 생성·편집·단계 전환·삭제는 관리자 전용.** M0의 `/admin/*` 가드 + `isAdminEmail` 재사용.
3. **출품 = 기존 published 칩 참조.** 칩은 **public + visible**여야 하고, **칩 소유자만** 출품한다.
   **유저당 콘테스트당 출품 1개**(공정성·스팸 통제). 출품은 `submission` 단계에서만, 철회는
   작성자/admin가 가능(투표 시작 후엔 출품/철회 잠금).
4. **투표 = 유저당 콘테스트당 1표**(출품작 하나 선택, 복합 PK `(contest_id, voter_user_id)`).
   **자기 출품작 투표 금지**(좋아요의 self-like 허용과 달리, 경쟁이므로 차단). 투표는 `voting`
   단계에서만, 철회 가능.
5. **결과 = 투표 집계에서 read-side 도출.** 별도 winners 테이블 없음(M2 랭킹처럼 순수 읽기 계산).
   득표수 DESC, 동점은 **먼저 출품한 순**(`created_at ASC`)으로 타이브레이크. 상위 3개를 입상작으로
   강조한다. `results` 단계에서 "발표" 프레이밍.
6. **결과 화면은 키노트 포스터 톤.** 1·2·3위 포디엄 + 입상 칩 포스터 + 큰 타이포를 v2 페이지 테마
   토큰으로 스타일링한다. 이 화면이 **v4 시각 품질 게이트 항목**(어설프면 안 됨; M4 lineage와 함께
   v4 시그니처 비주얼). 웹 페이지이므로 DOM/CSS 효과 허용(export 스테이지 아님).
7. **잘못된 단계의 변이는 409.** 예: `submission` 아닌데 출품, `voting` 아닌데 투표.

## 데이터 모델 — `006_contests` 마이그레이션

기존 트랜잭션-세이프 마이그레이션 러너 패턴(M0 `004_moderation`, M1 `005_reactions` 다음 id).

```text
contests (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  theme       TEXT NOT NULL,                          -- 주제/설명 프롬프트
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','submission','voting','results')),
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
)
CREATE INDEX idx_contests_status ON contests(status, created_at DESC);

contest_entries (
  id                 TEXT PRIMARY KEY,
  contest_id         TEXT NOT NULL REFERENCES contests(id)        ON DELETE CASCADE,
  published_chip_id  TEXT NOT NULL REFERENCES published_chips(id) ON DELETE CASCADE,
  owner_user_id      TEXT NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  created_at         INTEGER NOT NULL,
  UNIQUE (contest_id, owner_user_id),       -- 유저당 콘테스트당 1출품
  UNIQUE (contest_id, published_chip_id)    -- 같은 칩 중복 출품 방지
)
CREATE INDEX idx_contest_entries_contest ON contest_entries(contest_id);

contest_votes (
  contest_id      TEXT NOT NULL REFERENCES contests(id)         ON DELETE CASCADE,
  voter_user_id   TEXT NOT NULL REFERENCES users(id)            ON DELETE CASCADE,
  entry_id        TEXT NOT NULL REFERENCES contest_entries(id)  ON DELETE CASCADE,
  created_at      INTEGER NOT NULL,
  PRIMARY KEY (contest_id, voter_user_id)   -- 유저당 콘테스트당 1표
)
CREATE INDEX idx_contest_votes_entry ON contest_votes(entry_id);
```

CASCADE 규칙:
- 콘테스트 삭제 → 출품·투표 함께 제거.
- 칩 삭제(소유자 unpublish 또는 admin delete) → 그 칩의 출품 제거 → 그 출품에 달린 투표도 제거.
- 계정 삭제 → 그 유저의 출품·투표 제거.
- 출품 철회(엔트리 삭제) → 그 엔트리에 달린 투표도 CASCADE 제거(투표한 유저는 다시 투표 가능).

## API

기존 `{ error: { code, message } }` 계약(코드 UPPER_SNAKE)을 따른다. 단계 위반 변이는 409.

### 공개 (인증 불필요, `draft` 제외)

| 메서드/경로 | 설명 |
|---|---|
| `GET /api/contests` | 콘테스트 목록(`draft` 제외). 각 항목 `{ id, title, theme, status, entryCount, voteCount, createdAt }` |
| `GET /api/contests/:id` | 상세. theme·status·entries(칩 요약 + 단계에 따라 voteCount/rank) + 선택적 세션으로 `myEntryId`/`myVoteEntryId`. `results`면 입상작 강조 |

`GET /api/contests/:id`의 엔트리 직렬화: `submission`에서는 voteCount/rank 미노출(아직 투표 없음),
`voting`/`results`에서 voteCount 노출, `results`에서 rank(1·2·3 입상) 부여. 세션이 있으면 `myEntryId`
(내 출품 엔트리)와 `myVoteEntryId`(내가 투표한 엔트리)를 채운다(없으면 null). `draft` 콘테스트는 404.

### 유저 (auth)

| 메서드/경로 | 인가 | 설명 |
|---|---|---|
| `GET /api/published-chips/mine` | auth | 내 **public + visible** published 칩 요약 목록(출품 후보 피커용) |
| `POST /api/contests/:id/entries` | auth | 출품(body `{ publishedChipId }`). `submission` 단계만, 칩이 내 public+visible이어야, 유저당 1개. 응답 생성 엔트리 |
| `DELETE /api/contests/:id/entries/:entryId` | auth(작성자 \| admin) | 출품 철회. `submission` 단계만(작성자) / admin은 언제나 |
| `POST /api/contests/:id/vote` | auth | 투표(body `{ entryId }`). `voting` 단계만, 자기 출품작 금지, 유저당 1표. 응답 `{ myVoteEntryId, ... }` |
| `DELETE /api/contests/:id/vote` | auth | 투표 철회. `voting` 단계만 |

오류: 미인증 401, 권한 없음 403, 없는 콘테스트/엔트리 404, 잘못된 단계 409,
칩이 내 것/공개 아님·중복 출품·자기 출품작 투표 등 입력 위반 400(또는 자기투표는 403).

### 관리자 (`/admin/*` 가드)

| 메서드/경로 | 설명 |
|---|---|
| `POST /api/admin/contests` | 생성(`draft`). body `{ title, theme }` |
| `PATCH /api/admin/contests/:id` | 편집(`title`/`theme`) 및/또는 단계 전환(`status`, 유효 enum 검증; 전환 방향 자유) |
| `DELETE /api/admin/contests/:id` | 콘테스트 삭제(출품·투표 CASCADE) |

`PATCH`의 `status`는 4개 enum만 검증하고 전환 방향은 제한하지 않는다(관리자가 reopen 등 자유롭게).

## 서버 구조

- 새 모듈 `server/src/contests/`:
  - `service.ts` — 콘테스트 CRUD(`createContest`/`updateContest`/`deleteContest`/`listPublicContests`/
    `getContestDetail`), 출품(`createEntry`/`withdrawEntry`/`getEntryMeta`), 투표(`castVote`/`retractVote`),
    결과 도출(엔트리 voteCount/rank 집계), 단계 가드 헬퍼. publish/reactions service 스타일(row 타입·`toX`
    매퍼·주입된 `now`). 칩 가시성 검증은 M1 `isChipReactable`과 동일 기준(public+visible) 재사용 또는 동형
    헬퍼.
  - `routes.ts` — 위 공개/유저/관리자 엔드포인트. moderation routes처럼 모듈 로컬
    `routes.use('/admin/*', ...)` 가드(`readAdmin` = `readUser` + `isAdminEmail`)를 둔다. `/api`에 마운트.
- `app.ts`에 `app.route('/api', contestRoutes(deps))` 추가. `migrations.ts`에 `006_contests` 추가.
- `GET /api/published-chips/mine`는 publish 모듈(`publish/routes.ts` + `publish/service.ts`)에 추가한다
  (published 칩 조회 책임이 거기 있으므로). auth 필요, public+visible만.

## 클라이언트

- 새 피처 `src/features/contests/`:
  - `contestsApi.ts` — 공개 list/get, 유저 enter/withdraw/vote/unvote, 관리자 create/patch/delete,
    그리고 출품 피커용 `listMyPublishedChips`(`/api/published-chips/mine`). M0 `moderationApi.ts`의
    `ok()`/`jsonInit` 에러 처리 패턴.
  - `ContestsPage.tsx` (`/contests`) — 콘테스트 목록 + 상태 배지(공모중/투표중/결과). 서버 부재 시
    `offline` 상태(기존 갤러리 처리와 동형).
  - `ContestDetailPage.tsx` (`/contests/:id`) — 단계 인지 렌더:
    - `submission`: 주제 헤더 + 출품작 그리드 + (로그인 시) 내 공개 칩 피커로 출품/철회.
    - `voting`: 출품작 그리드 + (로그인 시) 한 작품에 투표/철회, 자기 출품작은 투표 비활성.
    - `results`: **키노트 포스터 톤 포디엄**(1·2·3위 포스터 + 득표수), 나머지는 그리드.
- 관리자 운영 UI는 `AdminPage.tsx`에 **Contests 패널**로 추가(생성 폼 + 콘테스트별 상태 전환 셀렉트 +
  삭제). 공개 페이지는 열람/출품/투표만, 관리자 운영은 `/admin`에 모은다(M0 일관성).
- 로그인 여부·`user.id`·`isAdmin`은 기존 `authStore`에서 읽는다(M3은 authStore 변경 불필요).
- 라우팅(`src/app/App.tsx`): `/contests`, `/contests/:id` 추가, 헤더 내비에 "Contests" 링크 추가.
- v2 페이지 테마(`--v2-*`)로 스타일. 결과 포디엄은 포스터 미학(글로우/그라데이션 — 웹 CSS 허용).

## 에러 처리 / 불변식

- 콘테스트는 서버 측 published 데이터에만 작용 → 소유자 로컬 프로젝트 불변(local-first 유지).
- 서버 부재 시 콘테스트/갤러리만 비활성, 로컬 편집/저장/export 무회귀(기존 `offline` 처리 유지).
- 변이는 올바른 단계 + 권한일 때만; 잘못된 입력(없는 콘테스트/엔트리/칩, 비공개 칩 출품, 중복 출품,
  자기 출품작 투표, 잘못된 단계)은 명확한 `{ error: { code, message } }`로 거절.
- `draft` 콘테스트는 공개 API에서 완전히 숨김(목록·상세 404).

## 테스트 원칙

- 기존 컨벤션(TDD, Vitest, Konva/React 페이지는 브라우저 검증) 유지.
- 마이그레이션 테스트: `006_contests`가 세 테이블을 만들고 CASCADE(콘테스트/칩/유저/엔트리 삭제)가
  작동.
- 서버 통합 테스트(임시 SQLite):
  - 콘테스트: 관리자 생성/편집/단계전환/삭제, 비-admin 403, 공개 목록이 `draft` 제외, 상세가 `draft`면 404.
  - 출품: `submission`에서 내 public 칩 출품 OK, 비-submission 단계 409, 비공개/타인 칩 출품 400/403,
    유저당 2번째 출품 거절, 철회는 작성자 OK·타인 비-admin 403, 없는 콘테스트/엔트리 404.
  - 투표: `voting`에서 1표 OK, 비-voting 단계 409, 자기 출품작 투표 거절, 2번째 투표는 기존 표 교체 또는
    거절(아래 결정), 철회 후 재투표 OK.
  - 결과: 득표수 DESC + 동점 `created_at ASC` 랭킹, 상위 3 입상 도출, 세션별 `myEntryId`/`myVoteEntryId`.
  - `/api/published-chips/mine`: 내 public+visible만 반환, 비공개/hidden 제외, 미인증 401.
- domain schema 검증(`migrateProject`) 회귀 유지.
- 클라이언트 단위 테스트: `contestsApi`(엔드포인트/메서드/에러). 콘테스트 페이지·결과 포디엄 UI는
  브라우저 검증.

### 추가 세부 결정

- **재투표 동작:** `POST /vote`는 멱등이 아니라 "현재 표를 교체"한다(같은 유저가 다른 엔트리에 투표하면
  PK 충돌 → 기존 행을 새 `entry_id`로 갱신). 별도 철회 없이 표를 바꿀 수 있어 UX가 단순. `DELETE /vote`는
  표 제거.

## 완료 기준

- 관리자가 `/admin`에서 콘테스트를 만들고 `submission → voting → results`로 단계를 넘긴다.
- 유저가 `submission`에서 자기 공개 칩을 출품(유저당 1개)하고 철회할 수 있다.
- 유저가 `voting`에서 한 출품작에 투표(유저당 1표, 자기 작품 제외)하고 표를 바꾸거나 철회할 수 있다.
- `results`에서 득표순 입상작이 키노트 포스터 톤 포디엄으로 발표된다(시각 품질 게이트 통과).
- `draft` 콘테스트는 공개에서 숨김, 잘못된 단계 변이는 409, 비로그인은 출품/투표 컨트롤 비활성.
- `npm test`(client + server)와 `npm run build`가 모두 green. 비로그인/서버다운 회귀 없음.

## 명시적 비범위 (이후 마일스톤/버전)

- 시간 기반 자동 단계 전환(스케줄러/크론), 콘테스트 알림/이메일, 상금/배지/트로피 영속 기록,
  출품작 댓글(M1 칩 댓글로 충분), 콘테스트별 다중 출품, 가중·랭크드초이스 투표, 결과의 SNS OG 카드.
- 리믹스 계보(V4-M4).

## 다음 단계

1. 이 문서를 기준으로 **V4-M3 구현 계획**(writing-plans)을 수립한다.
2. 마일스톤 진행 시 기존 컨벤션대로 `implementation.md`에 결정/결과를 기록하고 CLAUDE.md의
   Milestone Status를 갱신한다.
</content>
</invoke>
