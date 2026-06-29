# V10-M6 Look Presets Plan

## Scope

Implement V10-M6 as curated full-scene look presets that apply camera, lighting, and environment together.

This intentionally skips custom per-chip camera bookmark management. The v10 spec marks M6 as droppable and says "and/or" for looks/bookmarks, so the smaller preset path gives users one-click authored looks without schema expansion.

## Tasks

1. Add pure scene3d look preset data and tests.
   - Export stable preset ids, labels, and complete camera/lighting/environment settings.
   - Add a resolver that returns cloned settings so callers cannot mutate module-level presets.
   - Verify each preset can resolve through the existing `resolveScene3D` pipeline.

2. Add an editor store command for one undoable look application.
   - Apply camera, lighting, and environment in a single commit.
   - Preserve existing animation settings.
   - Avoid history entries for unchanged looks.

3. Wire editor-only showcase controls.
   - Add a compact look preset button group to the 3D showcase header.
   - Pass the new store command through `EditorPage` and `Chip3DPreviewToggle`.
   - Keep gallery/share showcases viewer-only unless editor callbacks are supplied.

4. Verify.
   - Run targeted RED/GREEN tests during implementation.
   - Run full `npm test`, `npm run build`, `npm run typecheck:server`, and the Three bundle check.
   - Browser smoke the editor 3D showcase preset controls.
