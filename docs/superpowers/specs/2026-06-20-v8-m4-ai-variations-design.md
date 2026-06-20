# v8-M4 — AI Remix / Variations Design

> **Status:** approved design (brainstormed 2026-06-20). Fifth milestone of v8 "AI-Assisted Creation"
> (outline: `docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`; foundation:
> `docs/superpowers/specs/2026-06-19-v8-m0-server-ai-foundation-design.md`). Reuses M0's
> provider/quota/`ai_prompt_log` foundation, M2's local-save pattern (`createFromAiDraft` /
> `materializeAiDraftProject`), and M3's full-layout context derivation. The next step after this spec
> is a bite-sized TDD plan (`docs/superpowers/plans/2026-06-20-v8-m4-ai-variations.md`).
> **Re-consult the `claude-api` skill before writing any `@anthropic-ai/sdk` code in the plan.**

## Goal

From the chip the user is editing, generate **2–4 stylistic variations** (recolor / re-theme /
re-arrange), preview each as a mini live thumbnail in an editor inspector-rail panel, and save the
chosen ones as **independent local projects**. The source chip is never mutated — it is only read to
derive the AI's context. Each saved variation is an ordinary, fully editable local `Project`.

Milestone gate: each variation is an independently editable local clone and the source chip is
unchanged; adversarial/malformed AI output can never yield an invalid project (guaranteed per
variation by the server's `mapAiDraftToProject` and the client's `migrateProject`-on-save); the
server/provider absent (or signed out / over quota / refused) degrades to an inline message with
manual editing unaffected; `npm test` / `npm run build` / server typecheck / lint green;
`ANTHROPIC_API_KEY` never reaches the client bundle.

## Decisions (resolved at milestone start)

- **Scope = generate variations of an existing chip as new local projects.** Each variation is a
  fresh `AiChipDraft` mapped to a `Project`; saving one creates an independent local clone. The
  source chip is read-only throughout.
- **UI = editor inspector-rail panel, per-card save.** A new `AiVariationsPanel` mounts in
  `EditorInspectorRail` alongside the M1 `AiSpecPanel` and M3 `AiLayoutSuggestionsPanel`. It has a
  count selector (2–4, default **3**) and a "Generate variations" button. Generate renders N cards —
  each a **mini Konva thumbnail** + name + theme + "Save as new project". Save creates the local
  clone and marks the card "Saved ✓" **without navigating**, so the user can keep several from one
  generation; the source editor stays open and unchanged.
- **AI input = full layout (reuse M3).** A new pure `deriveAiVariationContext(project)` returns
  `AiVariationContext` = M3's `deriveAiLayoutContext` (die shape + each block as a fractional rect)
  **plus** the source `name` + `theme`, so the AI perturbs the actual arrangement rather than
  re-imagining from a summary.
- **Output reuses M0/M2's `AiChipDraft`.** The AI returns N variation drafts; only the *input*
  context shape is new. Each draft flows through the existing `mapAiDraftToProject`, so the
  valid-project guarantee (drop unknown block types, clamp into the die, sequential z-order,
  `schemaVersion` 5, valid-or-default theme) is unchanged.
- **Count = user-selectable 2–4, clamped server-side.** The panel limits the control to 2–4
  (default 3); the route defensively clamps `count` to `[2, 4]` (default 3 on missing/invalid) and
  slices the result, so the count is bounded regardless of client or provider behavior.
- **Save = reuse M2, no new store method.** The chosen variation is saved via the existing
  `projectStore.createFromAiDraft` → `materializeAiDraftProject` (migrate + deep-clone + fresh
  id/timestamps, name preserved, no `remixedFrom`). The source chip is never written.
- **Server reuse = M0.** A new `POST /api/ai/generate-variations` endpoint reuses M0's auth +
  `requireUserWithinQuota` helper + shared 24h quota + `ai_prompt_log` (`kind='generate-variations'`).
  **One quota unit per call** regardless of N. No new migration; refusals surface from the anthropic
  adapter as a thrown error → the route's `503`.

## Architecture & Components

```text
src/domain/ai/                         (pure — NO React/Konva/Zustand/IndexedDB/AI/network imports)
  aiVariationContext.ts        NEW  AiVariationContext ({ name?, theme, dieShape, blocks:[{type,x,y,w,h}] })
  deriveAiVariationContext.ts  NEW  deriveAiVariationContext(project): AiVariationContext
                                    (= name + theme + deriveAiLayoutContext(project) fields)
  *.test.ts                    NEW  name/theme/dieShape + fractional blocks; empty-blocks case
  (aiChipDraft.ts / mapAiDraftToProject.ts / materializeAiDraftProject.ts — REUSED unchanged)

server/src/ai/                         (reuses src/domain/ai via the @domain/* alias)
  provider.ts             MOD  AiProvider gains generateVariations(input): Promise<{ variations: AiChipDraft[] }>
  fakeProvider.ts         MOD  deterministic generateVariations (count drafts derived from context)
  anthropicProvider.ts    MOD  generateVariations via json_schema (variations array of drafts, opus-4-8)
  routes.ts               MOD  POST /api/ai/generate-variations (requireUserWithinQuota;
                               kind='generate-variations'; clamp count [2,4]; map each draft -> Project)

src/features/editor/
  aiVariationsApi.ts            NEW  generateVariations(context, count): Promise<Project[]> (reuses M1 AI errors)
  ChipVariationThumbnail.tsx    NEW  read-only Konva Stage + shared ChipArtwork, fit-to-box (pure scale math)
  AiVariationsPanel.tsx         NEW  count selector -> "Generate variations" -> N thumbnail cards -> per-card Save
  EditorInspectorRail.tsx       MOD  mount the panel (project + onSaveVariation)
  EditorPage.tsx                MOD  accept onSaveVariation prop, thread to the rail
src/app/
  App.tsx                       MOD  EditorRoute passes onSaveVariation={store.createFromAiDraft}
```

### Data flow

Panel count selector + "Generate variations" → `deriveAiVariationContext(project)` →
`aiVariationsApi.generateVariations(context, count)` → `POST /api/ai/generate-variations
{ context, count }` → `getSessionUser` (401) → shared quota (429) →
`logPrompt(kind='generate-variations')` (before the call) → clamp `count` to `[2,4]` →
`AiProvider.generateVariations({ context, count })` (fake in dev/test; 503 on throw/refusal) → map
each `AiChipDraft` through `mapAiDraftToProject` → `{ variations: Project[] }` (sliced to count). The
panel renders each unsaved draft `Project` as a thumbnail card. **Save** →
`onSaveVariation(variation)` → `projectStore.createFromAiDraft` → `materializeAiDraftProject` (migrate
+ clone + fresh id/now) → `repository.save` → prepend to `projects`; the card marks "Saved ✓" and the
user stays in the source editor. **No navigation**; nothing is persisted server-side; the source chip
is never written.

### Component boundaries

- **`deriveAiVariationContext`** — input: a `Project`; output: `name` + `theme` + die shape + existing
  blocks as fractional rectangles. Pure, domain-only, unit-tested. Composes `deriveAiLayoutContext`.
- **`mapAiDraftToProject`** (reused) — the single per-variation valid-project guarantor; unchanged.
- **`AiProvider.generateVariations`** — input: `{ context, count }`; output: `{ variations }`
  (N `AiChipDraft`s). Fake + anthropic, selected by the existing `resolveAiConfig` wiring; the
  adapter owns all SDK usage.
- **`projectStore.createFromAiDraft`** (reused) — the only place a variation touches local project
  state; adds a fresh-id clone and never mutates the source.
- **`ChipVariationThumbnail`** — input: a draft `Project` + a target box; renders the shared
  `ChipArtwork` on a fixed-size read-only Konva stage scaled to fit. Pure fit-scale math is
  unit-tested; Konva rendering is browser-verified (jsdom lacks canvas).
- **`aiVariationsApi` / `AiVariationsPanel`** — client-only, additive. Every failure path (offline /
  401 / 429 / 503 / refusal) renders an inline message and never blocks manual editing. The key stays
  server-only.

## Schema & Config

- **No migration, no schema bump.** `AiVariationContext` is an in-memory intermediate shape;
  variations reuse the existing `AiChipDraft` and resolve to the existing `Block`/`Project` shapes;
  `CURRENT_SCHEMA_VERSION` stays `5`. `ai_prompt_log` and the shared 24h quota are reused with
  `kind='generate-variations'` (one row per call). No Konva 2D PNG export change.
- **Config (unchanged from M0):** `VSL_AI_PROVIDER` (`fake` default | `anthropic`), `ANTHROPIC_API_KEY`
  (server-only), `VSL_AI_MODEL` (default `claude-opus-4-8`), `VSL_AI_DAILY_QUOTA` (default `20`,
  shared). One `generate-variations` call counts as a single quota unit regardless of N.

## Non-Goals / Out of Scope

- **No save-all / auto-apply** (per-card save only); **no navigation on save** (the source editor
  stays); **no pre-save full-editor preview** (the editor is that surface once a variation is opened
  from the dashboard).
- **No quota tuning / abuse hardening / cost monitoring** (M5).
- **No new migration or endpoint** beyond `generate-variations`; **no `Project` schema/migration
  change**; **no Konva 2D PNG export change**; **no `src/domain/` purity change** (the new
  `src/domain/ai/` modules stay pure).
- **No `remixedFrom`/lineage** for variations (original AI creation, not a remix of a published
  chip). **No client-side API keys, no BYOK, no payments.** Admin (`/admin`) stays out of scope.
  EDA/GDSII/manufacturing remains permanently excluded.

## Testing Strategy

- **Pure (`src/domain/ai/`):** `deriveAiVariationContext` — die shape + `name` + `theme` + existing
  blocks as fractions (and an empty-blocks case). Plus the thumbnail's pure fit-scale helper
  (fit-to-box scale + centering math), unit-tested independently of Konva.
- **Store:** no new method — saving reuses `projectStore.createFromAiDraft` (already covered by M2:
  fresh-id clone, name preserved, prepend). M4 adds no store test beyond confirming the source chip is
  not mutated (the panel reads the project; save adds a new project).
- **Server (fake provider, no network):** `generate-variations` route — unauthenticated → `401`;
  authed under quota → `200` with a `{ variations }` array of the requested (clamped) length and
  exactly one `ai_prompt_log` row (`kind='generate-variations'`); over quota → `429`; missing/invalid
  context → `400`; provider throw → `503`; `count` clamped to `[2,4]` (e.g. `count=9` → 4, `count=0`
  → default). The fake `generateVariations` is deterministic from context + count.
- **Anthropic adapter (SDK mocked):** `generateVariations` issues `claude-opus-4-8` with an
  `output_config.format` json_schema for the variations array; a refusal `stop_reason` throws. No real
  Anthropic calls in the suite.
- **Client (RTL):** `aiVariationsApi` error mapping (offline → `AiServerUnreachableError`, `{error}` →
  typed `AiApiError`); `AiVariationsPanel` (**mocking** `ChipVariationThumbnail`, since Konva needs a
  canvas) — the count control is selectable in 2–4, "Generate variations" populates N cards, Save
  calls `onSaveVariation` with that variation and marks the card saved, and 401/429/503/offline render
  inline messages without disabling the panel or the editor.
- **Gates:** `npm test` (client then server), `npm run build`, `npm run typecheck --workspace server`,
  `npm run lint` all green; confirm no API key appears in any client bundle or API response. Exercise
  the generate → thumbnail → save flow in a browser after the frontend change (saved variation appears
  on the dashboard; the source chip is unchanged; server-down shows the inline error).

## Milestone Gate

- The panel generates 2–4 thumbnail variations of the current chip; saving one creates an
  independently editable local project and leaves the source chip unchanged; the fake provider pins
  the flow end to end.
- Malformed/refused AI output never yields an invalid project (`mapAiDraftToProject` per variation +
  client `migrateProject` on save); the refusal/error path degrades to an inline message with manual
  editing unaffected (local-first regression-free).
- `ANTHROPIC_API_KEY` server-only; Konva export + `Project` schema + `src/domain/` purity unchanged.
- All gates green; decisions/outcomes recorded in `implementation.md` + `CLAUDE.md`.
