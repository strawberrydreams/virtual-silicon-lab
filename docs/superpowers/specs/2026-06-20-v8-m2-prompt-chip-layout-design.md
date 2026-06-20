# v8-M2 — Prompt → Chip Layout Design

> **Status:** approved design (brainstormed 2026-06-20). Third milestone of v8 "AI-Assisted Creation"
> (outline: `docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`; foundation:
> `docs/superpowers/specs/2026-06-19-v8-m0-server-ai-foundation-design.md`; M1:
> `docs/superpowers/specs/2026-06-19-v8-m1-ai-naming-spec-copy-design.md`). The signature v8 feature.
> The next step after this spec is a bite-sized TDD plan
> (`docs/superpowers/plans/2026-06-20-v8-m2-prompt-chip-layout.md`).
> **Re-consult the `claude-api` skill before changing any `@anthropic-ai/sdk` code in the plan.**

## Goal

The signature feature: a vibe prompt becomes a starting chip. The user types a short prompt on the
dashboard, the server generates a constrained `AiChipDraft`, the existing pure domain factory maps it to
a valid `Project`, and the client saves it as a fresh **local** project and opens it in the editor for
fully local editing. M2 also **enriches the draft shape with a `theme`** so the AI picks the visual vibe
(neon/retro/military/keynote/mono), since the theme drives the chip's look and the look is the product.

**The server side already exists from M0.** `POST /api/ai/generate-draft` (auth + shared 24h quota,
`kind='generate-draft'`) already returns an **unsaved draft `Project`** via `mapAiDraftToProject`. M2
adds (a) the `theme` field end-to-end, and (b) the client surface: a dashboard prompt control, a
local-save path reusing the v3 remix-import clone pattern, and editor navigation.

Milestone gate: malformed or refused AI output never yields an invalid project (guaranteed by the
server's `mapAiDraftToProject` **and** a client-side `migrateProject` re-validation on save); generated
chips satisfy domain invariants (die clamp, z-order, `schemaVersion` 5); the refusal/error path degrades
gracefully to an inline message with no project created and manual creation unaffected; `npm test` /
`npm run build` / server typecheck / lint green; `ANTHROPIC_API_KEY` never reaches the client bundle.

## Decisions (resolved at milestone start)

- **Prompt UI = dashboard, next to "Random Chip".** Creating from a prompt is a *new-project* action, so
  it lives with the existing `create` / `createRandom` / `remixPreset` controls that each navigate to
  `/editor/:id` after creating. A prompt text field + a "Generate with AI" button, no modal.
- **Save flow = save directly, then navigate to the editor.** Matches the Random Chip / preset flow; the
  editor *is* the preview/edit surface. An unwanted result is deleted or undone there. No pre-save
  preview panel (unlike M1, M2 creates a *new* project, so there is nothing to overwrite).
- **Draft shape enriched with `theme`.** `AiChipDraft` gains an optional `theme: StyleTheme`. The pure
  `mapAiDraftToProject` applies it when valid and falls back to the project default otherwise — so the
  valid-project guarantee is unchanged (an invalid/missing theme can never corrupt the project).
- **Local save = v3 remix-import pattern, name preserved.** A new pure `materializeAiDraftProject`
  (sibling to `importRemixedProject`) migrates the network-sourced snapshot (defense in depth),
  deep-clones it, and assigns a fresh id + `now` timestamps while **keeping the AI-chosen name** and
  setting **no `remixedFrom`** (AI generation is original creation, not a remix of a published chip).
- **Quota/safety = shared with M0.** No new endpoint, no new migration; the existing generate-draft
  route, `ai_prompt_log`, and shared 24h quota apply. Refusals surface from the anthropic adapter as a
  thrown error → the route's existing `503 AI_UNAVAILABLE`.

## Architecture & Components

```text
src/domain/ai/                         (pure — NO React/Konva/Zustand/IndexedDB/AI/network imports)
  aiChipDraft.ts          MOD  AiChipDraft gains optional `theme?: StyleTheme`
  mapAiDraftToProject.ts  MOD  apply a valid draft.theme to project.theme; else keep the default
  materializeAiDraftProject.ts NEW  migrate + deep-clone a draft Project snapshot to a fresh local
                               Project (fresh id + now, name preserved, no remixedFrom)
  *.test.ts               MOD/NEW  theme-applied/invalid-fallback cases; materialize clone/migrate/throw

server/src/ai/                         (reuses src/domain/ai via the @domain/* alias)
  fakeProvider.ts         MOD  generateChipDraft includes a deterministic theme derived from the prompt
  anthropicProvider.ts    MOD  DRAFT_SCHEMA gains a `theme` enum; prompt instructs picking a vibe theme
  (routes.ts, quota.ts, config.ts unchanged — generate-draft already exists from M0)

src/stores/
  projectStore.ts         MOD  add createFromAiDraft(snapshot): Promise<Project> (materialize + save + prepend)
src/features/projects/
  aiDraftApi.ts           NEW  generateDraft(prompt): Promise<Project> (mirrors aiCopyApi error mapping)
  ProjectDashboard.tsx    MOD  prompt field + "Generate with AI" button next to Random Chip
src/app/
  App.tsx                 MOD  wire generateAiChip(prompt): generateDraft -> createFromAiDraft -> navigate
```

### Data flow

Dashboard "Generate with AI" → `App.generateAiChip(prompt)` → `aiDraftApi.generateDraft(prompt)` →
`POST /api/ai/generate-draft { prompt }` → [M0: `getSessionUser` 401 → shared quota 429 →
`logPrompt(kind='generate-draft')` → `aiProvider.generateChipDraft({ prompt })` (503 on throw/refusal) →
`mapAiDraftToProject(draft)`] → `{ project }` (unsaved, schemaVersion 5, with the AI-chosen theme) →
client `store.createFromAiDraft(project)` → `materializeAiDraftProject` (migrate + clone + fresh id/now,
name kept) → `repository.save` → prepend → `navigate('/editor/:id')`. Errors are caught **before**
navigation and rendered inline on the dashboard; no project is created on failure.

### Component boundaries

- **`mapAiDraftToProject`** (extended) — still the single valid-project guarantor. The theme addition is
  validated against the `StyleTheme` union inside the mapper; invalid/missing → project default. Existing
  M0 behavior (no theme in the draft → default `neon`) is preserved.
- **`materializeAiDraftProject`** — input: an unknown draft `Project` snapshot; output: a valid, fresh
  local `Project`. Pure, domain-only, unit-tested. Runs `migrateProject` so a malformed/legacy snapshot
  cannot be persisted; differs from `importRemixedProject` only in keeping the name and omitting
  `remixedFrom`.
- **`aiDraftApi` / `createFromAiDraft` / dashboard control** — client-only. The dashboard control is
  additive: every failure path (offline / 401 / 429 / 503 / refusal) renders an inline message and never
  blocks the existing manual create / random / preset controls. The API key stays server-only.

## Schema & Config

- **No migration, no schema bump.** `AiChipDraft` is an in-memory intermediate shape, not persisted; the
  resulting `Project` stays at `CURRENT_SCHEMA_VERSION` 5. `ai_prompt_log` and the shared 24h quota are
  reused unchanged. No Konva 2D PNG export change.
- **Config (unchanged from M0):** `VSL_AI_PROVIDER` (`fake` default | `anthropic`), `ANTHROPIC_API_KEY`
  (server-only), `VSL_AI_MODEL` (default `claude-opus-4-8`), `VSL_AI_DAILY_QUOTA` (default `20`, shared).

## Non-Goals / Out of Scope

- **No pre-save preview panel** (the editor is the preview surface; save-then-navigate).
- **No new endpoint or migration** — generate-draft already exists; quota/log are shared with M0.
- **No layout suggestions** (M3), **no variations** (M4), **no quota tuning / abuse hardening** (M5).
- **No `Project` schema change** beyond using the existing `theme` field; **no Konva export change**;
  **no `src/domain/` purity change** (the new/extended `src/domain/ai/` stays pure).
- **No `remixedFrom`/lineage** for AI drafts (original creation, not a remix); **no client API keys, no
  BYOK, no payments.** Admin (`/admin`) stays out of scope. EDA/GDSII/manufacturing permanently excluded.

## Testing Strategy

- **Pure (`src/domain/ai/`):** `mapAiDraftToProject` — a valid `draft.theme` is applied to
  `project.theme`; an invalid or missing theme falls back to the default (existing M0 cases still pass).
  `materializeAiDraftProject` — fresh id + `now`, **name preserved** (no "Remix" suffix), independent
  deep clone (mutating the result never touches the input), legacy-schema snapshot migrated to v5, and a
  corrupt snapshot throws.
- **Server (fake provider, no network):** the fake `generateChipDraft` returns a deterministic `theme`
  derived from the prompt; the anthropic adapter's `DRAFT_SCHEMA` includes the `theme` enum (verified via
  the existing SDK-mocked unit test). The generate-draft route is already covered by M0; add an assertion
  that the returned project reflects the draft's theme.
- **Client:** `aiDraftApi` error mapping (offline → `AiServerUnreachableError`, `{error}` → typed
  `AiApiError`); `projectStore.createFromAiDraft` (saves a fresh-id clone, keeps the name, prepends to
  `projects`); `ProjectDashboard` generate flow (RTL: typing a prompt enables the button, submit calls
  the injected handler, a failing handler renders an inline message and creates no project).
- **Gates:** `npm test` (client then server), `npm run build`, `npm run typecheck --workspace server`,
  `npm run lint` all green; confirm no API key appears in any client bundle or API response. Exercise the
  prompt → generate → editor flow in a browser after the frontend change.

## Milestone Gate

- A vibe prompt generates a valid `Project` saved as a fresh local project that opens in the editor for
  full local editing; the fake provider pins the flow end to end.
- Malformed/refused AI output never yields an invalid project (server `mapAiDraftToProject` + client
  `migrateProject`); generated chips satisfy domain invariants; refusal/error degrades to an inline
  message with no project created and manual creation unaffected (local-first regression-free).
- `ANTHROPIC_API_KEY` server-only; Konva export + `Project` schema + `src/domain/` purity unchanged.
- All gates green; decisions/outcomes recorded in `implementation.md` + `CLAUDE.md`.
