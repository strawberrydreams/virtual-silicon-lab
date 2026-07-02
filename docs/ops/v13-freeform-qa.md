# v13 Freeform QA Release Pack

Version line: **0.11 v13**. This pack closes the Freeform milestone and documents the final QA gate
for the editor, shared renderers, 3D showcase, and export surfaces.

## Scope

- Freeform conversion: convert an existing die shape into a normalized straight-line freeform polygon
  from the editor toolbar.
- Vertex add / move / delete: edit the outline with visible vertex handles and edge targets, then
  confirm undo/redo preserves the same polygon state.
- Block re-clamp: after a freeform vertex edit, existing blocks stay inside the edited outline or are
  moved back inside by the shared clamp path.
- 2D rendering: the editor canvas and offscreen export stages use the same freeform outline.
- 3D showcase: freeform projects extrude through the shared 3D footprint model.
- Die PNG: die-only export renders the freeform outline at the established pixel ratio.
- Poster PNG: all poster formats render the same freeform outline through the shared artwork path.
- MP4 export: the turntable recorder receives the unchanged freeform polygon model.
- No server or sync change: v13 does not add routes, SQLite migrations, publish schema changes, or sync
  engine behavior.

## Manual QA Checklist

1. Start a desktop project from a preset and open the editor.
2. Click `Freeform` and verify the selected die converts without losing blocks or theme settings.
3. Drag one vertex handle, add a vertex from an edge target, and delete one vertex while keeping at
   least three vertices.
4. Move a block near the edited edge, change the outline again, and verify Block re-clamp keeps the
   block inside the die.
5. Open the 3D showcase and verify the chip uses the edited freeform footprint rather than the source
   preset shape.
6. Verify Die PNG, Poster PNG, and MP4 export controls remain available for the same project.
7. Confirm the browser console has no runtime errors during the flow.

## Regression Gates

- `npm run test:client`
- `npm run build`
- `npm test`

The full release gate should also record the known lint baseline separately if unrelated pre-existing
lint failures are still present outside the v13-touched files.
