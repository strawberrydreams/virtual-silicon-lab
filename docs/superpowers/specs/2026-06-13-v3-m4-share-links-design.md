# V3-M4 공유 링크 설계 (2026-06-13)

## 한 줄 목표

로그인 없이 published 공개 칩을 볼 수 있는 독립 공유 뷰어 `/s/:slug`와, Slack/X 등
링크 미리보기가 실제로 동작하는 OG 메타 이미지를 추가한다. 공유 루프(M5 리믹스 가져오기)의
앞단을 완성한다.

## 배경 / 현재 상태

- 서버(`@vsl/server`)는 **API 전용** Hono 앱(:8787)이고, 클라이언트는 별도 정적 SPA(Vite,
  Netlify SPA fallback)다. 서버는 정적 클라이언트 자산을 서빙하지 않는다.
- M2/M3에서 `published_chips` 테이블, 공개 전용 조회
  `getPublicPublishedChipBySlug(db, slug)`(= `is_public = 1`만 반환), 갤러리 라우트
  `GET /api/gallery`, `GET /api/gallery/:slug`가 이미 존재한다.
- poster/die PNG는 현재 SQLite TEXT에 **data URL**로 저장된다(M6에서 파일 기반 전환 예정).
- `/gallery/:slug`도 이미 로그인 없이 열린다. 따라서 `/s/:slug`는 "최소 크롬 + 링크 미리보기
  최적화된 독립 공유 뷰어"로 차별화된다.

## 핵심 결정 (브레인스토밍 확정)

1. **가시성: 공개 칩만.** `/s/:slug`는 `is_public = 1`인 칩만 연다(갤러리와 동일 규칙).
   비공개/언퍼블리시/없는 slug는 모두 404로 처리. 별도 share token/언리스트 스키마는 추가하지
   않는다 — 기존 `getPublicPublishedChipBySlug`를 그대로 재사용한다.
2. **렌더링: 서버 렌더링 독립 뷰어.** OG 크롤러는 JS를 실행하지 않으므로, Hono 서버가
   `/s/:slug`를 OG/Twitter 메타가 들어간 HTML로 직접 렌더링한다. `og:image`는 data URL을
   쓸 수 없으므로 poster 바이트를 서빙하는 별도 엔드포인트를 절대 URL로 가리킨다. 서버
   렌더링은 크롤러 정확성 + Hono 통합 테스트 가능 + SPA 빌드 비의존 + 배포 단순성의 이점이 있다.
3. **공유 동선: PublishPanel에만.** 공개 퍼블리시 후 PublishPanel에 share URL + 복사 버튼을
   노출한다(소유자가 자기 칩을 공유하는 주 동선). 갤러리 상세의 복사 버튼은 비범위.

## 아키텍처

### 1. 서버: 공유 뷰어 모듈 (신규 `server/src/share/`)

기존 `publish/routes.ts`(124줄, JSON API)가 이미 커지고 있으므로 HTML 렌더링 경계를 섞지
않기 위해 공유 뷰어를 별도 모듈로 분리한다.

- `server/src/share/viewer.ts` — 순수 HTML 템플릿 + `escapeHtml` + base URL 유도 헬퍼
  (프레임워크 비의존, 단위 테스트 대상).
- `server/src/share/routes.ts` — Hono 라우트. `app.ts`에서 `app.route('/', shareRoutes(deps))`
  로 마운트(`/s/...` 경로를 `/api` 밖에 둔다).

#### 라우트

- **`GET /s/:slug`**
  - `getPublicPublishedChipBySlug`로 조회.
  - 공개 칩: OG/Twitter 메타 + 포스터-퍼스트 본문을 가진 HTML 200 (`Content-Type: text/html`).
  - 비공개/없음/언퍼블리시: 메타 기본값을 가진 404 HTML(noindex), "이 칩은 비공개거나 삭제됨"
    안내 + Lab/Gallery 링크.
- **`GET /s/:slug/poster.png`**
  - 공개 칩의 `posterImageDataUrl`을 디코딩해 `image/png` 바이트로 응답
    (`Content-Type: image/png`, `Cache-Control: public, max-age=...`).
  - data URL prefix를 방어적으로 파싱; 비공개/없음/잘못된 형식은 404.
  - 이 절대 URL이 `og:image`/`twitter:image`가 된다.

#### 절대 URL 해석

- `resolvePublicBaseUrl(req)` = `process.env.VSL_PUBLIC_BASE_URL`가 있으면 그 값(끝 `/` 제거),
  없으면 요청 URL의 origin에서 유도(`new URL(c.req.url).origin`).
- `og:url`/`og:image`/`twitter:image`에 절대 URL로 사용. M6에서 프로덕션 도메인을
  `VSL_PUBLIC_BASE_URL`로 확정한다.

### 2. 서버: HTML 템플릿 (`server/src/share/viewer.ts`)

- `<head>`:
  - `<title>{title} — Virtual Silicon Lab</title>`
  - `og:title`, `og:description`(spec.description, 없으면 brand/series 합성 한 줄),
    `og:type=website`, `og:url`, `og:image`(절대 poster.png), `og:image:width=3200`,
    `og:image:height=1800`, `og:site_name=Virtual Silicon Lab`.
  - `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- `<body>`(포스터-퍼스트):
  - kicker "Shared from Virtual Silicon Lab", 제목, "Published by {ownerDisplayName}".
  - 포스터 `<img src="/s/:slug/poster.png">`.
  - 가짜 스펙 시트: brand/series/process/cores/bandwidth/features/description.
  - CTA: "Open the Lab"(앱 루트 링크). "Remix this chip"은 M5 자리만 주석/플레이스홀더.
- **보안**: 모든 사용자 입력(title, spec 필드, ownerDisplayName)은 `escapeHtml`로 이스케이프해
  HTML/속성 주입을 차단한다. 메타 속성 값도 이스케이프한다.
- **시각 품질**: v2 토큰 계열 색을 인라인 `<style>`로 담아 어설프지 않게. 미리보기 카드의 핵심
  비주얼은 포스터 PNG(3200×1800)가 담당한다(비주얼 품질 게이트는 v3에도 적용).

### 3. 클라이언트: PublishPanel 공유 링크

- **서버 직렬화에 `shareUrl` 추가**: `serializePublishedChip`에
  `shareUrl: isPublic ? \`${base}/s/${slug}\` : null`을 더한다. 서버가 `/s/`의 권위자이므로
  절대 URL을 서버가 구성한다(base는 위 `resolvePublicBaseUrl`).
- **`publishApi`**: `PublishedChip` 타입에 `shareUrl: string | null` 반영.
- **`PublishPanel`**: 공개 퍼블리시 상태(`isPublic && shareUrl`)일 때 share URL 텍스트 +
  복사 버튼 표시. `navigator.clipboard.writeText` 사용, 미지원 시 텍스트 선택 폴백. 비공개/오프라인/
  로그인 전에는 미표시. 복사 성공 시 일시적 "Copied" 피드백.

## 데이터 흐름

```
소유자가 PublishPanel에서 공개 퍼블리시
  → POST /api/published-chips (기존)
  → 응답에 shareUrl 포함 → 패널이 복사 버튼 노출
공유 대상자가 링크 열기 / 크롤러가 fetch
  → GET /s/:slug (Hono) → getPublicPublishedChipBySlug
    → 공개: OG 메타 + 뷰어 HTML, og:image=/s/:slug/poster.png
    → 비공개/없음: 404 HTML
크롤러가 og:image fetch
  → GET /s/:slug/poster.png → data URL 디코딩 → PNG 바이트
```

## 에러 처리

- 공개가 아니거나 없는 slug: HTML 404(viewer)와 image 404(poster) 모두 일관 처리.
- 잘못된/누락된 poster data URL: poster 엔드포인트 404(서버 크래시 없음).
- 클라이언트 클립보드 미지원: 텍스트 선택 폴백, 기능 자체는 비차단.
- v3 원칙 유지: 서버 부재/실패는 로컬 편집에 무영향.

## 테스트 계획 (TDD, RED→GREEN)

- **서버 단위**: `escapeHtml`(특수문자 이스케이프), `resolvePublicBaseUrl`(env 우선 / origin
  폴백), poster data URL 디코딩 헬퍼.
- **서버 통합**(Hono, 임시/인메모리 SQLite):
  - `GET /s/:slug` 공개 = 200 + `text/html` + og:title/og:image/twitter:card 포함 + 제목
    이스케이프 확인(예: `<script>` 제목이 그대로 안 들어감).
  - `GET /s/:slug` 비공개/없음 = 404 HTML.
  - `GET /s/:slug/poster.png` 공개 = 200 + `image/png` + 바이트 길이 > 0.
  - `GET /s/:slug/poster.png` 비공개/없음 = 404.
- **클라이언트**:
  - `publishApi`가 응답의 `shareUrl`을 그대로 노출.
  - `PublishPanel`: 공개+shareUrl일 때 share URL/복사 버튼 표시, 비공개/로그인 전 미표시,
    복사 클릭 시 클립보드 호출.
- Konva/실제 OG 미리보기 렌더는 단위 테스트 비대상 — 브라우저 QA로 확인.

## 수용 게이트 (브라우저 QA)

1. 공개 칩 퍼블리시 → PublishPanel의 share URL 복사 → 새 탭에서 `/s/:slug`가 포스터+스펙으로
   열린다.
2. 같은 URL의 페이지 소스에 `og:image`/`twitter:card` 메타가 절대 URL로 존재하고,
   `/s/:slug/poster.png`가 PNG로 직접 열린다.
3. 비공개로 토글한 칩의 `/s/:slug`는 404 안내를 보여준다.
4. 서버를 끈 상태에서 기존 로컬 편집/저장/export 무회귀.

## 명시적 비범위 / 후속

- 비공개 언리스트 공유, share token, remix 가져오기(**M5**).
- 파일 기반 이미지 저장, 업로드 크기 제한, rate limit, Secure 쿠키, 프로덕션 도메인
  (`VSL_PUBLIC_BASE_URL`) 확정(**M6**).
- 갤러리 상세 페이지의 복사 버튼(이번엔 PublishPanel만).
