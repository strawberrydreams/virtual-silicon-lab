# Virtual Silicon Lab

Local-first creative web app for designing fictional semiconductor die shots and exporting
high-resolution chip PNGs and press-style posters. Not an EDA tool; no real manufacturing.

## v2 Private Release

v2 is a visual major release. The app keeps the v1 local-first editor and single JSON project
model, but rebuilds the page shell, editor chrome, chip material renderer, and poster output
around a premium semiconductor press-image direction.

## Features

- No-login start; projects persist in IndexedDB (localStorage fallback).
- React + Konva editor: four die shapes, grid/snap/zoom/pan, resize/rotate/reorder, undo/redo,
  16 real/fantasy block types, decorations, and page themes.
- Three page themes: `laboratory`, `anime`, and `space`.
- 16 remixable presets: 10 v2 hero chip/poster sets plus the original six base presets.
- Deterministic non-AI random chip generator for fast visual exploration.
- Editable fake spec sheets and three poster formats: `press-hero`, `architecture-slide`, and
  `product-closeup`.
- Two PNG exports rendered on dedicated Konva stages:
  - die-only at `pixelRatio: 4`
  - poster at logical `1600x900` with `pixelRatio: 2`, producing `3200x1800`

## Develop

```bash
npm install
npm run dev -- --host 127.0.0.1   # open the printed URL in desktop Chrome
npm test                          # vitest (unit tests)
npm run build                     # static bundle in dist/
```

The bundle exceeds Vite's 500 kB warning because Konva and the editor runtime ship in one chunk.
That warning is expected for the current private release and is tracked as a future code-splitting
candidate.

## Deploy

Static-host `dist/`. `netlify.toml` sets the build command, publish dir, and SPA fallback so deep
links such as `/editor/:id` resolve to `index.html`. Any static host (Vercel, GitHub Pages) works
with the same fallback.

## QA Snapshot

Final v2 QA verified:

- `npm test`: 39 files / 146 tests.
- `npm run build`: passes with only the known Vite chunk-size warning.
- Desktop Browser flow: landing, theme switching, dashboard, v2 hero remix, random chip creation,
  editor workspace, export controls, and console health.
- Export contract: all hero sets use the dedicated Konva poster path and the `3200x1800` poster
  raster contract.
