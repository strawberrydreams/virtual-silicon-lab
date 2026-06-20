# v8-M3 — AI Layout Suggestions Design

> **Status:** approved design (brainstormed 2026-06-20). Fourth milestone of v8 "AI-Assisted Creation"
> (outline: `docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`; foundation:
> `docs/superpowers/specs/2026-06-19-v8-m0-server-ai-foundation-design.md`). Independent of M2 — it
> builds on M0's provider/quota/`ai_prompt_log` foundation and the existing editor command system.
> The next step after this spec is a bite-sized TDD plan
> (`docs/superpowers/plans/2026-06-20-v8-m3-ai-layout-suggestions.md`).
> **Re-consult the `claude-api` skill before writing any `@anthropic-ai/sdk` code in the plan.**

## Goal

Given the chip the user is editing, the AI suggests new blocks to add (type + position + a short
reason). Each suggestion is shown in an editor inspector-rail panel with its own **Accept / Reject**.
Accepting routes the addition through a new editor command that goes through the editor's existing
`commit()` / undo machinery, so each accept is exactly **one undo step**; rejecting removes the
suggestion from the list and leaves the project untouched.

Milestone gate: accept/reject integrates with the editor command + undo stack (each accept is one
undoable step; undo removes the added block); rejecting leaves the project untouched; adversarial AI
suggestions can never produce an invalid block (the apply-time resolver drops unknown block types and
clamps positions into the die); the server/provider absent (or signed out / over quota / refused)
degrades to an inline message with manual editing unaffected; `npm test` / `npm run build` / server
typecheck / lint green; `ANTHROPIC_API_KEY` never reaches the client bundle.

## Decisions (resolved at milestone start)

- **Scope = block additions only.** Suggestions are new blocks (type + fractional position + size + an
  optional reason). Rearranging or resizing existing blocks is out of scope for M3 (it would require
  referencing existing block ids and a different apply path); additions are the clean, signature surface.
- **Granularity = per-suggestion Accept / Reject.** The panel lists each suggestion independently; the
  user accepts or rejects them one at a time. Each accept is one editor command (one undo step).
- **UI = editor inspector-rail panel.** A "Suggest improvements" button plus a suggestion list, mounted
  in `EditorInspectorRail` alongside the M1-style AI panels.
- **Apply path = a new editor command, not raw `addBlock`.** `addBlock(type)` only adds at a default
  position; to honor a suggested position in a single undoable commit, M3 adds
  `editorStore.applyAiSuggestion(suggestion)`, which resolves + clamps the block through a pure
  domain function and commits once. It still flows through the editor's `commit()` / undo stack.
- **Valid-output guarantee lives at apply time.** The pure `resolveAiSuggestionBlock(project,
  suggestion, id)` drops unknown block types (→ `null`, a no-op) and clamps the block into the die's
  bounding box (reusing M0's clamp approach), so an adversarial suggestion can never become an invalid
  block. Structured outputs enforce shape only.
- **Server reuse = M0.** A new `POST /api/ai/suggest-layout` endpoint reuses M0's auth +
  `requireUserWithinQuota` helper + shared 24h quota + `ai_prompt_log` (`kind='suggest-layout'`). No new
  migration; refusals surface from the anthropic adapter as a thrown error → the route's `503`.

## Architecture & Components

```text
src/domain/ai/                         (pure — NO React/Konva/Zustand/IndexedDB/AI/network imports)
  aiLayoutSuggestion.ts   NEW  AiLayoutSuggestion ({ type, label?, reason?, x, y, w, h } — x/y/w/h
                               fractions of the die) + AiLayoutContext ({ dieShape, blocks:[{type,x,y,w,h}] })
  deriveAiLayoutContext.ts NEW  deriveAiLayoutContext(project): AiLayoutContext — die shape + existing
                               blocks as fractional positions (the layout the AI reasons over)
  resolveAiSuggestionBlock.ts NEW  resolveAiSuggestionBlock(project, suggestion, id): Block | null —
                               drop unknown type, clamp into die bounds, assign nextZIndex (apply-time guarantee)
  *.test.ts               NEW  derivation; clamp/drop/adversarial cases

src/stores/
  editorStore.ts          MOD  applyAiSuggestion(suggestion): void — resolve + clamp + commit once (one undo step)

server/src/ai/                         (reuses src/domain/ai via the @domain/* alias)
  provider.ts             MOD  AiProvider gains generateLayoutSuggestions(input): Promise<{ suggestions }>
  fakeProvider.ts         MOD  deterministic generateLayoutSuggestions (context-derived)
  anthropicProvider.ts    MOD  generateLayoutSuggestions via json_schema (suggestions array, opus-4-8)
  routes.ts               MOD  POST /api/ai/suggest-layout (reuses requireUserWithinQuota; kind='suggest-layout')

src/features/editor/
  aiSuggestApi.ts         NEW  generateSuggestions(context): Promise<AiLayoutSuggestion[]> (reuses M1 AI errors)
  AiLayoutSuggestionsPanel.tsx NEW  "Suggest improvements" -> list -> per-item Accept/Reject
  EditorInspectorRail.tsx MOD  mount the panel (project + onApplyAiSuggestion)
  EditorPage.tsx          MOD  pass onApplyAiSuggestion={state.applyAiSuggestion}
```

### Data flow

Panel "Suggest improvements" → `deriveAiLayoutContext(project)` → `aiSuggestApi.generateSuggestions` →
`POST /api/ai/suggest-layout { context }` → `getSessionUser` (401) → shared quota (429) →
`logPrompt(kind='suggest-layout')` (before the call) → `AiProvider.generateLayoutSuggestions({ context })`
(fake in dev/test; 503 on throw/refusal) → `{ suggestions }`. The panel renders each suggestion with
Accept/Reject. **Accept** → `onApplyAiSuggestion(suggestion)` → `editorStore.applyAiSuggestion` →
`resolveAiSuggestionBlock` (clamp/drop) → `commit(...)` (one undo step), then the item is removed from
the list. **Reject** → the item is removed; no project change. Nothing is persisted server-side.

### Component boundaries

- **`deriveAiLayoutContext`** — input: a `Project`; output: the die shape + existing blocks as fractional
  rectangles. Pure, domain-only, unit-tested.
- **`resolveAiSuggestionBlock`** — input: the project + one suggestion + an id; output: a clamped,
  domain-valid `Block` or `null`. Pure, the single guarantor that an adversarial suggestion can't become
  an invalid block. Reuses the M0 clamp approach.
- **`editorStore.applyAiSuggestion`** — input: one suggestion; effect: one `commit` (one undo step) or a
  no-op when the suggestion resolves to `null`. The only place suggestions touch project state.
- **`AiProvider.generateLayoutSuggestions`** — input: `{ context }`; output: `{ suggestions }`. Fake +
  anthropic, selected by the existing `resolveAiConfig` wiring; the adapter owns all SDK usage.
- **`aiSuggestApi` / `AiLayoutSuggestionsPanel`** — client-only, additive. Every failure path (offline /
  401 / 429 / 503 / refusal) renders an inline message and never blocks manual editing. The key stays
  server-only.

## Schema & Config

- **No migration, no schema bump.** `AiLayoutSuggestion`/`AiLayoutContext` are in-memory intermediate
  shapes; the resulting blocks use the existing `Block` shape; `CURRENT_SCHEMA_VERSION` stays `5`.
  `ai_prompt_log` and the shared 24h quota are reused with `kind='suggest-layout'`. No Konva export change.
- **Config (unchanged from M0):** `VSL_AI_PROVIDER` (`fake` default | `anthropic`), `ANTHROPIC_API_KEY`
  (server-only), `VSL_AI_MODEL` (default `claude-opus-4-8`), `VSL_AI_DAILY_QUOTA` (default `20`, shared).

## Non-Goals / Out of Scope

- **No rearrange/resize of existing blocks** (additions only); **no whole-set accept** (per-item only);
  **no auto-apply** (the user accepts each suggestion).
- **No variations** (M4), **no quota tuning / abuse hardening** (M5).
- **No `Project` schema/migration change**, **no Konva 2D PNG export change**, **no `src/domain/` purity
  change** (the new `src/domain/ai/` modules stay pure).
- **No client-side API keys, no BYOK, no payments.** Admin (`/admin`) stays out of scope.
  EDA/GDSII/manufacturing remains permanently excluded.

## Testing Strategy

- **Pure (`src/domain/ai/`):** `deriveAiLayoutContext` (die shape + existing blocks as fractions, empty
  case); `resolveAiSuggestionBlock` across well-formed, unknown-type (→ `null`), and **adversarial**
  suggestions (out-of-bounds/oversized → clamped inside the die; sub-minimum size handled) — every
  accepted suggestion yields a domain-valid block or a no-op.
- **Store:** `editorStore.applyAiSuggestion` — a valid suggestion adds one clamped block as a single
  commit; `undo()` removes exactly that block; an unknown-type suggestion is a no-op (no commit, undo
  stack unchanged).
- **Server (fake provider, no network):** `suggest-layout` route — unauthenticated → `401`; authed under
  quota → `200` with a `{ suggestions }` array and exactly one `ai_prompt_log` row
  (`kind='suggest-layout'`); over quota → `429`; provider throw → `503`. The fake
  `generateLayoutSuggestions` is deterministic from context.
- **Anthropic adapter (SDK mocked):** `generateLayoutSuggestions` issues `claude-opus-4-8` with an
  `output_config.format` json_schema for the suggestions array; a refusal `stop_reason` throws. No real
  Anthropic calls in the suite.
- **Client (RTL):** `aiSuggestApi` error mapping; `AiLayoutSuggestionsPanel` — "Suggest improvements"
  populates the list, Accept calls `onApplyAiSuggestion` with the suggestion and removes the item, Reject
  removes the item without calling the callback, and 401/429/503/offline render inline messages without
  disabling the editor.
- **Gates:** `npm test` (client then server), `npm run build`, `npm run typecheck --workspace server`,
  `npm run lint` all green; confirm no API key appears in any client bundle or API response. Exercise the
  suggest → accept → undo flow in a browser after the frontend change.

## Milestone Gate

- The panel suggests new blocks for the current chip; Accept adds the block as one undoable commit and
  undo removes it; Reject leaves the project untouched; the fake provider pins the flow end to end.
- Adversarial suggestions never yield an invalid block (`resolveAiSuggestionBlock` drops/clamps); the
  refusal/error path degrades to an inline message with manual editing unaffected (local-first
  regression-free).
- `ANTHROPIC_API_KEY` server-only; Konva export + `Project` schema + `src/domain/` purity unchanged.
- All gates green; decisions/outcomes recorded in `implementation.md` + `CLAUDE.md`.
