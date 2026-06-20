# v8-M0 — Server AI Foundation Design

> **Status:** approved design (brainstormed 2026-06-19). First milestone of v8 "AI-Assisted Creation"
> (outline: `docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`). Grounded against the
> `claude-api` skill (current model IDs, structured-output syntax, SDK usage). The next step after this
> spec is a bite-sized TDD plan (`docs/superpowers/plans/2026-06-19-v8-m0-server-ai-foundation.md`).
> **Re-consult the `claude-api` skill before writing any `@anthropic-ai/sdk` code in the plan.**

## Goal

Lay the server-side AI foundation: a **provider abstraction** (a thin real `@anthropic-ai/sdk` adapter
plus a deterministic fake), the **`012_ai` schema** (per-user daily quota + append-only prompt log),
**auth + quota + rate-limit guards**, and a **pure intermediate-shape → `src/domain/` factory mapping
contract** that guarantees a valid `Project` from any AI output. **No user-facing generation yet** — no
editor UI, no "generate" button. The milestone gate runs entirely on the **fake provider**.

Milestone gate: with the fake provider, quota/auth/rate-limit guards behave correctly and the mapping
*always* yields a valid `Project`; the `ANTHROPIC_API_KEY` is never reachable client-side; a missing key
or provider-down state degrades to a clean error with local editing unaffected; `npm test` (incl. the
server fake-provider suite), `npm run build`, server typecheck, and lint are green.

## Decisions (resolved at milestone start)

- **M0 scope = interface + fake + thin real adapter.** The real Anthropic adapter is wired and selectable
  by config, but it is not exercised by a product surface in M0; the first user-facing feature is M1.
- **Cost levers = per-user daily quota, env-configurable.** A low default daily cap per user
  (`VSL_AI_DAILY_QUOTA`, default `20`) + usage derived from an append-only prompt log, behind auth and the
  existing rate-limiter. A global org-wide cap and quota tuning are deferred to M5.
- **Intermediate shape = minimal but real.** `AiChipDraft` carries a die shape + a list of blocks
  (type/label/relative position+size), mapped through the existing domain factories with clamping and
  z-order enforcement. M2 enriches the shape; M0 proves the valid-project guarantee on a realistic shape.
- **Model + structured outputs (from `claude-api`).** Default `claude-opus-4-8` via the official
  `@anthropic-ai/sdk`; constrain output with `output_config: { format: { type: "json_schema", schema } }`
  (every object `additionalProperties: false`). Structured outputs enforce **shape only** — not numeric
  `minimum`/`maximum`, string lengths, or recursion — so **all domain invariants (die-clamp, coordinate
  bounds, z-order, `schemaVersion`) are enforced in the `src/domain/` factory mapping, never in the AI
  schema.** This is exactly why the factory stays the source of truth.

## Architecture & Components

```text
src/domain/ai/                         (pure — NO React/Konva/Zustand/IndexedDB/AI/network imports)
  aiChipDraft.ts        NEW  AiChipDraft type (die shape + blocks: type/label/relative x,y,w,h)
  mapAiDraftToProject.ts NEW  mapAiDraftToProject(draft, opts): Project — via existing factories,
                              clamps blocks into die bounds, assigns z-order, sets schemaVersion
  *.test.ts             NEW  unit tests: adversarial/out-of-bounds drafts → valid clamped Project

server/src/ai/                         (reuses src/domain/ai via the @domain/* alias)
  provider.ts           NEW  AiProvider interface: generateChipDraft(input): Promise<AiChipDraft>
  fakeProvider.ts       NEW  deterministic fake (seeded draft); used in dev/test + the gate
  anthropicProvider.ts  NEW  thin real adapter (@anthropic-ai/sdk, claude-opus-4-8, json_schema)
  quota.ts              NEW  per-user daily quota check + usage count (from ai_prompt_log)
  service.ts            NEW  orchestrates: auth'd user → quota check → provider → log → map → draft
  routes.ts             NEW  POST /api/ai/generate-draft (auth + quota + rate-limit; returns draft, unsaved)
  config.ts             NEW  resolveAiConfig(env): provider, model, apiKey, dailyQuota
server/src/migrations/   012_ai          NEW  ai_prompt_log (append-only; CASCADE on user delete)
```

### Data flow (foundation API, exercised by the fake in M0)

`POST /api/ai/generate-draft` → `getSessionUser` (401 if unauthenticated) → quota guard (429 if over
`VSL_AI_DAILY_QUOTA` today) → configured `AiProvider.generateChipDraft(input)` (fake in dev/test) →
append a row to `ai_prompt_log` → `mapAiDraftToProject(draft)` → respond with the derived **draft
`Project` JSON (not persisted; the client would save it locally, like v3 remix-import)**. No row is
written to `projects`/`published_chips`; local-first is untouched.

### Component boundaries

- **`mapAiDraftToProject`** — input: an `AiChipDraft` (+ options like a name); output: a valid `Project`.
  Pure, domain-only, unit-tested directly. The single guarantor that invalid AI output cannot become a
  persisted/edited project. Depends only on existing domain factories.
- **`AiProvider`** — input: a generation request; output: an `AiChipDraft`. Two implementations (fake,
  anthropic) selected by `resolveAiConfig`. The real adapter owns all `@anthropic-ai/sdk` usage and is the
  only file that imports it.
- **`quota` / `service` / `routes`** — server-only; reuse v3 `getSessionUser` and the v5 rate-limiter.
  The API key lives only in server env (`anthropicProvider`); it is never serialized to any client response.

## Schema & Config

- **`012_ai` migration:** `ai_prompt_log(id, user_id, kind, prompt, created_at)` — append-only, indexed by
  `(user_id, created_at)`, `ON DELETE CASCADE` on `users`. The per-user daily quota is derived by counting
  today's rows for the user (no separate counter table in M0). Bumps the server migration runner only;
  **no `Project` `schemaVersion` change** (AI output flows through the *existing* schema).
- **Config (env, via `resolveAiConfig`):**
  - `VSL_AI_PROVIDER` — `fake` (default) | `anthropic`.
  - `ANTHROPIC_API_KEY` — required only when `VSL_AI_PROVIDER=anthropic`; absent ⇒ AI endpoints return a
    clean `503`-style error, server still boots, local editing unaffected.
  - `VSL_AI_MODEL` — default `claude-opus-4-8`.
  - `VSL_AI_DAILY_QUOTA` — default `20`.

## Non-Goals / Out of Scope

- **No user-facing generation** — no editor UI, no "generate" control, no client AI calls beyond the
  foundation endpoint's own tests. (M1 builds the first feature: naming + fake-spec copy.)
- **No prompt→layout product feature** (M2), **no layout suggestions** (M3), **no variations** (M4),
  **no quota tuning / abuse hardening** (M5).
- **No `Project` schema/migration change**, **no Konva 2D PNG export change**, **no `src/domain/` purity
  change** (the new `src/domain/ai/` stays pure).
- **No client-side API keys, no bring-your-own-key, no payments.**
- **EDA/GDSII/manufacturing remains permanently excluded.**

## Testing Strategy

- **Pure (`src/domain/ai/`):** `mapAiDraftToProject` unit-tested across well-formed, empty, and
  **adversarial** drafts (blocks outside die bounds, overlapping, oversized, unknown block types) — every
  case yields a domain-valid `Project` (die-clamp holds, z-order assigned, `schemaVersion` correct). This
  is the milestone's core guarantee.
- **Server (fake provider, no network):** quota under-limit → `200` with a draft; over-limit → `429`;
  unauthenticated → `401`; each call appends exactly one `ai_prompt_log` row; the returned draft is a
  valid `Project`; `resolveAiConfig` defaults to the fake provider and never throws on a missing key.
- **No real Anthropic calls in the test suite** — the anthropic adapter is covered by a typed unit test
  with the SDK mocked (request shape: model `claude-opus-4-8`, `output_config.format` json_schema), not by
  a live request.
- **Gates:** `npm test` (client then server), `npm run build`, `npm run typecheck --workspace server`,
  `npm run lint` all green; confirm no API key appears in any client bundle or API response.

## Milestone Gate

- Fake-provider path: auth/quota/rate-limit guards correct; mapping always yields a valid `Project`.
- Real adapter wired + config-selectable; missing key degrades cleanly; server still boots.
- `ANTHROPIC_API_KEY` server-only; local-first + Konva export + `src/domain/` purity unchanged.
- All gates green; decisions/outcomes recorded in `implementation.md` + `CLAUDE.md`.
