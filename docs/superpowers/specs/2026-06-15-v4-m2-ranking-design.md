# V4-M2 랭킹/트렌딩 (Trending · Top · Newest) 설계 (2026-06-15)

> 상태: 설계 확정. v4 "Community" 세 번째 마일스톤. 브랜치 `v4-community`(M0–M4가 이 브랜치에 누적, 미병합).
> 로드맵: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md` (V4-M2 = "랭킹/트렌딩: 주간/전체 정렬,
> 단순 점수 산식, 과한 알고리즘 금지").

## 한 줄 목표

공개 갤러리를 **Trending(주간) · Top(전체) · Newest(최신)** 세 정렬로 둘러볼 수 있게 해, M1이 깐 좋아요·댓글
참여 데이터를 "살아있는 갤러리"의 랭킹으로 환원한다. 점수 산식은 의도적으로 단순하게(좋아요+댓글) 유지하고,
시간 감쇠·개인화 같은 과한 알고리즘은 명시적으로 배제한다.

## 배경 / 현재 상태

- M1(`005_reactions`)이 `likes(published_chip_id, user_id, created_at)`와 `comments(id, published_chip_id,
  author_user_id, body, created_at)`를 이미 만들었다. **둘 다 `created_at`을 가지므로 M2는 새 마이그레이션이 필요 없다.**
- 공개 갤러리 쿼리 `listPublicPublishedChips(db, limit=48)`는 이미 private/unpublished/`moderation_status='hidden'`
  칩을 제외하고, 상관 서브쿼리로 `like_count`/`comment_count`를 계산한다. 현재 정렬은 `updated_at DESC`(최신순).
- `GET /api/gallery` 라우트는 `serializeGallerySummary`로 직렬화하며 요약에 `likeCount`가 이미 있다.
- `publishRoutes` 팩토리는 주입된 `now`(`() => number`)를 갖고 있어, 결정적 시간 윈도 계산에 그대로 쓸 수 있다.
- 클라이언트 `liveGalleryApi.list()`는 인자 없이 `GET /api/gallery`를 호출한다. `GalleryPage`가 카드 그리드를 렌더한다.

## 핵심 결정 (브레인스토밍 확정)

1. **범위 = 갤러리 그리드 정렬 3종 + 클라이언트 정렬 선택 UI.** 상세 페이지, 좋아요·댓글·신고 로직은 불변.
   페이지네이션·필터·개인화는 비범위.
2. **새 마이그레이션 없음.** M1의 `likes.created_at`/`comments.created_at`를 재사용한다. M2는 순수 읽기측 변경
   (서버 쿼리 + API 파라미터 + 클라 UI)이다. 새 테이블/컬럼 없음.
3. **점수 산식 = `좋아요 수 + 댓글 수` (동일 가중치 1:1).** 가장 단순하고 설명 가능한 참여 점수. 가중치 조정·
   시간 감쇠(HN/Reddit hot)·뷰 카운트는 "과한 알고리즘"으로 보고 배제(로드맵 명시). 가중치 재조정은 이후 후보.
4. **Trending = 최근 7일 롤링 윈도 내 참여.** `weeklyScore = (윈도 내 좋아요 수) + (윈도 내 댓글 수)`,
   `cutoff = now() - 7*24*60*60*1000`(ms). Top = 전체 기간 참여(`like_count + comment_count`).
5. **정렬은 `GET /api/gallery?sort=` 쿼리 파라미터.** 별도 엔드포인트를 만들지 않고 기존 엔드포인트/직렬화기를 재사용.
   값: `trending`|`top`|`newest`. 미지정·알 수 없는 값 → **`trending`으로 관대 기본**(400 아님; 정렬 파라미터는
   링크 안정성을 위해 lenient).
6. **기본 정렬 = Trending.** 마일스톤 목표("살아있는 커뮤니티")에 맞춘 제품 결정. 기존 기본은 최신순이었다.
7. **타이브레이크 = `updated_at DESC`.** 동점 안정성 + 콜드 스타트(참여 0인 주)에도 최신 칩이 노출되도록 보장.
8. **모든 참여를 집계(필터 없음).** self-like 포함(M1과 일관). 어뷰즈 통제는 M1의 idempotent 좋아요·댓글 길이 제한·
   M0 rate limit으로 이미 충분. 정렬 단계에서 추가 필터링은 단순성 위해 하지 않는다.
9. **쿼리 시점 계산(캐시·머티리얼라이즈드 점수 컬럼 없음).** 갤러리는 ≤48행이고 서버는 인-프로세스 SQLite이며
   M1이 이미 상관 서브쿼리로 카운트를 계산한다. 점수 캐시/배경 잡은 YAGNI이자 로드맵이 경계한 과한 알고리즘.
10. **응답 계약 불변.** 점수/주간점수는 응답에 노출하지 않는다(클라는 반환 순서대로 렌더). 요약 shape는 그대로.

## 점수 산식

```text
cutoff      = now() - 7 * 24 * 60 * 60 * 1000        # 최근 7일(ms)
totalScore(p) = like_count(p) + comment_count(p)     # 전체 기간 (M1 기존 서브쿼리)
weeklyScore(p) = COUNT(likes    WHERE chip=p AND created_at >= cutoff)
               + COUNT(comments WHERE chip=p AND created_at >= cutoff)
```

| sort | ORDER BY |
|---|---|
| `trending` (기본) | `weekly_score DESC, updated_at DESC` |
| `top` | `total_score DESC, updated_at DESC` |
| `newest` | `updated_at DESC` (기존 동작) |

- `created_at`은 프로덕션에서 `Date.now()` 기반 ms. `cutoff`도 ms라 단위 일치.
- 윈도 경계는 `>=`(포함). 테스트는 주입된 `now`로 cutoff 직전/직후 행을 만들어 결정적으로 검증한다.

## 데이터 모델

**변경 없음.** M1의 `likes`/`comments` 테이블과 그 `created_at` 컬럼을 그대로 사용한다. 새 인덱스도 추가하지 않는다
(M1의 `idx_comments_chip(published_chip_id, created_at)`와 `likes` PK 선두 컬럼 `published_chip_id`로 칩 기준 윈도
집계가 충족된다). `schemaVersion`/마이그레이션 러너 변화 없음.

## API

기존 `{ error: { code, message } }` 계약(UPPER_SNAKE) 유지. M2는 변이 엔드포인트를 추가하지 않는다.

| 메서드/경로 | 인가 | 설명 |
|---|---|---|
| `GET /api/gallery?sort=trending\|top\|newest` | 없음(공개) | 공개+visible 칩을 `sort` 순서로 반환. 미지정/알 수 없는 값→`trending`. 응답 `{ chips: GalleryChipSummary[] }`(shape 불변) |

- 정렬은 공개·읽기 전용이므로 인증/세션 불필요(`likedByMe`는 상세에만 있고 M2 무관).
- `limit`은 기존 48 유지.

## 서버 구조

- `server/src/publish/service.ts`:
  - `listPublicPublishedChips(db, limit = 48)` 시그니처를 옵션 객체
    `listPublicPublishedChips(db, opts?: { sort?: GallerySort; now?: () => number; limit?: number })`로 확장한다
    (기본값 `sort='trending'`, `now=Date.now`, `limit=48`). 단일 진입점 유지.
  - `GallerySort = 'trending' | 'top' | 'newest'` 타입을 export.
  - SELECT에 `top`/`trending`용 점수 컬럼(상관 서브쿼리)과 `sort`별 ORDER BY를 추가한다. `trending`은 `cutoff`를
    바인딩 파라미터로 받는다. `PublicGalleryChip` 타입에 점수 필드는 추가하지 않는다(내부 ORDER BY 전용).
- `server/src/publish/routes.ts`:
  - `GET /gallery` 핸들러가 `c.req.query('sort')`를 읽어 순수 헬퍼 `parseGallerySort(raw): GallerySort`
    (알 수 없으면 `'trending'`)로 정규화한 뒤 `listPublicPublishedChips(db, { sort, now })`를 호출한다. `now`는 팩토리
    주입값.

## 클라이언트

- `src/features/gallery/galleryApi.ts`:
  - `GallerySort = 'trending' | 'top' | 'newest'` export.
  - `GalleryApi.list` 시그니처를 `list(sort?: GallerySort)`로 확장하고, `liveGalleryApi.list`가
    `/api/gallery?sort=${sort}`(미지정 시 파라미터 없이)를 호출한다.
- `src/features/gallery/GalleryPage.tsx`:
  - 정렬 세그먼트 컨트롤(Trending | Top | Newest)을 그리드 위에 추가. `useState<GallerySort>('trending')`,
    변경 시 해당 `sort`로 refetch. 카드 마크업은 불변(M1의 좋아요 수 포함).
  - 기존 loading/offline/error/empty 상태 처리는 그대로 재사용.

## 에러 처리 / 불변식

- 공개 갤러리 필터(private/unpublished/hidden 제외)는 기존 그대로 — 정렬은 가시 집합의 순서만 바꾼다.
- `local-first` 불변: 서버 읽기측만 변경. IndexedDB/도메인/스토리지 무변경.
- 응답 계약 불변: 새 필드·새 엔드포인트 없음(쿼리 파라미터만 추가).
- 알 수 없는 `sort` 값은 에러 대신 `trending`으로 폴백(lenient) — 깨진 링크 방지.

## 테스트 원칙

- **서버 단위(`publish/service`):** 정렬·점수.
  - `top`: 전체 참여(좋아요+댓글) 내림차순 + `updated_at` 타이브레이크.
  - `trending`: 주입된 `now`로 cutoff 직전/직후 좋아요·댓글을 만들어 윈도 경계(`>=`)와 주간 순서 검증.
  - `newest`: `updated_at DESC`.
  - 기본값(opts 미지정)이 `trending`인지.
- **서버 라우트(`galleryRoutes`):** `?sort=top|newest|trending` 라우팅, 미지정→trending, 알 수 없는 값→trending(200).
- **클라(`galleryApi`):** `list('top')`이 `/api/gallery?sort=top`을 호출하는지(fetch mock 단위 테스트, M1 reactionsApi 패턴).
- **Konva/렌더 미단위테스트 원칙 유지:** `GalleryPage` 세그먼트 전환은 브라우저 QA로 검증.
- 기존 `galleryModeration`/`galleryReactionCounts` 테스트는 순서 비의존(`toContain`/단일 칩)이라 기본 정렬 변경에 안전.

## 완료 기준

- `GET /api/gallery?sort=`로 Trending/Top/Newest 3종 정렬 동작, 기본 trending.
- `npm test`(클라→서버) green, `npm run build` green(기존 chunk 경고만).
- 브라우저 QA: 시드 데이터(좋아요·댓글 시점을 섞어)에서 Top과 Trending과 Newest 순서가 서로 다르게 보이고,
  세그먼트 전환이 재정렬을 일으키며, 서버 정지 시 오프라인 상태로 폴백.
- `implementation.md`에 결정/결과 기록, `CLAUDE.md` v4 섹션에 V4-M2 ✅ 추가.

## 명시적 비범위 (이후 마일스톤/버전)

- 시간 감쇠/HN-hot 점수, 점수 캐시·머티리얼라이즈드 컬럼·배경 재계산 잡.
- 유저별 개인화/추천, 팔로우 피드, 뷰/임프레션 카운트.
- 카테고리·태그·검색 필터, 페이지네이션/무한 스크롤(48 제한 유지).
- 점수/주간점수의 UI 노출(배지·숫자), self-like 등 참여 필터링.
- 콘테스트(M3), 리믹스 계보(M4).

## 다음 단계

writing-plans 스킬로 본 스펙을 바이트사이즈 TDD 단계의 구현 계획으로 옮긴다.
