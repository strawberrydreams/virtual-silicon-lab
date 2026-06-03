# Virtual Silicon Lab

Local-first creative web app for designing fictional semiconductor die shots and exporting
high-resolution chip PNGs and keynote-style posters. Not an EDA tool; no real manufacturing.

## Features

- No-login start; projects persist in IndexedDB (localStorage fallback).
- React + Konva editor: four die shapes, grid/snap/zoom/pan, resize/rotate/reorder, undo/redo,
  16 real/fantasy block types, five themes, decorations.
- Curated remixable presets and editable fake spec sheets.
- Two PNG exports — die-only and keynote poster — rendered on dedicated Konva stages, with
  Web Share and a download fallback.

## Develop

```bash
npm install
npm run dev -- --host 127.0.0.1   # open the printed URL in desktop Chrome
npm test                          # vitest (unit tests)
npm run build                     # static bundle in dist/
```

The bundle exceeds Vite's 500 kB warning because Konva ships in one chunk — expected, not a failure.

## Deploy

Static-host `dist/`. `netlify.toml` sets the build command, publish dir, and SPA fallback so deep
links such as `/editor/:id` resolve to `index.html`. Any static host (Vercel, GitHub Pages) works
with the same fallback.

## Demo

Capture `docs/demo/virtual-silicon-lab-demo.gif` (landing → preset remix → edit → spec → poster
export) during final QA.
