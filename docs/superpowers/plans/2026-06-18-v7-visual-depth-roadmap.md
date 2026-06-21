# Virtual Silicon Lab — v7 "Visual Depth" Roadmap (Outline)

> **For agentic workers:** This is a **directional outline**, not an executable plan. Per the
> agreed approach (mirroring v3→v6), v7 milestone details — 3D derivation rules, material
> translation, video encoding choice, PixiJS adoption — are confirmed in a **per-milestone
> brainstorm/spec at that milestone's start**. **v7-M0 begins with a feasibility spike** before any
> committed build. Do not expand this into bite-sized tasks until that point.

**Goal:** Deepen "visual quality IS the product" by showing finished chips as a **3D showcase
(turntable/orbit) + video (MP4) export + shader-grade 2D visuals**, while 2D Konva remains the
editing source of truth.

**Architecture (hybrid):** 2D Konva is the authoring surface and source of truth. 3D is a
**derived, additive render path** (Three.js) built from the existing serializable `Project` JSON —
never an editing surface. The Konva `die-only`/`poster` PNG export contract is **untouched**; 3D
views and MP4 are *new* export paths. Three.js and any video encoder are **lazy-loaded /
code-split** so they never enter the core bundle (which already trips the >500 kB warning).

**Tech Stack (candidates, confirmed per milestone):** Three.js (3D), WebCodecs or `ffmpeg.wasm`
(video encoding), optionally PixiJS/WebGL (2D shader layer). All isolated behind dynamic imports.

**Spec:** `docs/superpowers/specs/2026-06-18-v7-v8-roadmap-design.md` (supersedes the v6-labelled
`docs/superpowers/specs/2026-06-16-v5-v6-roadmap-design.md` Visual Depth section). This roadmap
replaces `docs/superpowers/plans/2026-06-16-v6-visual-depth-roadmap.md`, which already carries a
"renumbered to v7, see this file" pointer back here.

---

## Version-numbering note

Visual Depth was originally scoped as **v6** in the 2026-06-16 roadmap, but Mobile/Responsive
shipped as v6 (0.4) first. Visual Depth is therefore **v7 (0.5 line)**. The technical content is
unchanged from the 2026-06-16 design; only the version label and spec reference move.

---

## Scope Lock

v7 **includes**: a derived 3D chip model + orbit/turntable showcase viewer · 3D material/lighting
that matches the chip aesthetic · camera turntable + subtle animation · MP4/GIF export of the
animation · optional shader-grade enhancement of the existing 2D pipeline · gallery/share
integration + performance budget.

v7 **excludes**: 3D as an *editing* surface (authoring stays 2D) · changing the Konva 2D PNG export
contract · mobile chip editing · AI (that's v8) · payments. EDA/GDSII/manufacturing remains
permanently excluded.

**Invariants:** local-first editing unchanged; Konva 2D export unchanged (die `pixelRatio:4`,
poster `3200x1800`); `src/domain/` purity unchanged; the M0 reference-board visual quality gate
applies to all 3D output (an amateurish 3D view is a milestone failure, not a ship); admin
(`/admin`) stays desktop-only and out of scope.

---

## Milestones (outline — detail confirmed at each milestone start)

- [ ] **v7-M0 — 3D Showcase Foundation (+ feasibility spike first)**
  - **Spike (precedes build):** validate Three.js bundle/perf impact, the project-JSON → 3D
    derivation, and the lazy-load isolation. Decide go/adjust before committing the milestone.
  - **Build:** integrate Three.js (dynamically imported); a pure derivation from the serializable
    `Project` (die + blocks → layered/extruded 3D model) living outside React/Konva so it is
    unit-testable like the existing domain/visual helpers; an optional orbit/turntable viewer
    mounted as a *view*, not an editor. Establish the 2D→3D mapping contract.
  - **Gate:** a real chip renders recognizably in 3D from its JSON; the editor's 2D path and bundle
    are unaffected when the 3D view is not opened.

- [ ] **v7-M1 — 3D Material & Lighting**
  - Translate the existing `materialRecipes`/theme tokens into 3D PBR-ish materials, emissive glow,
    and environment lighting so the 3D view reads as premium against the M0 reference board.
  - **Gate:** the 3D showcase passes the manual visual-quality review (same bar as v2/v3 visual
    gates).

- [ ] **v7-M2 — Turntable & Animation**
  - Camera turntable + subtle, looping layer/glow animation. Pure animation/keyframe logic kept
    testable; rendering browser-verified.
  - **Gate:** a smooth turntable loop with no jank on the target desktop profile.

- [ ] **v7-M3 — MP4 / GIF Export (highest-risk feasibility milestone)**
  - New export path: render the turntable/animation to MP4 (and/or GIF/WebM) via browser-side
    encoding (WebCodecs preferred; `ffmpeg.wasm` fallback). Encoder is lazy-loaded/code-split. The
    existing PNG export paths are untouched.
  - **Gate:** a downloadable, correctly-dimensioned video of the showcase; PNG exports unchanged.

- [ ] **v7-M4 — Shader-grade 2D Enhancement (optional)**
  - An optional PixiJS/WebGL filter layer to push 2D glow/material fidelity in the editor/export,
    bridging 2D and 3D quality. Adoption confirmed at milestone start (may be dropped if M1–M3
    already close the gap).
  - **Gate:** improved 2D fidelity with the Konva PNG export contract still intact (no DOM/CSS-only
    effects leaking into exports).

- [ ] **v7-M5 / M6 — Integration, Performance & QA**
  - 3D performance budget + low-end fallback (e.g., static poster when WebGL is unavailable);
    surface the 3D showcase / MP4 in gallery detail + share; final regression + browser QA.
  - **Gate:** `npm test`/`npm run build`/server typecheck/lint green with the 3D/encoder code split
    out of the core bundle; the showcase + video are reachable from gallery/share; local-first +
    Konva export invariants hold.

---

## Risks & Open Questions (resolve in per-milestone specs)

- **Bundle size.** The core bundle already warns at >500 kB; Three.js + an encoder must stay behind
  dynamic imports. M0's spike measures this explicitly.
- **3D fidelity vs effort.** Making 3D "look great at a glance" is the real risk, not the plumbing —
  M1 carries the visual-quality gate and may need iteration.
- **Video encoding portability.** WebCodecs support/perf vs `ffmpeg.wasm` size/speed is the M3 fork.
- **2D/3D divergence.** The derived 3D must stay faithful to the 2D authoring result; the M0 mapping
  contract is what keeps them in sync.

## Next Steps

1. v7-M0 is already brainstormed and planned — spec
   `docs/superpowers/specs/2026-06-18-v7-m0-3d-showcase-foundation-design.md` + bite-sized plan
   `docs/superpowers/plans/2026-06-18-v7-m0-3d-showcase-foundation.md` (feasibility spike first); the
   "renumbered to v7" note already exists on the old v6-visual-depth outline. The next action is to
   **execute v7-M0**, starting with its spike.
2. At each of M1–M6's start, run that milestone's brainstorm/spec (see the task-level detail in
   `docs/superpowers/plans/2026-06-18-v7-m1-m6-detailed-plans.md`) before expanding it into a
   bite-sized TDD plan.
3. Per-milestone: record decisions/outcomes in `implementation.md`, update `CLAUDE.md` Milestone
   Status, and re-confirm the next milestone's detail before building.
