# Reference Board (Milestone 0)

The visual standard the M3 visual system and the hero chips are reviewed against — the main defense
against amateur- or EDA-looking output. Text-first: each direction lists the traits to extract and
the Konva tokens they map to. Every export-visible effect is a Konva node setting (`shadowBlur`,
gradients, `globalCompositeOperation`), never DOM/CSS (which `toDataURL()` ignores).

## Three directions (every chip blends them)

1. **Real die-shot photography** — thin-film interference palette (copper → magenta → teal →
   violet), nested Manhattan-routed block hierarchy, fine repeated memory-array texture, perimeter
   bond-pad ring, slight micro-imperfection. → die/block gradients, repeated-cell pattern fill,
   dotted ring, low-opacity noise overlay.
2. **Sci-Fi game UI (Destiny / Star Citizen)** — dark near-black canvas, one or two bright accents,
   thin glowing strokes, hex/HUD framing, warning glyphs, restraint. → additive neon strokes
   (`lighter` + `shadowBlur`), corner-bracket/tick/warning decorations, mono labels.
3. **Apple-silicon keynote** — centered hero, dark radial-spotlight background, one soft package
   bloom, minimal high-tracking type, accent pulled from the chip. → poster stage with radial
   background + centered chip, a single soft bloom, sparse callouts.

## Global anti-reference

Do not look like an EDA tool (Cadence / Synopsys / KLayout): no flat saturated rectangles on light
gray, no engineering chrome, no uniform grid of identical blocks, no web-safe primaries or system
fonts, no depthless flat fills. Tone = surreal / Sci-Fi / playful, presented like a premium keynote.

## Files

- [`visual-direction.md`](./visual-direction.md) — per-theme palette, glow/contrast, background,
  decorations, and anti-reference, as Konva tokens.
- [`hero-compositions.md`](./hero-compositions.md) — hero chip composition A (primary, built first)
  plus B/C alternates that prove the themes are genuinely distinct.
