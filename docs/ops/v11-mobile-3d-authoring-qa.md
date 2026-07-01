# v11 Mobile 3D Authoring QA Release Pack

This release pack closes v11 "Mobile 3D Authoring" and records the final gates for the `0.9 v11`
line.

## Scope

v11 brings a curated subset of the existing 3D authoring surface to phone-width editor routes without
changing backend routes, SQLite migrations, project schema, or the 2D Konva PNG export contract.

- Mobile look presets: `Orbit hero`, `Inspection`, and `Dramatic closeup` dispatch the existing
  undoable look command and persist through the mobile editor store.
- Lighting chips: `Studio`, `Neon noir`, `Daylight`, and `Dramatic` are available on mobile without
  exposing the desktop-only lighting intensity slider.
- Camera touch authoring: touch orbit remains in the WebGL viewer, with mobile `Save current view`
  and `Reset 3D default` actions wired to the existing camera commands.
- Available fallback: 3D-capable mobile projects show the interactive mobile 3D showcase.
- Unavailable fallback: no-WebGL, unsupported-shape, or over-budget projects keep the static 2D
  preview plus desktop-edit CTA.
- Round-trip: mobile-authored `scene3d` travels through local persistence, publish snapshots, gallery
  `View in 3D`, share pages, and MP4 capture via the same resolved scene descriptor as desktop.
- Share: `/s/` pages keep using the frontend-local proxy in development and link back to gallery 3D.
- MP4: the existing 1280x720 / 30fps / 8s capture contract is unchanged.
- Export parity: die-only PNG remains `pixelRatio: 4` and poster PNG remains `3200x1800`.

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

### Mobile Available Path

1. Start the frontend with `npm run dev -- --host 127.0.0.1`.
2. Set the browser viewport to 390x844.
3. Remix `AURORA M5` from the dashboard.
4. Confirm the mobile editor route shows the chip preview/spec/export surface, not the desktop Konva
   workspace.
5. Open `Open 3D showcase`.
6. Confirm mobile look presets, lighting chips, `Save current view`, and `Reset 3D default` are
   visible.
7. Confirm desktop-only lighting, environment, and animation range inputs are absent.
8. Confirm the compact mobile rail uses accessible labels and 44px tap targets.
9. Apply a look preset and lighting chip, save/reset camera, and reload to confirm persistence.

### Mobile Unavailable Fallback

1. Open or seed a project that fails `isChip3DShowcaseAvailable`.
2. Confirm the mobile editor keeps the static 2D preview and desktop-edit CTA.
3. Confirm no `Open 3D showcase` button is shown for the unavailable project.

### Round-trip / Share / MP4

1. Start the API server locally with signups open and the frontend origin as the public base:

   ```bash
   VSL_SIGNUPS_OPEN=true VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173 npm run dev:server
   ```

2. Publish a mobile-authored scene containing look, lighting, and camera settings.
3. Confirm server gallery JSON retains `scene3d`.
4. Open the gallery detail with `?view=3d` and confirm the viewer-only showcase opens with no mobile
   or desktop authoring controls.
5. Open the share target under `/s/` and confirm `View in 3D` links to gallery 3D.
6. Confirm the MP4 export control remains attached to the 3D showcase and uses the authored scene
   descriptor.

### Export Parity

1. Confirm die-only PNG remains `die width x height x 4`.
2. Confirm poster PNG remains `3200x1800`.
3. Confirm MP4 remains `1280x720` / `30fps` / `8s`.

## Known Local-dev Notes

- Running only the frontend dev server logs expected proxy errors for `/api/me` and `/api/health` if
  the API server is not running.
- The frontend dev/preview proxy includes `/api`, `/s/`, and `/uploads`. Keep the share proxy as `/s/`
  rather than `/s`; `/s` also matches Vite's `/src` module path and can blank the app during dev QA.
- For local share round-trip QA, set `VSL_PUBLIC_BASE_URL=http://127.0.0.1:5173` on the API server so
  generated share, gallery, and poster URLs stay on the frontend origin and flow through those proxies.
- Browser download events for MP4 can be environment-dependent; recorder and panel contracts remain
  covered by automated tests, while browser QA verifies the MP4 control path and authored scene state.

## M4 Result Log

- Release docs were bumped to `0.9 v11` in English and Korean READMEs.
- Final mobile browser QA covered the available 3D authoring path, unavailable fallback, round-trip
  gallery/share path, MP4 control path, and unchanged export contracts.
- Final gate results are recorded in `implementation.md` under V11-M4.
