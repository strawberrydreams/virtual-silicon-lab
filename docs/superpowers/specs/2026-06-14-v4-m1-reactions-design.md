# V4-M1 반응 (좋아요 · 댓글 · 신고 버튼) 설계 (2026-06-14)

- 작성일: 2026-06-14
- 상태: 사용자 승인된 목표 설계 (구현 계획은 별도 writing-plans 문서)
- 선행: V4-M0 모더레이션 + 접근 게이트 (브랜치 `v4-community`, 미머지)
- 상위 방향: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md` (v4 "Community")
- 브랜치: 모든 v4 마일스톤(M0–M4)은 `v4-community`에 쌓는다.

## 한 줄 목표

공개 갤러리의 칩에 로그인 유저가 **좋아요·댓글·신고**로 반응할 수 있게 해, M0가 깐 모더레이션
인프라 위에 커뮤니티 상호작용을 처음 올린다. 반응은 전부 서버 측 published 데이터에만 작용하고
local-first 계약(오프라인 로컬 편집)은 불변이다.

## 배경 / 현재 상태

- M0가 `reports` 테이블 + 관리자 검토 큐 + 인증된 `POST /api/reports`(칩 신고)를 이미 만들었고,
  **유저용 신고 버튼만 M1로 미뤘다**. M1의 "신고"는 이 버튼을 기존 엔드포인트에 배선하는 것이다.
- 공개 갤러리 API: `GET /api/gallery`(요약 그리드), `GET /api/gallery/:slug`(상세, snapshot 포함).
  두 쿼리는 이미 private/unpublished/`moderation_status='hidden'` 칩을 제외한다.
- 갤러리 상세 응답은 칩 `id`를 포함하므로 클라이언트가 반응 대상 id를 안다.
- 서버는 변이 `/api/*`에 rate limit(M0/V3-M6)을 이미 적용한다. 좋아요는 idempotent(유니크 제약),
  댓글은 길이 제한으로 어뷰즈를 통제한다.
- 인증은 서명된 `vsl_session` 쿠키 + `getSessionUser`. M0의 라우트 패턴(`readUser`, 로컬 `fail` 헬퍼)을 따른다.

## 핵심 결정 (브레인스토밍 확정)

1. **범위 = 좋아요 + 댓글 + 유저용 칩 신고 버튼.** 셋 다 published 칩에 대한 반응이고 갤러리 상세를
   공유하므로 단일 M1 스펙으로 진행한다(분해 불필요).
2. **셋 다 로그인 필수.** M0의 authed `POST /api/reports`와 일관되고, 계정 모델·어뷰즈 통제가 단순하다.
3. **좋아요 = 유저당 칩당 1개 토글.** self-like 허용(소유자 체크 없음 — 단순화).
4. **댓글 = 플랫(비스레드), 수정 없음, 작성자/admin 하드 삭제.** 스레드·수정은 YAGNI. 댓글 hide 상태도 없음
   (나쁜 댓글은 삭제로 충분; hide는 쇼케이스 대상인 칩에만 둔다).
5. **댓글 신고(유저용)·폴리모픽 reports는 M1 비범위.** `reports`는 칩 전용으로 유지한다. 나쁜 댓글은
   작성자/admin 삭제로 커버. 유저용 댓글 신고는 이후 별도 마일스톤 후보.
6. **별도 admin 댓글 큐 없음.** admin은 갤러리 상세에서 인라인으로 모든 댓글을 삭제할 수 있다.
7. **반응은 public + visible 칩에만.** hidden/private/없는 칩에 대한 좋아요·댓글은 404.

## 데이터 모델 — `005_reactions` 마이그레이션

기존 트랜잭션-세이프 마이그레이션 러너 패턴을 따른다. (M0의 `004_moderation` 다음 id.)

```text
likes (
  published_chip_id  TEXT NOT NULL  FK→published_chips(id) ON DELETE CASCADE,
  user_id            TEXT NOT NULL  FK→users(id)           ON DELETE CASCADE,
  created_at         INTEGER NOT NULL,
  PRIMARY KEY (published_chip_id, user_id)
)
-- 좋아요 수 집계용: chip 기준 조회가 잦으므로 PK 선두 컬럼이 chip이라 인덱스 충족.
CREATE INDEX idx_likes_user ON likes(user_id);

comments (
  id                 TEXT PRIMARY KEY,
  published_chip_id  TEXT NOT NULL  FK→published_chips(id) ON DELETE CASCADE,
  author_user_id     TEXT NOT NULL  FK→users(id)           ON DELETE CASCADE,
  body               TEXT NOT NULL,
  created_at         INTEGER NOT NULL
)
CREATE INDEX idx_comments_chip ON comments(published_chip_id, created_at);
```

- 칩 삭제(소유자 unpublish 또는 admin delete)는 좋아요·댓글을 CASCADE로 함께 제거한다.
- 계정 삭제는 그 유저의 좋아요·댓글을 CASCADE로 함께 제거한다(작성자명을 잃은 orphan 댓글 방지).

## API

기존 `{ error: { code, message } }` 계약(코드 UPPER_SNAKE)을 따른다. 변이 엔드포인트는 모두 대상 칩이
**public + visible**인지 검증하고, 아니면 404.

| 메서드/경로 | 인가 | 설명 |
|---|---|---|
| `POST /api/published-chips/:id/like` | auth | 좋아요(idempotent). 응답 `{ likeCount, likedByMe: true }` |
| `DELETE /api/published-chips/:id/like` | auth | 좋아요 취소. 응답 `{ likeCount, likedByMe: false }` |
| `GET /api/published-chips/:id/comments` | 공개 | 댓글 목록(작성자 displayName 포함, created_at ASC, limit 200) |
| `POST /api/published-chips/:id/comments` | auth | 댓글 작성(body 1~1000자). 응답 생성된 댓글 |
| `DELETE /api/published-chips/:id/comments/:commentId` | auth(작성자 \| admin) | 댓글 삭제. 작성자/admin 아니면 403 |
| `POST /api/reports` (기존, M0) | auth | 칩 신고 — M1은 클라이언트 버튼만 추가 |

추가로 기존 갤러리 응답을 확장한다:
- `GET /api/gallery/:slug` (상세): **선택적 세션 읽기**를 더해 `likeCount`, `likedByMe`(세션 없으면 false),
  `commentCount`를 포함한다. 댓글 목록 자체는 별도 `.../comments`로 조회한다(작성 후 독립 갱신·캐시 단순).
- `GET /api/gallery` (그리드 요약): 각 칩에 `likeCount`를 추가한다(좋아요가 헤드라인 사회적 신호).

`:id`는 published 칩의 id다(갤러리 상세 응답이 이미 노출). like/comment 대상 검증은
`is_public = 1 AND moderation_status = 'visible'` 기준.

## 서버 구조

- 새 모듈 `server/src/reactions/`:
  - `service.ts` — `likeChip`/`unlikeChip`/`getLikeState`(count+likedByMe), `createComment`/`listComments`/
    `deleteComment`(+작성자 확인), 그리고 칩 가시성 검증 헬퍼. publish/service 스타일(row 타입·`toX` 매퍼·
    주입된 `now`)을 따른다.
  - `routes.ts` — 위 like/comment 엔드포인트. M0 라우트의 `readUser`(+admin 판정은 `isAdminEmail` 재사용)
    패턴을 따른다. `/api`에 마운트.
- 갤러리 카운트는 `publish/service.ts`의 공개 쿼리에 집계(서브쿼리 또는 LEFT JOIN COUNT)를 더하고,
  상세 직렬화에 `likeCount`/`likedByMe`/`commentCount`, 요약 직렬화에 `likeCount`를 추가한다.
  세션-의존 `likedByMe` 때문에 갤러리 상세 라우트가 선택적으로 세션을 읽는다(없으면 false).
- 신고 버튼은 서버 변경 없음(M0 `POST /api/reports` 재사용).

## 클라이언트

- `src/features/gallery/reactionsApi.ts` (신규) — like/unlike, comments(list/create/delete) 클라이언트.
  M0 `moderationApi.ts`의 `ok()`/`jsonInit` 에러 처리 패턴을 따른다. 칩 신고는 기존 신고 경로 재사용
  (필요시 작은 `reportChip` 클라이언트 추가).
- 갤러리 상세 페이지(`src/features/gallery/GalleryDetailPage.tsx`)에 추가:
  - **좋아요 버튼 + 카운트**(낙관적/재조회 토글), 비로그인 시 비활성 + "로그인하면 반응할 수 있어요" 안내.
  - **댓글 스레드**: 목록 + 작성 폼(로그인 시) + 삭제 버튼(본인 댓글, admin이면 전체).
  - **신고 버튼**(로그인 시): 사유 입력 → `POST /api/reports` → "신고됨" 상태.
- 갤러리 그리드 카드(`GalleryPage`)에 좋아요 카운트 표시.
- 로그인 여부·`isAdmin`은 기존 `authStore`에서 읽는다(M1은 authStore 변경 불필요).
- v2 페이지 테마(`--v2-*`)로 스타일.

## 에러 처리 / 불변식

- 반응은 서버 측 published 데이터에만 작용 → 소유자 로컬 프로젝트 불변(local-first 유지).
- 서버 부재 시 갤러리/반응만 비활성, 로컬 편집/저장/export 무회귀(기존 `offline` 처리 유지).
- 변이는 대상 칩이 public+visible일 때만; 잘못된 입력(빈/과길이 body, 없는 칩/댓글, 권한 없음)은 명확한
  `{ error: { code, message } }`로 거절.

## 테스트 원칙

- 기존 컨벤션(TDD, Vitest, Konva/React 페이지는 브라우저 검증) 유지.
- 서버 통합 테스트(임시 SQLite):
  - 좋아요: 토글이 카운트를 증감, 재좋아요 idempotent(중복 행 없음), 좋아요 auth 필수(401),
    hidden/private/없는 칩 좋아요 404, 취소 후 카운트 감소.
  - 댓글: 작성→목록 노출(작성자명), 빈/과길이 body 400, 작성 auth 필수, hidden/private/없는 칩 댓글 404,
    삭제는 작성자 OK·타인 비-admin 403·admin OK, 없는 댓글 404.
  - 갤러리: 상세가 `likeCount`/`likedByMe`/`commentCount`를 반영(세션 유무에 따라 likedByMe), 요약이
    `likeCount`를 포함, hidden 칩은 여전히 제외.
- domain schema 검증(`migrateProject`) 회귀 유지.
- 클라이언트 단위 테스트: `reactionsApi`(엔드포인트/메서드/에러). 갤러리 상세 UI는 브라우저 검증.

## 완료 기준

- 로그인 유저가 공개 칩을 좋아요/취소하고 카운트가 갱신된다.
- 로그인 유저가 댓글을 작성·삭제(본인/admin)하고 목록이 갱신된다.
- 신고 버튼이 M0 관리자 큐에 신고를 넣는다(`/admin`에서 확인 가능).
- hidden 칩은 반응 불가(404), 비로그인은 반응 컨트롤 비활성.
- `npm test`(client + server)와 `npm run build`가 모두 green. 비로그인/서버다운 회귀 없음.

## 명시적 비범위 (이후 마일스톤/버전)

- 유저용 댓글 신고·폴리모픽 reports, 댓글 수정, 스레드/대댓글, 댓글 hide 상태, 전용 admin 댓글 큐,
  좋아요/댓글 알림.
- 랭킹/트렌딩(V4-M2) · 콘테스트(V4-M3) · 리믹스 계보(V4-M4).

## 다음 단계

1. 이 문서를 기준으로 **V4-M1 구현 계획**(writing-plans)을 수립한다.
2. 마일스톤 진행 시 기존 컨벤션대로 `implementation.md`에 결정/결과를 기록하고 CLAUDE.md의
   Milestone Status를 갱신한다.
