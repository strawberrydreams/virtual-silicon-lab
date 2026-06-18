# v7-M1 — 3D Material & Lighting Design

> **Status:** approved design (brainstormed 2026-06-18). Supersedes the M1 task sketch in
> `docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md` by resolving its **Open design
> decision**. The next step after this spec is a bite-sized TDD plan
> (`docs/superpowers/plans/2026-06-18-v7-m1-3d-material-lighting.md`).

## Goal

Lift the M0 flat-box 3D showcase to the v2/v3 **premium visual-quality bar** by giving the derived
3D chip real materials and lighting: theme-driven PBR materials, a procedural studio environment
(PMREM) for metal/glass reflections, a three-point lighting rig with ACES Filmic tone mapping, and
emissive + UnrealBloom glow for the neon/fantasy blocks that are the signature look. Every material
and lighting parameter is **derived from the existing `resolveMaterialRecipe(theme)`** so the 3D
view tracks the 2D authoring result. `three` — including its bundled postprocessing (`EffectComposer`,
`UnrealBloomPass`) and `PMREMGenerator` — stays isolated in the lazy `src/three/` chunk.

This is the milestone that carries the v7 **manual visual-quality gate** (the same bar as the v2/v3
visual gates): an amateurish 3D view is a milestone failure, not a ship.

## Non-Goals / Out of Scope

- No camera turntable or animation (that is v7-M2).
- No MP4/GIF export (v7-M3).
- No 2D Konva shader enhancement (v7-M4).
- No gallery/share embedding (v7-M5).
- No new block-type taxonomy: the 3D model keeps M0's `emphasis: 'real' | 'fantasy'` distinction;
  `fantasy` blocks glow, `real` blocks are metal. No per-`BlockType` material rules.
- No 2D editor/export change: the Konva `die-only` (`pixelRatio:4`) / `poster` (`3200x1800`) export
  contract is untouched. 3D remains an additive, separate view.
- No schema/migration/API change; local-first is untouched (3D is a client-only derivation of the
  in-memory `Project`).
- No `MeshPhysicalMaterial`/clearcoat in M1 — `MeshStandardMaterial` (color/metalness/roughness/
  emissive) + envMap + bloom is sufficient for the gate. Clearcoat-grade glass is a possible later
  refinement, explicitly deferred.

## Background / Current State (M0)

- `src/visual/chip3d/chip3dModel.ts` — pure derivation `buildChip3DModel(layers, die, palette)`
  produces `Chip3DModel` whose pieces (`package` / `dieBase` / `blockSurface`) each carry a **flat
  `color: string`**. Depths are flat-color M0 stand-ins.
- `src/three/chip3dScene.ts` — builds one `MeshStandardMaterial({ color })` per piece (no
  metalness/roughness/emissive).
- `src/three/Chip3DViewer.tsx` — a presentational `{ model }` component with a `HemisphereLight` +
  one `DirectionalLight`, OrbitControls (change-driven render), resize, reset, and full disposal. No
  tone mapping, no environment, no bloom.
- `src/features/editor/Chip3DPreviewToggle.tsx` — "Open 3D showcase" full-screen modal; resolves a
  **flat palette** stand-in from `resolveTheme(project.theme)` tokens (`dieFill[0].color`,
  `blockFill.real`, `blockFill.fantasy`) and passes it to `buildChip3DModel`. WebGL guard + error
  boundary + Escape/focus restoration.

The M0 plan explicitly flagged that "M1 replaces the whole palette path with real PBR materials
resolved from `materialRecipes`."

Mapping source — `resolveMaterialRecipe(theme): ChipMaterialRecipe` (`src/visual/materialRecipes.ts`)
exposes 2D Konva-oriented tokens: `package.fill`, `dieBase.fillStops`, `substrate.fill`,
`metalTrace`, `microTile`, `glassGlow.{color,blur,opacity}`, plus the resolved `ThemeTokens`
(`tokens.glow.{shadowColor,shadowBlur,shadowOpacity}`, `tokens.background`, `tokens.blockFill`).

## Architecture — resolving the Open Design Decision

**Decision: keep the derived model serializable and self-describing.** Map the recipe to PBR
parameters in a new pure function and embed the resolved descriptors into the model (recommended in
the detailed plan). This keeps color/material policy out of `src/three/`, keeps the geometry
derivation pure and unit-testable, and makes the `Chip3DModel` a complete, deterministic, serializable
contract for downstream milestones (M3 video capture, M5 gallery), where the model — not live theme
state — is the input.

### New pure module: `src/visual/chip3d/chip3dMaterials.ts` (+ test)

No `three` import. Maps `ChipMaterialRecipe` → serializable PBR + environment descriptors.

```ts
export type Chip3DMaterial = {
  color: string
  metalness: number          // 0..1
  roughness: number          // 0..1
  emissive: string           // hex; '#000000' when non-emissive
  emissiveIntensity: number  // >= 0; 0 when non-emissive
}

export type Chip3DMaterialSet = {
  package: Chip3DMaterial
  dieBase: Chip3DMaterial
  blockReal: Chip3DMaterial
  blockFantasy: Chip3DMaterial
}

export type Chip3DBloom = { threshold: number; strength: number; radius: number }

export type Chip3DEnvironment = {
  topColor: string           // procedural PMREM gradient top
  bottomColor: string        // procedural PMREM gradient bottom
  bloom: Chip3DBloom
  exposure: number           // renderer.toneMappingExposure
}

export type Chip3DStyle = { materials: Chip3DMaterialSet; environment: Chip3DEnvironment }

export function resolveChip3DStyle(theme: StyleTheme): Chip3DStyle
```

**Signature note:** the mapper takes `theme: StyleTheme` (not just the recipe) because the PBR/
environment mapping needs both `resolveMaterialRecipe(theme)` (for `package.fill`, `glassGlow`) and
`resolveTheme(theme)` (for `background`, `blockFill`, `glow`); both resolvers are pure, so
`resolveChip3DStyle` stays pure. The caller (`Chip3DPreviewToggle`) just calls
`resolveChip3DStyle(project.theme)`.

### Material mapping (recipe → PBR)

| role | look | metalness | roughness | color source | emissive |
|------|------|-----------|-----------|--------------|----------|
| `package` | dark dielectric | ~0.1 | ~0.8 | `recipe.package.fill` | none (`#000000`, 0) |
| `dieBase` | substrate | ~0.4 | ~0.55 | `tokens.dieFill[0].color` | none |
| `blockReal` | brushed metal | ~0.75 | ~0.35 | `tokens.blockFill.real` | none |
| `blockFantasy` | emissive glow | ~0.15 | ~0.5 | `tokens.blockFill.fantasy` | `recipe.glassGlow.color`, intensity scaled from `recipe.glassGlow.opacity` × theme glow |

- Only `blockFantasy` is emissive, and its `emissiveIntensity` is tuned so it (and only it) crosses
  the bloom luminance threshold. This is the signature neon halo.
- `emissiveIntensity` scales with the theme's glow strength (`recipe.glassGlow.opacity` /
  `tokens.glow.shadowOpacity`), so neon/keynote glow hot while mono/military stay restrained.

### Environment & bloom mapping (per theme)

- `topColor` / `bottomColor` from `tokens.background` (the theme backdrop), so reflections on metal
  surfaces match the theme rather than a generic gray studio.
- `bloom.strength` derived from theme glow (`tokens.glow.shadowOpacity`/`shadowBlur`): **neon >
  keynote > retro > military ≈ mono**. `bloom.threshold` set so non-emissive surfaces stay below it.
  `bloom.radius` a small constant.
- `exposure` a per-theme constant (brighter themes slightly lower) for a balanced ACES result.

### `chip3dModel.ts` changes (pure, no `three`)

- Replace each piece's flat `color: string` with `material: Chip3DMaterial`.
- Add `environment: Chip3DEnvironment` to `Chip3DModel`.
- Change the signature: `buildChip3DModel(layers: ChipLayerModel, die: Die, style: Chip3DStyle):
  Chip3DModel`. The `palette: Chip3DPalette` argument is removed; `Chip3DPalette` is deleted.
- All piece materials come from `style.materials` (single recipe-driven source). The M0 path of
  taking the package color from `layers.package.color` and die/block colors from the flat palette is
  dropped. Geometry/footprint/depth/stacking logic is unchanged.
- Existing M0 `chip3dModel.test.ts` is updated: assertions that read `piece.color` now read
  `piece.material.*`, and the test fixture builds a `Chip3DStyle` instead of a `Chip3DPalette`.

### `chip3dScene.ts` changes (`three`)

- Build `MeshStandardMaterial` from each piece's `material` descriptor
  (`color`/`metalness`/`roughness`/`emissive`/`emissiveIntensity`).
- Reflections come from `scene.environment` (set once by the viewer), so no per-material envMap
  wiring is needed. Geometry building and `disposeChip3DScene` are otherwise unchanged (disposal
  already covers geometry + materials).

### `Chip3DViewer.tsx` changes (`three`)

Reads everything new from `model.environment` (keeps the presentational `{ model }` prop intact for
M5 reuse).

1. **Procedural environment:** build a small vertical-gradient scene/texture from
   `environment.topColor → bottomColor`, run it through `PMREMGenerator`, and assign the result to
   `scene.environment` for image-based reflections on metal surfaces.
2. **Tone mapping:** `renderer.toneMapping = THREE.ACESFilmicToneMapping`;
   `renderer.toneMappingExposure = environment.exposure`. `renderer.outputColorSpace` confirmed sRGB.
3. **Lighting rig (replaces the single directional light):** key (warm, strong, shadow-casting) +
   fill (cool, soft) + rim/back + a low-intensity hemisphere ambient.
4. **Post-processing:** `EffectComposer` with `RenderPass` → `UnrealBloomPass`
   (threshold/strength/radius from `environment.bloom`). Render through the composer in the
   change-driven render loop. On resize, update the composer size and bloom resolution alongside the
   camera/renderer.
5. **Disposal:** extend the existing teardown to dispose the composer/render targets, the
   `PMREMGenerator`, and the generated environment texture, in addition to the M0 scene/renderer
   disposal.

OrbitControls (change-driven render), reset-view, resize, and the WebGL/error fallbacks are all
unchanged in behavior.

### `Chip3DPreviewToggle.tsx` changes

Drop the flat-palette stand-in. Resolve `resolveChip3DStyle(project.theme)` and pass the
`Chip3DStyle` to `buildChip3DModel`. The existing toggle/modal test (viewer mocked) stays valid; if it asserted
`model.pieces.length`, that still holds (geometry unchanged).

## Data Flow

```
project.theme
  → resolveChip3DStyle(theme): Chip3DStyle                  (new pure, src/visual/chip3d)
       internally uses resolveMaterialRecipe(theme) + resolveTheme(theme)
buildChipLayers(project): ChipLayerModel                    (existing)
buildChip3DModel(layers, die, style): Chip3DModel           (pieces carry material; model carries environment)
  → Chip3DViewer({ model })                                 (src/three, lazy)
      scene meshes  ← piece.material  (MeshStandardMaterial)
      scene.environment ← PMREM(environment.top/bottom)
      tone mapping/exposure ← environment.exposure
      EffectComposer + UnrealBloomPass ← environment.bloom
```

## Testing Strategy

- **Pure unit tests (`chip3dMaterials.test.ts`):** for all five themes, `resolveChip3DStyle` returns
  bounded PBR params (`0 ≤ metalness,roughness ≤ 1`, `emissiveIntensity ≥ 0`); only `blockFantasy`
  is emissive (`emissiveIntensity > 0`, others `0`); `blockReal.metalness > package.metalness`;
  `environment.bloom.strength` ordering holds (neon > mono); `environment` has non-empty
  top/bottom colors and a positive exposure.
- **Updated `chip3dModel.test.ts`:** pieces carry the expected `material` per role; the model carries
  an `environment`; stacking/footprint/extent assertions are unchanged (geometry untouched).
- **Three rendering is browser-verified, not unit-tested** (jsdom has no WebGL) — per the existing
  convention. The scene/viewer changes (PBR, PMREM, lighting, bloom) are validated in the browser.
- **Toggle/modal test** stays green (viewer mocked).
- **Manual visual-quality gate:** open the showcase on a real hero chip (e.g. the N1 GREEN HORIZON
  12-block project used for M0 QA) and review against the M0 reference board — metal reads as metal,
  the substrate reflects the theme environment, fantasy blocks glow with a real bloom halo, and each
  theme stays distinct. Recorded in `implementation.md`.

## Invariants & Risks

- **Bundle isolation:** `EffectComposer`, `UnrealBloomPass`, and `PMREMGenerator` are part of the
  `three` package (`three/examples/jsm/...`) and load only via the existing lazy `Chip3DViewer`
  import — no new npm dependency. The gate re-verifies the core `index-*` chunk did not grow by
  Three's weight and that postprocessing stays in the 3D chunk.
- **Purity:** `src/visual/chip3d/` (model + materials) imports only from `domain`/`visual`; `three`
  is imported only in `src/three/`.
- **2D/export/local-first untouched:** Konva editor, die/poster PNG export contract, autosave,
  IndexedDB, and schema are all unchanged.
- **Visual-quality risk (the real risk):** "looks premium at a glance" may need browser iteration on
  the PBR constants, bloom threshold/strength, and exposure. The pure mapper centralizes these
  constants so tuning is a localized, testable change rather than scattered magic numbers in the
  renderer.
- **Performance:** bloom + PMREM add GPU cost. Mitigations: DPR is already capped at 2; the render
  loop stays change-driven (no rAF turntable until M2); a heavier perf budget/low-end fallback is
  M5's responsibility. The WebGL-unavailable fallback from M0 is retained.

## Affected Files

- **Create:** `src/visual/chip3d/chip3dMaterials.ts` + `src/visual/chip3d/chip3dMaterials.test.ts`
- **Modify:** `src/visual/chip3d/chip3dModel.ts` (+ `chip3dModel.test.ts`),
  `src/three/chip3dScene.ts`, `src/three/Chip3DViewer.tsx`,
  `src/features/editor/Chip3DPreviewToggle.tsx`
- **Docs:** `implementation.md` (v7-M1 entry), `CLAUDE.md` (Milestone Status)

## Milestone Gate

The 3D showcase passes the manual visual-quality review at the same bar as the v2/v3 visual gates;
`npm test` / `npm run build` / `npm run typecheck --workspace server` / `npm run lint` are green with
`three` + postprocessing code-split out of the core bundle; the 2D editor/export path and bundle are
unaffected when the showcase is not opened.
