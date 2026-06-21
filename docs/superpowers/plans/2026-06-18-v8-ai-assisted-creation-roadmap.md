# Virtual Silicon Lab — v8 "AI-assisted Creation" Roadmap (Outline)

> **For agentic workers:** This is a **directional outline**, not an executable plan. Per the
> agreed approach (mirroring v3→v6), v8 milestone details — intermediate-shape schema, domain
> factory mapping, prompt/safety design, quota tuning — are confirmed in a **per-milestone
> brainstorm/spec at that milestone's start**. Do not expand this into bite-sized tasks until that
> point. Before writing any Claude API code, consult the `claude-api` skill for current model IDs,
> structured-output syntax, and SDK usage — do not guess SDK bindings.

**Goal:** Add an AI creation layer on top of the 2D local-first authoring pipeline — generate a
starting chip from a prompt, write names/fake-spec copy, suggest layout edits, and produce
variations — all server-side, with every result becoming an ordinary editable local `Project`.

**Architecture:** AI never emits a `Project` directly. The model returns a **constrained
intermediate shape** (structured outputs via `output_config.format` json_schema, or tool use),
which the server maps through the existing **pure `src/domain/` factories** to a valid `Project`.
All calls are server-side in the Hono `server/` workspace via the official `@anthropic-ai/sdk`;
`ANTHROPIC_API_KEY` lives only in server env and the client never sees it. The provider sits behind
an interface (mirroring v5's email provider) so dev/test use a deterministic fake. Editing stays
100% local-first — AI is optional and the editor works fully with the server (or provider) off.

**Tech Stack:** Hono + `@anthropic-ai/sdk` (server) · better-sqlite3 (`012_ai_*` migration:
per-user daily quota, usage, prompt log) · structured outputs (`output_config.format`) ·
`src/domain/` factories (reused, unchanged) · Vitest fake-provider tests. Default model
`claude-opus-4-8` for prompt→layout; `claude-haiku-4-5` selectable for lighter copy tasks (owner
config). Confirm exact model IDs/params via the `claude-api` skill at implementation time.

**Spec:** `docs/superpowers/specs/2026-06-18-v7-v8-roadmap-design.md`.

---

## Scope Lock

v8 **includes**: a server AI provider module (real Anthropic + fake) · per-user daily generation
quota + auth + rate-limit gating · prompt→chip layout generation · AI naming + fake-spec copy · AI
layout suggestions (accept/reject) · AI remix/variations · the intermediate-shape → domain-factory
mapping contract · prompt logging within the existing safety/moderation posture.

v8 **excludes**: any change to the Konva 2D PNG export contract · any change to local-first editing
(AI output becomes an ordinary local `Project`) · 3D/MP4 (that's v7) · client-side API keys ·
bring-your-own-key · payments. EDA/GDSII/manufacturing remains permanently excluded.

**Invariants:** all AI output flows through `src/domain/` factories and satisfies domain invariants
(die clamp, z-order, `schemaVersion`); `src/domain/` purity unchanged (no AI/network imports);
server-down or provider-down degrades to normal local editing with no regression; prompts are
handled within the existing moderation/safety posture; admin (`/admin`) stays desktop-only and out
of scope.

---

## Milestones (outline — detail confirmed at each milestone start)

- [ ] **v8-M0 — Server AI Foundation**
  - Provider interface + deterministic dev/test fake; `@anthropic-ai/sdk` integration behind it;
    `012_ai_*` migration (per-user daily quota, usage counters, prompt log); auth + rate-limit +
    quota guard middleware reusing v3/v5 patterns; the **intermediate-shape → `src/domain/`
    factory mapping contract** (pure, unit-tested) that all later milestones produce through.
  - **Gate:** with the fake provider, quota/guards behave correctly and the mapping always yields a
    valid `Project`; no client exposure of the API key; server typecheck/lint green.

- [ ] **v8-M1 — AI Naming + Fake-Spec Copy (smallest surface first)**
  - Given an existing chip, generate a surreal product name, tagline, and fake spec sheet; surface
    accept/apply in the editor. Reuses the existing `FakeSpec` shape (no schema change beyond M0).
  - **Gate:** generated copy applies cleanly into `FakeSpec`; server/provider absent → no
    regression; fake-provider test pins the flow.

- [ ] **v8-M2 — Prompt → Chip Layout (signature feature)**
  - A vibe prompt → constrained intermediate shape → domain factory → valid `Project`; "save into
    my projects" then fully local editing (reuses the v3 remix-import local-clone pattern).
  - **Gate:** malformed/refused AI output never yields an invalid project; generated chips satisfy
    domain invariants (die clamp, z-order, `schemaVersion`); refusal path degrades gracefully.

- [ ] **v8-M3 — AI Layout Suggestions**
  - Given the current chip, suggest block additions/rearrangements the user can accept or reject;
    applied changes route through existing editor commands so undo/redo stays consistent.
  - **Gate:** accept/reject integrates with the editor command + undo stack; rejecting leaves the
    project untouched.

- [ ] **v8-M4 — AI Remix / Variations**
  - Given an existing chip, generate N stylistic variations (recolor/re-theme/re-arrange) as new
    independent local projects to choose from (reuses M0 mapping + M2 save pattern).
  - **Gate:** each variation is an independently editable local clone; the source chip is unchanged.

- [ ] **v8-M5 — QA & Cost Hardening**
  - Quota/rate-limit tuning, prompt-abuse defenses, cost monitoring, end-to-end test
    (prompt → generate → edit → save), final gates.
  - **Gate:** `npm test` (incl. server fake-provider suite) / `npm run build` / server typecheck /
    lint green; local-first regression-free.

---

## Risks & Open Questions (resolve in per-milestone specs)

- **Valid-project guarantee.** The intermediate-shape schema + factory mapping must make invalid AI
  output impossible to persist. M0 owns and unit-tests this contract; M2 stresses it. **Note:**
  structured outputs (`output_config.format`) enforce *shape* (types, enums, required, nested
  objects) but **not** numeric `minimum`/`maximum`, `minLength`/`maxLength`, or recursive schemas
  (a documented json_schema limitation), and every object needs `additionalProperties: false`. So
  domain invariants like die-clamp and coordinate bounds must be enforced by the `src/domain/`
  factory mapping, **not** the AI schema — which is exactly why the factory stays the source of truth.
- **Cost control.** Unbounded generation is expensive — per-user daily quota + rate-limit + (owner
  choice) Haiku for light tasks. M0 builds the levers; M5 tunes them.
- **Safety.** User prompts go to an external LLM. Prompt logging + the existing moderation posture
  apply; refusals must not break the flow. Confirm refusal handling via the `claude-api` skill.
- **Model/SDK drift.** Model IDs and structured-output syntax evolve — always re-confirm via the
  `claude-api` skill at implementation time rather than hardcoding from memory.
- **Local-first integrity.** Every AI feature must degrade to normal local editing when the server
  or provider is unavailable; each milestone's gate re-checks this.

## Next Steps

1. At v8 start (after v7, or whenever prioritized), run a **v8-M0 brainstorm/spec** (intermediate
   schema + mapping contract + quota/safety design), then write the M0 bite-sized plan.
2. Invoke the `claude-api` skill before writing any Anthropic SDK code.
3. Per-milestone: record decisions/outcomes in `implementation.md`, update `CLAUDE.md` Milestone
   Status, and re-confirm the next milestone's detail before building.
