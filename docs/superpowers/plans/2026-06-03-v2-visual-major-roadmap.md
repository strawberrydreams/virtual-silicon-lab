# Virtual Silicon Lab — v2 Visual Major Roadmap

All milestones (V2-M0–V2-M6) are complete; per-milestone plans are condensed alongside this file
(full TDD scripts in git history).

**Goal:** Rebuild the v1 visual experience into a desktop-only visual major release where the
website, editor, chip artwork, and exported posters look comparable to the corporate chip press
visuals in `images/`.

**Architecture:** Keep the v1 local-first React/Konva architecture and single JSON project schema.
Add a v2 visual layer (page themes, material recipes, chip artwork layers, poster compositions,
curated hero sets) without backend, auth, mobile support, AI, or true 3D. Export stages stay
dedicated Konva stages — never editor-DOM capture.

## Scope Lock

v2 included:

- website + editor + output image redesign
- page theme switcher: `laboratory`, `anime`, `space`
- improved 2D chip textures/materials/presets
- non-AI deterministic random chip generator
- 10 curated hero chip + poster sets

v2 excluded: backend/SQLite/auth/account CRUD, board/gallery/ranking/contest, mobile/responsive,
true 3D, AI, payments, manufacturing/EDA compatibility. (Earlier backend/board answers were
superseded by this scope decision; final decisions live in `docs/spec-v2.md`.)

## Milestones (all ✅)

- **V2-M0** Visual Audit & Direction (no code) — extracted visual rules, page-theme/poster-format
  definitions, and 10 hero set targets with a pass/fail quality rubric in `docs/reference/`.
- **V2-M1** Page Theme System & App Shell — `laboratory`/`anime`/`space` token contracts, theme
  store + switcher, `data-page-theme` app-root attribute, redesigned landing/dashboard.
- **V2-M2** Editor Chrome Redesign — three-zone desktop tool surface (stage / creation rail /
  inspector rail), product-analysis stage environment, segmented toolbar, all v1 commands preserved.
- **V2-M3** Chip Material Renderer — `materialRecipes`/`chipLayers` package/substrate/die/trace/
  micro-detail/glow layers shared by `ChipArtwork` across editor and export.
- **V2-M4** Poster Export Redesign — `press-hero`/`architecture-slide`/`product-closeup`
  compositions on dedicated export-only Konva stages, output remains `3200x1800`.
- **V2-M5** Hero Set Production & Random Generator — `heroSetCatalog` (10 distinct sets) and a
  deterministic seeded `randomChipGenerator`, both wired into the dashboard.
- **V2-M6** Final QA & Release Pack — full regression pass (`npm test` / `npm run build`), desktop
  Chrome QA across landing/theme/dashboard/editor/export/random flows, docs and backlog updated.

## Quality Rubric (from V2-M0)

- No DOM/CSS-only effects in exports — everything renders via Konva node settings.
- Reject hero sets that are recolors of the same chip; require visual-family distribution.
- Posters must contain no editor UI and hit exact `3200x1800` output.
- Glow/neon/metal must read as premium, not amateurish, against `images/` references.

## Key Decisions

- Single JSON project schema unchanged throughout v2; no migration required.
- Pure visual logic (`materialRecipes`, `chipLayers`, `posterCompositions`, `heroSetCatalog`,
  `randomChipGenerator`) lives in `src/visual/` and is unit-tested; Konva rendering itself is
  browser-verified only.
- v2 merge to `main` remains pending explicit user instruction (see `CLAUDE.md`).
