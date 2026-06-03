# v2 Style Direction

This document converts the v2 visual audit into implementation rules for page themes, editor layout, chip rendering, and poster formats.

## Design Brief

Virtual Silicon Lab v2 is a desktop-only visual major release. The app should feel like a premium chip visual lab: a user opens a preset or random chip, edits it inside a cinematic but practical chip stage, and exports a poster that could plausibly sit beside the `images/` press references.

## Theme Model

v2 has two related but separate theme layers.

- **Page theme:** controls app shell, landing, dashboard, editor chrome, panels, and stage environment. New values: `laboratory`, `anime`, `space`.
- **Chip theme:** existing project-level chip styling such as `neon`, `retro`, `military`, `keynote`, `mono`. This stays with the project JSON.

Page theme must not require a project schema migration. It can be stored as app preference outside the project, with `laboratory` fallback.

## Page Theme Tokens

Every page theme should expose the same token keys so React/CSS code can switch themes without branching.

Required token groups:

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

- Default theme.
- Mood: controlled research equipment, graphite lab, premium instrument panel.
- Palette direction: black/graphite, cool white, cyan, restrained blue.
- Surfaces: matte dark panels with hairline borders and low-opacity glass.
- Glow: cool, narrow, mostly used on active controls and stage edges.
- Typography: compact, clinical, high readability.
- Use when: default app experience, Apple/Intel-like premium press direction.
- Avoid: playful saturation, cartoon outlines, purple-heavy sci-fi wash.

### `anime`

- Mood: mecha cockpit, energetic hardware UI, stylized but still usable.
- Palette direction: deep black, ink blue, hot magenta/red, electric cyan, signal yellow used sparingly.
- Surfaces: sharper panels, bolder outlines, diagonal accents acceptable.
- Glow: stronger edge lights, selection states can feel animated even before real animation.
- Typography: strong headers, compact labels, occasional badge-like callouts.
- Use when: expressive presets and high-energy product-closeup posters.
- Avoid: making every surface neon; controls still need hierarchy and calm reading zones.

### `space`

- Mood: orbital product lab, black void, distant light, glass/metal instrumentation.
- Palette direction: near-black, midnight blue, white, pale violet/cyan.
- Surfaces: translucent glass panels over deep background, subtle star/noise texture only if restrained.
- Glow: horizon/halo lighting and soft ambient bloom.
- Typography: airy but not landing-page oversized inside tools.
- Use when: wide hero compositions and premium poster exports.
- Avoid: decorative orbs, bokeh blobs, or generic galaxy wallpaper.

## App Shell Rules

- Desktop-first layout. The app can avoid obvious overflow at smaller widths, but v2 does not promise mobile support.
- Keep the primary workflow immediately available: start blank, open dashboard, open hero set, random chip.
- The chip/product must be visible in the first viewport on landing.
- Do not make the landing page a marketing-only page. It should be an entry surface to the tool.
- Avoid nested cards. Use full-width bands, tool surfaces, and repeated cards only for projects/presets.
- Use stable dimensions for toolbar buttons, counters, chip preview tiles, and panel rails.
- Text should never rely on viewport-width font scaling.

## Editor Layout Rules

The v2 editor should be a three-zone desktop tool surface:

- **Left rail:** project navigation, block creation, preset/remix/random entry points.
- **Center stage:** chip viewport inside a cinematic product analysis environment.
- **Right rail:** inspector, fake specs, export controls, project metadata.

Stage environment:

- Dark instrument background with subtle grid/readout.
- Package shadow or frame visible around the chip even before M3 material upgrade.
- Selection affordances must remain readable against glow and dense die detail.
- Zoom/pan controls should feel like viewport tools, not form buttons.
- No editor chrome should be assumed to appear in export.

Control rules:

- Use icon or icon+label buttons for direct commands.
- Use segmented controls for modes and theme/format choices.
- Use toggles/checkboxes for binary settings.
- Use compact inputs/sliders for numeric controls.
- Use menus only for longer option sets.
- All unfamiliar icon-only controls need accessible labels and hover tooltips where practical.

## Chip Visual Rules

The chip renderer should be organized as reusable visual layers:

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

The order matters. M3 should introduce helpers that describe layer intent before adding more Konva nodes.

Material recipes should cover:

- graphite package
- ceramic/black substrate
- silicon die base
- copper/gold trace
- cyan/violet blueprint trace
- red translucent product frame
- green horizon/product glow
- monochrome premium package

No persisted schema change is required unless a later implementation proves that project-level visual metadata cannot be derived from existing preset/project data. If that happens, pause and ask before changing the single JSON contract.

## Poster Formats

### `press-hero`

Use for Apple/NVIDIA-style hero images.

- Chip/package is the dominant object.
- Text is minimal: product name, one tagline, optional 2-3 specs.
- Strong negative space is acceptable.
- Best page themes: `laboratory`, `space`.
- Chip area target: 45-70% width.
- Fail condition: too many metric panels or busy copy.

### `architecture-slide`

Use for Intel-style structure/spec explanation.

- Title/subtitle and metric panels are part of the composition.
- Chip may be cropped left or repeated in 2-3 variants.
- Grid alignment is strict.
- Best page themes: `laboratory`, `space`.
- Information area target: 30-50% width.
- Fail condition: random floating boxes, unreadable small text, or chip becoming secondary.

### `product-closeup`

Use for Qualcomm/NVIDIA-style close product imagery.

- Package/frame can crop off-screen.
- Central die/badge remains readable.
- Strong accent color is allowed when the rest is black/metal.
- Best page themes: `anime`, `space`.
- Chip area target: 60-90% width with intentional crop.
- Fail condition: fake depth with inconsistent shadows or generic sci-fi background.

## Pass/Fail Acceptance

### Page Theme

- Pass: `laboratory`, `anime`, and `space` visibly change app mood while preserving workflow and readability.
- Fail: themes are only background color swaps or create illegible controls.

### Editor

- Pass: the editor looks like a premium chip visual lab and existing editing commands remain reachable.
- Fail: the editor becomes a static poster, hides core commands, or resembles a generic dashboard.

### Chip Artwork

- Pass: chip visuals show package, die, material, macro/meso/micro density, and coherent lighting.
- Fail: chip remains a flat colored block grid with glow applied uniformly.

### Poster Export

- Pass: exported PNG looks intentionally composed at `3200x1800` and contains no editor UI.
- Fail: poster is just the editor canvas on a background, or export loses important visual effects.

### Hero Set

- Pass: 10 sets are distinct by composition/material/reference family, not just hue.
- Fail: sets feel like recolored copies of one preset.

## Implementation Notes

- M1 should implement page theme tokens and app shell before detailed editor work.
- M2 should redesign editor chrome using the theme tokens, not hardcoded page-specific colors.
- M3 should keep `ChipArtwork` shared between editor and export.
- M4 should implement poster safe regions before detailed visual decoration.
- M5 should use the audit rubric to reject weak hero sets.
