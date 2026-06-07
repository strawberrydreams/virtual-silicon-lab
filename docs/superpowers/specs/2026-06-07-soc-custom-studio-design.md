# SoC Custom Studio Design

## Purpose

v2 is not complete until the editor moves beyond an EDA-like freeform block canvas. The new default editor identity is **Chip Custom Studio**: a playful, visual SoC assembly surface where users can build realistic or impossible chips, decorate them with stickers and sprays, and export the decorated result.

The editor should still produce premium chip press visuals, but it should not require real semiconductor design knowledge.

## Product Decisions

- Default editor mode is **Global Reflow Studio**.
- Users add and move tiles by click or drag. They do not need to manually align every tile.
- Moving or inserting a tile can shift the entire die layout, similar to rearranging iPhone app icons.
- Tile detail is **semi-automatic**. Users choose and place tiles, then adjust a small set of detail controls such as density, route intensity, and contact style.
- Stickers and sprays are first-class chip design elements, not editor-only decoration.
- Stickers, sprays, global reflow layout, and semi-automatic tile details must appear in die-only and poster PNG export.
- The right editor rail shows a generated Fake Spec derived from the chip design. Manual spec editing can remain as an override, but generated spec is the default story.

## Data Model Direction

The project remains a single persisted JSON document, but the schema may evolve. The earlier v2 rule "do not change single JSON schema" is revised to:

> Keep one local-first Project JSON document, but allow `schemaVersion` changes and migrations when the editor model needs explicit studio data.

Target shape:

```ts
type Project = {
  schemaVersion: 2
  blocks: Block[]
  decorations: Decoration[]
  studio: StudioState
}

type StudioState = {
  layoutMode: 'global-reflow'
  detailMode: 'semi-auto'
  tileSettings: {
    detailDensity: number
    routeIntensity: number
    contactStyle: 'minimal' | 'balanced' | 'dense'
  }
  sprays: StudioSpray[]
  stickers: StudioSticker[]
}
```

Existing projects migrate to schema v2 with `studio` defaults. Existing `blocks` remain the tile source of truth so old presets and exports still have a clear path forward.

## Global Reflow Behavior

Global reflow is a deterministic layout projection over `Project.blocks`.

- The user action supplies an insertion target: block id, pointer position, and optional desired size.
- The engine computes a tile order from the target position and current block positions.
- Tiles are packed onto a die grid without overlap.
- Reflow is global: compute, memory, I/O, and fantasy tiles may all move when a new tile is inserted.
- The engine preserves die bounds and clamps tile sizes if needed.
- The first implementation should use a predictable grid packer, not physics.

The target is a stable and understandable motion model. It should feel dynamic, but the saved result should be deterministic and testable.

## Tile Visual Detail

Each tile renders as a chip sub-region:

- Macro: tile type, size, category, and label.
- Meso: type-specific patterns such as compute partitions, memory stripes, analog lanes, fantasy glow fields.
- Micro: grid, contacts, tiny route hints, and density texture.
- Style modifiers: page theme, chip theme, stickers, and spray mood can tint or intensify detail.

This is handled in Konva through `ChipArtwork` so editor, die-only export, and poster export share the same visual source.

## Sticker And Spray Model

Stickers are positioned design elements on the die or on a tile:

- badge stickers such as star, lightning, mascot mark, warning label
- text label stickers
- style effect: boost generated style/fantasy signals and add visible artwork

Sprays are soft color/mood overlays:

- color
- position
- radius
- intensity
- blend style

Sprays affect both the rendered artwork and generated spec metrics.

## Generated Fake Spec

Generated Fake Spec is derived from project design signals:

- tile mix: real/fantasy, compute, memory, I/O, fabric
- density: total block area versus die area
- complexity: number of tiles, global reflow pressure, route density
- stickers: overclock, mascot, warning, brand labels
- sprays: color mood and intensity

Initial generated metrics:

- Compute
- Bandwidth
- Fantasy
- Stability
- Style

Generated text should be intentionally fictional when fantasy tiles or heavy decoration are present. The app should still support existing fake spec fields for export text compatibility.

## Editor UI Direction

Left rail:

- Tiles
- Stickers
- Spray colors/tools

Center:

- Die stage
- Global reflow mode indicator
- Direct click/drag tile manipulation
- Visible tile detail, stickers, sprays

Right rail:

- Generated Fake Spec
- Small semi-auto detail controls
- Optional manual override path
- Export controls

## Testing Strategy

- Pure unit tests for schema migration.
- Pure unit tests for global reflow: no overlap, bounds, deterministic order, insertion causes global movement.
- Pure unit tests for generated spec from tile/sticker/spray signals.
- Render/component tests for editor rail mode changes and generated spec visibility.
- Browser QA for the default editor flow and exported visual parity once UI layers are wired.

## Non-goals For First Slice

- No physics engine.
- No true 3D.
- No mobile editor.
- No backend or shared gallery.
- No fully manual micro-route editor.
