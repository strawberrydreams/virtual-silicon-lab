# Virtual Silicon Lab — 요구사항 v1

가상의 반도체 칩 다이를 2D 캔버스에서 조립·연출하고, 고해상도 칩 이미지와 홍보 포스터(PNG)로
내보내는 **창작 도구**. EDA 툴·게임 아님, 실제 제조 무시.

## 제품 원칙 (우선순위)

1. **완성 > 기능 수.** 1인 + AI로 끝까지 갈 범위만 v1.
2. **시각 품질이 곧 제품.** 글로우/네온/금속질감/익스포트가 아마추어 같으면 실패.
3. **5분 안에 멋진 칩.** 빈 캔버스가 아니라 프리셋·테마에서 시작.
4. 톤은 병맛·초현실·Sci-Fi 유머. 진지한 연구소 흉내 금지.
5. 타겟: 칩 미감을 좋아하는 비-EE. (회로 정합성 원하는 사람은 타겟 아님.)
- 디자인 레퍼런스: 실제 die shot · Sci-Fi 게임 UI · 애플 키노트. EDA 외형(Cadence/Synopsys) ❌.
  착수 전 레퍼런스 보드부터 (`docs/reference/`).

## 기능 분류

### v1 (MVP)

- 로그인 없이 즉시 시작; 프로젝트 생성/복제/삭제; 자동 저장(IndexedDB, localStorage 폴백).
- Konva 에디터: 줌/팬/그리드/스냅; 다이 4종(rect/square/circle/hexagon); 블록 드래그/리사이즈/회전,
  다이 경계 제한; undo/redo·삭제·복제·앞뒤 순서·단축키.
- 블록: 현실(CPU/GPU/DSP/SRAM/Cache/DAC/ADC/PLL/IO/USB) + 판타지(EmotionEngine/DreamSynth/
  QuantumMemory/ConsciousnessProcessor/RealityDistortionUnit/TimeCore).
- 파라메트릭 프리셋 + 리믹스(v1 중심); 스타일 테마 원클릭(최대 차별점).
- 장식(글로우/네온 라인/금속질감/라벨/경고): 출력 효과는 **Konva 노드 설정**(shadowBlur/그라디언트/
  filter/blend), 셰이더 미사용. DOM/CSS 효과는 에디터 UI에만.
- 가짜 스펙 시트(폼 + 자동 레이아웃 + 예시 동봉).
- PNG 2종: die-only, poster(export 전용 Konva Stage 합성). `toDataURL({pixelRatio})` 다운로드 +
  Web Share(가능 시). Hero 칩 3~5개 큐레이션.

### post-MVP

자유 설계형 커스텀 다이 · 셰이더 비주얼(PixiJS/Three.js) · 시뮬레이션 애니메이션 · 프로젝트 공유
(Supabase) · 가짜 3D(CSS transform) · 커뮤니티 갤러리 · AI 생성 · 세계관 페이지 · 반응형/모바일.

### 제외 (영구)

진짜 3D 뷰어 · MP4/애니메이션 익스포트 · 로그인/계정 · GDSII/DRC/LVS/타이밍/합성/제조 호환성.

## 데이터 모델 (스케치 — 고정 계약 아님; `schemaVersion`으로 마이그레이션)

```ts
type Project = {
  schemaVersion: number; id: string; name: string; createdAt: number; updatedAt: number
  die: Die; blocks: Block[]; decorations: Decoration[]; theme: StyleTheme; spec: FakeSpec
}
type Die = { shape: 'rect'|'square'|'circle'|'hexagon'; width: number; height: number; background: string }
type Block = {
  id: string; type: BlockType; category: 'real'|'fantasy'
  x: number; y: number; w: number; h: number; rotation: number
  label?: string; glow?: boolean; colorOverride?: string; zIndex?: number
}
type Decoration =
  | { id: string; kind: 'neonLine'; points: number[]; color: string; zIndex?: number }
  | { id: string; kind: 'warningMark'; x: number; y: number; zIndex?: number }
  | { id: string; kind: 'label'; x: number; y: number; text: string; zIndex?: number }
  | { id: string; kind: 'sciFiObject'; assetKey: string; x: number; y: number; zIndex?: number }
type StyleTheme = 'neon'|'retro'|'military'|'keynote'|'mono'
type FakeSpec = {
  brand: string; series: string; generation: string; process: string
  cores: number; bandwidth: string; features: string[]; description: string
}
```

처음부터 **단일 JSON으로 export 가능한 구조**로 둘 것.

## 기술 스택

Vite · React + TypeScript · Tailwind CSS · Zustand · Konva · 저장 IndexedDB(`idb`) + localStorage
폴백 · 정적 호스팅(백엔드 없음). post-MVP: Supabase(공유), PixiJS/Three.js(고급 비주얼).

## MVP 완료 기준 (Acceptance)

- 로그인 없이 30초 내 첫 블록 배치; 프리셋에서 5분 내 발표급 칩 1개 완성.
- 테마 1클릭으로 다이 전체 톤 일관 변경; 글로우/네온이 아마추어 같지 않음(Hero 기준).
- 판타지 블록 + 병맛 스펙으로 "웃기고 멋진" 결과; undo/redo·삭제·복제·순서변경 동작.
- 블록이 다이 경계를 벗어나지 않음; die-only/poster PNG + 공유 동작.
- 새로고침/재방문 후 프로젝트 보존; 데스크탑 Chrome 끊김 없는 UX(60fps 목표, 자동 저장 필수).

## 면책

가상 반도체 창작·시각화 전용. 실제 제조·엔지니어링에 사용할 수 없다.
