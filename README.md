# Virtual Silicon Lab

Virtual Silicon Lab is a local-first creative web tool for designing fictional semiconductor die shots and exporting high-resolution chip images and keynote-style poster PNGs. It is not an EDA tool and does not model real manufacturing constraints.

## What Is Included

- no-login project creation with IndexedDB persistence and localStorage fallback
- React Konva editor with four die shapes, grid, snap, zoom, pan, resize, rotate, ordering, undo, redo, duplicate, and delete
- 16 real/fantasy block types, visual themes, decorations, and curated remixable presets
- editable fake spec sheets with bundled examples
- die-only PNG export and poster PNG export through dedicated Konva stages
- Web Share for poster files when available, with download fallback

## Local Development

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open the printed localhost URL in desktop Chrome.

## Verification

Run the full automated checks:

```bash
npm test
npm run build
```

Expected build output is a static Vite bundle in `dist/`. The current bundle can exceed Vite's default 500 kB warning threshold because Konva and the editor/export stack are bundled together; this is a known release note, not a test failure.

## Browser QA Checklist

Use desktop Chrome for the MVP acceptance gate:

- A new visitor can start without login and place the first block within 30 seconds.
- Refreshing and revisiting preserves local projects.
- A preset can produce a presentation-ready poster in under five minutes.
- The editor remains usable during a 150-block smoke test.
- Die-only exports match `die.width * 4` by `die.height * 4`.
- Poster exports are `3200 x 1800` and contain no editor controls.
- Browser console errors stay empty, ignoring a favicon 404 if present.

## Demo GIF

Final release QA should capture `docs/demo/virtual-silicon-lab-demo.gif` showing:

1. landing page direct start,
2. preset remix,
3. quick block edit,
4. fake spec edit,
5. poster export.

The GIF is intentionally deferred until the final Chrome QA pass so it reflects the release UI.

## Static Deployment

This app is static-hosted. Build with:

```bash
npm run build
```

Publish `dist/`. For Netlify, `netlify.toml` contains the build command, publish directory, and SPA fallback route. Equivalent Vercel/GitHub Pages deployment should serve `dist/index.html` for unknown routes such as `/dashboard` and `/editor/:projectId`.

