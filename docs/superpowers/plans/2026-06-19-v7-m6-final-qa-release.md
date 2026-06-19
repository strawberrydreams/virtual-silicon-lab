# v7-M6 Final QA & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign off every v7 surface, record a 3D/video browser-QA matrix, confirm the bundle/perf budgets, bump the version line to 0.5 v7, and hand `v7-visual-depth` to `finishing-a-development-branch` (present options, no auto-merge).

**Architecture:** QA-and-release milestone — no product code unless QA finds a blocker (a blocker fix routes back through the relevant milestone's task pattern and commits separately as `fix(v7):`). A new `docs/ops/3d-showcase-qa.md` records the matrix; `README.md`/`CLAUDE.md`/`implementation.md` are updated for the release pack. Mirrors the v6-M4 release plan structure.

**Tech Stack:** Vite dev/build · Playwright MCP (automatable 3D cells) · real Chrome (owner-manual MP4 + visual sign-off) · Markdown docs.

## Global Constraints

- Package manager: **npm**. Node.js `20.19+` or `22.12+`.
- **No schema / migration / API / upload change.** Any QA-blocker fix must respect `src/domain/` purity, the Konva PNG export contract (die `pixelRatio:4`, poster `3200x1800`), and local-first.
- `three` + the recorder + `mp4-muxer` stay **lazy-loaded / code-split** — out of the core `index-*` chunk and the gallery route's initial chunk.
- **Version line: README title only** moves `0.4 v6` → `0.5 v7`; `package.json` stays at `1.0.0`.
- **Branch finish presents options, no auto-merge** — `v7-visual-depth` stays unmerged like v4–v6 unless the owner explicitly chooses to merge.
- **QA split:** agent automates derivation/material/turntable/embed/fallback cells via Playwright MCP; **MP4 export and the M0-reference-board visual-quality sign-off are manual owner QA in a real Chrome.**
- "Visual quality IS the product": 3D output must read as premium against the M0 reference board — an amateurish 3D view is a milestone failure, not a ship.
- One concern per commit. No new unit tests (M6 adds no code); the automated suite is the regression guard.

## Surfaces / cells under test

3D derivation across all four die shapes (`rect`/`square`/`circle`/`hexagon`) + a neon-fantasy and a matte-mono hero/preset · materials+lighting · turntable+glow · MP4 export (owner-manual) · gallery `/gallery/:slug` "View in 3D" · share `/s/:slug` "View in 3D" link · WebGL-off / over-budget poster fallback · 2D editor/export/autosave/themes/presets regression. (Admin `/admin` and mobile 3D are out of scope.)

---

### Task 1: Regression gates + bring up the app for 3D QA

**Files:** none (environment setup folded into Task 2's deliverable).

**Interfaces:** none.

- [ ] **Step 1: Confirm all gates are green before QA**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green — client then server suites pass; `npm run build` exits 0 (known Vite >500 kB chunk warning is acceptable); typecheck and lint exit 0. If anything fails, stop and fix before QA (a real product regression is a release blocker).

- [ ] **Step 2: Capture the build chunk report for the bundle sign-off (Task 3)**

Run: `npm run build 2>&1 | grep -iE 'Chip3DViewer|index|mp4|recorder' | tee /tmp/v7-m6-chunks.txt`
Expected: a separate lazy `Chip3DViewer-*.js` chunk is listed; note its size. The core `index-*.js` line is present. Keep the output for Task 3.

- [ ] **Step 3: Start the API server and the client (two background processes)**

Run:
- `npm run dev:server` → API on `http://127.0.0.1:8787`
- `npm run dev -- --host 127.0.0.1` → client (note the printed port, typically 5173)

Expected: `/api/health` reachable; client loads in a browser.

- [ ] **Step 4: Seed one published chip for the gallery/share cells**

Using the running app (desktop browser): ensure ≥1 published chip exists so `/gallery/:slug` and `/s/:slug` have content. If none exists, sign in, open a hero/preset project, publish it (PublishPanel), and note its **slug**. Also note one local project **id** with a recognizable multi-block chip for the editor showcase + die-shape checks. Record slug + id for Task 2. No commit (runtime seed only).

---

### Task 2: Run the 3D/video QA matrix and record results

**Files:**
- Create: `docs/ops/3d-showcase-qa.md`

**Interfaces:** none (documentation deliverable).

- [ ] **Step 1: Create the QA results doc skeleton**

Create `docs/ops/3d-showcase-qa.md`:

```markdown
# v7 3D Showcase & Video QA — Results

Date: 2026-06-19
Build: <git short SHA>
Profile: desktop Chrome, Playwright MCP against local dev (`/api` proxied to :8787).
Pass bar: 3D reads as premium against the M0 reference board (no amateurish glow/metal),
recognizable from the 2D project, smooth turntable (no jank), correct fallback, PNG export unchanged.

## Derivation / materials / turntable (agent-automatable)

| Chip | Die shape | Derivation | Materials+lighting | Turntable | Notes |
|---|---|---|---|---|---|
| <seeded multi-block> | rect | | | | |
| (square variant) | square | | | | |
| (circle variant) | circle | | | | |
| (hexagon variant) | hexagon | | | | |
| neon-fantasy hero | (its shape) | | | | |
| matte-mono preset | (its shape) | | | | |

## Gallery / share / fallback (agent-automatable)
- Gallery `/gallery/<slug>` "View in 3D" opens, renders, matches the editor showcase: <result>
- Share `/s/<slug>` "View in 3D" link target resolves to `/gallery/<slug>`: <result>
- WebGL-off → static poster (no broken viewer); over-budget chip → poster: <result>

## Owner manual sign-off (real Chrome — NOT agent-automatable)
- MP4 export: downloadable 1280x720 / 30fps / ~8s opaque H.264, plays + loops seamlessly,
  PNG die/poster exports unchanged: <owner result>
- Visual-quality sign-off vs M0 reference board (premium, not amateurish) across shapes
  + neon/mono: <owner sign-off>

## 2D regression spot-check
- Editor authoring, autosave, theme switch, hero presets, die/poster PNG export unaffected: <result>
```

- [ ] **Step 2: Drive the editor showcase across die shapes (Playwright MCP)**

Open the seeded project's editor (`/editor/<id>`), click "Open 3D showcase", and for each die shape:
1. In the 2D editor, set the die shape (rect → square → circle → hexagon) — or use a project/preset per shape.
2. Open the showcase; `browser_snapshot` to confirm the `dialog` ("<name> 3D showcase") and that the viewer canvas mounts (no error-boundary text "3D showcase failed to load").
3. `browser_take_screenshot` for the visual record.
4. Confirm the package/die/blocks are recognizable vs the 2D layout.
Record derivation/materials per row. (Turntable: click Play, screenshot mid-rotation, confirm motion; note jank if any.)

- [ ] **Step 3: Gallery "View in 3D" + parity check**

Navigate to `/gallery/<slug>`. Confirm the "View in 3D" button is present (WebGL available). Click it; `browser_snapshot` confirms the `dialog` ("<title> 3D showcase") and the viewer mounts; `browser_take_screenshot`. Compare against the editor showcase screenshot for the same chip — they must match (same derivation path). Confirm **no** MP4 export panel is present (gallery is view-only). Record under "Gallery / share / fallback".

- [ ] **Step 4: Share link target + WebGL-off fallback**

1. Navigate to `/s/<slug>`; in the snapshot confirm a "View in 3D" link whose href ends `/gallery/<slug>`. Record.
2. Fallback: in a `browser_evaluate`, stub WebGL so `getContext` returns null, then reload `/gallery/<slug>`:

```js
() => { HTMLCanvasElement.prototype.getContext = () => null; return 'stubbed'; }
```

Confirm the "View in 3D" button is hidden (page poster remains) — no broken viewer. Record. (The over-budget path is covered by the unit test `chip3dBudget.test.ts`; note that in the doc.)

- [ ] **Step 5: 2D regression spot-check**

Back at a normal viewport with WebGL, in the editor confirm authoring still works (add/move a block, autosave persists on reload), switch theme, load a hero preset, and run a die-only + poster PNG export — all unaffected by v7. Record one line.

- [ ] **Step 6: Fill agent-automatable results; leave owner sign-off for Step 7; commit the doc**

Fill every agent-automatable cell with PASS/FAIL + notes. If any cell is a **release blocker** (broken derivation, amateurish materials, jank, broken fallback, or a 2D regression), stop and fix it via the matching milestone's task pattern, commit separately as `fix(v7): …`, re-run the affected cell, then continue. Commit the doc:

```bash
git add docs/ops/3d-showcase-qa.md
git commit -m "docs(ops): record v7 3D showcase + video QA matrix"
```

- [ ] **Step 7: Request owner manual QA for MP4 + visual sign-off**

Ask the owner to, in a real Chrome: (a) open the editor showcase, export the MP4, and confirm it downloads, plays, loops seamlessly at 1280×720/30fps/~8s, and that die/poster PNG exports are unchanged; (b) sign off the visual-quality "premium, not amateurish" bar against the M0 reference board across the die shapes + neon/mono. When the owner reports back, fill the "Owner manual sign-off" section and commit:

```bash
git add docs/ops/3d-showcase-qa.md
git commit -m "docs(ops): record owner MP4 + visual-quality sign-off"
```

---

### Task 3: Bundle / performance budget sign-off

**Files:**
- Modify: `docs/ops/3d-showcase-qa.md` (append a "Bundle / perf" section)

**Interfaces:** none.

- [ ] **Step 1: Verify three/encoder stay out of the core + gallery chunks**

From the `/tmp/v7-m6-chunks.txt` captured in Task 1 Step 2 (re-run `npm run build` if needed), confirm: a lazy `Chip3DViewer-*.js` chunk exists and carries the heavy 3D/encoder code; the core `index-*.js` is not bloated by `three`. As a direct check that the core bundle has no static three import, run:

```bash
grep -l "BufferGeometry\|WebGLRenderer" dist/assets/index-*.js || echo "core index clean of three"
```

Expected: prints `core index clean of three` (three's identifiers appear only in the lazy `Chip3DViewer-*` chunk). Record the lazy chunk size.

- [ ] **Step 2: Append the bundle/perf section and commit**

Append to `docs/ops/3d-showcase-qa.md`:

```markdown
## Bundle / perf sign-off
- Lazy `Chip3DViewer-*` chunk: <size> kB (gzip <n>); carries three + recorder + mp4-muxer.
- Core `index-*` + gallery route: free of three (static-import check passed).
- Turntable frame timing: M2 measured worst ~9.3ms / p95 ~9.1ms over 180 frames; owner spot re-check: <result> — no visible jank.
```

```bash
git add docs/ops/3d-showcase-qa.md
git commit -m "docs(ops): record v7 bundle + perf budget sign-off"
```

---

### Task 4: Release pack — version line + Milestone Status + implementation log

**Files:**
- Modify: `README.md` (title line 1 `0.4 v6` → `0.5 v7`; version note around line 10)
- Modify: `CLAUDE.md` (Working Context v7 bullet; add a V7-M6 line under "### v7 Visual Depth")
- Modify: `implementation.md` (append a dated V7-M6 entry, Korean)

**Interfaces:** none.

- [ ] **Step 1: Bump the README version line**

In `README.md`, change the title `# Virtual Silicon Lab 0.4 v6` to `# Virtual Silicon Lab 0.5 v7`. Update the version note (around line 10) to record that the `0.5` line is v7 (Visual Depth). Add a one-line v7 entry to the feature/section list: a lazy Three.js 3D showcase (editor + gallery) with PBR/PMREM/ACES/bloom, turntable/glow, editor MP4 export, and a poster fallback — Konva 2D authoring + PNG export unchanged. Leave `package.json` at `1.0.0`.

- [ ] **Step 2: Update `CLAUDE.md` Milestone Status + Working Context**

Under "### v7 Visual Depth", add a **V7-M6** line: "✅ done — final QA & release. Full regression green; 3D/video QA matrix recorded in `docs/ops/3d-showcase-qa.md` (agent-automated derivation/materials/turntable/embed/fallback across rect/square/circle/hexagon + neon/mono; owner manual sign-off for MP4 export + M0-reference visual quality). Bundle sign-off: three/recorder/mp4-muxer lazy-only, core + gallery chunks Three-free, lazy `Chip3DViewer-*` <size> kB. Version line 0.5 v7. `finishing-a-development-branch` run; branch left unmerged for the owner's integration decision. Spec: `docs/superpowers/specs/2026-06-19-v7-m6-final-qa-release-design.md`; plan: this file."

Update the "Working Context" v7 bullet to read that **v7 is complete (M0–M6; M4 intentionally dropped)** on branch `v7-visual-depth`, not yet merged; public launch / branch integration remain separate owner gates.

- [ ] **Step 3: Run the full gates one last time**

Run: `npm test && npm run build && npm run typecheck --workspace server && npm run lint`
Expected: all green.

- [ ] **Step 4: Append the implementation log entry and commit**

Append a `## V7-M6 Final QA & Release (2026-06-19)` section to `implementation.md` (Korean, matching the file's style): regression-green, the 3D/video QA matrix + owner sign-off, the bundle/perf result, the 0.5 v7 version bump, and that the branch is handed to the owner unmerged.

```bash
git add -f README.md CLAUDE.md implementation.md
git commit -m "docs: bump to 0.5 v7 and record v7-M6 final QA & release"
```

- [ ] **Step 5: Finish the branch (present options, no auto-merge)**

**REQUIRED SUB-SKILL:** use `superpowers:finishing-a-development-branch` to verify tests/gates and present merge/PR options for the completed `v7-visual-depth` branch. Per the resolved decision, do **not** auto-merge — leave the branch for the owner's explicit integration choice, consistent with v4–v6.

---

## Self-Review

**1. Spec coverage (v7-M6):**
- Full regression / gates green → Task 1 Step 1 + Task 4 Step 3. ✅
- 3D/video QA matrix → `docs/ops/3d-showcase-qa.md`, split agent/owner → Task 2 (Steps 2–7). ✅
- Derivation across all four die shapes + neon/mono → Task 2 Step 2 (matrix rows). ✅
- Gallery "View in 3D" parity + view-only → Task 2 Step 3. ✅
- Share link target + WebGL-off/over-budget fallback → Task 2 Step 4. ✅
- MP4 + visual-quality owner sign-off → Task 2 Step 7. ✅
- Bundle/perf sign-off (three/encoder code-split, lazy chunk size, frame timing) → Task 3. ✅
- Version line 0.5 v7 (README only) → Task 4 Step 1. ✅
- Milestone Status + Working Context + implementation log → Task 4 Steps 2 & 4. ✅
- finishing-a-development-branch, no auto-merge → Task 4 Step 5. ✅

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to" placeholders. Each QA step has a concrete Playwright/MCP action or exact command. `<size>`, `<result>`, `<slug>`, `<id>`, `<git short SHA>`, and the 2026-06-19 date are runtime-filled by design (they cannot be known until execution) — consistent with the v6-M4 release plan.

**3. Type consistency:** No code/types introduced (QA + docs milestone). The WebGL-off stub and the static-import grep reference real identifiers (`getContext`, `BufferGeometry`/`WebGLRenderer`). Any blocker fix routes back through the relevant milestone's task pattern.

## Notes

- If QA surfaces a blocker, the fix is small and local (a material/scene tweak, a fallback branch, or a 2D fix) and is committed separately with a `fix(v7):` message before re-running the affected cell — never bundled into a doc commit.
- Confirm exact filenames before linking in docs: `ls docs/superpowers/specs | grep v7-m6` and `ls docs/ops`.
- Owner-manual cells (Task 2 Step 7) gate the milestone: do not mark V7-M6 done in `CLAUDE.md` until the owner's MP4 + visual sign-off is recorded.
