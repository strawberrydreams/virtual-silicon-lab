# v7-M0 — 3D Showcase Foundation 설계

- 작성일: 2026-06-18
- 상태: 사용자 승인된 설계 (브레인스토밍 완료, writing-plans로 진행)
- 상위 로드맵: `docs/superpowers/specs/2026-06-18-v7-v8-roadmap-design.md` (v7 Visual Depth),
  `docs/superpowers/plans/2026-06-18-v7-visual-depth-roadmap.md` (v7 아웃라인)
- 범위: **v7-M0만.** M1(머티리얼/라이팅)~M6은 각 착수 시 별도 brainstorm/spec.

## 한 줄 목표

완성한 칩을, 기존 serializable `Project`에서 **파생된 3D 모델**로 에디터에서 보여주는 기반을
세운다. 2D Konva 편집/export는 그대로 두고, 3D는 별도·additive·lazy-load 렌더 경로로 추가한다.

## 핵심 결정 (브레인스토밍 확정)

1. **파생 입력 = 기존 `ChipLayerModel`.** 순수 함수 `buildChip3DModel(layers, die)`가
   `buildChipLayers(project)`의 결과(`ChipLayerModel`)와 `Die`를 받아 3D 모델을 만든다. 2D 레이아웃
   로직(bounds·emphasis·색)을 그대로 물려받아 2D/3D가 어긋나지 않는다.
2. **2D/3D 구조 미러링.** 2D는 `buildChipLayers`(순수) → `ChipArtwork`/`ChipStage`(Konva). 3D는
   `buildChip3DModel`(순수, `src/visual/chip3d/`) → `Chip3DViewer`(Three.js, `src/three/`).
3. **`three`는 `src/three/`에서만 import하고 lazy-load한다.** 토글을 열기 전에는 `three`가
   초기 청크에 들어가지 않는다(코어 번들 무영향 게이트의 핵심).
4. **마운트 = 에디터 "3D 미리보기" 토글.** 데스크톱 에디터에서 현재 칩을 3D로 보는 옵셔널 패널.
   갤러리/공유 통합은 M5.
5. **M0 시각 충실도 = 지오메트리 우선(flat 색).** die/블록을 압출한 박스 + `ChipLayerModel`의 평면
   색 + 기본 조명 + orbit. 프리미엄 PBR 머티리얼·emissive glow·환경광은 **M1로 명시적 이월**.

## 아키텍처

```text
src/visual/chip3d/
  chip3dModel.ts        # 순수: buildChip3DModel(layers: ChipLayerModel, die: Die): Chip3DModel
  chip3dModel.test.ts   # Vitest 단위 테스트 (React/Three import 없음)
src/three/
  Chip3DViewer.tsx      # Three.js 렌더러 (three를 dynamic import, lazy)
  chip3dScene.ts        # Chip3DModel → Three 객체 빌드 헬퍼 (three import; 브라우저 검증)
src/features/editor/
  (기존 에디터 셸에 "3D 미리보기" 토글 + lazy 마운트 추가)
```

규칙 준수:
- `src/domain/`은 불변·순수(3D 코드 없음). 파생은 `src/visual/`(이미 domain만 import하는 순수 계층)에 둔다.
- `three`는 오직 `src/three/`에서만 import. `src/visual/chip3d/`는 three를 모른다(순수, 테스트 가능).
- Konva 2D export 계약(die `pixelRatio:4`, poster `3200x1800`) 불변. 3D는 새 경로로만 추가.

## `Chip3DModel` (직렬화 가능, M0 flat-color 형태)

```ts
export type Vec3 = [number, number, number]

export type Chip3DPiece =
  | { id: string; kind: 'package'; footprint: Footprint; baseZ: number; depth: number; color: string }
  | { id: string; kind: 'dieBase'; footprint: Footprint; baseZ: number; depth: number; color: string }
  | { id: string; kind: 'blockSurface'; blockId: string; footprint: Footprint; baseZ: number; depth: number; color: string; emphasis: 'real' | 'fantasy' }

// 사각형은 rect, circle/hexagon die는 polygon으로 표현 (압출 단면)
export type Footprint =
  | { type: 'rect'; x: number; y: number; width: number; height: number }
  | { type: 'polygon'; points: [number, number][] }

export type Chip3DModel = {
  pieces: Chip3DPiece[]
  center: Vec3       // 모델 중심(카메라 타깃)
  extent: Vec3       // 바운딩 박스 크기(카메라 거리 산정용)
}
```

- **좌표 매핑(2D→3D 계약):** 2D die 픽셀 공간(x, y; y는 아래로 증가)을 3D 바닥 평면
  (x = x, z = y; y축은 위로 = 압출 두께)으로 매핑한다. 모델은 `center`만큼 평행이동해 원점 중심에 둔다.
- **압출 규칙(M0):** package 슬래브(가장 낮고 가장 큼) → die base 슬래브 → block surface 박스.
  가독성을 위해 `fantasy` 블록을 `real`보다 약간 더 높게(depth 차등) 압출한다.
- **M0 제외:** trace/microtile/filler/glow는 평면 처리하거나 생략(게이트 기준은 "알아볼 수 있게").
  fabric 디테일·glow·PBR은 M1.

## Feasibility 스파이크 (빌드 전 선행, go/no-go)

빌드 커밋 전에 세 가지를 검증하고 결과를 `implementation.md`에 기록한다.

1. **번들 격리:** `three`를 lazy/dynamic import 했을 때 `npm run build` 산출 청크에서 `three`가
   **별도 청크**로 분리되고 초기(index) 청크에 들어가지 않는다.
2. **파생 충실도:** 실제 히어로 프리셋 칩이 JSON에서 파생되어 3D로 **알아볼 수 있게** 렌더된다.
3. **인터랙션:** 타깃 데스크톱 프로파일에서 orbit이 수용 가능한 FPS로 동작한다.

세 항목 중 하나라도 실패하면(특히 번들 격리/렌더 불가) 본 빌드 전에 대안(라이브러리/접근)을 재검토한다.
스파이크 코드는 throwaway이며, 본 구현은 위 아키텍처 계약을 따른다.

## 에러/엣지

- **WebGL 미지원:** M0는 "3D를 사용할 수 없습니다" 안내를 표시(완전한 저사양 폴백은 M5).
- **빈 프로젝트(블록 0):** package+die만 렌더.
- **블록 수 상한:** `ChipLayerModel`이 이미 상위에서 bound(예: microtile ≤ 4000)하므로 별도 상한 불필요.
- **서버/로컬:** 3D는 클라이언트 전용 파생 — 서버 부재와 무관, local-first 무영향.

## 테스트 전략

- **순수 `buildChip3DModel`은 단위 테스트(Vitest)** — `chipLayers.test.ts`와 동일 패턴: die base/
  package/block 조각 생성, fantasy가 real보다 높음, 좌표 매핑(center/extent), circle/hexagon footprint.
- **Three 렌더링은 단위 테스트하지 않음**(jsdom에 WebGL 없음) — 브라우저 검증. 기존 "Konva는 단위
  테스트 안 함" 컨벤션과 동일. 토글/lazy 마운트는 viewer를 mock해 컴포넌트 테스트로 핀.

## M0 완료 기준 (게이트)

- 실제 칩이 에디터 "3D 미리보기" 토글에서 자신의 JSON으로부터 알아볼 수 있게 3D 렌더된다.
- 토글을 닫은 상태에서 2D 에디터 경로와 **코어 번들이 영향받지 않는다**(`three`가 초기 청크에 없음).
- `npm test`·`npm run build`·서버 typecheck·lint 모두 green. 결정/결과는 `implementation.md`에,
  Milestone Status는 `CLAUDE.md`에 기록.

## 비고

- 신규 의존성은 `three` + `@types/three`뿐(코드 분할로 격리).
- `src/three/`는 새 렌더러 경계(2D의 `canvas/`에 대응). M5에서 갤러리/공유로 승격 가능하도록
  Viewer는 `{ model: Chip3DModel }`만 받는 표현 컴포넌트로 유지.
