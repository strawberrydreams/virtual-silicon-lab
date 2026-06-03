# Presets And Remixing (Milestone 4) — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Let a user start from one of six curated, visually distinct chips and remix it into an
independent editable local project in one click, without mutating the source.

**Outcome:** six immutable curated blueprints materialize into fresh ordinary `Project` JSON;
`projectStore.remixPreset()` persists an independent editable local project; the dashboard shows
lightweight CSS summary cards (not six live Konva stages). Browser-verified: blank start preserved;
AURORA/N-9/M-7 open in the editor; an edited remix survives refresh while a fresh remix still starts
from the original, proving source immutability.

**Key decisions:** presets are not a separate persisted model — remixing materializes the existing
`Project` shape so editor/autosave/export all work unchanged; each remix gets fresh project/block/
decoration IDs and deep-copied arrays; no schema change; AURORA reuses `createHeroChip`.

**Main files:** `src/presets/{presetCatalog,presetFactory}.ts`, `src/features/projects/PresetCard.tsx`,
`src/stores/projectStore.ts` (`remixPreset`).
