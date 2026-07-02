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

## V11-M0 Mobile Authoring Surface Foundation

- Renamed the working branch from `v11` to `codex/v11-m0` so the branch name matches the milestone and Codex branch convention.
- Started v11 from `docs/superpowers/specs/2026-06-30-v11-mobile-3d-authoring-design.md` and executed the existing M0 plan in `docs/superpowers/plans/2026-06-30-v11-m0-mobile-authoring-surface.md`.
- Added an optional `chip3dSlot` to `MobileEditorPreview`, rendered immediately under the mobile chip preview and before the fake spec section. When the slot is omitted, the read-only mobile surface remains the existing chip preview/spec/publish/export/desktop-CTA path.
- Introduced `MobileEditor`, a store-backed mobile wrapper that creates the same `createEditorStore(project)` instance and `useAutosave(store, persist)` flow used by the desktop editor. This gives the mobile route the persistence/undo foundation needed by later v11 milestones without enabling 2D Konva authoring.
- M0 uses the existing `isChip3DShowcaseAvailable(project)` gate exactly as specified. If the chip is interactive-3D capable, `MobileEditor` passes a viewer-only `Chip3DPreviewToggle` into the slot; otherwise it passes no slot and the static preview remains.
- No 3D authoring callbacks are passed in M0. The mobile showcase can open the viewer, play/reset the view, and export MP4 through the existing viewer extras, but it does not expose look presets, lighting presets, camera save/reset-default, environment sliders, or animation controls.
- Wired `App.tsx` so the mobile editor route renders `MobileEditor` with the same `persist={(nextProject) => void store.save(nextProject)}` shape as desktop `EditorPage`. Desktop routing remains unchanged.
- Trade-off: the fallback/no-WebGL branch is covered by `MobileEditor.test.tsx` rather than browser-forced no-WebGL QA. The in-app browser's read-only evaluation context did not provide a stable way to disable WebGL or seed an over-budget project, so browser QA focused on the real 3D-capable path while component tests cover the unavailable path.
- Bundle-check trade-off: the first slot wrapper class used `mobile-editor-preview__three`, which made `rg "three" dist/assets/index-*.js` fail even though the Three library was still lazy-loaded. Renamed the class to `mobile-editor-preview__showcase` to preserve the existing string-based gate.
- Targeted TDD verification:
  - RED: `npm run test:client -- src/features/editor/MobileEditorPreview.test.tsx` failed because the provided `chip3dSlot` button did not render.
  - GREEN: `npm run test:client -- src/features/editor/MobileEditorPreview.test.tsx` passed with 3 tests.
  - RED: `npm run test:client -- src/features/editor/MobileEditor.test.tsx` failed because `./MobileEditor` did not exist.
  - GREEN: `npm run test:client -- src/features/editor/MobileEditor.test.tsx` passed with 2 tests.
  - RED: `npm run test:client -- src/app/App.test.tsx` failed because the app still rendered the real `MobileEditorPreview` branch instead of the new `MobileEditor` mock, hitting Konva/ResizeObserver in jsdom.
  - GREEN: `npm run test:client -- src/app/App.test.tsx` passed with 13 tests after the route swap.
- Browser smoke on `http://127.0.0.1:5173/` at `390x844`: opened the dashboard, remixed `AURORA M5`, confirmed the mobile editor route showed chip preview, fake spec, publish controls, export controls, no desktop editor workspace, and exactly one `Open 3D showcase` button.
- Browser 3D smoke: opened the mobile 3D showcase and confirmed a viewer-only modal labeled `AURORA M5 3D showcase`, a visible WebGL canvas (`356x628` CSS / `712x1256` backing), buttons limited to `Export turntable MP4`, `Close 3D showcase`, `Play turntable`, and `Reset view`, no range inputs, and no look/environment/animation/camera authoring text. Dragging the canvas kept the modal open; closing returned focus to `Open 3D showcase`; browser console warn/error logs were empty.
- Final verification:
  - `npm test`: client 120 files / 773 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V11-M1 Mobile Look + Lighting Preset Chips

- Renamed the branch from `codex/v11-m0` to `v11-mobile-3d-authoring` before starting M1, matching the broader v11 feature name requested by the user.
- Implemented M1 as an explicit `authoringMode` on `Chip3DPreviewToggle` / `Chip3DShowcase`: default `desktop` preserves the existing full desktop controls, while `mobile-presets` exposes only look presets and lighting preset buttons.
- `mobile-presets` intentionally hides desktop-only controls even if their callbacks exist: lighting intensity slider, reset lighting, environment presets/sliders, animation controls, and camera save/reset-default do not render. `Reset view`, play/pause, MP4 export, and close remain viewer controls.
- Wired `MobileEditor` to pass `authoringMode="mobile-presets"`, `state.applyScene3DLook`, and `state.setScene3DLighting` into the mobile 3D toggle. These reuse the existing editor store commands and autosave path; no schema, backend, route, SQLite, or publish snapshot change was needed.
- Lighting preset taps preserve the current lighting intensity, matching desktop preset behavior. This lets mobile change the preset without exposing the precision intensity slider that the v11 spec keeps desktop-only.
- Targeted TDD verification:
  - RED: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx` failed because `authoringMode="mobile-presets"` still rendered the `Lighting intensity` range.
  - GREEN: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx` passed with 16 tests after adding the preset-only mode.
  - RED: `npm run test:client -- src/features/editor/MobileEditor.test.tsx` failed because `MobileEditor` did not pass `mobile-presets` mode or preset callbacks into the toggle.
  - GREEN: `npm run test:client -- src/features/editor/MobileEditor.test.tsx` passed with 3 tests after wiring the store commands.
- Browser smoke on `http://127.0.0.1:5173/` at `390x844`: remixed `AURORA M5`, opened the mobile 3D showcase, and confirmed the modal showed `Orbit hero`, `Inspection`, `Dramatic closeup`, `Studio`, `Neon noir`, `Daylight`, and `Dramatic`, with zero range inputs and no desktop-only text for lighting intensity, exposure, bloom, turntable timing, save current view, or reset 3D default.
- Browser persistence smoke: tapped `Inspection`, then `Neon noir`; `Neon noir` became the pressed lighting preset while the WebGL canvas remained present. After closing the modal, reloading the editor route, and reopening the showcase, `Neon noir` was still pressed, confirming the mobile preset change traveled through autosave. Browser console warn/error logs were empty.
- QA note: local Vite server logs still show expected `/api/me` and `/api/health` proxy `ECONNREFUSED` entries when the API server is not running; no browser console warnings/errors were produced during the M1 interactions.
- Final verification:
  - `npm test`: client 120 files / 775 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V11-M2 Camera Touch Authoring

- Added mobile camera authoring by allowing `authoringMode="mobile-presets"` to pass camera callbacks through to `Chip3DViewer`. This keeps the mobile mode's look + lighting preset subset from M1, but now also exposes the existing viewer-level `Save current view` and `Reset 3D default` actions when callbacks are supplied.
- Wired `MobileEditor` to pass `state.setScene3DCamera` and `state.resetScene3DCamera` into the mobile 3D toggle. These reuse the same schema 9 `scene3d.camera` payload and autosave path as desktop camera authoring.
- Kept desktop-only controls hidden on mobile: lighting intensity, lighting reset, environment controls, animation controls, and raw sliders remain absent. `Reset view` remains a viewer-only transient camera reset; `Reset 3D default` removes persisted camera settings.
- Added `touch-action: none` to `.chip-3d-viewer` and its canvas so touch orbit gestures are handled by the WebGL viewer instead of triggering page scroll/pinch handling on the page.
- Added `tests/mobile3dCss.test.ts` as a small CSS contract test because the touch behavior is otherwise browser-only and easy to regress during layout cleanup.
- Targeted TDD verification:
  - RED: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx src/features/editor/MobileEditor.test.tsx tests/mobile3dCss.test.ts` failed because mobile mode blocked mocked camera save/reset buttons, MobileEditor did not pass camera callbacks, and the viewer CSS lacked `touch-action: none`.
  - GREEN: the same command passed with 3 files / 22 tests after wiring camera callbacks and the CSS guard.
- Browser smoke on `http://127.0.0.1:5173/` at `390x844`: remixed `AURORA M5`, opened the mobile 3D showcase, confirmed `Save current view` and `Reset 3D default` now render alongside look/lighting presets, confirmed zero range inputs and no desktop-only slider text, and confirmed computed `touch-action` is `none` on both `.chip-3d-viewer` and the WebGL canvas.
- Browser camera smoke: dragged the canvas, clicked `Save current view`, closed and reloaded the editor route, reopened the showcase, and clicked `Reset 3D default`. The modal stayed live with a rendered canvas throughout and browser console warn/error logs were empty.
- QA note: local Vite server logs still show expected `/api/me` and `/api/health` proxy `ECONNREFUSED` entries when the API server is not running; no browser console warnings/errors were produced during the M2 interactions.
- Final verification:
  - `npm test`: client 121 files / 778 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V11-M3 Responsive Control Layout & A11y

- Implemented M3 as a mobile-only layout polish on the existing `authoringMode="mobile-presets"` showcase rather than introducing a separate mobile control component. `Chip3DShowcase` now adds `chip-3d-showcase--mobile-presets` only for the mobile authoring mode, so the desktop control rail keeps the original `chip-3d-showcase` class and desktop look preset label.
- Added explicit ARIA groups for look, lighting, and environment controls. Mobile mode labels the exposed preset rails as `Mobile 3D look presets` and `Mobile 3D lighting presets`; desktop keeps `3D look presets`, `3D lighting controls`, and `3D environment controls`.
- Added a `max-width: 767px` CSS contract for mobile preset showcases: the modal header becomes a compact horizontal chip rail with `overflow-x: auto`, preset groups stay `nowrap`, and all header/viewer action buttons get at least `44px` width and height.
- Viewer actions now expand across the bottom of the mobile modal under the mobile class only. This keeps `Save current view` and `Reset 3D default` reachable without reintroducing desktop sliders or changing the desktop rail.
- Trade-off: the compact rail intentionally scrolls horizontally instead of wrapping into multiple rows. This preserves vertical space for the WebGL viewer on phone screens, at the cost of requiring horizontal swipe for the full preset set.
- Targeted TDD verification:
  - RED: `npm run test:client -- src/features/editor/Chip3DPreviewToggle.test.tsx tests/mobile3dCss.test.ts` failed because the mobile showcase lacked the mobile layout class and CSS breakpoint rules.
  - GREEN: the same command passed with 2 files / 20 tests after adding the mobile class, ARIA groups, and compact rail CSS.
- Browser QA on `http://127.0.0.1:5173/` at `390x844`: remixed `AURORA M5`, opened the mobile 3D showcase, and confirmed `chip-3d-showcase--mobile-presets`, header `overflow-x: auto`, look/lighting preset `flex-wrap: nowrap`, minimum action size `44x44`, mobile ARIA group labels, visible `Save current view` and `Reset 3D default`, zero range inputs, and no browser console warnings/errors.
- QA note: local Vite server logs still show expected `/api/me` and `/api/health` proxy `ECONNREFUSED` entries when the API server is not running; no browser console warnings/errors were produced during the M3 interactions.
- Final verification:
  - `npm test`: client 121 files / 780 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V11-M4 Final QA & Release

- Closed v11 as the `0.9 v11` release line and updated the English/Korean READMEs to describe Mobile 3D Authoring as a frontend-only extension of the existing `scene3d` authoring path.
- Added `docs/ops/v11-mobile-3d-authoring-qa.md` as the v11 release pack covering mobile look presets, lighting chips, camera touch authoring, available/unavailable fallback coverage, round-trip, share, MP4, and export parity. Because `/docs/` is ignored for new files, this file must be force-added when staging.
- Updated `tests/releaseDocs.test.ts` from the previous v10 release contract to the v11 release contract. RED confirmed the README version lines still said `0.8 v10` and the v11 QA pack was missing; GREEN passed after the docs update.
- Browser mobile available-path QA on `http://127.0.0.1:5173/` at `390x844`: remixed `AURORA M5`, confirmed the mobile editor route rendered the preview/spec/publish/export/edit-on-desktop surface instead of the desktop Konva workspace, opened the 3D showcase, and confirmed mobile look presets, lighting chips, `Save current view`, `Reset 3D default`, MP4 export control, compact rail `overflow-x: auto`, preset `nowrap`, 44px tap targets, mobile ARIA group labels, zero range inputs, and a rendered WebGL canvas.
- Browser persistence QA: applied `Inspection`, selected `Neon noir`, saved the camera view, reloaded the mobile editor route, reopened the 3D showcase, and confirmed `Neon noir` was still pressed. The published gallery JSON retained `scene3d.camera`, `lighting.preset = neon-noir`, and the look-preset environment values.
- Browser round-trip/share QA: signed up a local QA account, published the mobile-authored `AURORA M5` snapshot, made it public at `/s/aurora-m5-630e2ac5`, opened `/gallery/aurora-m5-630e2ac5?view=3d`, and confirmed a viewer-only 3D modal with no authoring controls, zero range inputs, and a `356x684` CSS / `712x1368` backing WebGL canvas. The `/s/` share page rendered the poster and linked `View in 3D` to `http://127.0.0.1:5173/gallery/aurora-m5-630e2ac5?view=3d`.
- Export parity QA used the actual published PNGs captured by the mobile publish panel: `v1-die.png` was `3680x2400` for the `920x600` AURORA M5 die (`x4`), and `v1-poster.png` was `3200x1800`. MP4 browser QA verified the editor 3D showcase still exposes `Export turntable MP4`; recorder/capture contracts remain covered by automated tests.
- Unavailable fallback browser limitation: the in-app browser evaluation context exposed neither `indexedDB` nor `fetch`, so I could not safely seed an over-budget local project for a browser-only fallback check. This branch remains covered by `MobileEditor.test.tsx` and the release pack records it as an acceptance checklist item.
- QA note: the first API dev-server start failed inside the sandbox because `tsx watch` could not open its temporary IPC pipe; rerunning with escalation started the server. The email verification route showed an invalid-token page during the UI signup flow, but development publish still allowed the verified/not-live local QA account path and the publish/share round-trip completed.
- Browser console warn/error logs were empty after the mobile authoring, gallery, and share checks.
- Final verification:
  - `npm run test:client -- tests/releaseDocs.test.ts`: passed with 1 file / 3 tests.
  - `npm test`: client 121 files / 780 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V12-M0 Sync Reconcile Core

- Started v12 "Continuum" multi-device sync with a pure `src/domain/sync/reconcile.ts` decision function — the last-write-wins core that later milestones (server routes, SyncApi, SyncEngine) build on. It imports nothing from Three, React, Konva, browser APIs, storage, network, or Zustand, keeping `src/domain/` reusable and unit-testable in isolation (matches the `src/domain/scene3d/` purity rule).
- `reconcile(local, remote)` takes two `SyncMeta[]` lists (`{ id, updatedAt, deleted? }`) and returns a `ReconcilePlan` of project-id lists: `toPush` (send local to server), `toApply` (upsert remote locally), `toDeleteLocal` (remove locally).
- Decision: `remote` is treated as the complete server snapshot for the user, so the LWW decision is defined against a full snapshot; the `?since=` delta-pull optimization is a later engine concern, not part of `reconcile`.
- Conflict rule is last-write-wins by `updatedAt`: for a project present on both sides and live, server-newer resolves to `toApply`, local-newer to `toPush`, and equal `updatedAt` is a no-op (already in sync).
- Deletions propagate via tombstones (a remote entry with `deleted: true`): a tombstone that is newer than or equal to the local copy (`>=`) resolves to `toDeleteLocal`; a strictly-newer local copy (a revive/edit after the delete) resolves to `toPush`; a remote-only tombstone with nothing local to remove is ignored.
- Decision: output arrays are sorted ascending by id so results are deterministic regardless of input order, which keeps the tests and downstream engine behavior stable.
- Built via three TDD slices (new-project routing, both-present LWW, tombstones), landing 9 unit tests in `src/domain/sync/reconcile.test.ts`.
- No backend/route/SQLite/schema change in M0 — this is pure client domain code; the server `synced_projects` table and `/api/sync/*` routes are V12-M1.
- Final verification:
  - `npm run test:client -- src/domain/sync/reconcile.test.ts`: 9/9 passing.
  - `npm test`: client 122 files / 789 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.

## V12-M1 Server Sync Table + Routes

- Added the server side of v12 "Continuum" multi-device sync: a per-user `synced_projects` table plus `/api/sync/projects` routes, so a signed-in user's local projects can be mirrored/reconciled across devices. This is the first v12 milestone to touch the backend (schema + routes), by design.
- Migration `014_synced_projects` (append-only, follows `013_ai`): `(user_id, project_id, project_json, updated_at, deleted_at)` with composite `PRIMARY KEY (user_id, project_id)`, FK `user_id → users(id) ON DELETE CASCADE`, and index `idx_synced_projects_user_updated` on `(user_id, updated_at)` for delta pulls. Mirrors the existing `published_chips` per-user pattern.
- `server/src/sync/service.ts` holds the last-write-wins persistence: `pushSyncedProject` stores only when `updatedAt >= stored.updated_at` (clearing any tombstone via `ON CONFLICT ... DO UPDATE SET deleted_at = NULL`) and always returns the stored winner; `deleteSyncedProject` writes/keeps a tombstone (`deleted_at`, `updated_at = deletedAt`) when `deletedAt >= stored.updated_at` or no row exists (a never-pushed project gets an empty-json tombstone) and never hard-deletes the row; `listSyncedProjectsSince` returns rows with `updated_at > since` ascending (tombstones included so deletions propagate). Every statement is scoped by `user_id`.
- Decision: the `>=` push/tombstone acceptance boundary matches the M0 client `reconcile` (`updatedAt >= stored` / tombstone-newer-or-equal → delete), so a client re-pushing its own latest is idempotent and the two sides cannot oscillate.
- `server/src/sync/validation.ts` (`validateSyncPush`) guards the PUT body: rejects non-objects/arrays, an `id` that does not match the URL, and a non-finite `updatedAt`; on success returns the serialized `projectJson` and numeric `updatedAt`. Mirrors the `publish/validation.ts` result-object style.
- `server/src/sync/routes.ts` (`syncRoutes`) mounts under `/api` in `app.ts`, reusing the `publish/routes.ts` auth pattern verbatim: signed `vsl_session` cookie → `getSessionUserWithStatus`; 401 `UNAUTHORIZED` without a session, 403 `ACCOUNT_BANNED` for banned users; 400 `INVALID_INPUT` on a bad push body. Wire format per record is `{ projectId, updatedAt, deleted, project }` where `project` is the parsed project JSON for a live record and `null` for a tombstone — giving M2's `SyncApi` the `{ id, updatedAt, deleted }` metadata `reconcile` needs plus the body for `toApply` (only field adaptation for M2 is `projectId → id`).
- Cross-user isolation is proven end-to-end by test (a second user cannot see or overwrite the first user's rows).
- Deferred (noted for later milestones): `since` is not clamped to non-negative integers server-side (M2 should send clean values); the push body is not size-capped (revisit alongside real payloads in M4, consistent with the publish path's `uploadMaxBytes`).
- No client code changed in M1. `published_chips` and all other tables/routes are untouched.
- Final verification:
  - `npm test`: client 122 passed; server 321 passed.
  - `npm run typecheck:server`: passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.

## V12-M2 Client SyncApi

- Added the client `SyncApi` wrapper in `src/features/sync/syncApi.ts` with `pull(since)`, `push(project)`, and `remove(projectId)` over the V12-M1 `/api/sync/projects` routes. M2 is intentionally only the HTTP client: no store, engine, UI, repository, schema, server, or publish-path change.
- Kept the server wire DTO shape as `{ projectId, updatedAt, deleted, project }` in `SyncedProjectDto`. The `projectId -> id` mapping for the pure `reconcile` metadata stays deferred to V12-M3 `SyncEngine`, as planned.
- `pull(since)` clamps client-supplied watermarks before making the request: finite values become `Math.max(0, Math.floor(since))`, while non-finite values become `0`. This compensates for the M1 decision not to clamp `since` server-side.
- `push` sends the full project JSON as the PUT body to `/api/sync/projects/:id`; `remove` calls DELETE on the same encoded id path. Both parse the returned `{ project }` DTO so the later engine can observe the server-side LWW winner or tombstone.
- Error handling mirrors the existing client API modules: fetch rejection and 502/503/504 gateway responses become `ServerUnreachableError`; non-ok JSON error bodies become `SyncApiError` with the server code; no explicit `credentials` option is passed, so same-origin session cookies use the browser default behavior.
- TDD note: the initial `pull` test reused one mocked `Response` across three fetch calls, which failed because a `Response` body can only be consumed once. The test fixture now returns a fresh `Response` per mocked fetch call; production code did not need a workaround.
- Targeted TDD verification:
  - RED: `npm run test:client -- src/features/sync/syncApi.test.ts` failed because `./syncApi` did not exist.
  - GREEN: the same command passed with 5 tests after adding types, error scaffolding, request handling, and `pull`.
  - RED: the same command failed on `push`/`remove` because the Task 1 placeholders threw `NOT_IMPLEMENTED`.
  - GREEN: the same command passed with 9 tests after adding `jsonInit`, PUT, and DELETE.
- Final verification:
  - `npm test`: client 123 files / 799 tests passed; server 74 files / 321 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.

## V12-M3 Sync Engine Wiring

- Wired the client sync layer with three pieces: `createSyncingRepository(local, api, gate)`, `runSyncPass(local, api)`, and the renderless `SyncEngine` component mounted inside the app's auth provider. No server, SQLite migration, project schema, export, publish, or gallery path changed in M3.
- Local-first remains the invariant: the syncing repository always writes/removes from the local `ProjectRepository` first, then mirrors `push`/`remove` to the server only when `gate.authenticated` is true. Server/network/auth errors are swallowed so offline or expired-session states cannot break local saves.
- `runSyncPass` intentionally calls `api.pull(0)` for a complete server snapshot, maps `SyncedProjectDto.projectId` into `SyncMeta.id`, runs the M0 `reconcile`, applies remote live records/tombstones to the raw local repository, and only then pushes local winners. There is no `lastPulledAt` watermark in v12; the M3 plan superseded the original design-spec wording because full snapshots keep `reconcile` correct and are simpler at current single-user scale.
- App composition now creates one raw local repository, one shared auth gate, and one syncing decorator in stable React state. `ProjectStoreProvider` receives the decorator, while `SyncEngine` receives the raw local repo so pulled records do not echo back as redundant pushes.
- Implementation trade-off: on this macOS workspace, `syncEngine.ts` and `SyncEngine.tsx` (and matching tests) collide under case-insensitive path resolution. To avoid ambiguous Vitest/Vite resolution and Git confusion, the renderless `SyncEngine` component is exported from `syncEngine.ts`, and its focused test is named `syncEngineComponent.test.tsx`.
- Browser QA used local dev servers with the API restarted as `VSL_ACCESS_MODE=open` for account creation. Signed-in sync pushed existing local projects to `synced_projects`, creating a new project added a live server row, deleting it wrote a tombstone, and a server-injected remote project appeared on dashboard reload through the authenticated full-snapshot pull. A true second isolated browser storage context was not available in the in-app browser, so the remote-device pull path was simulated by inserting the server row directly for the QA account.
- Browser console warn/error logs were empty during the M3 QA pass.
- Targeted TDD verification:
  - RED/GREEN: `syncingRepository.test.ts` failed on missing module, then passed with 5 tests after adding the decorator.
  - RED/GREEN: `syncEngine.test.ts` failed on missing module, then passed with 5 tests after adding `runSyncPass`.
  - RED/GREEN: `syncEngineComponent.test.tsx` failed on missing/ambiguous component export, then passed with 2 tests after adding `SyncEngine` and provider store access.
  - Focused sync bundle: `npm run test:client -- src/features/sync/syncingRepository.test.ts src/features/sync/syncEngine.test.ts src/features/sync/syncEngineComponent.test.tsx src/features/sync/syncApi.test.ts` passed with 4 files / 21 tests.
- Final verification:
  - `npm test`: client 126 files / 811 tests passed; server 74 files / 321 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.

## V12-M4 First-Login Adoption

- Verification milestone: no new production code. First-login adoption was already implemented by M3's `runSyncPass` — `reconcile` classifies an anonymous local-only project as `toPush`, so the first authenticated sync uploads it, and equal-`updatedAt` on later passes is a no-op (idempotent). M4 locks this in with explicit end-to-end tests.
- Added `src/features/sync/syncAdoption.test.ts` driving the real `runSyncPass` through a stateful in-memory server (push stores with LWW, pull returns all rows, remove tombstones):
  - Empty server + multiple anonymous local projects → every local project is pushed; local state is unchanged (nothing deleted).
  - Local-only + server-only projects together → the local project uploads and the server project applies locally; neither is lost.
  - Idempotency → a second `runSyncPass` pushes nothing new and leaves local state stable.
- Decision: kept M4 as a verification milestone rather than adding a separate `adoptLocalProjects` pass, because a dedicated force-upload would duplicate `runSyncPass`'s `toPush` behavior (YAGNI). The tests give the adoption/idempotency guarantee the v12 spec's M4 called for.
- Final verification:
  - `npm run test:client -- src/features/sync/syncAdoption.test.ts`: 3/3 passing.
  - `npm test`: client 127 files / 814 tests passed; server 74 files / 321 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.

## V12-M5 Sync Status UI

- Added a display-only sync status surface without changing sync behavior: `createSyncStatusStore` owns `idle | syncing | synced | offline | error`, `SyncStatusIndicator` renders active states with `role="status"` / `aria-live="polite"`, and `idle` renders no badge.
- `SyncEngine` now accepts the status store and reports sync pass state: unauthenticated becomes `idle`, pass start becomes `syncing`, success becomes `synced`, `ServerUnreachableError` becomes `offline`, and all other failures become `error`. The engine still swallows failures after reporting status, preserving M3's local-first behavior.
- App composition creates one stable status store and passes it both to `SyncEngine` and the header. The header renders the badge before the theme switcher so signed-in users get a compact global sync signal without adding controls or routes.
- Decision: the syncing label uses ASCII `Syncing...` instead of a Unicode ellipsis to match the repository's default ASCII editing rule for new text.
- Targeted TDD verification:
  - RED/GREEN: `npm run test:client -- src/features/sync/SyncStatusIndicator.test.tsx` failed on the missing component/store, then passed with 2 tests after adding them.
  - RED/GREEN: `npm run test:client -- src/features/sync/syncEngineComponent.test.tsx` failed while the engine left status at `idle`, then passed with 5 tests after wiring status transitions.
  - Focused app/sync bundle passed: `npm run test:client -- src/features/sync/SyncStatusIndicator.test.tsx src/features/sync/syncEngineComponent.test.tsx src/app/App.test.tsx` with 3 files / 20 tests, and `npm run test:client -- src/features/sync/syncApi.test.ts src/features/sync/syncingRepository.test.ts src/features/sync/syncEngine.test.ts src/features/sync/syncAdoption.test.ts` with 4 files / 22 tests.
- Browser QA on `http://localhost:5173/`: signed out showed no sync badge; signing in as the local `V12 M5 QA` account showed `Synced`; stopping the API server while keeping the signed-in SPA state changed the badge to `Offline` after the sync interval; restarting the API server changed it back to `Synced` after the next interval.
- Browser console warn/error logs were empty after the M5 badge QA. Vite server logs showed expected proxy `ECONNREFUSED` entries while the API server was intentionally stopped for the offline-path check.
- Final verification:
  - `npm test`: client 128 files / 819 tests passed; server 74 files / 321 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.

## V12-M6 Final QA & Release

- Release milestone for v12 "Continuum" multi-device sync. Bumped the version line to `0.10 v12`
  (`README.md` + `README.kr.md`), corrected the launch-status note to record that v12 is the first
  client authoring milestone to add server state (per-user `synced_projects` + `/api/sync/*`), and
  added the QA release pack `docs/ops/v12-continuum-sync-qa.md`.
- Rewrote `tests/releaseDocs.test.ts` from the v11 contract to the v12 contract (version line, v12
  overview, QA pack); confirmed RED before the doc edits and GREEN after with 1 file / 3 tests.
- Browser QA used `VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173`, the API server on `127.0.0.1:8787`,
  and dev origins `localhost:5173` / `127.0.0.1:5174`. The in-app browser could not keep a stable
  third independent anonymous host (`127.0.0.2` timed out and left an internal error page), so the
  signed-out/no-badge path is covered by M5 browser QA and the anonymous/local-only behavior is
  covered by the M3/M4 sync tests.
- Browser QA results:
  - Anonymous stays local: signed-out header/no-badge path verified in M5; no new browser evidence of
    `/api/sync/*` from an independent anonymous storage context because the available browser host set
    could not provide a stable third origin.
  - First-login adoption: covered by `syncAdoption.test.ts` and the full regression suite; no new
    production code changed in M6.
  - Multi-device round-trip: same-account remote pull path was verified by inserting server project
    `remote-v12-m6-browser` for the QA user; the logged-in dashboard pulled it through the sync pass
    and displayed `REMOTE V12 M6 QA` with the badge at `Synced`.
  - Sync status badge / offline resilience: with the logged-in dashboard open, stopping the API server
    changed the badge to `Offline` while the pulled local project remained visible; restarting the
    server changed the badge back to `Synced`.
  - Publish/gallery/share unchanged: existing public chip `/s/aurora-m5-630e2ac5` rendered the share
    page with poster image and 3D link; `/gallery/aurora-m5-630e2ac5?view=3d` rendered the published
    gallery detail with a WebGL canvas.
  - Export parity: no export code changed in v12-M6; full regression/build passed and the publish/share
    smoke confirmed the existing 2D/3D read surfaces still render.
- Browser console warn/error logs were empty for the sync dashboard, share, and gallery QA tabs. Vite
  server logs showed expected proxy `ECONNREFUSED` entries only while the API server was intentionally
  stopped for the offline-path check.
- Final verification:
  - `npm run test:client -- tests/releaseDocs.test.ts`: passed with 1 file / 3 tests.
  - `npm test`: client 128 files / 819 tests passed; server 74 files / 321 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.

## V13-M0 Freeform Geometry Core

- Started v13 "Freeform" on branch `v13-freeform`, adding a vertex-only freeform die shape as pure domain geometry. M0 is foundation-only: no store command, canvas authoring UI, or 3D/export browser QA yet (those are M1-M4); bezier curves and boolean CSG remain deferred to later versions.
- Added `'freeform'` to `DieShape` and a new `Die.freeform?: { vertices: FreeformVertex[] }` field in `src/domain/project.ts`, with `FreeformVertex = { x: number; y: number }`. Vertices are normalized to the unit square `[0,1]` so they stay independent of `die.width`/`die.height`, matching how existing parametric shapes separate shape params from size.
- Added `resolveFreeformVertices(value: unknown): FreeformVertex[]` in `src/domain/die/freeformVertices.ts`. It reads `value.vertices`, drops any non-finite/non-numeric coordinate pairs, clamps the rest to `[0, 1]`, and falls back to a default unit-square rectangle (`(0,0) (1,0) (1,1) (0,1)`) whenever fewer than 3 valid vertices remain. This one normalizer is reused by outline resolution, seeding, and migration so all three call sites share one definition of "valid".
- Added the `'freeform'` case to `resolveDieOutline` in `src/domain/die/dieOutline.ts`: normalized vertices are scaled by `die.width`/`die.height` into absolute points, the centroid is the plain mean of those points, and the result is returned through the existing `polygonOutline(points, centroid)` helper used by every other polygon-based shape. (The other polygon shapes pass an explicit geometric center rather than a vertex mean; the centroid is only consumed by `clampBlockToPolygon` as the scale-to-fit anchor when a block cannot fit, so a vertex mean is a fine interior anchor here.)
- Freeform was added to all five exhaustive `DieShape` switch/record consumers so the app keeps typechecking with no `default` escape hatch: `clampBlockToDie` (`src/features/editor/canvas/geometry.ts`) routes freeform through the same `resolveDieOutline` + `clampBlockToPolygon` path as the other polygon shapes; `SHAPE_LABELS` (`src/features/editor/DieParameterPanel.tsx`) adds a `Freeform` label; `SHAPE_CLASSES` (`src/features/projects/dieShapePreview.ts`) adds a placeholder `clip-path` polygon preview (a concrete blob shape, to be refined in M2 once real authored freeform data exists); `isChip3DShapeSupported` (`src/three/chip3dAvailability.ts`) marks freeform as 3D-capable like the other polygon shapes.
- Added `seedFreeformFromDie(die: Die): FreeformVertex[]` in `src/domain/die/seedFreeform.ts` as the not-yet-wired entry point for M2's "convert current shape to freeform" palette action. It flattens the die's *current* resolved outline (via `outlineToPolygon(resolveDieOutline(die))`) back into normalized `[0,1]` vertices through `resolveFreeformVertices`, so converting a rectangle yields its 4 corners, a concave shape like `plus` yields >4 vertices, and an arc-based shape like `circle` flattens into many vertices — verified directly in `seedFreeform.test.ts`.
- Bumped `CURRENT_SCHEMA_VERSION` from `9` to `10` and added `10` to `SUPPORTED_SCHEMA_VERSIONS` alongside the still-supported `9` (schema `9`, added in V10-M1 for `scene3d`, keeps loading unchanged). `normalizePersistedDie` in `src/domain/projectMigration.ts` now branches on `die.shape === 'freeform'` to call `resolveFreeformVertices(candidate.freeform)` before falling through to the existing `isParametricDieShape` branch for `dieShapeParams`, so a persisted freeform die is normalized independently of parametric-shape params.
- Downstream RUNTIME consumers that are genuinely polygon-driven are unchanged by design: block clamp (`clampBlockToDie` → `clampBlockToPolygon`) and 3D extrusion (`src/visual/chip3d/chip3dModel.ts` `dieFootprint` → `outlineToPolygon(resolveDieOutline(die))`) consume whatever `resolveDieOutline` returns without knowing a shape is freeform, so they needed zero changes (confirmed via `git diff` against `main`).
- CAVEAT (correcting an earlier draft of this note): the 2D editor canvas `src/features/editor/canvas/ChipArtwork.tsx` is NOT purely polygon-driven — `clipForDie` / the `DieShape` component dispatch on `die.shape === 'circle'` / `'hexagon'` / `isParametricDieShape(die.shape)`, and everything else (including freeform, which is intentionally non-parametric) falls through to a full-frame `context.rect(...)` / `<Rect>`. So a freeform die currently renders as a plain rectangle in 2D. This is NOT a live bug in M0 (no UI can create a freeform die until M2's palette entry), but wiring freeform through `ChipArtwork` is an explicit M2 task, not something M0 delivered.
- Final verification:
  - `npm run test:client`: 130 files / 834 tests passed (whole client suite).

## V13-M1 Freeform Vertex Editing

- `normalizeDie` (`src/features/editor/canvas/geometry.ts`) now seeds `die.freeform` via `seedFreeformFromDie` when switching to the `'freeform'` shape: it keeps `die.width`/`die.height` untouched, drops any stale `dieShapeParams`/`freeform` from the previous shape, then flattens the die's *current* outline into a fresh vertex polygon. This means `setDieShape('freeform')` converts whatever shape is active (rectangle, hexagon, plus, circle, …) into an editable polygon and re-clamps blocks through the existing `clampBlockToDie` path, with no new store command needed for the conversion itself.
- Added `projectWithFreeformVertices(baseline: Project, vertices: FreeformVertex[]): Project` in `src/stores/editorStore.ts`, mirroring the existing `projectWithDieShapeParams` helper: it is a no-op when `baseline.die.shape !== 'freeform'`, otherwise it normalizes the given vertices through `resolveFreeformVertices`, replaces `die.freeform`, and re-clamps every block to the updated outline via `clampBlockToDie`. All three new vertex-editing commands funnel through this one helper so re-clamp-after-edit is defined in exactly one place.
- Added three store commands to `EditorState`, all reading/writing `project.die.freeform` through `resolveFreeformVertices` and all no-op when the current die is not `'freeform'`:
  - `addFreeformVertex(index: number, point: FreeformVertex)` inserts `point` at `index` (clamped to `[0, current.length]`) and commits.
  - `deleteFreeformVertex(index: number)` removes the vertex at `index`, guarded by an out-of-range check and a min-3 floor (`current.length - 1 < 3` is rejected) so a freeform die can never drop below a triangle.
  - `moveFreeformVertex(index: number, point: FreeformVertex)` replaces the vertex at `index` (after an out-of-range guard) and commits with the coalesce tag `` `freeform-vertex-move:${index}` ``, so a full pointer drag — many `moveFreeformVertex` calls against the same vertex — collapses into a single undo step instead of one step per intermediate frame. Moving a *different* vertex (a different tag) still starts a new undo step, matching the existing `dieShapeParams` coalescing pattern.
  - All three commands go through `commit`, so they participate in the existing undo/redo stacks with no bespoke history handling.
- Out of scope for M1, confirmed unchanged: Konva vertex handles for interactive add/move/delete on the 2D canvas, the palette `Freeform` entry that would let a user reach `setDieShape('freeform')` from the UI, and `ChipArtwork.tsx` 2D rendering of freeform dies (still falls through to the full-frame rect noted in the M0 caveat above). These remain M2.
- Final verification:
  - `npm run test:client`: 130 files / 843 tests passed (whole client suite).

## V13-M2 Canvas Authoring UI

- Started M2 from the existing v13 spec and M0/M1 implementation. Added the milestone plan at `docs/superpowers/plans/2026-07-02-v13-m2-canvas-authoring-ui.md` because no M2 plan file existed yet.
- Scope decision: M2 will expose the already-implemented store commands through the editor surface only. It will not add server/sync/storage changes, curved freeform edges, boolean CSG, or a blank pen tool.
- Planned implementation slices are toolbar conversion, 2D freeform outline rendering in `ChipArtwork`, Konva vertex handles/add/delete interactions in `ChipStage`, `EditorPage` store wiring, then focused/full test and browser QA.
- Added a first-class `Freeform` button to the editor shape controls (`EditorToolbar`). It calls the existing `setDieShape('freeform')` path from M1, so conversion still seeds vertices from the current die and re-clamps blocks through store logic. Decision: keep it beside the legacy one-click shapes rather than inside the parametric menu because freeform is not parametric and is a primary authoring mode.
- Wired freeform 2D rendering through the same outline trace path as parametric shapes in `ChipArtwork`: clipping, die base rendering, and seal rings now use `traceDieOutline(resolveDieOutline(die))` for `die.shape === 'freeform'`. Legacy primitive branches for rect/square/circle/hexagon remain unchanged.
- Added a freeform vertex editor overlay in `ChipStage`. When the die is freeform it renders an outline guide, transparent edge hit targets, and draggable circular vertex handles. Dragging a handle calls `onMoveFreeformVertex(index, normalizedPoint)`, double-clicking an edge inserts a midpoint after that edge via `onAddFreeformVertex(index + 1, normalizedPoint)`, and selecting a handle then pressing Delete/Backspace calls `onDeleteFreeformVertex(index)` while respecting the store's min-3 enforcement.
- `EditorPage` now passes `state.addFreeformVertex`, `state.moveFreeformVertex`, and `state.deleteFreeformVertex` into `ChipStage`. No separate UI history stack was introduced; every mutation still goes through M1's store commands and existing undo/redo behavior.
- Testing trade-off: jsdom cannot perform real Konva canvas hit testing, so the `react-konva` mock in `ChipStage.test.tsx` exposes enough event callbacks to verify normalized callback wiring. Real pointer behavior was browser-verified with the in-app Browser on the Vite dev server.
- Browser QA on `http://127.0.0.1:5173/`: created an AURORA M5 project from the landing page, opened `/editor/da14d850-fcad-49b9-b907-d05fd8f1ec50`, clicked `Freeform`, verified the Freeform button had `aria-pressed="true"`, confirmed visible vertex handles on the canvas, dragged the top-left handle, double-clicked the top edge, selected a handle and pressed Delete, and confirmed browser console warn/error logs were empty. The generated spec metrics changed after the outline edit, which confirmed the project reacted to the edited freeform geometry.
- Final verification:
  - RED: `npm run test:client -- src/features/editor/EditorToolbar.test.tsx` failed because the `Freeform` button did not exist.
  - GREEN: the same toolbar test passed after adding the shape control.
  - RED: `npm run test:client -- src/features/editor/canvas/ChipArtwork.test.tsx` failed because freeform rendered through the rect fallback.
  - GREEN: the same artwork test passed after routing freeform through the outline trace path.
  - RED: `npm run test:client -- src/features/editor/canvas/ChipStage.test.tsx src/features/editor/EditorPage.test.tsx` failed because no overlay or store wiring existed.
  - GREEN: the same stage/page tests passed after adding the overlay and callbacks.
  - Focused suite: `npm run test:client -- src/features/editor/EditorToolbar.test.tsx src/features/editor/canvas/ChipArtwork.test.tsx src/features/editor/canvas/ChipStage.test.tsx src/features/editor/EditorPage.test.tsx`: 4 files / 42 tests passed.
  - `npm run test:client`: 130 files / 850 tests passed.
  - `npm run build`: passed; Vite emitted the existing >500 kB chunk warning.
  - `npm test`: client 130 files / 850 tests passed; server 74 files / 321 tests passed.
  - `npx eslint src/features/editor/canvas/ChipStage.tsx --report-unused-disable-directives --max-warnings 0`: passed after replacing the synchronous selection-reset effect with a derived active selection.
  - `npm run lint`: failed on pre-existing unrelated files (`src/features/gallery/GalleryDetailPage.tsx` `react-hooks/set-state-in-effect`, `src/features/sync/syncEngine.ts` `react-hooks/immutability`, and `src/stores/projectStoreContext.tsx` `react-refresh/only-export-components`). No M2-touched file remains in the lint output.

## V13-M3 3D + Export Parity Verification

- Started M3 as a verification milestone on top of the uncommitted M2 worktree. Added the plan at `docs/superpowers/plans/2026-07-02-v13-m3-3d-export-parity.md`.
- Scope decision: M3 should add regression/characterization coverage and browser QA for freeform 3D, die PNG, poster PNG, and MP4 handoff. Production code should change only if those tests reveal a real pipeline gap.
- Added 3D model parity coverage in `src/visual/chip3d/chip3dModel.test.ts`: `freeform` now participates in the shared die-shape footprint matrix, and targeted arbitrary + concave freeform tests assert the die-base footprint equals `outlineToPolygon(resolveDieOutline(die), 64)`. No production 3D code changed; the tests passed against the existing polygon pipeline.
- Added die/poster export parity coverage:
  - `DieExportStage.test.tsx` now verifies a freeform project keeps exact die stage dimensions, passes `project.die.shape === 'freeform'` into shared `ChipArtwork`, and uses `renderMode="die-only"`.
  - `PosterExportStage.test.tsx` now covers all poster formats and verifies freeform projects still render through shared `ChipArtwork` inside the poster composition.
- Added MP4 handoff coverage in `VideoExportPanel.test.tsx`: a model containing a freeform polygon die-base footprint is passed unchanged to `recordTurntableMp4`, confirming the MP4 UI does not inspect or special-case `die.shape`.
- Browser QA on `http://127.0.0.1:5173/`: created an AURORA M5 project, switched to `Freeform`, opened the 3D showcase, confirmed a rendered WebGL canvas plus `Export turntable MP4`, closed the showcase, confirmed die/poster/share export controls remained present for the freeform project, and confirmed browser console warn/error logs were empty throughout.
- M3 added no production code. The milestone result is regression coverage + browser evidence that M0-M2's shared outline/model/artwork paths already carry freeform through 3D and exports.
- Final verification:
  - `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts`: 1 file / 28 tests passed.
  - `npm run test:client -- src/features/export/DieExportStage.test.tsx src/features/export/PosterExportStage.test.tsx`: 2 files / 3 tests passed.
  - `npm run test:client -- src/features/export/VideoExportPanel.test.tsx`: 1 file / 4 tests passed.
  - Focused M3 suite: `npm run test:client -- src/visual/chip3d/chip3dModel.test.ts src/features/export/DieExportStage.test.tsx src/features/export/PosterExportStage.test.tsx src/features/export/VideoExportPanel.test.tsx`: 4 files / 35 tests passed.
  - `npm run test:client`: 131 files / 856 tests passed.
  - `npm run build`: passed; Vite emitted the existing >500 kB chunk warning.
  - `npm test`: client 131 files / 856 tests passed; server 74 files / 321 tests passed.
  - `npx eslint src/visual/chip3d/chip3dModel.test.ts src/features/export/DieExportStage.test.tsx src/features/export/PosterExportStage.test.tsx src/features/export/VideoExportPanel.test.tsx --report-unused-disable-directives --max-warnings 0`: passed.

## V13-M4 Final QA & Release

- Started M4 as the v13 release-close milestone. Added the plan at `docs/superpowers/plans/2026-07-02-v13-m4-final-qa-release.md`.
- Scope decision: M4 is documentation + verification only unless final QA exposes a release-blocking defect. It should bump the public release docs to `0.11 v13`, add the v13 QA pack, and update the release docs contract test.
- Rewrote `tests/releaseDocs.test.ts` from the v12 contract to the v13 Freeform contract and confirmed the expected RED state first: English/Korean README files still said `0.10 v12`, and `docs/ops/v13-freeform-qa.md` did not exist. After the docs work, the same release-doc test passed with 1 file / 3 tests.
- Updated `README.md` and `README.kr.md` to `0.11 v13`, added release-overview entries for `v13 Freeform`, updated the editor shape count to include freeform, and added `Freeform Die Authoring (v13)` sections covering vertex handles, block re-clamp, and 3D/export parity.
- Added `docs/ops/v13-freeform-qa.md` as the release QA pack. It records the manual checklist for Freeform conversion, Vertex add / move / delete, Block re-clamp, 2D rendering, 3D showcase, Die PNG, Poster PNG, MP4 export, and the "No server or sync change" invariant.
- Final browser QA exposed a real release blocker: both Vite dev and production preview opened the 3D showcase modal for a freeform project, but the lazy `Chip3DViewer` stayed on `Loading 3D showcase...` indefinitely while console warn/error logs stayed empty. The MP4 and authoring controls rendered, but the WebGL viewer never mounted.
- Fixed that blocker by setting `build.modulePreload = false` in `vite.config.ts`. This keeps `Chip3DViewer`, `chip3dStage`, recorder, and `mp4-muxer` in lazy chunks, but removes Vite's modulepreload wrapper/hints from the production build. Trade-off: 3D lazy chunks no longer get proactive modulepreload hints, so the first 3D open may do a little less speculative loading; the payoff is a simpler native dynamic-import path that resolved reliably in the in-app Browser release QA. `rg "three" dist/assets/index-*.js` still has no output, so Three remains out of the core index bundle.
- Browser QA after the fix used production preview at `http://127.0.0.1:4173/`: started `AURORA M5`, clicked `Freeform`, opened the 3D showcase, confirmed the WebGL canvas rendered, confirmed `Export turntable MP4`, `Play turntable`, `Reset view`, `Save current view`, and `Reset 3D default` were present, closed the modal, and confirmed `Download Die PNG`, `Download Poster PNG`, and `Share Poster` remained available. Browser console warn/error logs were empty after the fixed run.
- Local dev-server logs still show expected `/api/me` and `/api/health` proxy `ECONNREFUSED` entries when the API server is not running; they did not surface as browser console warn/error logs and are unchanged from previous frontend-only QA.
- Final verification:
  - `npm run test:client -- tests/releaseDocs.test.ts`: 1 file / 3 tests passed.
  - `npm run test:client`: 131 files / 856 tests passed.
  - `npm run build`: passed; Vite emitted the known >500 kB chunk warning, and lazy 3D chunks remained split.
  - `npm test`: client 131 files / 856 tests passed; server 74 files / 321 tests passed.
  - `npx eslint tests/releaseDocs.test.ts src/features/export/PosterExportStage.test.tsx src/features/export/DieExportStage.test.tsx src/features/export/VideoExportPanel.test.tsx src/visual/chip3d/chip3dModel.test.ts vite.config.ts --report-unused-disable-directives --max-warnings 0`: passed.
  - `npm run lint`: still fails only on the pre-existing unrelated baseline (`src/features/gallery/GalleryDetailPage.tsx` `react-hooks/set-state-in-effect`, `src/features/sync/syncEngine.ts` `react-hooks/immutability`, and `src/stores/projectStoreContext.tsx` `react-refresh/only-export-components`).
  - `rg "three" dist/assets/index-*.js`: no output.
- Follow-up README simplification: removed the long v3-v13 change-history paragraph and version-line callout from both README files, rewrote the release overview as short plain-language entries, removed version numbers from Key Features section headings, and deleted the bottom Launch Status / server deploy memo sections. This intentionally makes the README more product-facing and less operations-heavy.
- Updated `tests/releaseDocs.test.ts` to assert the new concise README contract, including negative checks for the removed version-line callout, versioned Key Features headings, launch-status section, and server deploy memo.
- Verification after the README simplification:
  - `npm run test:client -- tests/releaseDocs.test.ts`: 1 file / 3 tests passed.
