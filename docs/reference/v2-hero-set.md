# v2 Hero Set Targets

These are target concepts for the 10 v2 hero chip + poster sets. M0 defines intent only; M5 converts them into concrete preset/project data and final QA notes.

## Selection Rules

- Each hero must map to a clear reference family from `docs/reference/v2-visual-audit.md`.
- No two heroes may differ only by color.
- Each hero must define page theme, chip theme, poster format, material intent, accent budget, and primary quality risk.
- Three heroes are marked as early gates for M3/M4 because they represent the hardest visual foundations.

## Hero 01 — AURORA M5

- Early gate: yes, M3 material gate.
- Reference family: Apple premium product.
- Primary references: `images/apple_m5.png`, `images/apple_m4_pro.jpg`.
- Page theme: `laboratory`.
- Chip theme: `keynote`.
- Poster format: `press-hero`.
- Composition: black package on left, cyan blueprint die on right, sparse product title/specs.
- Material intent: graphite package, cyan edge bloom, monochrome die lines, subtle brushed package texture.
- Accent budget: cyan/teal only.
- Blocks: large CPU/GPU/memory slabs plus fine blueprint subdivisions.
- Quality risk: looking like a flat line-art diagram instead of a premium product image.
- Pass condition: feels restrained, expensive, and readable with one accent color.

## Hero 02 — PANTHER SCALE

- Early gate: yes, M4 architecture poster gate.
- Reference family: Intel architecture slide.
- Primary references: `images/intel_panther_lake_architecture.jpg`, `images/intel_meteor_lake_cpu_tiles.jpg`.
- Page theme: `laboratory`.
- Chip theme: `mono`.
- Poster format: `architecture-slide`.
- Composition: three package variants in a row, left title/feature stack, top variant labels.
- Material intent: metallic packages, violet die insets, strict slide grid.
- Accent budget: violet + blue.
- Blocks: three related chip variants derived from one layout family.
- Quality risk: too much UI text or weak alignment.
- Pass condition: reads like a real architecture scalability slide.

## Hero 03 — N1 GREEN HORIZON

- Early gate: yes, M3/M4 product lighting gate.
- Reference family: NVIDIA / Qualcomm glow product.
- Primary references: `images/nvidia_n1x(1).jpg`, `images/nvidia_n1x(2).jpg`.
- Page theme: `space`.
- Chip theme: `neon`.
- Poster format: `press-hero`.
- Composition: angled-looking black package centered low, green horizon light behind it, logo/specs above.
- Material intent: graphite package, recessed die window, green circuit-floor glow, bright die center.
- Accent budget: green primary, cyan/yellow only inside die detail.
- Blocks: compute arrays, AI cores, memory banks, IO perimeter pads.
- Quality risk: generic gaming neon if the floor/background overpowers the package.
- Pass condition: chip feels staged in a product reveal, not pasted onto a background.

## Hero 04 — SNAPDRAGON FRAME

- Early gate: no.
- Reference family: NVIDIA / Qualcomm glow product.
- Primary references: `images/qualcomm_snapdragon_8_elite.png`, `images/qualcomm_snapdragon_x_elite.jpg`.
- Page theme: `anime`.
- Chip theme: `retro`.
- Poster format: `product-closeup`.
- Composition: close-cropped red translucent mechanical frame around a central chip badge/die.
- Material intent: black metal, red glass/plastic frame, orange/gold label highlight, layered cutouts.
- Accent budget: red/orange primary, gold highlight.
- Blocks: central processor tile, surrounding cache/memory strips, edge contact details.
- Quality risk: becoming a red sci-fi wallpaper without enough chip structure.
- Pass condition: depth comes from frame layers and highlights, not blur.

## Hero 05 — CRESCENT BLUE

- Early gate: no.
- Reference family: Intel architecture slide.
- Primary references: `images/intel_crescent_island.jpg`.
- Page theme: `space`.
- Chip theme: `mono`.
- Poster format: `architecture-slide`.
- Composition: large cropped chip on left, title and 2x3 metric cells on right.
- Material intent: blue GPU die, dark package edge, translucent metric panels.
- Accent budget: Intel blue + white.
- Blocks: large accelerator tile, memory/context cells, power/IO feature regions.
- Quality risk: poster becoming a plain dashboard instead of a chip press slide.
- Pass condition: metric panels and chip crop feel like one designed slide.

## Hero 06 — PENTIUM DENSITY MAP

- Early gate: no.
- Reference family: raw die shot.
- Primary references: `images/intel_pentium_2_die_shot.jpg`.
- Page theme: `laboratory`.
- Chip theme: `neon`.
- Poster format: `product-closeup`.
- Composition: near-full-frame die map with edge frame and minimal title strip.
- Material intent: saturated blue/green die base, salmon memory slabs, dense logic noise, crisp bus lines.
- Accent budget: blue/green base + salmon memory.
- Blocks: many varied rectangular regions, large memory slabs on one side, IO edge detail.
- Quality risk: random confetti if micro-detail is not structured.
- Pass condition: looks like a stylized die shot with believable density hierarchy.

## Hero 07 — EXYNOS ANNOTATED CORE

- Early gate: no.
- Reference family: raw die shot.
- Primary references: `images/samsung_exynos_2100_die_shot.jpg`.
- Page theme: `laboratory`.
- Chip theme: `mono`.
- Poster format: `architecture-slide`.
- Composition: annotated die map with 5-7 restrained callouts and central compute cluster.
- Material intent: cyan/green traces, black die, thin white/cyan labels, perimeter interfaces.
- Accent budget: cyan + green.
- Blocks: CPU cluster, GPU lanes, NPU/DSP, modem strip, memory buses.
- Quality risk: labels becoming cluttered or watermark-like.
- Pass condition: callouts clarify without hiding the die structure.

## Hero 08 — SERPENT TILE ARRAY

- Early gate: no.
- Reference family: Intel architecture slide.
- Primary references: `images/intel_serpent_lake_cpu_tiles.jpg`, `images/intel_meteor_lake_cpu_tiles.jpg`.
- Page theme: `space`.
- Chip theme: `keynote`.
- Poster format: `press-hero`.
- Composition: multi-tile package floating in a dark space/lab stage, compact spec strip below.
- Material intent: cool blue silicon tiles inside a graphite package, separated chiplets, subtle halo.
- Accent budget: cyan + pale violet.
- Blocks: compute tile, IO tile, memory tile, media/AI tile, package interconnect.
- Quality risk: chiplet seams looking like simple gutters.
- Pass condition: package/tile layering reads clearly at first glance.

## Hero 09 — LUCID MONO PACKAGE

- Early gate: no.
- Reference family: Apple premium product.
- Primary references: `images/apple_m5.png`, `images/apple_silicon_die_shot.jpg`.
- Page theme: `laboratory`.
- Chip theme: `mono`.
- Poster format: `press-hero`.
- Composition: single black package centered with a small exposed die inset and quiet spec typography.
- Material intent: monochrome graphite, white edge highlight, low-saturation ice-blue detail.
- Accent budget: ice-blue only.
- Blocks: memory arrays and compute grid visible through a recessed die window.
- Quality risk: too quiet or empty.
- Pass condition: minimal image still feels detailed and premium.

## Hero 10 — ORBITAL DREAM TILE

- Early gate: no.
- Reference family: hybrid premium/space product.
- Primary references: `images/nvidia_n1x(1).jpg`, `images/intel_diamond_rapids.jpg`.
- Page theme: `space`.
- Chip theme: `neon`.
- Poster format: `product-closeup`.
- Composition: cropped package corner with luminous die window and orbital-style readout arcs outside the chip.
- Material intent: black ceramic package, violet/cyan internal die, thin orbital readout lines.
- Accent budget: cyan + violet.
- Blocks: fantasy-oriented DreamSynth/QuantumMemory/TimeCore blocks mixed with real IO/cache regions.
- Quality risk: drifting into generic space UI rather than chip product visual.
- Pass condition: space theme supports a concrete package/die object.

## Gate Order

1. **AURORA M5** validates premium package, blueprint die, and one-accent restraint.
2. **PANTHER SCALE** validates architecture slide layout and repeated package comparison.
3. **N1 GREEN HORIZON** validates product lighting, horizon glow, and staged package depth.

If these three fail, later hero production should pause until the material and poster systems are corrected.

## Final QA Table

M5 should fill this table after concrete presets and poster exports exist.

| Hero | Composition | Material | Density | Lighting | Typography | Export Fidelity | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AURORA M5 | pending | pending | pending | pending | pending | pending | pending |
| PANTHER SCALE | pending | pending | pending | pending | pending | pending | pending |
| N1 GREEN HORIZON | pending | pending | pending | pending | pending | pending | pending |
| SNAPDRAGON FRAME | pending | pending | pending | pending | pending | pending | pending |
| CRESCENT BLUE | pending | pending | pending | pending | pending | pending | pending |
| PENTIUM DENSITY MAP | pending | pending | pending | pending | pending | pending | pending |
| EXYNOS ANNOTATED CORE | pending | pending | pending | pending | pending | pending | pending |
| SERPENT TILE ARRAY | pending | pending | pending | pending | pending | pending | pending |
| LUCID MONO PACKAGE | pending | pending | pending | pending | pending | pending | pending |
| ORBITAL DREAM TILE | pending | pending | pending | pending | pending | pending | pending |
