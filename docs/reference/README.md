# Virtual Silicon Lab — Reference Board (Milestone 0)

> The spec (`virtual_silicon_lab_v1.md` §1) names a reference board as **the primary defense
> against amateur-looking output** and requires it before visual work begins. Visual quality *is*
> the product; this board is the standard the Milestone 3 visual system and the first hero chip
> are reviewed against — not ad-hoc taste.

This board is **text-first by design**. Instead of committing image binaries, each direction
records (a) canonical public references, (b) the precise traits to extract, and (c) the concrete,
Konva-renderable tokens those traits map to. That pre-digests the references into something the
Milestone 3 code can implement directly. See `implementation.md` for the rationale.

## How to use this board

- **During M3:** build the theme catalog and the first hero chip from the concrete tokens in
  [`visual-direction.md`](./visual-direction.md). Build the first hero chip from
  [`hero-compositions.md`](./hero-compositions.md).
- **At the M3 gate:** the first hero chip is manually reviewed against this board. If glow/neon/
  metal/export looks amateurish or like an EDA tool, do not advance — fix the visual system first.
- Every effect that must appear in PNG export is a **Konva node setting** (`shadowBlur`,
  `shadowColor`, gradients, filters, `globalCompositeOperation`/blend) — never DOM/CSS, which
  `toDataURL()` ignores.

---

## The three named directions

The spec calls out three reference directions. Each chip we build should read as a deliberate blend
of them: die-shot **realism** for texture and grid, Sci-Fi game UI for **framing and glow**, and
the Apple keynote for **composition and restraint**.

### 1. Real die-shot photography — color, texture, grid

Microscope macro shots of actual silicon dies.

- **References:** Fritzchens Fritz die-shot macro photography (Flickr / Behance); WikiChip die
  galleries; Apple/AMD/Intel published die photos; "die shot" image searches for M-series, Zen,
  and classic CPUs.
- **Extract:**
  - **Thin-film interference palette** — the iridescent copper → magenta → teal → violet sheen of
    metal layers under a microscope. This is the single most important "real silicon" tell.
  - **Nested block hierarchy** — big functional regions subdivided into smaller blocks, Manhattan
    (orthogonal) routing, strong rectangular grid with *varying* density (not a uniform grid).
  - **Memory-array texture** — large regions of fine, regular, repeated cells (caches/SRAM). This
    repeated micro-texture is what sells "this is a real chip."
  - **Perimeter bond-pad ring** — a row of regular pads/dots around the die edge.
  - **Micro-imperfection** — faint scratches, dust, uneven lighting. A little keeps it from looking
    like flat vector art.
- **Maps to (Konva):** thin-film gradients on the die base + block fills; a repeated fine-cell
  pattern fill for "memory" blocks; a dotted perimeter ring decoration; subtle low-opacity noise/
  texture overlay (bundled asset).

### 2. Sci-Fi game UI — Destiny / Star Citizen menus

Fictional-interface ("FUI") menu and HUD design.

- **References:** Destiny 2 menus (cyan/white on near-black); Star Citizen MobiGlas (blue
  holographic HUD); general FUI / HUD design boards; Oblivion/Aliens-style military FUI.
- **Extract:**
  - **Dark near-black canvas** with a small number of bright accent hues (often just one or two).
  - **Thin, crisp glowing strokes** — 1–2px lines that bloom, not thick fills.
  - **Hex motifs and HUD framing** — corner brackets, tick marks, segmented arcs, reticles.
  - **Restraint + negative space** — bright elements are sparse; the dark does most of the work.
  - **Warning glyphs and condensed/mono labels** — triangle/hazard marks, monospaced callouts.
- **Maps to (Konva):** additive neon strokes (`globalCompositeOperation: 'lighter'` +
  `shadowBlur`); corner-bracket and tick-mark decorations; warning-mark decoration; condensed/mono
  label styling.

### 3. Apple-silicon keynote slides — dark bg + glow + minimal type

How a premium chip is *presented*, not just rendered.

- **References:** Apple M1/M2/M3/M-series keynote chip reveals; "Apple silicon" presentation stills.
- **Extract:**
  - **Centered hero composition** — one chip, large, centered, lots of breathing room.
  - **Dark gradient background with a soft radial spotlight** behind the chip (vignette).
  - **One soft outer bloom** around the package — tasteful, singular, never gaudy.
  - **Minimal typography** — one large name, a few sparse spec callouts, generous tracking, light
    weight, near-white text.
  - **Color pulled from the chip itself** — the accent comes from the product, not decoration.
- **Maps to (Konva):** export poster stage with a radial-gradient background + centered chip; a
  single soft `shadowBlur` bloom on the package; minimal high-tracking text layout; accent color
  sampled from the die theme.

---

## The global anti-reference (applies to every theme)

**Do not look like an EDA tool** (Cadence Virtuoso, Synopsys Custom Compiler, KLayout, generic
layout viewers). Concretely, avoid:

- flat, fully-saturated primary-color rectangles on a **light gray** background;
- busy engineering chrome — dense toolbars, netlist/schematic look, property grids;
- a uniform, evenly-spaced grid of identical blocks with no visual hierarchy;
- pure web-safe colors (`#FF0000`, `#00FF00`) and default system fonts;
- depthless flat fills — no gradient, no glow, no metal, no shadow.

If a chip could be mistaken for a screenshot from an engineering tool, it has failed the brief. The
tone is **surreal / Sci-Fi / playful**, presented like a premium keynote — not a research lab.

---

## Files in this board

- [`visual-direction.md`](./visual-direction.md) — per-theme direction notes (`neon`, `retro`,
  `military`, `keynote`, `mono`): palette, glow & contrast intent, background, decorations, and one
  explicit anti-reference each, expressed as concrete Konva tokens.
- [`hero-compositions.md`](./hero-compositions.md) — 1 primary + 2 alternate rough compositions for
  the first hero chip, with die shape, block layout, decorations, glow, and fake-spec text.
