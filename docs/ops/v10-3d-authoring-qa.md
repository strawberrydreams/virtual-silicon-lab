# v10 3D Authoring QA Release Pack

This release pack closes v10 "3D Authoring" and records the final gates for the `0.8 v10` line.

## Scope

v10 turns the derived 3D showcase into an editor authoring surface without changing backend routes,
SQLite migrations, or the 2D Konva PNG export contract.

- Camera: save/reset normalized authored viewpoints.
- Lighting: safe preset + intensity authoring.
- Environment: background, exposure, and bloom authoring over theme-derived defaults.
- Animation: deterministic turntable/glow toggles and timing.
- Look presets: full-scene camera + lighting + environment application.
- Round-trip: editor-authored `scene3d` travels through publish snapshots, gallery, share deep links,
  and MP4 export.
- MP4: continues to use the existing 1280x720 / 30fps / 8s capture contract.

## Final Gate Commands

Run these from the repository root:

```bash
npm test
npm run build
npm run typecheck:server
rg "three" dist/assets/index-*.js
```

Expected:

- `npm test` passes client and server suites.
- `npm run build` passes. The known Vite chunk-size warning is acceptable for this release.
- `npm run typecheck:server` passes.
- `rg "three" dist/assets/index-*.js` prints no output, confirming Three remains outside the core
  index bundle.

## Browser QA Checklist

### Editor Authoring

1. Start the frontend with `npm run dev -- --host 127.0.0.1`.
2. Open the `AURORA M5` preset in the editor.
3. Open `Open 3D showcase`.
4. Confirm a nonblank WebGL canvas.
5. Exercise Camera controls: `Save current view`, `Reset 3D default`, and `Reset view`.
6. Exercise Lighting controls: `Studio`, `Neon noir`, `Daylight`, `Dramatic`, intensity slider, and
   `Reset lighting`.
7. Exercise Environment controls: `Midnight post`, `Aurora post`, `Clean post`, exposure slider,
   bloom slider, and `Reset environment`.
8. Exercise Animation controls: turntable toggle/period, glow toggle/period/min/max, `Reset animation`,
   and `Play turntable`.
9. Exercise Look presets: `Orbit hero`, `Inspection`, `Dramatic closeup`.
10. Confirm Undo becomes enabled after authoring actions and the dialog remains usable.

### Round-trip

1. Start the API server locally with signups open and the frontend origin as the public base:

   ```bash
   VSL_SIGNUPS_OPEN=true VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173 npm run dev:server
   ```

2. Publish an authored scene containing Camera, Lighting, Environment, Animation, and Look presets.
3. Open the gallery detail with `?view=3d`.
4. Confirm the 3D showcase opens with the saved scene and without editor-only authoring controls.
5. Open/copy the share target under `/s/` and confirm its `View in 3D` link targets gallery 3D.
6. Confirm published JSON retains `scene3d` in the server snapshot.

### Export Parity

1. Confirm die-only PNG remains `die width x height x 4`.
2. Confirm poster PNG remains `3200x1800`.
3. Confirm MP4 export UI remains attached to the 3D showcase and uses the authored scene descriptor.

## Known Local-dev Notes

- Running only the frontend dev server logs expected proxy errors for `/api/me` and `/api/health` if
  the API server is not running.
- The frontend dev/preview proxy includes `/api`, `/s/`, and `/uploads`. Keep the share proxy as `/s/`
  rather than `/s`; `/s` also matches Vite's `/src` module path and can blank the app during dev QA.
- For local share round-trip QA, set `VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173` on the API server so
  generated share, gallery, and poster URLs stay on the frontend origin and flow through those proxies.
- Vite may invalidate React Fast Refresh while editing provider files during development. Final QA
  should use a clean page load after edits settle.
- Browser download events for MP4 can be environment-dependent; recorder and panel contracts remain
  covered by automated tests, while browser QA verifies the MP4 control path and authored scene state.

## M7 Result Log

- Release docs were bumped to `0.8 v10` in English and Korean READMEs.
- Added release documentation and Vite local share proxy contract tests.
- Editor authoring browser QA on `AURORA M5` exercised camera save/reset, lighting presets/intensity,
  environment presets/exposure/bloom, animation toggles/timing, look presets, undo enablement, and the
  3D MP4 control path. The WebGL canvas rendered at `2492x774` backing pixels on a `1246x387` CSS canvas.
- Round-trip browser QA published
  `m7-3d-round-trip-qa-1782715787775-ffc21765` with authored camera, lighting, environment, and animation
  settings. Server gallery JSON retained `scene3d`; the share page rendered poster + `View in 3D`; gallery
  `?view=3d` opened the viewer-only 3D modal with no authoring controls and a `2462x1212` backing canvas.
- Found and fixed a local-dev share proxy issue: proxying `/s` intercepted Vite `/src/*` modules. The proxy
  now uses `/s/` and `/uploads`, and QA runs the API server with `VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173`.
- Final gate results:
  - `npm test`: client 119 files / 769 tests passed; server 70 files / 298 tests passed.
  - `npm run build`: passed; only the known >500 kB chunk warning appeared.
  - `npm run typecheck:server`: passed.
  - `rg "three" dist/assets/index-*.js`: no output, so Three remains outside the core index bundle.
