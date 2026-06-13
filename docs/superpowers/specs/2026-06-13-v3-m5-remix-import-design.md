# V3-M5 리믹스 가져오기 설계 (2026-06-13)

## 한 줄 목표

갤러리/공유 링크의 published 칩을 내 로컬 프로젝트로 가져와 편집하는 리믹스 import를
추가해 v3 공유 루프(가입 → 퍼블리시 → 갤러리 열람 → 공유 링크 → **리믹스 가져오기** →
로컬 편집)를 완성한다.

## 배경 / 현재 상태

- M3 갤러리 상세 API(`GET /api/gallery/:slug`)는 이미 응답에 published snapshot의 `project`
  JSON(`GalleryChipDetail.project: Project`)을 포함한다. 클라이언트 `GalleryDetailPage`도 이미
  이 project를 받는다. 따라서 **import는 새 서버 엔드포인트 없이** 클라이언트에서 완결된다.
- 기존 로컬 프로젝트 materialize 패턴: `projectStore.remixPreset`(preset → 새 독립 로컬 프로젝트),
  `projectStore.duplicate`(`structuredClone` + 새 id/타임스탬프). M5는 이와 동형으로 "스냅샷 → 새
  독립 로컬 프로젝트"를 만든다.
- 도메인 `migrateProject(unknown)`은 publish 검증/마이그레이션 진입점으로 이미 공유된다.
- M4 공유 뷰어(`server/src/share/viewer.ts`)에는 `<!-- Remix this chip: V3-M5 -->` 플레이스홀더가
  남아 있다.

## 핵심 결정 (브레인스토밍 확정)

1. **가져오기 진입점: 갤러리 상세 + 공유 뷰어 CTA 딥링크.** import 액션은 SPA 갤러리 상세
   `/gallery/:slug`에서 수행한다(상세는 이미 스냅샷을 갖고 있다). 서버 렌더링 공유 뷰어 `/s/:slug`의
   "Remix this chip" CTA는 `/gallery/:slug`로 링크한다. 공유 링크는 공개 칩만 열리고 공개 칩은 항상
   갤러리 상세에도 존재하므로 일관적이며, import 구현이 단일 경로로 유지된다.
2. **정체성: 완전 독립 복제, 이름만 표시.** 가져온 프로젝트는 새 로컬 `id`, `createdAt/updatedAt =
   now`, 이름 `${project.name} Remix`를 갖는다. provenance/remixedFrom 메타데이터는 저장하지 않으며
   **스키마 변경이 없다**(schemaVersion bump 없음). remix lineage 트리는 v4 범위. preset remix와 동일한
   철학이다.

## 아키텍처

### 1. 도메인: 순수 import 함수 (신규 `src/domain/remixImport.ts`)

```text
importRemixedProject(snapshot: unknown, id: string, now: number): Project
```

- `migrateProject(snapshot)`로 스냅샷을 현재 스키마로 정규화/마이그레이트한다(스펙: 스냅샷 schema가
  구버전이면 가져오기 시점에 마이그레이션 적용).
- 마이그레이트 결과를 `structuredClone`으로 깊게 복제하고 `id`, `name`(`${migrated.name} Remix`),
  `createdAt = now`, `updatedAt = now`를 덮어쓴다. 입력 스냅샷은 변형하지 않는다.
- Project에는 서버 연결 식별자가 없으므로(서버의 `source_project_id`는 publish 레코드가 로컬
  `project.id`로 키잉) 새 `id`만으로 publish 독립성이 확보된다 — 리믹서가 자기 계정으로 새로 publish
  하면 새 published 레코드가 된다.
- `src/domain/`은 순수 경계이며 이 함수도 React/Konva/storage 의존이 없다.

### 2. 스토어: `projectStore.remixImport`

`remixPreset`와 동형의 액션을 추가한다.

```text
remixImport: (snapshot: unknown) => Promise<Project>
```

- `importRemixedProject(snapshot, createId(), now())` → `repository.save(project)` →
  `set({ projects: [project, ...get().projects] })` → `project` 반환.
- 로그인 불필요(local-first). 서버 부재와 무관.

### 3. 클라이언트: 가져오기 진입점

- **`GalleryDetailPage`**: 상세 본문에 "Remix into my projects" 버튼을 추가한다. 버튼은 prop
  `onRemix?: (project: Project) => void`를 호출한다. import/네비게이션 책임은 페이지가 아니라 App이
  주입한다(페이지는 프레젠테이션 유지). 칩이 아직 로드되지 않았거나 offline/error 상태면 버튼은
  표시하지 않는다.
- **App 배선(`src/app/App.tsx`)**: `GalleryDetailRoute`에 `onRemix` 핸들러를 추가한다. 핸들러는
  `projectStore.remixImport(snapshot)`를 호출하고 결과 프로젝트의 `/editor/:id`로 `useNavigate`
  이동한다. (`ProjectDashboard`가 `remixPreset` 후 에디터로 이동하는 동선과 동일 패턴.)

### 4. 서버: 공유 뷰어 CTA (작은 변경)

- `server/src/share/viewer.ts`의 `renderViewerHtml`에서 `<!-- Remix this chip: V3-M5 -->`
  플레이스홀더를 실제 링크로 교체한다: "Open the Lab" 옆에
  `<a href="${escapeHtml(baseUrl)}/gallery/${escapeHtml(slug)}">Remix this chip</a>`.
- 갤러리 상세 API는 이미 스냅샷을 반환하므로 **새 서버 엔드포인트는 없다.**

## 데이터 흐름

```
사용자가 공유 링크 /s/:slug 를 봄 (서버 렌더)
  → "Remix this chip" 클릭 → /gallery/:slug (SPA 갤러리 상세)
또는 바로 /gallery/:slug 방문
  → 상세가 이미 chip.project 스냅샷 보유
  → "Remix into my projects" 클릭 → onRemix(project)
    → projectStore.remixImport(project)
      → importRemixedProject: migrateProject → 새 id/이름/타임스탬프 독립 복제
      → repository.save → projects 맨 앞에 추가
    → /editor/:id 로 이동 → 로컬 편집
```

## 에러 처리

- 스냅샷 손상/마이그레이션 실패: import 핸들러에서 catch → 사용자 메시지 표시, 로컬 데이터 무영향.
- import는 순수 로컬 동작이라 서버 부재와 무관(스냅샷은 상세 로드 시 이미 확보됨).
- v3 원칙 유지: 공유 기능 실패가 로컬 편집/저장에 영향 주지 않음.

## 테스트 계획 (TDD, RED→GREEN)

- **도메인 `importRemixedProject`**:
  - 새 `id`, `name = '${name} Remix'`, `createdAt/updatedAt = now` 부여.
  - 입력 스냅샷 불변(결과 변경이 원본에 전파되지 않음 — 깊은 복제 확인).
  - 구버전 `schemaVersion` 스냅샷을 현재 스키마로 마이그레이트(`CURRENT_SCHEMA_VERSION` 확인).
- **스토어 `remixImport`**: 독립 프로젝트를 persist하고 `projects` 맨 앞에 추가, 반환값이 저장된
  프로젝트와 일치. 두 번 가져오면 서로 다른 id.
- **클라이언트 `GalleryDetailPage`**: 칩 로드 후 "Remix into my projects" 버튼이 `onRemix`를
  `chip.project`와 함께 호출. offline/error/loading 상태에서는 버튼 미표시.
- **서버 `viewer.ts`**: `renderViewerHtml`이 `/gallery/:slug`로 가는 "Remix this chip" 링크 포함
  (기존 shareHelpers 단위 테스트 확장).
- Konva 렌더는 단위 테스트 비대상 — 브라우저 QA로 확인.

## 수용 게이트 (브라우저 QA)

1. 갤러리 상세에서 "Remix into my projects" 클릭 → 새 로컬 프로젝트가 에디터로 열린다.
2. 가져온 프로젝트가 대시보드 목록 맨 앞에 `{title} Remix`로 나타나고, 편집/새로고침 후에도
   유지된다(독립 로컬 프로젝트).
3. 가져온 프로젝트를 편집해도 원본 published 칩/갤러리에는 영향이 없다.
4. 공유 뷰어 `/s/:slug`의 "Remix this chip" 링크가 `/gallery/:slug`로 이동한다.
5. 서버를 끈 상태에서 기존 로컬 편집/저장/export 무회귀.

## 명시적 비범위 / 후속

- remix lineage 트리 시각화, `remixedFrom` provenance 메타데이터(**v4**).
- 갤러리 목록 카드의 remix 버튼(이번엔 상세 페이지에만 — 목록은 스냅샷이 아닌 summary만 보유).
- 파일 기반 이미지 저장, 업로드 크기 제한, rate limit, Secure 쿠키, 프로덕션 도메인(**M6**).
