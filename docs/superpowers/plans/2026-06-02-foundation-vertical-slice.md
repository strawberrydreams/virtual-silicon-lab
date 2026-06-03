# Foundation Vertical Slice (Milestone 1) — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** A working no-login vertical slice — create a project, add real + fantasy blocks to a
rectangular die, persist locally, and restore on refresh.

**Outcome:** Vite + React + TS + Tailwind + Vitest + Git scaffold; versioned `Project` JSON
(`schemaVersion`) + migration entry point; IndexedDB repository with localStorage fallback; project
create/list/duplicate/delete; editor route with a rectangular die; real/fantasy block palette; add and
drag blocks clamped inside die bounds; refresh persistence browser-verified.

**Key decisions:** serializable single-JSON `Project` is the source of truth from day one; the domain
layer stays framework-free; storage is a `ProjectRepository` interface (IndexedDB primary, localStorage
fallback) so the editor never talks to storage directly; geometry stays unit-testable without canvas.

**Main files:** `src/domain/{project,projectFactory,projectMigration,blockFactory}.ts`, `src/storage/`,
`src/stores/projectStore.ts`, `src/features/projects/`, `src/features/editor/`.
