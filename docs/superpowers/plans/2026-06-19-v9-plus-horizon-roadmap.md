# Virtual Silicon Lab — v9+ Horizon Roadmap (Goal-Level Outline)

> **⚠️ TEMPORARY HOLDING DOC.** This is a rough, **goal-only** directional outline for the horizon
> *after* v8. It exists to park the agreed direction until each version gets its own detailed
> roadmap/spec. **Delete this file once per-version (v9, v10, …) detailed roadmaps are written** — it
> is intentionally throwaway, not a source of truth.
>
> **For agentic workers:** Do NOT expand any of this into milestones or bite-sized tasks. Each version
> below is confirmed via its own brainstorm → spec → plan at that version's start, mirroring v3→v8.

**Where this sits:** v7 "Visual Depth" is **done** (M0–M6, M4 dropped); v8 "AI-Assisted Creation" is
**outlined** (`docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`). This doc sketches
**v9 onward**, getting deliberately fuzzier the further out it reaches.

**Chosen post-v8 themes:** **Authoring Power** and **Reach & Continuity** (selected 2026-06-19). Other
directions (creator economy/payments, worldbuilding pages, real-time collaboration) stay parked as
future candidates, not scheduled.

---

## Carried-forward invariants (every version respects these)

- **Visual quality IS the product** — surreal / Sci-Fi / playful chip aesthetics for enthusiasts, not EE pros.
- **Local-first** editing; serializable `Project` JSON is the single source of truth.
- The **Konva 2D PNG export contract** stays stable: die `pixelRatio:4`, poster `3200x1800`.
- `src/domain/` purity; every persisted change bumps `schemaVersion` + adds a migration + test.
- **EDA / GDSII / DRC / LVS / manufacturing compatibility is permanently excluded.**

---

## Proposed goal sequence (Authoring Power first, then Reach & Continuity)

Rationale for the ordering: Authoring Power is the most on-brand and self-contained (pure-domain +
Konva/Three, no new server infra), so it comes first; Reach & Continuity is heavier (touch UX, then the
genuinely hard two-way sync problem), so it follows, with sync deliberately last.

- [ ] **v9 — "Deep Canvas" (Authoring Power I)**
  - **Goal:** push the 2D authoring surface past rectangles — **freeform / custom die paths** and
    **richer materials + subtle in-editor animation** — while keeping the Konva PNG export contract
    intact. Most on-brand; pure-domain + Konva, no backend change.

- [ ] **v10 — "3D Authoring" (Authoring Power II)**
  - **Goal:** promote v7's *derived 3D showcase* toward a light **authoring / posing surface** (camera,
    lighting, and material tuning that round-trips into the saved project), with 2D remaining the
    structural source of truth. Builds directly on the v7 showcase.

- [ ] **v11 — "Anywhere" (Reach & Continuity I)**
  - **Goal:** **touch / mobile authoring + installable PWA + offline**, extending v6's responsive *read*
    surfaces to actual *creation* — without degrading desktop-first authoring quality.

- [ ] **v12 — "Continuum" (Reach & Continuity II)**
  - **Goal:** **multi-device / cloud project sync** (two-way) with conflict handling. Deliberately last —
    it is the hardest and most invariant-stressing step (local-first → sync).

---

## Still parked (future candidates, not on this horizon)

Creator economy / payments / print-on-demand · worldbuilding & narrative pages · real-time
collaboration (multiplayer editing). Revisit only if priorities shift; none are scheduled here.

## Next step

When v9 is prioritized (after v8), run a **v9 brainstorm → spec → bite-sized plan** for its first
milestone, record decisions in `implementation.md` + `CLAUDE.md`, and **delete this holding doc** once
v9+ has its own detailed roadmap.
