# v8-M1 — AI Naming + Fake-Spec Copy Design

> **Status:** approved design (brainstormed 2026-06-19). Second milestone of v8 "AI-Assisted Creation"
> (outline: `docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`; foundation:
> `docs/superpowers/specs/2026-06-19-v8-m0-server-ai-foundation-design.md`). Builds on the M0 server AI
> foundation (provider abstraction, `ai_prompt_log`, per-user 24h quota, `POST /api/ai/generate-draft`).
> The next step after this spec is a bite-sized TDD plan
> (`docs/superpowers/plans/2026-06-19-v8-m1-ai-naming-spec-copy.md`).
> **Re-consult the `claude-api` skill before writing any `@anthropic-ai/sdk` code in the plan.**

## Goal

The first **user-facing** AI feature: given the chip the user is editing, generate a surreal product
name, tagline, and fake spec sheet, surfaced as a **preview → Apply/Discard** control in the editor.
Generation is **zero-input** — the user clicks "Generate from this chip" and the chip's own context
(theme, die shape, block types) drives the copy; there is no prompt textarea in M1.

The applied result writes only the existing `FakeSpec` via the existing `setSpec` editor command (one
undoable edit). The `FakeSpec.brand`/`series` carry the "product name" and `FakeSpec.description` carries
the "tagline", so a single `FakeSpec` covers name + tagline + spec with **no schema change and no new
editor command**.

Milestone gate: generated copy applies cleanly into `FakeSpec`; with the server/provider absent (or the
user signed out / over quota) the editor shows a friendly inline message and manual spec editing is
fully unaffected; the fake provider pins the flow end to end; `npm test` / `npm run build` / server
typecheck / lint are green; `ANTHROPIC_API_KEY` never reaches the client bundle.

## Decisions (resolved at milestone start)

- **Input model = chip-context only (zero text input).** A single "Generate from this chip" button.
  The client derives a small `AiChipContext` (`theme`, `dieShape`, `blockTypes`, optional `name`) from
  the live project and sends it; the AI uses it as flavor. This is the smallest user-facing surface —
  matching the roadmap's "smallest surface first" framing for M1. An optional vibe prompt is deferred.
- **Apply scope = `FakeSpec` only, via `setSpec`.** `brand`/`series` = product name, `description` =
  tagline. No `Project.name` change, no new command, no schema change. The apply is one undoable commit.
- **Review flow = preview, then Apply/Discard.** Generation populates a small preview panel; the user
  reviews the surreal copy and chooses Apply (overwrite the current `FakeSpec`) or Discard (no change).
- **Valid-output guarantee (M0 mirror).** Exactly as M0 maps `AiChipDraft → Project` through a pure
  `src/domain/` factory, M1 maps `AiSpecDraft → FakeSpec` through a pure factory. Structured outputs
  enforce **shape only** (no numeric `minimum/maximum`, no string length, no array length), so all
  coercion/clamping/defaults live in `mapAiSpecDraftToFakeSpec`, never in the AI schema.
- **Quota = shared with M0.** The 24h per-user quota counts all `ai_prompt_log` rows regardless of kind;
  copy generation logs `kind='generate-copy'`. **No new migration** — `ai_prompt_log` already exists.

## Architecture & Components

```text
src/domain/ai/                         (pure — NO React/Konva/Zustand/IndexedDB/AI/network imports)
  aiSpecDraft.ts          NEW  AiSpecDraft (loose FakeSpec: all fields optional/string-ish)
                               + AiChipContext ({ name?, theme, dieShape, blockTypes: string[] })
  deriveAiChipContext.ts  NEW  deriveAiChipContext(project): AiChipContext — pure derivation
  mapAiSpecDraftToFakeSpec.ts NEW  mapAiSpecDraftToFakeSpec(draft): FakeSpec — coerce/clamp/default;
                               the M1 valid-output guarantee
  *.test.ts               NEW  adversarial/missing/oversized drafts -> always a valid FakeSpec

server/src/ai/                         (reuses src/domain/ai via the @domain/* alias)
  provider.ts             MOD  AiProvider gains generateSpecCopy(input): Promise<AiSpecDraft>
  fakeProvider.ts         MOD  deterministic generateSpecCopy (context-derived; gate/dev/test)
  anthropicProvider.ts    MOD  generateSpecCopy via output_config.format json_schema (claude-opus-4-8)
  routes.ts               MOD  POST /api/ai/generate-copy (auth + shared quota; returns { spec })

src/features/specs/
  aiCopyApi.ts            NEW  generateCopy(context): Promise<FakeSpec> (mirrors publishApi errors)
  AiSpecPanel.tsx         NEW  "Generate from this chip" -> preview -> Apply (onSetSpec) / Discard
  *.test.tsx / *.test.ts  NEW  api error mapping; panel generate/preview/apply/discard/error states
src/features/editor/
  EditorInspectorRail.tsx MOD  mount AiSpecPanel above FakeSpecForm (reuses project + onSetSpec)
```

### Data flow

`AiSpecPanel` "Generate" → `deriveAiChipContext(project)` → `aiCopyApi.generateCopy(context)` →
`POST /api/ai/generate-copy { context }` → `getSessionUser` (401 if unauthenticated) → shared quota
guard (429 if over `VSL_AI_DAILY_QUOTA` in the trailing 24h) → `logPrompt(kind='generate-copy')`
(logged **before** the provider call so failed/abused calls still count) → configured
`AiProvider.generateSpecCopy({ context })` (fake in dev/test; 503 on throw) →
`mapAiSpecDraftToFakeSpec(draft)` → respond `{ spec: FakeSpec }`. The panel shows the spec as a preview;
**Apply** calls `onSetSpec(spec)` (one undoable commit), **Discard** drops it. No row is written to
`projects`/`published_chips`; local-first is untouched.

### Component boundaries

- **`deriveAiChipContext`** — input: a `Project`; output: a minimal `AiChipContext`. Pure, domain-only,
  unit-tested. Keeps the project→context derivation out of React and trivially testable.
- **`mapAiSpecDraftToFakeSpec`** — input: an `AiSpecDraft`; output: a valid `FakeSpec`. Pure,
  domain-only, the single guarantor that adversarial AI copy cannot produce an invalid `FakeSpec`
  (string trim + length caps, `cores` → integer ≥ 0 with an upper clamp, `features` → bounded array of
  trimmed/length-capped strings, missing fields → defaults). Depends on nothing but `FakeSpec`.
- **`AiProvider.generateSpecCopy`** — input: `{ context }`; output: `AiSpecDraft`. Two implementations
  (fake, anthropic) selected by the existing `resolveAiConfig` wiring. The anthropic adapter owns all
  `@anthropic-ai/sdk` usage and is the only file importing it; the API key stays server-only.
- **`aiCopyApi` / `AiSpecPanel`** — client-only. The panel is purely additive: it never blocks
  `FakeSpecForm`. Every failure path (offline, 401, 429, 503) renders an inline message and leaves
  manual editing untouched.

## Schema & Config

- **No migration.** `ai_prompt_log` (M0's `013_ai`) already stores `(id, user_id, kind, prompt,
  created_at)`; copy generation reuses it with `kind='generate-copy'`. No `Project` `schemaVersion`
  change (`FakeSpec` is reused unchanged).
- **Config (unchanged from M0):** `VSL_AI_PROVIDER` (`fake` default | `anthropic`), `ANTHROPIC_API_KEY`
  (server-only; absent ⇒ copy endpoint returns a clean 503-style error, server still boots), `VSL_AI_MODEL`
  (default `claude-opus-4-8`), `VSL_AI_DAILY_QUOTA` (default `20`, shared across all AI kinds).

## Non-Goals / Out of Scope

- **No vibe prompt / freeform text input** in M1 (chip-context only; an optional prompt is a later add).
- **No `Project.name` rename**, no new editor command, no `Project`/`FakeSpec` schema or migration change.
- **No prompt→layout generation** (M2), **no layout suggestions** (M3), **no variations** (M4),
  **no quota tuning / abuse hardening** (M5).
- **No Konva 2D PNG export change**, **no `src/domain/` purity change** (`src/domain/ai/` stays pure).
- **No client-side API keys, no bring-your-own-key, no payments.** Admin (`/admin`) stays out of scope.
- **EDA/GDSII/manufacturing remains permanently excluded.**

## Testing Strategy

- **Pure (`src/domain/ai/`):** `deriveAiChipContext` (theme/die/block-type derivation, dedup/empty
  cases); `mapAiSpecDraftToFakeSpec` across well-formed, empty/missing-field, and **adversarial** drafts
  (over-long strings, huge `features` arrays, non-integer/negative `cores`, wrong types) — every case
  yields a valid `FakeSpec`. This is the milestone's core guarantee.
- **Server (fake provider, no network):** `generate-copy` route — unauthenticated → `401`; authed under
  quota → `200` with a valid `FakeSpec` and exactly one new `ai_prompt_log` row (`kind='generate-copy'`);
  over quota → `429`; provider throw → `503`. Fake `generateSpecCopy` is deterministic from context.
- **Anthropic adapter (SDK mocked):** `generateSpecCopy` issues `claude-opus-4-8` with an
  `output_config.format` json_schema and parses the structured draft; a refusal `stop_reason` throws.
  **No real Anthropic calls in the suite.**
- **Client (RTL):** `aiCopyApi` error mapping (offline → `ServerUnreachableError`, `{error}` → typed
  error); `AiSpecPanel` — generate populates a preview, Apply calls `onSetSpec` with the returned spec,
  Discard leaves it unchanged, and 401/429/503/offline render inline messages without disabling
  `FakeSpecForm`.
- **Gates:** `npm test` (client then server), `npm run build`, `npm run typecheck --workspace server`,
  `npm run lint` all green; confirm no API key appears in any client bundle or API response. Exercise the
  editor accept/apply flow in a browser after the frontend change.

## Milestone Gate

- Generated copy applies cleanly into `FakeSpec` via `setSpec` (one undoable commit), preview/Apply/Discard
  behaves; the fake provider pins the flow end to end.
- Server/provider absent, signed out, or over quota ⇒ friendly inline message, manual spec editing fully
  unaffected (local-first regression-free).
- `ANTHROPIC_API_KEY` server-only; Konva export + `FakeSpec`/`Project` schema + `src/domain/` purity
  unchanged.
- All gates green; decisions/outcomes recorded in `implementation.md` + `CLAUDE.md`.
