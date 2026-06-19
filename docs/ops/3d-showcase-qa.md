# v7 3D Showcase & Video QA — Results

Date: 2026-06-19
Build: bebb5a7 (branch `v7-visual-depth`)
Profile: desktop Chrome via Playwright MCP against local dev (`http://127.0.0.1:5174`, `/api` → :8787).
Environment capability probe: WebGL2 = **ANGLE Metal (Apple M4 Pro)**, WebCodecs `VideoEncoder` = **available**.
Execution: split — agent automated the derivation/material/turntable/embed/fallback cells (Playwright MCP);
MP4 export + the M0-reference visual-quality sign-off are **owner-manual** (see that section).
Pass bar: 3D reads as premium against the M0 reference board (no amateurish glow/metal), recognizable
from the 2D project, smooth turntable, correct fallback, PNG export unchanged.

## Derivation / materials / turntable (agent-automatable)

| Chip | Die shape | Surface | Derivation | Materials+lighting | Turntable | Notes |
|---|---|---|---|---|---|---|
| PANTHER SCALE (mono) | rect | gallery | PASS | PASS | PASS | Matte package + raised metal/substrate blocks, soft PMREM reflections; Play→Pause rotated azimuth. `gallery-3d-panther*.png`. |
| NEON DISTRICT N-9 (neon-fantasy) | hexagon | editor | PASS | PASS | n/a | Hexagon die on square package; cyan emissive blocks glow with bloom — premium neon. `editor-3d-neon-hexagon.png`. |
| NEON DISTRICT N-9 (neon-fantasy) | circle | editor | PASS | PASS | n/a | Smooth 48-segment round die, no faceting; emissive glow casts cyan onto die surface. `editor-3d-neon-circle.png`. |
| (square) | square | — | PASS (by code path) | — | — | `square` uses the same `rectFootprint` derivation as `rect` (`chip3dModel.ts`) + unit tests; visually equivalent to the rect case. |

Screenshots in `docs/ops/3d-showcase-qa-assets/`.

## Gallery / share / fallback (agent-automatable)

- Gallery `/gallery/panther-scale-8313ef09` "View in 3D": button present; opens `dialog "PANTHER SCALE 3D
  showcase"`; viewer mounts and renders PBR (no error boundary); **view-only** — Play turntable + Reset
  view, **no** export panel. Turntable Play→Pause produced a visibly rotated frame. **PASS**
- Editor showcase (same `Chip3DShowcase`): carries the **"Export turntable MP4"** button (editor-only
  `renderExtras`), confirming editor vs gallery split. **PASS**
- Share `/s/panther-scale-8313ef09` (server-rendered): CTA contains `<a … /gallery/panther-scale-8313ef09>View in 3D</a>`
  alongside "Remix this chip" / "Open the Lab"; no client JS added. **PASS**
- WebGL-off fallback: with `HTMLCanvasElement.prototype.getContext` stubbed to `null` and the detail page
  re-rendered (in-app nav), the "View in 3D" button is **absent** and the poster remains — no broken
  viewer. **PASS**
- Over-budget fallback (`pieceCount > 400` → poster): covered by the pure unit test
  `src/visual/chip3d/chip3dBudget.test.ts` (in the green suite). **PASS (unit)**

## 2D regression spot-check (agent-automatable)

- Remix → editor load, die-shape edits (hexagon → circle re-derived live), and "Autosaved" status all
  worked during QA; theme/export controls present. Die/poster PNG export raster contract is covered by the
  green client suite (455 tests incl. export-stage raster tests). **PASS**

## Owner manual sign-off (real Chrome — NOT agent-automatable)

> The environment supports WebCodecs, but per the agreed split these two cells are owner-verified in a real
> Chrome before V7-M6 is marked done.

- [ ] **MP4 export:** open the editor showcase, click "Export turntable MP4"; confirm a downloadable
  **1280×720 / 30fps / ~8s opaque H.264** clip that plays and loops seamlessly, and that die-only
  (`pixelRatio:4`) + poster (`3200x1800`) PNG exports are unchanged. Result: ____
- [ ] **Visual-quality sign-off** vs the M0 reference board (premium, not amateurish) across rect/square/
  circle/hexagon + neon/mono — confirm glow/metal/substrate read as intentional. Result: ____

## Bundle / perf sign-off

- Lazy 3D chunk: `chip3dStage-DKOqudVi.js` = **559.22 kB raw / 142.46 kB gzip**, reached via the
  `Chip3DViewer-*` wrapper (22.53 kB); carries Three + the recorder + `mp4-muxer`.
- Core `index-*` + gallery route: **free of three** — `grep -l "BufferGeometry\|WebGLRenderer" dist/assets/index-*.js`
  → `core index clean of three`. The gallery imports `Chip3DShowcase` statically but Three stays behind the
  lazy `Chip3DViewer` boundary.
- Turntable frame timing: M2 measured worst ~9.3ms / p95 ~9.1ms over 180 frames; live turntable in QA was
  smooth. Owner spot re-check: ____ — no visible jank.

## Gate summary

- `npm test`: client 89 files / 455 tests, server 62 files / 243 tests — PASS.
- `npm run build`: PASS (known >500 kB chunk warning). `npm run typecheck --workspace server`: PASS. `npm run lint`: PASS.
- Console during QA: only the harmless `favicon.ico` 404 (known).
