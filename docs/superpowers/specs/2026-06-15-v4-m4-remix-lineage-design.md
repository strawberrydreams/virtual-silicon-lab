# V4-M4 리믹스 계보(Remix Lineage) 설계 (2026-06-15)

- 작성일: 2026-06-15
- 상태: 사용자 승인된 목표 설계 (구현 계획은 별도 writing-plans 문서). **모든 선택 분기는 추천안으로 확정.**
- 선행: V3-M5 리믹스 가져오기, V4-M0 모더레이션/접근 게이트, V4-M1 반응, V4-M2 랭킹, V4-M3 콘테스트 (브랜치 `v4-community`, 미머지)
- 상위 방향: `docs/superpowers/specs/2026-06-12-v3-v4-roadmap-design.md` (V4-M4 = "리믹스 계보: published 칩의 remix lineage 트리 시각화 — 칩 미학과 어울리는 v4 시그니처 비주얼 기능")
- 브랜치: 모든 v4 마일스톤(M0–M4)은 `v4-community`에 쌓는다.

## 한 줄 목표

published 칩이 **누구로부터 리믹스되었고 누가 리믹스해 갔는지**(부모 ← 자손) 계보를 추적하고,
갤러리 상세에서 칩 미학과 어울리는 **계보 시각화**로 보여준다. 추적은 전부 서버 측 published
데이터에만 작용하고, local-first 계약(오프라인 로컬 편집)은 불변이다.

## 배경 / 현재 상태

- **핵심 난점 — M5는 의도적으로 provenance를 저장하지 않았다.** M5 `importRemixedProject`는 스냅샷을
  완전 독립 로컬 프로젝트로 복제하고 부모 링크를 남기지 않았다("lineage 트리는 v4 범위"로 명시 연기).
  따라서 M4는 **부모 참조를 import → 로컬 편집 → publish까지 실어 나르는 경로**를 새로 만들어야 한다.
- 서버 측 부모 링크를 만들 수 있는 **유일한 순간은 publish 시점**이다. import한 클라이언트가 부모
  참조를 들고 있어야 재-publish 시 그 링크가 서버에 기록된다.
- 도메인 `Project`(`src/domain/project.ts`)는 현재 `schemaVersion = 4`, provenance 필드 없음.
  `migrateProject`는 현재 버전 프로젝트를 `{ ...project, schemaVersion, studio }`로 스프레드 보존한다
  (추가 필드는 보존됨). 모든 스키마 변경은 `schemaVersion` bump + 마이그레이션 테스트 + `implementation.md`
  기록이 불변식이다.
- `published_chips`(서버)는 `id`(PK) / `owner_user_id` / `source_project_id`(로컬 `project.id`로 키잉) /
  `slug`(UNIQUE) / `title` / `project_json` / 모더레이션·가시성 컬럼을 갖는다. publish 업서트는
  `(owner_user_id, source_project_id)` 유니크로 동작한다.
- 공개 갤러리 상세 `GET /api/gallery/:slug`는 이미 `project` 스냅샷 + 소유자 표시명 + like/comment
  카운트 + `likedByMe`를 반환한다. 가시성 필터는 항상 `is_public = 1 AND moderation_status = 'visible'`.
- 갤러리 상세 페이지(`/gallery/:slug`)에는 M1 좋아요/신고/댓글, M5 "Remix into my projects" 버튼이
  이미 있다. M4 계보 섹션은 같은 페이지에 붙는다.

## 핵심 결정 (브레인스토밍 확정 — 모든 분기 추천안 채택)

1. **서버 부모 링크 = `published_chips`의 nullable 자기참조 컬럼 `remixed_from_chip_id`.** (별도 edge
   테이블 아님.) 각 published 칩은 부모가 최대 1개(리믹스 원본 1개)이므로 부모 포인터 단일 FK가 가장
   단순하고, M2/M3 결과처럼 트리는 read-side로 도출한다. 마이그레이션 `007_remix_lineage`로 컬럼 +
   인덱스 추가. **FK `ON DELETE SET NULL`** — 조상 칩이 삭제돼도 자손은 남고 계보에 "사라진 조상"으로만
   표시(자손 cascade 삭제 금지).
2. **로컬 provenance 운반 = 도메인 `Project`의 신규 선택 필드 `remixedFrom?`.** 스키마 v4 → **v5** bump.
   shape `{ chipId: string; slug: string; title: string }`. 이게 local-first 운반체다: import 시 채우고,
   사용자가 그 프로젝트를 publish하면 서버가 `chipId`로 `remixed_from_chip_id`를 기록한다. 재-publish를
   안 해도 로컬/UI에서 "Remixed from {title}" 표시에 쓸 수 있다. v4→v5 마이그레이션은 `schemaVersion`만
   올리고 기존 프로젝트의 `remixedFrom`은 미설정(undefined)으로 둔다(추가적·비파괴적). **첫 v4 스키마
   bump** — `implementation.md` 기록.
3. **식별자: 서버 FK는 published chip `id`(내구성 키), 로컬/UI는 `slug`+`title` 동반.** `remixedFrom`은
   세 값을 모두 들고, publish는 `chipId`를 서버로 보낸다. 서버는 그 `chipId`가 존재하면 기록, 없으면
   **NULL로 관대 처리**(publish를 거절하지 않음).
4. **계보 범위 = 조상 사슬(루트→…→이 칩) 전체 + 직계 자식 + 자식 수.** 전체 자손 서브트리는 폭발 위험이
   있어 직계 자식 + 카운트로 제한. 조상 사슬은 부모 포인터를 위로 따라가며 **깊이 캡(20)**으로 사이클/
   폭주 방지(구조상 DAG이지만 방어). 이게 "이 칩은 X ← Y ← Z의 후손이고, N개가 이 칩에서 리믹스됨"이라는
   시그니처 뷰를 만든다.
5. **가시성 — 계보 노드는 public+visible만 노출.** 비공개/hidden/삭제된 조상은 클릭 불가 placeholder
   ("a private chip" / "a removed chip")로만 표시해 사슬이 오해 없이 이어지되 비공개 데이터는 새지
   않는다. 자식 목록·카운트는 public+visible 자식만 센다.
6. **계보 UI = 갤러리 상세 `/gallery/:slug`의 "Lineage" 섹션.** 조상 스파인(수직 사슬) + 자식 그리드.
   v2 페이지 테마 토큰으로 칩 미학에 맞춰 스타일(웹 페이지이므로 글로우/그라데이션 등 DOM/CSS 허용 —
   export 스테이지 아님). 이 화면은 **v4 시각 품질 게이트 항목**(M3 결과 포디엄과 함께 v4 시그니처
   비주얼; 어설프면 안 됨).
7. **서버 엔드포인트 = 신규 `GET /api/gallery/:slug/lineage`(별도).** 상세 페이로드를 가볍게 유지하고
   계보 섹션을 lazy-load 한다(노드마다 포스터 URL + 요약이라 무거움). draft/비공개 칩 slug는 404
   (상세와 동일 가시성 규칙).
8. **`importRemixedProject` 시그니처 확장(선택 인자).** `importRemixedProject(snapshot, id, now, origin?)`.
   `origin: { chipId; slug; title }`이면 결과 프로젝트에 `remixedFrom`로 설정. preset remix
   (`remixPreset`)는 origin 없음(프리셋은 published 칩이 아님). 갤러리 상세 import는 로드된 chip의
   `id`/`slug`/`title`을 origin으로 전달.
9. **공유 뷰어(`/s/:slug`)는 한 줄 "Remixed from {title}" 텍스트 링크만(범위 최소).** 본격 트리 시각화는
   갤러리 상세에만. 부모가 public+visible일 때만 링크, 아니면 생략.
10. **사이클 방지.** 리믹스는 기존 published 칩으로부터만 생기고 새 리믹스는 **항상 새 published id**를
    받으므로 그래프는 구성상 DAG(부모는 자식보다 먼저 생성). 그래도 조상 walk는 깊이 캡으로 방어.

## 데이터 모델 — `007_remix_lineage` 마이그레이션

기존 트랜잭션-세이프 마이그레이션 러너 패턴(M3 `006_contests` 다음 id).

```sql
ALTER TABLE published_chips
  ADD COLUMN remixed_from_chip_id TEXT REFERENCES published_chips(id) ON DELETE SET NULL;
CREATE INDEX idx_published_chips_remixed_from ON published_chips(remixed_from_chip_id);
```

- 자기참조 nullable FK. 부모가 삭제되면 `SET NULL`(자손 보존).
- `ALTER TABLE … ADD COLUMN`은 기존 better-sqlite3 마이그레이션 패턴(`003`, `004`)과 동형.
- SQLite의 FK는 `PRAGMA foreign_keys = ON`일 때 enforce된다(기존 `db.ts` 설정 그대로). 자기참조
  ADD COLUMN은 SQLite에서 허용된다(테이블 이미 존재).

### 도메인 스키마 — `Project.remixedFrom?` (v4 → v5)

```ts
export type RemixOrigin = {
  chipId: string   // 원본 published 칩의 서버 id (서버 FK용)
  slug: string     // 링크/표시용
  title: string    // 표시용
}

export type Project = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION  // = 5
  // …기존 필드…
  remixedFrom?: RemixOrigin
}
```

- `CURRENT_SCHEMA_VERSION` 4 → 5. `SUPPORTED_SCHEMA_VERSIONS`에 5 추가.
- v4→v5 마이그레이션: `schemaVersion`만 5로, `remixedFrom` 미설정. 1→/2→/3→ 경로는 기존대로
  최종 버전으로 정규화(remixedFrom 없음).
- `migrateProject`는 `{ ...project, schemaVersion: CURRENT, … }` 스프레드라 입력에 `remixedFrom`가
  있으면 보존된다(import한 프로젝트를 publish할 때 운반).

## API

기존 `{ error: { code, message } }` 계약(코드 UPPER_SNAKE). 가시성 규칙은 갤러리와 동일.

### 공개 (인증 불필요)

| 메서드/경로 | 설명 |
|---|---|
| `GET /api/gallery/:slug/lineage` | 그 칩의 계보. `draft`/비공개/hidden 칩 slug는 404 |

응답 shape:

```ts
type LineageNode = {
  slug: string
  title: string
  ownerDisplayName: string
  posterImagePath: string | null
  posterImageDataUrl: string
} | { hidden: true }   // 비공개/삭제된 조상 placeholder (slug 비노출)

type LineageResponse = {
  ancestors: LineageNode[]   // 루트→부모 순(이 칩 제외), 깊이 캡 20
  children: LineageNode[]    // 직계 자식(public+visible만)
  childCount: number         // public+visible 직계 자식 수
}
```

- `ancestors`는 `remixed_from_chip_id`를 위로 따라가며 수집. 노드가 public+visible이 아니면
  `{ hidden: true }` placeholder로 넣고 더 위로는 올라가지 않는다(비공개 칩의 조상도 비노출).
- `children`은 `WHERE remixed_from_chip_id = <this chip id> AND is_public = 1 AND moderation_status =
  'visible'` (updated_at DESC, 표시 LIMIT 12). `childCount`는 같은 조건 COUNT.

### publish (기존 엔드포인트 확장)

- `POST /api/published-chips`(업서트)의 입력 검증이 `body.project.remixedFrom?.chipId`를 읽어
  `remixed_from_chip_id`로 기록. `chipId`가 존재하지 않으면 NULL(관대). 재-publish 시에도 동일.
- **새 publish 엔드포인트 추가 없음.** `remixedFrom`는 `project` 안에 실려 온다.

## 서버 구조

- 마이그레이션: `migrations.ts`에 `007_remix_lineage` 추가.
- 계보 조회는 **publish 모듈에 둔다**(published 칩 조회 책임이 거기 있음):
  - `publish/service.ts`: `getChipLineage(db, slug): LineageResult | null`(조상 walk + 자식/카운트
    쿼리, public+visible 필터, 깊이 캡). row→노드 매퍼는 기존 `OwnerChipSummary` 스타일 재사용.
  - `publish/routes.ts`: `GET /api/gallery/:slug/lineage` 핸들러(404 처리는 기존 상세와 동일).
    ※ 갤러리 라우트는 publish/routes.ts에 있다(기존 `/api/gallery`, `/api/gallery/:slug`와 같은 곳).
- publish 업서트(`createOrUpdatePublishedChip` 등): INSERT/UPDATE 컬럼 목록에
  `remixed_from_chip_id` 추가. 값 도출: `resolveRemixParentId(db, project.remixedFrom?.chipId)`
  (존재하면 id, 아니면 null) 헬퍼.
- 공유 뷰어(`server/src/share/viewer.ts`): 부모가 public+visible이면 "Remixed from {title}" 링크
  한 줄 추가(`escapeHtml` 사용, 기존 share 패턴). 부모 조회는 `getChipLineage` 또는 작은 헬퍼 재사용.

## 클라이언트

- 도메인: `src/domain/project.ts`에 `RemixOrigin` + `Project.remixedFrom?`,
  `projectMigration.ts`에 v5 지원, `remixImport.ts` 시그니처 확장.
- 스토어: `projectStore.remixImport(snapshot, origin?)`로 origin 전달.
- 갤러리 API: `galleryApi`에 `getLineage(slug)` 추가(`GET /api/gallery/:slug/lineage`).
- 갤러리 상세 페이지(`/gallery/:slug`):
  - import 호출이 로드된 chip의 `{ id, slug, title }`을 origin으로 넘기도록 배선(App `onRemix`).
  - 새 **"Lineage" 섹션** — 조상 스파인(루트→부모, 클릭 시 해당 slug 상세로) + 자식 그리드(포스터
    카드, childCount 표시). 계보가 비면(`ancestors`·`children` 모두 빈) 섹션 자체를 숨기거나
    "원본 칩 — 아직 리믹스 없음" 정도의 가벼운 표시. v2 테마 토큰 스타일.
  - offline/error/loading 상태에서는 계보 섹션 미표시(기존 갤러리 처리와 동형).
- 로그인 여부·`user.id`는 기존 `authStore`에서 읽음(M4는 authStore 변경 불필요).

## 데이터 흐름

```
A를 publish (원본)  →  published_chips A (remixed_from_chip_id = NULL)
사용자 B가 /gallery/a-slug 에서 "Remix into my projects"
  → remixImport(chip.project, origin={ chipId: A.id, slug, title })
    → importRemixedProject: migrate(v→5) + 독립 복제 + remixedFrom = origin
  → 로컬 편집 → publish
    → validatePublishInput: project.remixedFrom.chipId = A.id
    → createOrUpdatePublishedChip: remixed_from_chip_id = A.id  (resolve로 존재 확인)
  → published_chips B (remixed_from_chip_id = A.id)
/gallery/b-slug → GET /api/gallery/b-slug/lineage
  → ancestors = [A], children = [], childCount = 0
/gallery/a-slug → lineage → ancestors = [], children = [B], childCount = 1
```

## 에러 처리 / 불변식

- 계보는 서버 측 published 데이터에만 작용 → 소유자 로컬 프로젝트 불변(local-first 유지).
- 서버 부재 시 계보/갤러리만 비활성, 로컬 편집/저장/export 무회귀(기존 `offline` 처리 유지).
- `remixedFrom.chipId`가 가리키는 칩이 삭제/없음 → publish는 NULL로 기록(거절 안 함); 계보 조회는
  `SET NULL`로 끊긴 사슬을 자연 처리.
- 비공개/hidden 칩은 계보 노드로 노출 금지(placeholder만). draft/비공개 칩 slug의 lineage는 404.
- 깊이 캡(20)으로 조상 walk 폭주/사이클 방어.

## 테스트 원칙

- 기존 컨벤션(TDD, Vitest, Konva/React 페이지는 브라우저 검증) 유지.
- **도메인 마이그레이션 테스트**: v4→v5가 `schemaVersion`만 올리고 데이터 보존, `remixedFrom` 미설정;
  v1/v2/v3→ 경로 회귀; `migrateProject`가 입력 `remixedFrom`를 보존; `CURRENT_SCHEMA_VERSION === 5`.
- **도메인 `importRemixedProject`**: origin 주면 `remixedFrom` 설정, 안 주면 미설정; 기존 동작
  (새 id/이름/타임스탬프/깊은 복제) 회귀.
- **서버 마이그레이션 테스트**: `007_remix_lineage`가 컬럼+인덱스 생성, 부모 삭제 시 자식의
  `remixed_from_chip_id`가 `SET NULL`.
- **서버 publish 테스트**: `remixedFrom.chipId`가 존재하는 칩이면 `remixed_from_chip_id` 기록,
  없는 id면 NULL, 없으면 NULL; 재-publish가 값 유지.
- **서버 lineage 테스트**: A←B←C 사슬에서 C의 조상=[A,B] 순서, A의 자식=[B] childCount=1;
  비공개 조상은 `{ hidden: true }` placeholder; 비공개/hidden 자식 제외; 깊이 캡; 없는/비공개 slug 404.
- **클라이언트 단위**: `galleryApi.getLineage` 엔드포인트/메서드/에러; `remixImport` origin 전달.
  계보 섹션 UI(스파인/자식 그리드)는 브라우저 검증.
- domain schema 검증(`migrateProject`) 회귀 유지.

## 수용 게이트 (브라우저 QA)

1. 칩 A를 publish → B가 A를 리믹스 가져오기 → 편집 → publish → `/gallery/b-slug` 계보에 "Remixed
   from A"가 클릭 가능한 조상으로 표시.
2. `/gallery/a-slug` 계보에 B가 자식으로 표시되고 childCount = 1.
3. 다단(A←B←C) 리믹스에서 C 상세의 조상 스파인이 A → B 순으로 보인다.
4. A를 비공개 전환하면 B의 계보에서 A가 "a private chip" placeholder로만 보이고 링크 안 됨.
5. A를 삭제하면 B의 `remixed_from_chip_id`가 NULL이 되고 B는 원본처럼(조상 없음) 보인다.
6. 계보 섹션이 칩 미학과 어울리게 스타일됨(v4 시각 품질 게이트 통과).
7. 서버를 끈 상태에서 기존 로컬 편집/저장/export 무회귀.
8. `npm test`(client + server)와 `npm run build` 모두 green.

## 명시적 비범위 (이후 마일스톤/버전)

- 전체 자손 서브트리 시각화(직계 자식 + 카운트만), 인터랙티브 줌/팬 그래프, 계보 기반 추천/검색,
  리믹스 알림/이메일, 리믹스 카운트 기반 랭킹 가중(M2는 like+comment만), 계보의 SNS OG 카드.
- 프리셋/랜덤 생성 칩의 계보(프리셋은 published 칩이 아니므로 origin 없음).
- 시간 기반/자동화, 결제, AI 등 (`CLAUDE.md` v5+ 비범위 유지).

## 다음 단계

1. 이 문서를 기준으로 **V4-M4 구현 계획**(writing-plans, `docs/superpowers/plans/2026-06-15-v4-m4-remix-lineage.md`)을 따른다.
2. 마일스톤 진행 시 기존 컨벤션대로 `implementation.md`에 결정/결과(특히 첫 v4 스키마 bump v4→v5)를
   기록하고 `CLAUDE.md`의 Milestone Status를 갱신한다.
