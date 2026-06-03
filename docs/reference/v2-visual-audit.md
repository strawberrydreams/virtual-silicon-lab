# v2 Visual Audit

Virtual Silicon Lab v2의 visual major release 기준 문서. `images/` 레퍼런스를 그대로 복제하지 않고, press image로 보이게 만드는 구도, 조명, 물성, 밀도, 타이포 규칙을 추출한다.

## Reference Inventory

| File | Size | Use In v2 |
| --- | ---: | --- |
| `images/apple_m4_pro.jpg` | 1960x1102 | black background, cyan wireframe die, left text/right die composition. |
| `images/apple_m5.png` | 1920x1080 | premium package + die blueprint pair; controlled cyan accent, large negative space. |
| `images/apple_silicon_die_shot.jpg` | 1024x421 | real die tile density and horizontal aspect ratio reference. |
| `images/intel_crescent_island.jpg` | 2000x1125 | architecture slide with cropped chip left, metric panels right, blue corporate glow. |
| `images/intel_diamond_rapids.jpg` | 1200x675 | Intel package/tile product image; useful for package metal and module framing. |
| `images/intel_meteor_lake_cpu_tiles.jpg` | 800x414 | multi-tile package reference; useful for chiplet layout and subtle material contrast. |
| `images/intel_panther_lake_architecture.jpg` | 1200x675 | three-package architecture comparison, violet die insets, left feature list. |
| `images/intel_pentium_2_die_shot.jpg` | 8917x5519 | high-density real die texture: memory arrays, logic noise, buses, IO perimeter. |
| `images/intel_serpent_lake_cpu_tiles.jpg` | 1536x864 | product-like tile/package rendering with cool blue semiconductor tone. |
| `images/nvidia_n1x(1).jpg` | 1000x600 | angled package hero on green horizon glow/circuit floor. |
| `images/nvidia_n1x(2).jpg` | 941x706 | alternate NVIDIA/MediaTek package closeup and green product lighting. |
| `images/qualcomm_snapdragon_8_elite.png` | 814x459 | red/black transparent mechanical frame, badge-centered product closeup. |
| `images/qualcomm_snapdragon_x_elite.jpg` | 1723x960 | Snapdragon premium press image direction; red product material and high contrast. |
| `images/samsung_exynos_2100_die_shot.jpg` | 634x680 | annotated die layout; useful for label density and cyan/green circuit traces. |

## Visual Families

### Apple Premium Product

References: `apple_m4_pro.jpg`, `apple_m5.png`.

- Black or near-black background with very restrained bloom.
- One primary accent, usually cyan/teal, carried through package edge, die lines, and text.
- Large negative space is part of the design; do not fill every area with decoration.
- The chip/die geometry is crisp and frontal. Depth comes from edge glow, subtle bevel, and package shadow rather than camera drama.
- Typography is sparse, large, and calm. Labels are few and deliberate.

Implementation rule: when building premium/keynote-style presets, cap accent hues at one, use thick outer package silhouettes, and let micro-detail carry density instead of adding many UI badges.

### Intel Architecture Slide

References: `intel_crescent_island.jpg`, `intel_panther_lake_architecture.jpg`, `intel_diamond_rapids.jpg`, `intel_meteor_lake_cpu_tiles.jpg`, `intel_serpent_lake_cpu_tiles.jpg`.

- Information structure matters as much as the chip: title, subtitle, metric cells, and package imagery must align to a clear grid.
- Background is usually dark blue/navy with a controlled radial or lateral glow.
- Chips may be cropped or repeated to explain scale/comparison.
- Violet/blue die insets work because they sit inside metallic package frames.
- Text panels are translucent but rectangular and disciplined; they do not float randomly.

Implementation rule: architecture posters need explicit safe regions for chip, title, feature list, and metric panels. Decorative glow must support the grid, not compete with it.

### NVIDIA / Qualcomm Glow Product

References: `nvidia_n1x(1).jpg`, `nvidia_n1x(2).jpg`, `qualcomm_snapdragon_8_elite.png`, `qualcomm_snapdragon_x_elite.jpg`.

- Strong brand color can dominate when the palette is otherwise black/metal.
- Angled package or close crop adds product energy even without true 3D.
- A horizontal horizon light or illuminated floor makes the chip feel staged.
- Transparent/mechanical layers can make a 2D scene feel deeper if edge highlights are consistent.
- Central badge/label can work, but only when surrounded by enough material detail.

Implementation rule: v2 can fake depth with 2D package layers, offset shadows, internal frame cutouts, and foreground edge highlights. Avoid using generic sci-fi blobs as a substitute for material construction.

### Raw Die Shot

References: `intel_pentium_2_die_shot.jpg`, `apple_silicon_die_shot.jpg`, `samsung_exynos_2100_die_shot.jpg`.

- Real die visual quality comes from mixed scale: large memory slabs, mid-size compute regions, tiny buses, IO edge detail, and noisy logic blocks.
- The die is not uniformly busy. Dense areas need breathing space from larger slabs.
- Strong colors are acceptable in die shots when the geometry remains precise.
- Edge/perimeter detail is important; empty die edges look fake.
- Labels can help, but too many labels make the result feel like a leaked annotated diagram rather than a press visual.

Implementation rule: every v2 hero chip should include at least three density scales: macro blocks, meso subgrids, and micro line/noise detail.

## Extracted Rules

### Composition

- One primary subject per poster: chip package, die blueprint, or architecture comparison.
- Use deliberate crop. A package can be cropped off-screen only if the crop feels intentional and preserves the die as a focal point.
- Keep a clear title/spec area. Poster text must never sit directly over the densest die detail.
- For `press-hero`, chip occupies 45-70% of canvas width.
- For `architecture-slide`, information panels occupy 30-50% of canvas width.
- For `product-closeup`, chip/frame can exceed the canvas and crop, but a central die/badge must remain readable.

### Lighting

- Choose one light direction per composition: top-left, bottom-left bloom, horizon line, or centered halo.
- Glow should reinforce package edges, not blur the entire chip.
- Use bloom sparingly on text; text glow is lower priority than chip material.
- Avoid equal-intensity glows on all layers. Background glow < package edge glow < die accent glow.

### Material

- Separate at least four material roles: background, package, substrate/die base, metal/detail.
- Package should read as graphite, ceramic, brushed metal, or translucent frame.
- Die base should be darker and more detailed than package interior.
- Metal/detail lines need thin strokes, occasional highlight strokes, and reduced opacity where dense.
- Avoid flat rectangles with only fill color; every hero chip needs edge, shadow, and texture treatment.

### Density

- A believable die needs:
  - macro regions: 6-16 large named/typed blocks.
  - meso detail: subgrid lines or repeated cells inside large blocks.
  - micro detail: tiny traces/noise/hatch lines, especially at edges and between blocks.
  - perimeter detail: IO pads, small repeated marks, or frame contacts.
- Leave at least 10-20% calm area so dense regions feel designed instead of random.

### Typography

- Use one display voice per poster. Do not mix many decorative fonts.
- Poster hierarchy: product/series title first, one-line claim second, metrics/specs third.
- Use numbers as visual anchors in metric panels.
- Avoid long paragraphs. Feature copy should be scan-size.
- Small text must remain readable at `3200x1800` export.

### Color Budget

- Apple premium: black/graphite + white + one cyan/teal accent.
- Intel architecture: navy/blue + violet/cyan accent; no more than two accent hues.
- NVIDIA product: black/graphite + green; secondary color only inside die detail.
- Qualcomm product: black/metal + red/orange; white/gold badge highlight allowed.
- Raw die: richer colors allowed, but geometry must stay crisp and organized.

## Anti-Patterns

- Stock sci-fi background that looks unrelated to the chip.
- One-note palette where every surface is the same blue/purple/red.
- Unreadable glow that blurs die geometry.
- Empty die interiors with only a few large blocks.
- Poster text that fights the chip for attention.
- Too many equal-weight cards or nested cards around the editor.
- Fake 3D that depends on true perspective but is implemented as inconsistent skew.
- UI chrome inside exported poster.
- Export-only design that looks good in DOM but disappears from Konva `toDataURL()`.

## v2 Quality Rubric

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

## Implementation Inputs For Later Milestones

- M1 should implement page themes without coupling them to chip `StyleTheme`.
- M2 should make the editor stage look like a product analysis environment, not a neutral canvas.
- M3 should prioritize material recipes, chip layer order, and micro-detail density.
- M4 should implement poster safe regions before adding visual flourish.
- M5 should reject hero sets that only differ by hue.
