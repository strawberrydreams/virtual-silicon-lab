# V2 Style Direction

Implementation rules for page themes, editor layout, chip rendering, and poster formats, derived
from `docs/reference/v2-visual-audit.md`. Goal: a premium chip visual lab where editing happens in
a cinematic but practical chip stage, and exports could plausibly sit beside the `images/` press
references.

## Theme Model

v2 has two separate theme layers:

- **Page theme:** app shell, landing, dashboard, editor chrome, panels, stage environment. Values:
  `laboratory`, `anime`, `space`. No project schema migration; stored as app preference outside the
  project, with `laboratory` fallback.
- **Chip theme:** existing project-level chip styling (`neon`, `retro`, `military`, `keynote`,
  `mono`; see `docs/reference/visual-direction.md`). Stays with the project JSON.

## Page Theme Tokens

Every page theme exposes the same token keys so React/CSS code switches themes without branching:

- `background`: app background, radial/linear accent, depth layer.
- `surface`: panel base, raised panel, inset panel.
- `border`: normal, strong, glow edge.
- `text`: primary, secondary, muted, inverse.
- `accent`: primary, secondary, warning, success.
- `glow`: soft, hard, horizon, selection.
- `focus`: outline and accessible focus ring.
- `canvas`: stage background, grid line, vignette, package shadow.
- `hero`: landing hero chip treatment and decorative background rules.

### `laboratory`

- Default theme. Mood: controlled research equipment, graphite lab, premium instrument panel.
- Palette: black/graphite, cool white, cyan, restrained blue.
- Surfaces: matte dark panels, hairline borders, low-opacity glass.
- Glow: cool, narrow; mostly active controls and stage edges.
- Typography: compact, clinical, high readability.
- Use when: default app experience, Apple/Intel-like premium press direction.
- Avoid: playful saturation, cartoon outlines, purple-heavy sci-fi wash.

### `anime`

- Mood: mecha cockpit, energetic hardware UI, stylized but usable.
- Palette: deep black, ink blue, hot magenta/red, electric cyan, signal yellow used sparingly.
- Surfaces: sharper panels, bolder outlines, diagonal accents acceptable.
- Glow: stronger edge lights; selection states feel animated even before real animation.
- Typography: strong headers, compact labels, occasional badge-like callouts.
- Use when: expressive presets and high-energy product-closeup posters.
- Avoid: making every surface neon; controls still need hierarchy and calm reading zones.

### `space`

- Mood: orbital product lab, black void, distant light, glass/metal instrumentation.
- Palette: near-black, midnight blue, white, pale violet/cyan.
- Surfaces: translucent glass over deep background, subtle star/noise texture only if restrained.
- Glow: horizon/halo lighting and soft ambient bloom.
- Typography: airy but not landing-page oversized inside tools.
- Use when: wide hero compositions and premium poster exports.
- Avoid: decorative orbs, bokeh blobs, generic galaxy wallpaper.

## App Shell Rules

- Desktop-first; no promised mobile support.
- Keep the primary workflow immediately available: start blank, open dashboard, open hero set,
  random chip.
- The chip/product is visible in the first viewport on landing.
- Landing page is an entry surface to the tool, not marketing-only.
- Avoid nested cards. Use full-width bands and tool surfaces; repeat cards only for projects/presets.
- Stable dimensions for toolbar buttons, counters, chip preview tiles, panel rails.
- No viewport-width font scaling.

## Editor Layout Rules

Three-zone desktop tool surface:

- **Left rail:** project navigation, block creation, preset/remix/random entry points.
- **Center stage:** chip viewport inside a cinematic product analysis environment.
- **Right rail:** inspector, fake specs, export controls, project metadata.

Stage environment:

- Dark instrument background with subtle grid/readout.
- Package shadow or frame visible around the chip even before material upgrades.
- Selection affordances stay readable against glow and dense die detail.
- Zoom/pan controls feel like viewport tools, not form buttons.
- No editor chrome assumed to appear in export.

Control rules:

- Icon or icon+label buttons for direct commands.
- Segmented controls for modes and theme/format choices.
- Toggles/checkboxes for binary settings.
- Compact inputs/sliders for numeric controls.
- Menus only for longer option sets.
- All unfamiliar icon-only controls need accessible labels and hover tooltips where practical.

## Chip Visual Rules

Chip renderer organized as reusable visual layers, in order:

1. background/stage lighting
2. package silhouette
3. substrate or recessed frame
4. die base
5. major block regions
6. meso subgrids
7. micro traces/noise/detail
8. labels/readouts
9. glow/highlight overlays
10. editor-only selection handles

Material recipes cover:

- graphite package
- ceramic/black substrate
- silicon die base
- copper/gold trace
- cyan/violet blueprint trace
- red translucent product frame
- green horizon/product glow
- monochrome premium package

No persisted schema change unless project-level visual metadata cannot be derived from existing
preset/project data — pause and ask before changing the single JSON contract.

## Poster Formats

### `press-hero`

Apple/NVIDIA-style hero images.

- Chip/package is the dominant object.
- Text minimal: product name, one tagline, optional 2-3 specs.
- Strong negative space acceptable.
- Best page themes: `laboratory`, `space`.
- Chip area target: 45-70% width.
- Fail: too many metric panels or busy copy.

### `architecture-slide`

Intel-style structure/spec explanation.

- Title/subtitle and metric panels are part of the composition.
- Chip may be cropped left or repeated in 2-3 variants.
- Strict grid alignment.
- Best page themes: `laboratory`, `space`.
- Information area target: 30-50% width.
- Fail: random floating boxes, unreadable small text, chip becoming secondary.

### `product-closeup`

Qualcomm/NVIDIA-style close product imagery.

- Package/frame can crop off-screen; central die/badge remains readable.
- Strong accent color allowed when the rest is black/metal.
- Best page themes: `anime`, `space`.
- Chip area target: 60-90% width with intentional crop.
- Fail: fake depth with inconsistent shadows or generic sci-fi background.

## Pass/Fail Acceptance

| Area | Pass | Fail |
| --- | --- | --- |
| Page Theme | `laboratory`, `anime`, `space` visibly change app mood while preserving workflow and readability. | Themes are only background color swaps or create illegible controls. |
| Editor | Editor looks like a premium chip visual lab and existing editing commands remain reachable. | Editor becomes a static poster, hides core commands, or resembles a generic dashboard. |
| Chip Artwork | Chip visuals show package, die, material, macro/meso/micro density, and coherent lighting. | Chip remains a flat colored block grid with glow applied uniformly. |
| Poster Export | Exported PNG looks intentionally composed at `3200x1800` and contains no editor UI. | Poster is just the editor canvas on a background, or export loses important visual effects. |
| Hero Set | 10 sets are distinct by composition/material/reference family, not just hue. | Sets feel like recolored copies of one preset. |
