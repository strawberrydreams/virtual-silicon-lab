# Virtual Silicon Lab 0.1 v2

가상의 반도체 다이를 디자인하고, 고해상도 칩 PNG와 보도자료 스타일 포스터를 내보내는
로컬 우선(local-first) 크리에이티브 웹 앱입니다. EDA 툴이 아니며 실제 제조와는 무관합니다.

## v2 비주얼 메이저 릴리스

v2는 비주얼을 전면 개편한 릴리스입니다. v1의 로컬 우선 에디터와 단일 JSON 프로젝트 모델은
그대로 유지하면서, 페이지 셸·에디터 화면·칩 머티리얼 렌더러·포스터 출력을 프리미엄
반도체 보도자료 이미지 방향으로 다시 디자인했습니다.

## 주요 기능

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

## 시작하기

```bash
npm install
npm run dev -- --host 127.0.0.1   # 출력된 URL을 데스크탑 Chrome에서 열기
npm run dev:server                # v3 API 서버 (http://127.0.0.1:8787)
npm test                          # 클라이언트 + 서버 단위 테스트 (vitest)
npm run test:client               # 클라이언트 테스트만
npm run build                     # dist/에 정적 번들 생성
```

Konva와 에디터 런타임이 하나의 청크로 번들되어 Vite의 500kB 경고 기준을 초과합니다.
현재는 의도된 상태이며, 추후 코드 스플리팅으로 개선할 예정입니다.

