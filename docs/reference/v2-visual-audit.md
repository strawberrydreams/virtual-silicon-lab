# V2 Visual Audit

Extracts composition, lighting, material, density, and typography rules from `images/` press
references so v2 reads as a press image, not a copy of those references.

## Reference Inventory

| File | Size | Use In v2 |
| --- | ---: | --- |
| `images/apple_m4_pro.jpg` | 1960x1102 | black bg, cyan wireframe die, left text/right die composition. |
| `images/apple_m5.png` | 1920x1080 | premium package + die blueprint pair; controlled cyan accent, large negative space. |
| `images/apple_silicon_die_shot.jpg` | 1024x421 | real die tile density and horizontal aspect ratio reference. |
| `images/intel_crescent_island.jpg` | 2000x1125 | architecture slide: cropped chip left, metric panels right, blue corporate glow. |
| `images/intel_diamond_rapids.jpg` | 1200x675 | package/tile product image; package metal and module framing. |
| `images/intel_meteor_lake_cpu_tiles.jpg` | 800x414 | multi-tile package; chiplet layout and subtle material contrast. |
| `images/intel_panther_lake_architecture.jpg` | 1200x675 | three-package architecture comparison, violet die insets, left feature list. |
| `images/intel_pentium_2_die_shot.jpg` | 8917x5519 | high-density real die texture: memory arrays, logic noise, buses, IO perimeter. |
| `images/intel_serpent_lake_cpu_tiles.jpg` | 1536x864 | product-like tile/package rendering, cool blue semiconductor tone. |
| `images/nvidia_n1x(1).jpg` | 1000x600 | angled package hero on green horizon glow/circuit floor. |
| `images/nvidia_n1x(2).jpg` | 941x706 | alternate NVIDIA/MediaTek package closeup, green product lighting. |
| `images/qualcomm_snapdragon_8_elite.png` | 814x459 | red/black transparent mechanical frame, badge-centered product closeup. |
| `images/qualcomm_snapdragon_x_elite.jpg` | 1723x960 | Snapdragon press direction; red product material, high contrast. |
| `images/samsung_exynos_2100_die_shot.jpg` | 634x680 | annotated die layout; label density, cyan/green circuit traces. |

## Visual Families

### Apple Premium Product

References: `apple_m4_pro.jpg`, `apple_m5.png`.

- Black/near-black background, very restrained bloom.
- One primary accent (usually cyan/teal) carried through package edge, die lines, and text.
- Large negative space is part of the design.
- Crisp frontal geometry; depth from edge glow, subtle bevel, and package shadow, not camera drama.
- Typography sparse, large, calm; few deliberate labels.

Implementation rule: cap accent hues at one, use thick outer package silhouettes, let micro-detail
carry density instead of UI badges.

### Intel Architecture Slide

References: `intel_crescent_island.jpg`, `intel_panther_lake_architecture.jpg`,
`intel_diamond_rapids.jpg`, `intel_meteor_lake_cpu_tiles.jpg`, `intel_serpent_lake_cpu_tiles.jpg`.

- Information structure matters as much as the chip: title, subtitle, metric cells, package imagery
  align to a clear grid.
- Background usually dark blue/navy with controlled radial or lateral glow.
- Chips may be cropped or repeated to explain scale/comparison.
- Violet/blue die insets work inside metallic package frames.
- Text panels are translucent but rectangular and disciplined, not floating randomly.

Implementation rule: architecture posters need explicit safe regions for chip, title, feature list,
and metric panels. Decorative glow supports the grid, doesn't compete with it.

### NVIDIA / Qualcomm Glow Product

References: `nvidia_n1x(1).jpg`, `nvidia_n1x(2).jpg`, `qualcomm_snapdragon_8_elite.png`,
`qualcomm_snapdragon_x_elite.jpg`.

- Strong brand color can dominate when the rest of the palette is black/metal.
- Angled package or close crop adds product energy without true 3D.
- A horizontal horizon light or illuminated floor stages the chip.
- Transparent/mechanical layers deepen a 2D scene if edge highlights are consistent.
- Central badge/label can work, but only with enough surrounding material detail.

Implementation rule: fake depth with 2D package layers, offset shadows, internal frame cutouts,
and foreground edge highlights. Avoid generic sci-fi blobs as a substitute for material construction.

### Raw Die Shot

References: `intel_pentium_2_die_shot.jpg`, `apple_silicon_die_shot.jpg`,
`samsung_exynos_2100_die_shot.jpg`.

- Real die quality comes from mixed scale: large memory slabs, mid-size compute regions, tiny
  buses, IO edge detail, noisy logic blocks.
- The die is not uniformly busy; dense areas need breathing space from larger slabs.
- Strong colors are acceptable if geometry remains precise.
- Edge/perimeter detail matters; empty die edges look fake.
- Labels can help, but too many feel like a leaked annotated diagram, not a press visual.

Implementation rule: every v2 hero chip needs at least three density scales: macro blocks, meso
subgrids, and micro line/noise detail.

## Extracted Rules

### Composition

- One primary subject per poster: chip package, die blueprint, or architecture comparison.
- Deliberate crop only — a package can be cropped off-screen if it preserves the die as focal point.
- Clear title/spec area; poster text never sits over the densest die detail.
- `press-hero`: chip occupies 45-70% of canvas width.
- `architecture-slide`: information panels occupy 30-50% of canvas width.
- `product-closeup`: chip/frame can exceed canvas and crop, but a central die/badge stays readable.

### Lighting

- One light direction per composition: top-left, bottom-left bloom, horizon line, or centered halo.
- Glow reinforces package edges, not blurs the entire chip.
- Use bloom sparingly on text; chip material has priority.
- Avoid equal-intensity glows: background glow < package edge glow < die accent glow.

### Material

- Separate at least four material roles: background, package, substrate/die base, metal/detail.
- Package reads as graphite, ceramic, brushed metal, or translucent frame.
- Die base is darker and more detailed than package interior.
- Metal/detail lines: thin strokes, occasional highlight strokes, reduced opacity where dense.
- Avoid flat fill-only rectangles; every hero chip needs edge, shadow, and texture treatment.

### Density

- A believable die needs:
  - macro regions: 6-16 large named/typed blocks.
  - meso detail: subgrid lines or repeated cells inside large blocks.
  - micro detail: tiny traces/noise/hatch lines, especially at edges and between blocks.
  - perimeter detail: IO pads, small repeated marks, or frame contacts.
- Leave 10-20% calm area so dense regions feel designed, not random.

### Typography

- One display voice per poster; don't mix decorative fonts.
- Hierarchy: product/series title first, one-line claim second, metrics/specs third.
- Numbers as visual anchors in metric panels.
- No long paragraphs; feature copy is scan-size.
- Small text stays readable at `3200x1800` export.

### Color Budget

- Apple premium: black/graphite + white + one cyan/teal accent.
- Intel architecture: navy/blue + violet/cyan accent; max two accent hues.
- NVIDIA product: black/graphite + green; secondary color only inside die detail.
- Qualcomm product: black/metal + red/orange; white/gold badge highlight allowed.
- Raw die: richer colors allowed, geometry stays crisp and organized.

## Anti-Patterns

- Stock sci-fi background unrelated to the chip.
- One-note palette where every surface is the same blue/purple/red.
- Unreadable glow that blurs die geometry.
- Empty die interiors with only a few large blocks.
- Poster text fighting the chip for attention.
- Too many equal-weight cards or nested cards around the editor.
- Fake 3D that depends on true perspective but is implemented as inconsistent skew.
- UI chrome inside exported poster.
- Export-only design that looks good in DOM but disappears from Konva `toDataURL()`.

## V2 Quality Rubric

Each v2 hero chip + poster must pass all items below.

| Area | Pass | Fail |
| --- | --- | --- |
| Composition | Chip is the clear focal object; crop and scale feel deliberate. | Chip feels pasted into a generic background or is visually secondary. |
| Material | Package, die, metal/detail, glow, and text read as different layers. | Flat blocks with one fill style dominate the image. |
| Density | Macro, meso, and micro detail scales are all visible. | Die is sparse, uniformly busy, or only a simple grid. |
| Lighting | One coherent light direction shapes the scene. | Glow appears everywhere with no hierarchy. |
| Typography | Title/specs are readable and support the chip. | Text overlaps detail, is too small, or has mixed visual voices. |
| Color | Accent budget matches the selected reference family. | Palette becomes rainbow, muddy, or a single monotonous hue. |
| Export Fidelity | Exported PNG preserves the visible material system. | Important effects depend on DOM/CSS and vanish from export. |
