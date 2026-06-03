# Visual System (Milestone 3) — Summary

✅ Done. Condensed; full bite-sized TDD steps in git history.

**Goal:** Give every die a coherent, reference-quality look — five one-click themes, Konva-rendered
glow/gradients/decorations, and the first hero chip — so the editor reads as an Apple-keynote / Sci-Fi
product shot, not an EDA tool.

**Outcome:** pure `src/themes/` boundary (token catalog for neon/retro/military/keynote/mono +
gradient builders + `resolveBlockStyle`/`resolveDecorationStyle`); theme-driven die/grid/blocks/glow
with procedural memory texture; decorations (neon line/warning/label/sci-fi, additive blend);
`createHeroChip` (composition A, AURORA C-1); minimal `stage.toDataURL` PNG smoke test. All three M3
gates browser-verified against the M0 board.

**Key decisions:** `project.theme` is the render-time source of truth (no migration — a theme switch
recolors the whole die); `die.background` is reserved for presets; every export-visible effect is a
Konva node setting (never DOM/CSS); texture is procedural (no bundled image assets); pure style
resolvers keep components thin.

**Main files:** `src/themes/{themeTokens,gradients,resolveStyle}.ts`,
`src/features/editor/canvas/{ChipStage,blockTexture}.ts`, `src/domain/heroChip.ts`.
