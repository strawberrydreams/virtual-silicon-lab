# v8-M5 — QA & Cost Hardening Design

> **Status:** approved design (brainstormed 2026-06-20). Final milestone of v8 "AI-Assisted Creation"
> (outline: `docs/superpowers/plans/2026-06-18-v8-ai-assisted-creation-roadmap.md`; foundation:
> `docs/superpowers/specs/2026-06-19-v8-m0-server-ai-foundation-design.md`). Closes v8 by hardening
> the AI surface built in M0–M4; no new user-facing AI feature. The next step after this spec is a
> bite-sized TDD plan (`docs/superpowers/plans/2026-06-20-v8-m5-qa-cost-hardening.md`).
> **Re-consult the `claude-api` skill before touching any `@anthropic-ai/sdk` code in the plan.**

## Goal

Close v8 by hardening the existing AI endpoints (`generate-draft`, `generate-copy`, `suggest-layout`,
`generate-variations`): bound abusive input, add an AI-specific burst rate-limit, give the owner
cost/usage visibility, prove the whole AI surface with one end-to-end fake-provider test, pass final
gates, and bump the version line. Editing stays 100% local-first; the AI surface degrades to normal
local editing when the server/provider is unavailable.

Milestone gate: `npm test` (incl. the server fake-provider suite) / `npm run build` / server
typecheck / lint all green; abusive input is rejected with `400` before any provider call or quota
log; the AI burst rate-limit and the shared 24h quota both hold; the owner can read aggregate AI usage
from an admin-only endpoint; local-first editing is regression-free; `ANTHROPIC_API_KEY` never reaches
the client bundle.

## Decisions (resolved at milestone start)

- **Prompt-abuse bounds = reject oversized with `400`.** Two module constants in
  `server/src/ai/routes.ts` — `MAX_PROMPT_LENGTH = 2000`, `MAX_CONTEXT_BLOCKS = 64` — gate every AI
  handler *after* the auth+quota guard but *before* `logPrompt`/the provider call. Oversized requests
  get `400 PAYLOAD_TOO_LARGE` and consume no quota and write no log row. The dashboard prompt textarea
  also gets `maxLength={2000}` (defense in depth + UX).
- **AI burst rate-limit = per-path overrides.** Four entries added to `SENSITIVE_RATE_LIMIT_OVERRIDES`
  in `server/src/config.ts` (`POST:/api/ai/<endpoint>` at `{ windowMs: 60_000, max: 10 }` = 10/min per
  IP). Config-only, reusing the existing override mechanism. The per-user 24h quota
  (`VSL_AI_DAILY_QUOTA`, default 20) stays the primary limit; this caps bursts. Rate limiting is
  production-only (`deps.rateLimit` unset in dev/test), so the E2E test is unaffected.
- **Cost monitoring = admin-only aggregate read, no migration.** A new pure-ish
  `summarizeAiUsage(db, { since, until })` aggregates the existing `ai_prompt_log`; a new
  `GET /api/ai/usage?windowHours=24` exposes it behind an **inline** admin guard (`getSessionUser` +
  `isAdminEmail`, 401/403). Placed under `/ai/` (not `/admin/`) and guarded inline to avoid overlap
  with the moderation `/admin/*` sub-app (the v4 contests lesson). No client/admin-UI change.
- **End-to-end test = server, fake provider, all four endpoints.** One integration test exercises
  signup → each AI endpoint → valid output, plus shared-quota enforcement and the new abuse bounds.
  Client save/edit stays covered by the existing M2/M4 store tests.
- **Version bump = `0.6 v8`.** README version line bumped at M5 close (matching v6 `0.4` / v7 `0.5`);
  `package.json` stays `1.0.0`.

## Architecture & Components

```text
server/src/ai/
  usage.ts            NEW  summarizeAiUsage(db, { since, until }): AiUsageSummary
                           (aggregate ai_prompt_log: totalCalls, distinctUsers, byKind)
  routes.ts           MOD  MAX_PROMPT_LENGTH/MAX_CONTEXT_BLOCKS bound checks (400 before log/provider)
                           on all 4 handlers; new GET /ai/usage (inline admin guard) -> summarizeAiUsage;
                           accept adminEmails from deps; widen fail() status union to include 403
  (quota.ts, config.ts in ai/ unchanged; provider/fake/anthropic unchanged)

server/src/
  config.ts           MOD  add 4 POST:/api/ai/* entries to SENSITIVE_RATE_LIMIT_OVERRIDES (10/min/IP)

server/test/
  aiUsage.test.ts     NEW  summarizeAiUsage aggregation (counts per kind, distinct users, window)
  aiEndToEnd.test.ts  NEW  signup -> all 4 endpoints -> valid output + quota 429 + abuse-bound 400s
  (aiRoutes.test.ts may gain the abuse-bound + usage-guard cases, or they live in aiEndToEnd.test.ts)

src/features/projects/
  ProjectDashboard.tsx  MOD  maxLength={2000} on the AI prompt input (defense in depth + UX)

README.md             MOD  version line -> 0.6 v8
```

### Data flow

- **Abuse bound:** request → `requireUserWithinQuota` (401/429) → parse body → **bound check**
  (`prompt.length > MAX_PROMPT_LENGTH` or coerced `blocks`/`blockTypes` length `> MAX_CONTEXT_BLOCKS`
  → `400 PAYLOAD_TOO_LARGE`, no log, no provider) → `logPrompt` → provider → existing mapping.
- **Burst limit:** the app-level rate-limit middleware (production) applies the new
  `POST:/api/ai/<endpoint>` override by `${method}:${path}` → `429 RATE_LIMITED` with `Retry-After`.
- **Cost read:** `GET /api/ai/usage?windowHours=H` → inline admin guard (signed cookie →
  `getSessionUser` → `isAdminEmail`; else 401/403) → `summarizeAiUsage(db, { since: now-H*3600_000,
  until: now })` → `{ since, until, totalCalls, distinctUsers, byKind }`.

### Component boundaries

- **`summarizeAiUsage`** — input: a db handle + a time window; output: aggregate counts. Reads
  `ai_prompt_log` only; unit-tested by inserting rows and asserting totals/per-kind/distinct-users.
- **Bound constants + checks** — owned by `routes.ts`; the single place abusive payloads are rejected.
  Each check runs before `logPrompt`, so abuse never consumes quota or pollutes the log.
- **`GET /ai/usage`** — admin-only, additive, read-only; no write path, no migration. Its inline guard
  is independent of the moderation `/admin/*` middleware.
- **Rate-limit override** — config data only; the existing middleware enforces it unchanged.

## Schema & Config

- **No migration, no schema bump.** `CURRENT_SCHEMA_VERSION` stays `5`. `ai_prompt_log` (from M0's
  `013_ai`) is reused unchanged as both the quota basis and the cost/abuse data source; no new column,
  no new table.
- **Config:** `VSL_AI_DAILY_QUOTA` (default 20, shared) and all M0 AI env vars are unchanged. The AI
  rate-limit overrides are compiled into `SENSITIVE_RATE_LIMIT_OVERRIDES` (no new env var). The bound
  constants (`MAX_PROMPT_LENGTH`, `MAX_CONTEXT_BLOCKS`) are module constants (not env-configurable;
  YAGNI). `ANTHROPIC_API_KEY` stays server-only. No Konva 2D PNG export change.

## Non-Goals / Out of Scope

- **No token-level `$` capture** (provider-specific; the fake has no token counts) — deferred.
- **No `ai_prompt_log` pruning/retention** — the quota query reads only the trailing 24h and is
  indexed; old rows are the abuse/cost audit trail.
- **No admin-UI surface** for the usage endpoint (v8 keeps the `/admin` client page out of scope); the
  owner consumes the JSON endpoint.
- **No quota-model redesign** — stays one shared per-user/24h counter, one unit per call.
- **No new AI feature**, **no `Project` schema/migration change**, **no Konva export change**, **no
  `src/domain/` change** (M5 is server + a one-line client `maxLength`). **No client API keys, no BYOK,
  no payments.** EDA/GDSII/manufacturing permanently excluded.

## Testing Strategy

- **Server unit (`summarizeAiUsage`):** insert `ai_prompt_log` rows across kinds/users/timestamps;
  assert `totalCalls`, `distinctUsers`, and `byKind` for a window, and that rows outside the window are
  excluded.
- **Server routes / E2E (fake provider, no network):**
  - Abuse bounds: an over-`MAX_PROMPT_LENGTH` prompt → `400`; an over-`MAX_CONTEXT_BLOCKS`
    context (`blockTypes`/`blocks`) → `400`; assert no `ai_prompt_log` row is written and quota is not
    consumed for the rejected request.
  - `GET /api/ai/usage`: unauthenticated → `401`; authed non-admin → `403`; admin → `200` with the
    aggregate shape reflecting prior logged calls.
  - End-to-end: signup → `generate-draft` / `generate-copy` / `suggest-layout` / `generate-variations`
    each `200` with valid output; `ai_prompt_log` accrues the expected rows; the shared 24h quota
    returns `429` once exhausted (`aiDailyQuota` set low).
- **Config:** the four `POST:/api/ai/*` overrides are present in `SENSITIVE_RATE_LIMIT_OVERRIDES`
  (asserted via a config unit test, or exercised by enabling `deps.rateLimit` and hitting an AI
  endpoint past the burst cap → `429`).
- **Client:** `ProjectDashboard` AI prompt input carries `maxLength={2000}` (RTL attribute assertion);
  existing generate-flow tests stay green.
- **Gates:** `npm test` (client then server), `npm run build`, `npm run typecheck --workspace server`,
  `npm run lint` all green; confirm no API key appears in any client bundle or API response.

## Milestone Gate

- Abusive input (over-long prompt / oversized context) is rejected with `400` before any provider call
  or quota log; the AI burst rate-limit override and the shared 24h quota both hold; the fake provider
  pins the full AI surface end to end.
- The owner can read aggregate AI usage (`GET /api/ai/usage`) restricted to admins (401/403/200).
- `ANTHROPIC_API_KEY` server-only; `Project` schema + Konva export + `src/domain/` unchanged;
  local-first editing regression-free.
- Version line bumped to `0.6 v8`; all gates green; decisions/outcomes recorded in `implementation.md`
  + `CLAUDE.md`. This is the last planned v8 milestone; public launch remains a separate gate.
