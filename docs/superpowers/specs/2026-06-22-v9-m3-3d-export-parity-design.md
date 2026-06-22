# V9-M3 3D + Export Parity Design

> **Status:** Approved 2026-06-22

## Goal

Make every v9 die shape use the same pure outline in 2D, die/poster PNG export, the interactive 3D
showcase, and MP4 turntable export. Preserve all existing raster and video output contracts.

## Scope

M3 completes the 3D consumer of the shared die-outline architecture introduced in M0 and extended
through M1–M2. It includes all ten die shapes:

- Legacy: `rect`, `square`, `circle`, `hexagon`
- Parametric: `octagon`, `rounded-rect`, `chamfered-rect`, `keyed`, `l-shape`, `plus`

M3 does not add persisted fields, schema migrations, server routes, SQLite changes, 3D authoring,
new export formats, or material-finish controls.

## Architecture

`resolveDieOutline(die)` remains the single source of die geometry. `chip3dModel` converts that
outline with `outlineToPolygon(outline, 64)` and emits the result as the die base's polygon
footprint. The 3D scene and MP4 recorder already consume the same `Chip3DModel`, so this one model
change provides parity to both outputs.

All die shapes, including rectangles, use the outline-derived polygon path. Package and block
surfaces remain rectangular because their geometry is not controlled by `DieShape`.

## Coordinate Mapping

The outline is expressed in die-local coordinates from `(0, 0)` through `(die.width, die.height)`.
The 3D layer model supplies the die base's actual render bounds. Each polygon point is mapped into
those bounds using independent X/Y scale and offset:

```text
x' = bounds.x + point.x / die.width  * bounds.width
y' = bounds.y + point.y / die.height * bounds.height
```

This makes the model correct even if layout padding or a later composition changes the die base
bounds. Project migration already guarantees positive, finite die dimensions.

## Curve Flattening Policy

3D extrusion uses a fixed 64 segments per full circle by calling `outlineToPolygon(outline, 64)`.
Quarter-circle corners therefore receive 16 segments each. This is deliberately the same default
sampling policy used by the shared outline domain:

- Circle: 64 polygon points
- Rounded rectangle: four straight-edge start points plus 16 sampled points per quarter arc, with
  junction and closing-point deduplication performed by `outlineToPolygon`
- Straight-sided shapes: their exact ordered vertices, with no added sampling

The structured outline remains the source for crisp Konva 2D/export curves. The flattened polygon
is reserved for containment and 3D extrusion, as established by the v9 design.

## Showcase Availability and Fallback

All ten valid `DieShape` values are supported by 3D. The temporary M1/M2 parametric-shape rejection
is removed. `isChip3DShapeSupported` remains as an exhaustive domain boundary rather than becoming
an unconditional boolean, so a future shape addition must explicitly enter the support contract.

Poster fallback remains available only when:

- WebGL is unavailable;
- the derived piece count exceeds the existing interactive budget; or
- the lazy viewer fails, in which case the existing error boundary keeps the modal recoverable.

The obsolete `Parametric 3D geometry arrives in M3.` state and copy are removed. Parametric shapes
must mount the interactive viewer whenever WebGL and the piece budget permit.

## MP4 Export

No second geometry path is introduced. `VideoExportPanel` receives the same model rendered by the
interactive showcase, and `recordTurntableMp4` uses `buildChip3DScene(model)`. Consequently the
MP4 frame sequence extrudes the identical outline polygon.

Existing capture settings, encoder behavior, turntable timing, dimensions, and fallback behavior
are unchanged.

## 2D and Export Parity

M1 already routes editor artwork, die-only PNG, and poster PNG through `ChipArtwork` and the shared
structured outline. M3 does not duplicate or replace those renderers. It adds regression tests that
pin the unchanged export contracts while the 3D model tests prove the same project parameters reach
the outline-derived polygon.

Stable output contracts:

- Die-only PNG: logical die width/height at `pixelRatio: 4`
- Poster PNG: logical `1600×900` at `pixelRatio: 2`, yielding `3200×1800`
- Poster formats: `press-hero`, `architecture-slide`, `product-closeup`
- MP4: existing V7 capture and encoder contract

## Error Handling and Invariants

`resolveDieOutline` and `outlineToPolygon` are pure and already guarantee ordered finite geometry
for valid migrated projects. The six parametric resolvers clamp malformed persisted parameters to
safe ranges. M3 relies on these established boundaries and does not add silent geometry fallback,
because replacing an invalid outline with a rectangle would violate parity and conceal a defect.

The model tests assert finite, bounded, non-empty footprints for all ten shapes. Concave vertex
order is preserved for L and Plus, allowing `THREE.Shape` to extrude their re-entrant regions
without CSG or special cases.

## Testing Strategy

Implementation follows strict red-green-refactor cycles:

1. Add model tests proving every die footprint is derived as a polygon and mapped into layer bounds.
2. Add parameter tests proving rounded radius, keyed/L corner and notch size, chamfer, and plus arm
   width affect the 3D polygon.
3. Pin fixed 64-segment circle/rounded sampling and concave L/Plus vertices.
4. Change 3D support tests from temporary rejection to exhaustive ten-shape support.
5. Change showcase integration tests so a parametric project mounts the viewer and exposes the
   existing MP4 export extra under WebGL; retain WebGL/budget poster fallback tests.
6. Run existing die/poster export-size tests and the complete client/server/build/typecheck/lint
   gates.
7. Browser-QA representative curved, chamfered, keyed, and concave shapes in the 3D showcase and
   compare them with the editor/poster rendering. Confirm fallback and console state.

## Acceptance Criteria

- All ten shapes open the interactive 3D showcase when WebGL and piece budget allow.
- The die base in every 3D model is the polygon from the shared outline resolver.
- Shape parameters and notch corners visibly affect both 2D and 3D from the same project snapshot.
- Rounded curves use the fixed 64-segments-per-circle policy.
- L and Plus remain concave after conversion and extrusion.
- The editor showcase's MP4 action receives exactly the displayed `Chip3DModel`.
- WebGL and budget fallbacks remain functional; temporary M3 placeholder copy is absent.
- Die PNG `×4`, poster `3200×1800`, and existing MP4 capture contracts remain unchanged.
- Client tests, server tests, production build, server typecheck, lint, targeted formatting, and
  `git diff --check` pass.

## Trade-offs and Decisions

- Fixed 64-segment flattening was chosen over adaptive tessellation. It is deterministic, reuses
  the existing domain contract, and avoids adding performance heuristics to M3.
- Direct shared-outline integration was chosen over a parametric-only branch. This removes the last
  die-shape switch from the 3D model and prevents legacy and parametric geometry from drifting.
- No runtime rectangle fallback is added for geometry errors. A loud test/runtime failure is safer
  than exporting a plausible but incorrect chip.
- Block surfaces remain rectangular and are not clipped into the die polygon in 3D. M1/M2 clamp
  guarantees their four corners are on-die; changing block extrusion topology is outside M3.
