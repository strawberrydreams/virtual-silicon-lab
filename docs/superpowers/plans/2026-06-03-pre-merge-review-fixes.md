# Pre-Merge Review Fixes — Summary

Full-branch review of `main..feature/foundation-slice` (2026-06-03): unanimous "merge with fixes",
**no Critical issues**. The Important findings were fixed (TDD; full steps in git history). Minor items
are backlogged below.

## Fixed (Important)

1. **Missing `/editor/:id` infinite loading** → `EditorRoute` is tri-state (`loading | Project |
   missing`); a missing/deleted id shows a "Project not found" view + dashboard link; a `get()`
   rejection is handled. Routing tests added.
2. **Persistence robustness** → `migrateProject` validates project shape; `migrateProjects()` skips
   corrupt records so one bad blob can't blank the dashboard; `resilientProjectRepository` logs a
   primary failure and sticks to the localStorage fallback for the session (no stale-read divergence);
   localStorage save logs quota failures.
3. **Poster share** → `dataUrlToFile` guards malformed data URLs; `shareFileOrDownload` treats a
   cancelled share (`AbortError`) as done (no extra download) and falls back to download only on a real
   failure; `ExportPanel.sharePoster` degrades to a direct download.
4. **Block↔decoration z-order** → decorations are an intentional always-on-top overlay; documented in
   `ChipArtwork` (no behavior change).

## Minor backlog (non-blocking)

- Spec edits create one undo entry per keystroke (consider coalescing).
- Landing "Open Projects (N)" flashes 0 before the async load resolves.
- `sciFiObject` decoration not exposed in the toolbar (intentional for v1?).
- Die-only PNG has transparent corners for circle/hexagon dies (confirm intent / add a backdrop).
- `DieShape`/`clipForDie` derive circle/hexagon radius from width only (latent if non-square).
- Bundle > 500 kB (post-MVP Konva code-split).
- Domain factories use `crypto.randomUUID()`/`Date.now()` default params (cross-platform globals).
