# Implementation Notes

## V10-M0 Scene Descriptor Foundation

- Implemented a pure `src/domain/scene3d/scene3d.ts` resolver that centralizes the current baseline 3D scene descriptor: camera, light rig, and animation defaults.
- The resolver is intentionally plain TypeScript data only. It imports no Three, React, Konva, browser APIs, storage, or Zustand so `src/domain/` stays pure and reusable by the server build.
- Added `src/domain/scene3d/scene3d.test.ts` first and confirmed the RED state (`./scene3d` missing) before implementation. The test locks the current camera distance/FOV/near/far/min/max math, the hemisphere/key/fill/rim light values, and the current 14s turntable + 3s glow pulse defaults.
- Replaced `addShowcaseLights(scene)` with `applyResolvedLights(scene, lights)` in `src/three/chip3dStage.ts`. The function now builds the same Three light objects from the descriptor instead of hardcoded inline values.
- Rewired `src/three/Chip3DViewer.tsx` to compute `const resolved = resolveScene3D({ extent: model.extent })` once and use it for lights, camera setup, OrbitControls min/max distance, turntable period, and glow pulse values.
- Rewired `src/three/chip3dRecorder.ts` to use the same resolved lights and camera values. The recorder's existing `CaptureSpec` frame loop remains unchanged in M0; authored animation options are deferred to V10-M4.
- No schema change was made. `CURRENT_SCHEMA_VERSION` remains 8, and no `Project.scene3d` field or migration was added in M0. That belongs to V10-M1.
- No server route, SQLite migration, or 2D Konva PNG export path changed.
- Preserved the pre-existing viewer-vs-recorder camera interpretation difference on purpose: the viewer treats `baseOffset` as the initial absolute camera position, while the recorder adds it to `target`. M0 keeps visual behavior inert; V10-M1 camera authoring can reconcile this deliberately.
- Browser smoke on `http://127.0.0.1:5173/`: opened `AURORA M5`, opened the 3D showcase, confirmed a 960x640 CSS / 1920x1280 backing canvas exists in the dialog, clicked Play turntable, observed the button become Pause, clicked Reset view scoped to the dialog, and saw no console warnings/errors.
- Browser limitations: Browser screenshot capture timed out twice through CDP on the WebGL-heavy page; MP4 export button click produced no console errors and the UI returned to normal, but the Browser runtime did not observe a download event within 90 seconds. Source and build gates are clean.
- Final verification:
  - `npm test`: client 117 files / 702 tests passed; server 70 files / 297 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M1 Camera Pose Authoring

- Added schema 9 with optional `Project.scene3d?: Scene3DSettings`. Schema 8 and older projects migrate to 9 without adding `scene3d`; valid schema 9 camera settings are preserved and clamped; malformed `scene3d` is dropped instead of rejecting the project.
- M1 persists only `scene3d.camera`. The `Scene3DSettings` shape also has optional `lighting`, `environment`, and `animation` slots so M2-M4 can fill the already-declared schema contract without another migration.
- Camera settings are geometry-independent: `azimuthRadians`, `elevationRadians`, `zoom`, optional `targetNudge`, and optional `fov`. Runtime clamps are: azimuth wrapped to `[-pi, pi]`, elevation `[0.08, 1.4]`, zoom `[0, 1]`, target nudge components `[-1, 1]`, FOV `[28, 60]`.
- `resolveScene3D` remains backwards compatible with the M0 call shape and now also accepts `(settings, derived)`. With no authored camera, it reproduces M0 exactly. With authored camera, it resolves a concrete `position`, `target`, and `baseOffset` so the live viewer and MP4 recorder consume the same saved pose.
- Added `cameraSettingsFromPose` as the pure bridge from the live Three camera/OrbitControls pose back to serialized settings. The viewer uses this helper for `Save current view`; no Three types leak into `src/domain`.
- Added undoable editor store commands: `setScene3DCamera(camera)` and `resetScene3DCamera()`. Reset removes only the camera group and removes `scene3d` entirely when no groups remain.
- `Chip3DModel` now carries optional `scene3d` from the source `Project`, so editor, gallery/share showcase models, and MP4 export all resolve the same camera settings.
- Editor 3D showcase now includes `Save current view` and `Reset 3D default` controls when used from the editor. `Reset view` still only resets the current interactive camera to the resolved starting pose.
- Trade-off: M1 keeps non-camera `scene3d` groups typed as `unknown` and drops malformed persisted groups during migration until their milestones define real validators. This avoids storing untested placeholder config while preserving the schema shape.
- Browser smoke on `http://127.0.0.1:5173/`: opened `AURORA M5`, opened the 3D showcase, confirmed `Save current view` and `Reset 3D default` controls, confirmed a nonblank WebGL render via screenshot, dragged the canvas, clicked save, closed/reopened the showcase, clicked reset default, and saw no console warnings/errors.
- Browser limitation: the in-app Browser read-only evaluate sandbox did not expose IndexedDB/localStorage, so persisted project payload was verified by unit/integration tests rather than direct browser storage inspection.
- Final verification:
  - `npm test`: client 117 files / 713 tests passed; server 70 files / 297 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M2 Lighting Presets + Intensity

- Added a typed `Scene3DLightingSettings` group under the existing schema 9 `scene3d` shape: `preset` is one of `studio`, `neon-noir`, `daylight`, or `dramatic`, and `intensity` is a global scalar.
- `studio` intentionally reuses the M0/M1 hardcoded baseline light rig exactly at intensity `1`, so projects with no authored lighting and projects saved as `studio/1` resolve to the same hemisphere/key/fill/rim descriptor.
- Intensity is clamped to `[0.35, 1.8]` in both runtime resolving and persisted migration. This range is a product decision not specified by the v10 spec; it keeps the slider useful while avoiding near-black previews and heavily overexposed captures.
- Each preset still resolves to the same structural rig: one hemisphere light plus three directional lights for key/fill/rim. This keeps the Three adapter simple and preserves the MP4 recorder/live viewer parity introduced in M0-M1.
- Schema version remains 9. M2 only fills the already-reserved `scene3d.lighting` group, so no storage migration version bump or server persistence change was needed.
- Added undoable editor store commands `setScene3DLighting(lighting)` and `resetScene3DLighting()`. Reset removes only the lighting group and removes `scene3d` entirely only when no other groups remain.
- Wired editor-only 3D lighting controls into the showcase header. The picker appears when editor callbacks are supplied, while gallery/share showcases continue to render without authoring controls.
- UI trade-off: the intensity range input commits on every change event, matching the existing one-command-per-store-call pattern. No drag coalescing was added in M2 because the current store coalescing API is tag-based internal plumbing and the spec only requires undoable commits, not slider gesture grouping.
- Browser smoke found that the M1 camera authoring buttons shared one absolute-position class and overlapped in the bottom-right of the 3D viewer. M2 fixed this by moving `Reset view`, `Save current view`, and `Reset 3D default` into a flex action rail.
- Browser smoke on `http://127.0.0.1:5173/`: started `AURORA M5`, opened the editor 3D showcase, confirmed `Studio`, `Neon noir`, `Daylight`, `Dramatic`, intensity `[0.35, 1.8]`, and `Reset lighting`, clicked a preset, changed intensity, reset lighting, confirmed Undo became enabled, confirmed a nonblank WebGL canvas, and saw no console warnings/errors.
- Responsive limitation: at a 390px-wide viewport the app intentionally switches the editor route to the existing `Edit on desktop` preview/export surface, so mobile 3D authoring controls are not reachable there.
- Final verification:
  - `npm test`: client 117 files / 725 tests passed; server 70 files / 297 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M3 Environment + Post

- Added typed `Scene3DEnvironmentSettings` under schema 9 `scene3d.environment`: `topColor`, `bottomColor`, `exposure`, and `bloom` (`threshold`, `strength`, `radius`).
- M3 stores a full environment payload rather than sparse partial overrides. This keeps UI/store/reset behavior simple: setting environment captures the current complete authored look, and resetting removes the whole environment group so the theme/finish-derived baseline returns.
- `resolveScene3D(settings, { extent, environment })` now resolves a complete environment descriptor. If no authored environment exists, it preserves the derived `model.environment` baseline; if no derived environment is supplied, it falls back to a safe domain default for legacy call sites/tests.
- Safe render clamps are: exposure `[0.55, 1.65]`, bloom threshold `[0.15, 0.95]`, bloom strength `[0, 2.4]`, and bloom radius `[0.1, 1]`. These are product guardrails, not raw Three limits, chosen to avoid washed-out bloom or near-black captures.
- Persisted environment colors must be `#rrggbb` hex strings. Malformed environment data is dropped independently while valid camera/lighting groups are preserved.
- Added undoable editor store commands `setScene3DEnvironment(environment)` and `resetScene3DEnvironment()`. Reset removes only the environment group and removes `scene3d` entirely only when no other groups remain.
- Rewired the live viewer and MP4 recorder to pass `model.environment` into `resolveScene3D` and then use `resolved.environment` for PMREM colors, renderer exposure, clear color, and bloom pass settings.
- Added editor-only showcase controls for environment: three safe background gradient presets (`Midnight post`, `Aurora post`, `Clean post`), exposure slider, bloom strength slider, and reset. Raw color editing was intentionally avoided in M3 to keep novice output within curated looks while still exercising the persisted `topColor`/`bottomColor` fields.
- Browser smoke on `http://127.0.0.1:5173/`: started `AURORA M5`, opened the editor 3D showcase, confirmed environment controls and safe slider ranges, clicked `Aurora post`, changed exposure and bloom strength, reset environment, confirmed Undo became enabled, confirmed a nonblank WebGL canvas, and saw no console warnings/errors.
- Final verification:
  - `npm test`: client 117 files / 737 tests passed; server 70 files / 297 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M4 Animation Parameters

- Added typed `Scene3DAnimationSettings` under schema 9 `scene3d.animation`: a complete `turntable` group (`enabled`, `periodSeconds`) and a complete `glow` group (`enabled`, `periodSeconds`, `min`, `max`).
- The default authored-free resolver output keeps the existing behavior: turntable enabled at 14 seconds per rotation and glow enabled at a 3 second pulse from `0.8` to `1.2`.
- Safe deterministic ranges are: turntable period `[4, 60]`, glow period `[1, 12]`, glow min `[0.2, 1]`, and glow max `[1, 2]`. These are authoring guardrails rather than renderer limits.
- Persisted animation data must include the full nested payload with boolean toggles and finite numeric values. Malformed animation is dropped independently while valid camera, lighting, and environment groups are preserved.
- Added undoable editor store commands `setScene3DAnimation(animation)` and `resetScene3DAnimation()`. Reset removes only the animation group and removes `scene3d` entirely only when no other groups remain.
- Rewired both live viewer playback and MP4 frame capture to consume `resolved.animation`. When turntable is disabled the camera holds its current offset; when glow is disabled emissive pulse stays at `1`.
- MP4 capture keeps its old default behavior when no resolved animation is provided: one full turn over the clip and integer glow cycles based on `CaptureSpec`. This preserves existing deterministic export tests while allowing project-specific animation during actual recording.
- Added editor-only animation controls to the 3D showcase: turntable on/off, turntable period, glow on/off, glow period, glow min/max, and reset animation. Gallery/share showcases remain viewer-only unless editor callbacks are supplied.
- UI trade-off: sliders commit on each change event, matching M2/M3 lighting/environment controls. No drag coalescing was added in M4.
- Browser smoke on `http://127.0.0.1:5173/`: started `AURORA M5`, opened the editor 3D showcase, confirmed animation controls and ranges, toggled turntable/glow, changed turntable/glow period and glow min/max, reset animation, clicked Play, confirmed the button became `Pause`, confirmed Undo became enabled, confirmed a nonblank WebGL canvas, and saw no console warnings/errors.
- Responsive limitation: the changed editor controls were smoke-tested in the desktop editor flow. The app's mobile-width editor route remains the existing desktop-only preview/export surface, so mobile animation authoring was not separately exercised.
- Final verification:
  - `npm test`: client 117 files / 752 tests passed; server 70 files / 297 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M5 Round-Trip & Export Parity Hardening

- Added explicit regression coverage that `scene3d` camera, lighting, environment, and animation groups are included in the publish client payload, stored in the server's opaque `project_json`, and returned by gallery detail JSON. No server schema or route shape change was required.
- Changed the share-page `View in 3D` CTA from `/gallery/:slug` to `/gallery/:slug?view=3d`. Gallery detail now auto-opens the 3D showcase when `view=3d` is present and the snapshot is within the interactive 3D budget.
- The share deep link is intentionally still a gallery route, not a new share/server 3D renderer. This preserves the no-backend-change constraint while making the share target land directly in the saved 3D scene.
- Pinned the MP4 export caller to pass the existing `CAPTURE` contract explicitly (`1280x720`, `30fps`, `8s`, `3` glow cycles) instead of relying on recorder defaults. The recorder still owns the actual frame loop and resolved-scene consumption.
- Added export contract tests showing authored `scene3d` does not affect die-only `x4` raster sizing or poster `3200x1800` sizing.
- Browser smoke on `http://127.0.0.1:5173/gallery/m5-round-trip-qa-b72b2642?view=3d`: seeded a real local server publish with full `scene3d`, opened the gallery deep link, confirmed the 3D showcase auto-opened, confirmed gallery view has no editor authoring control groups, confirmed a nonblank WebGL canvas, and saw no browser console warnings/errors.
- Browser QA limitation: actual MP4 download was not attempted in-browser for M5 because WebCodecs/download-event behavior is already covered by the existing MP4 panel tests plus the recorder/capture contract tests; the browser pass focused on round-trip 3D scene loading.
- Final verification:
  - `npm test`: client 117 files / 757 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M6 Look Presets / Bookmarks

- Started V10-M6 as curated full-scene look presets rather than persisted custom camera bookmarks. The spec explicitly makes M6 droppable and allows "look presets and/or bookmarks"; this narrower implementation gives one-click camera + lighting + environment authoring while avoiding a new schema group, migration, bookmark naming UI, or list-management workflow.
- Planned M6 in `docs/superpowers/plans/2026-06-29-v10-m6-look-presets.md`.
- Added three domain-owned look presets in display order: `Orbit hero`, `Inspection`, and `Dramatic closeup`. Each preset is a complete camera + lighting + environment payload, and the resolver returns cloned settings so UI/store callers cannot mutate the module-level preset data.
- Adjusted `Inspection` exposure to `1.1` after browser smoke showed the range input normalizes non-step value `1.12` to `1.10`. Preset values now align with the existing environment slider's `0.05` step.
- Added `applyScene3DLook(look)` to the editor store. It applies camera, lighting, and environment in one undoable command, preserves any authored animation settings, and skips history when the active scene already matches the look.
- Wired editor-only look preset buttons into the 3D showcase and passed the command through `EditorPage` and `Chip3DPreviewToggle`. Gallery/share showcases remain viewer-only because the controls only render when the editor callback is supplied.
- Targeted TDD verification:
  - RED: `src/domain/scene3d/scene3d.test.ts` failed on missing look preset exports/resolver.
  - RED: `src/stores/editorStore.test.ts` failed on missing `applyScene3DLook`.
  - RED: `src/features/editor/Chip3DPreviewToggle.test.tsx` failed on missing `Inspection` button.
  - GREEN: all three targeted test files now pass.
- Browser smoke on `http://127.0.0.1:5173/`: started from `AURORA M5`, opened the editor 3D showcase, confirmed `Orbit hero`, `Inspection`, and `Dramatic closeup` render alongside the existing lighting/environment/animation/camera controls, clicked `Inspection`, confirmed `Daylight` became pressed, Undo became enabled, the slider values reflected the look (`1.05`, `1.1`, `0.35` for lighting/exposure/bloom), and the WebGL canvas was nonblank.
- Browser QA note: Vite recorded `ProjectStoreProvider is missing` during a dev-server HMR invalidation while files were being edited. A clean home-to-editor smoke after the final code change did not add a new warn/error during M6 interactions. The local dev server also logged expected `/api/me` and `/api/health` proxy connection errors because the API server was not running for this frontend-only smoke.
- Final verification:
  - `npm test`: client 117 files / 764 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V10-M7 Final QA & Release

- Started V10-M7 as a release/QA milestone, not a new feature milestone. The spec requires full regression, browser QA across 3D authoring dimensions and round-trip surfaces, version line bump to `0.8 v10`, and release pack/docs.
- Planned M7 in `docs/superpowers/plans/2026-06-29-v10-m7-final-qa-release.md`.
- Added a release documentation contract test first and confirmed RED: `npm run test:client -- src/releaseDocs.test.ts` failed because README files still said `0.7 v9` and `docs/ops/v10-3d-authoring-qa.md` did not exist. After a build check showed `src/` tests are included in the client TypeScript project without Node built-in types, moved this docs-only test to `tests/releaseDocs.test.ts` so Vitest still runs it while `tsc -b` keeps the existing browser-only client type boundary.
- Updated README and README.kr to the `0.8 v10` line and added `docs/ops/v10-3d-authoring-qa.md` as the release pack for camera, lighting, environment, animation, look presets, round-trip, and MP4 export parity.
- Added `tests/viteDevProxy.test.ts` after browser QA found a real local-dev round-trip bug: share pages generated with the API origin linked `View in 3D` to `127.0.0.1:8787/gallery/...`, which returns 404 in the split Vite/API dev setup. The fix keeps dev/preview public share surfaces reachable from the frontend origin by proxying `/s/` and `/uploads` to the API server and running local QA with `VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173`.
- Important proxy trade-off: the first attempted proxy key was `/s`, but Vite treats proxy keys as prefixes and it captured `/src/main.tsx`, blanking the app. The final key is `/s/` specifically so share pages work without intercepting Vite source modules.
- Browser authoring QA on `AURORA M5`: exercised camera save/reset, lighting presets/intensity/reset, environment presets/exposure/bloom/reset, animation toggles/timing/reset/play, look presets, undo enablement, and confirmed the editor 3D showcase canvas rendered. MP4 was verified through the existing recorder/panel/export contract plus the browser-visible `Export turntable MP4` control path; no browser download assertion was added because download/WebCodecs behavior is environment-dependent.
- Browser round-trip QA published `m7-3d-round-trip-qa-1782715787775-ffc21765` with authored `scene3d`; server gallery JSON retained camera, lighting, environment, and animation; `/s/:slug` rendered poster and `View in 3D`; `/gallery/:slug?view=3d` opened the viewer-only 3D modal with no authoring controls and a `2462x1212` backing canvas.
- Final verification:
  - `npm test`: client 119 files / 769 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.
