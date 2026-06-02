# Hero Chip — Rough Target Compositions

> 1 primary + 2 alternates for the **first hero chip** (spec: "Hero 칩 3~5개 큐레이션"). The first
> hero chip built in Milestone 3 is reviewed against composition **A** and the board in
> [`README.md`](./README.md). The alternates exist to prove the theme system's range (a neon and a
> military chip should look like different worlds, not recolors of the same layout).
>
> These are rough layouts, not pixel specs — they fix die shape, block placement intent, glow,
> decorations, theme, and the fake-spec copy so M3/M4 can build directly. Coordinates are relative
> (0–1) within the die so they survive any die size. Block types come from the spec's real/fantasy
> palettes; fantasy blocks are the narrative hook and should anchor each composition.

Composition principles pulled from the board: **centered hero** (keynote), **die-shot grid texture**
for realism (a memory-array band), **one signature bloom** (restraint), **fantasy block as the
story**, and a strict per-theme accent budget.

---

## A — Primary: "AURORA C-1 — Consciousness Processor" (`keynote` + neon accent)

The reviewable first hero. Keynote restraint and centered composition, with a single neon-cyan→violet
bloom behind the hero block. Brushed space-gray die, one accent gradient, a die-shot memory band for
realism, a quiet perimeter bond-pad ring.

- **Die:** `square`, large, centered on a deep-graphite radial-spotlight background.
- **Theme:** `keynote` base; the single accent gradient is the neon cyan→violet (`#22d3ee`→`#a855f7`).
- **Glow:** exactly one soft bloom behind the central block (`shadowBlur` ~48, `shadowOpacity` ~0.4,
  accent-colored). Everything else is monochrome brushed metal.

```text
 ┌──────────────────────────────────────────────┐  ← square die, brushed space-gray
 │  · · · · · · · · · · · · · · · · · · · · · ·  │     dotted bond-pad ring (perimeter)
 │  ·  ┌────────┐        ┌────────┐           ·  │
 │  ·  │  CPU   │        │  GPU   │           ·  │     symmetric compute clusters (real blocks)
 │  ·  └────────┘        └────────┘           ·  │
 │  ·          ╔══════════════════╗            ·  │
 │  ·          ║  CONSCIOUSNESS    ║  ← hero    ·  │     central hero block, neon bloom behind it
 │  ·          ║    PROCESSOR      ║    block   ·  │
 │  ·          ╚══════════════════╝            ·  │
 │  ·  ┌────────┐        ┌────────┐           ·  │
 │  ·  │  PLL   │        │  DAC   │           ·  │
 │  ·  └────────┘        └────────┘           ·  │
 │  ·  ▓▓▓▓▓▓▓▓▓▓▓▓ Quantum Memory ▓▓▓▓▓▓▓▓▓  ·  │     fine repeated-cell memory band (die-shot texture)
 │  · · · · · · · · · · · · · · · · · · · · · ·  │
 └──────────────────────────────────────────────┘
```

- **Blocks (relative coords, `x,y` = top-left, `w,h` fractions of die):**
  - `ConsciousnessProcessor` (fantasy, hero) — `0.30, 0.40, 0.40, 0.18` — accent gradient + bloom
  - `CPU` (real) — `0.12, 0.12, 0.22, 0.12`
  - `GPU` (real) — `0.66, 0.12, 0.22, 0.12`
  - `PLL` (real) — `0.12, 0.64, 0.22, 0.10`
  - `DAC` (real) — `0.66, 0.64, 0.22, 0.10`
  - `QuantumMemory` (fantasy) — `0.10, 0.80, 0.80, 0.10` — repeated-cell pattern fill
- **Decorations:** dotted perimeter bond-pad ring; one quiet `label` with the chip name above the die;
  no neon routing lines (keynote restraint).
- **Fake spec:**
  - brand `AURORA`, series `C-1`, generation `3rd-gen`
  - process `0.5nm 영혼각인 (soul-etched)`
  - cores `88`, bandwidth `∞ TB/s`
  - features: `["Dream Coherence Engine", "Lucid Cache", "Empathy Co-processor"]`
  - description: `"의식을 88코어로 병렬 처리합니다. 부작용으로 가끔 자아를 가집니다."`
- **Review focus at the M3 gate:** the bloom must look soft and premium (not a hard ring); the
  brushed-metal die must have real gradient depth; the memory band must read as fine repeated texture,
  not a flat rectangle.

---

## B — Alternate: "NEON DISTRICT N-9" (`neon`, hexagon die)

Full cyberpunk to stress the `neon` theme: hexagon die, dense glowing grid, additive neon routing,
HUD framing. Two accent hues only (cyan + magenta).

- **Die:** `hexagon`, dark `#0d1117` with cool thin-film overlay, on indigo radial background.
- **Theme:** `neon`; accents cyan `#22d3ee` + magenta `#ff2bd6` (no violet here — stay within budget).
- **Glow:** neon routing lines with blend `lighter`, `shadowBlur` 20–36; key blocks get accent halos.
- **Layout:** denser, less symmetric than A — a cluster of compute/IO blocks with `EmotionEngine` and
  `RealityDistortionUnit` as glowing fantasy anchors; neon lines tracing between blocks; HUD corner
  brackets and tick marks at the hex vertices.
- **Decorations:** `neonLine` routing (cyan + magenta), `warningMark` near the Reality Distortion
  Unit, hex-vertex tick framing.
- **Fake spec:** brand `NEXUS`, series `N-9`, process `1nm 네온증착`, cores `256`, bandwidth
  `12.8 PB/s`, features `["Overclock Halo", "Magenta Bus", "Glitch Shield"]`.

## C — Alternate: "FIELD UNIT M-7" (`military`, rect die)

Counter-programs against A and B to prove range: matte, heavy, almost no glow. If this looks like the
same chip recolored, the theme system has failed.

- **Die:** `rect` (wide, landscape), brushed gunmetal/olive-drab gradient, matte gunmetal background.
- **Theme:** `military`; olive/sand/gunmetal, hazard amber + signal red used only as warnings.
- **Glow:** minimal (`shadowBlur` ≤8). Hierarchy from stencil labels, hazard stripes, rivets, and
  stroke weight.
- **Layout:** utilitarian grid of armored panels; `TimeCore` (fantasy) as the central sealed unit;
  IO/USB along one edge; black/yellow hazard stripe banding one corner.
- **Decorations:** hazard stripes, `warningMark` triangles, stencil serial labels, bolt/rivet dots.
- **Fake spec:** brand `AEGIS`, series `M-7`, process `3nm 군용내환경`, cores `32`, bandwidth
  `2.4 TB/s`, features `["Rad-Hardened", "Faraday Seal", "Failover Core"]`,
  description `"전장 환경에서 시간을 1.5배 늦춥니다. 워런티는 평시에만 유효합니다."`

---

## Selection note

Composition **A** is the chip to build and review first; it exercises the hardest visual skills
(soft bloom, brushed metal, restraint, die-shot texture). **B** and **C** become two of the curated
hero set in Milestone 6 and double as the visual regression check that themes are genuinely distinct.
