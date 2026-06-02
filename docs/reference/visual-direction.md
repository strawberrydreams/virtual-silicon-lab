# Visual Direction Notes — Five Themes

> One direction note per theme named in the spec: `neon`, `retro`, `military`, `keynote`, `mono`.
> Each records **palette** (hex), **glow & contrast intent** (as Konva-renderable tokens),
> **background**, **decoration character**, and **one explicit anti-reference**.
>
> These are the source tokens for the Milestone 3 theme catalog. Values are starting points tuned
> for a dark, premium, Sci-Fi feel — refine them against rendered output, but keep each theme
> internally consistent (a one-click theme must change the *whole* die coherently).
>
> **All glow/effect tokens are Konva node settings**, never DOM/CSS. Neon lines use additive blend
> (`globalCompositeOperation: 'lighter'`); blooms use `shadowColor` + `shadowBlur` + `shadowOpacity`.

## Shared token shape (informs the M3 `themes/` catalog)

Each theme is expected to resolve to roughly this set of Konva-renderable tokens:

```text
background      radial/linear gradient stops for the poster/editor backdrop
dieBase         die fill (often a gradient) + optional thin-film overlay
dieStroke       die edge color + width
blockFill       default block panel fill (often translucent over the die)
blockStroke     default block edge color + width
accent[]        1–3 accent hues used for neon lines, highlights, key blocks
glow            { shadowColor, shadowBlur range, shadowOpacity range, blend }
text            label/typography color + weight/tracking intent
texture         optional bundled overlay (noise / scanline / brushed metal), low opacity
```

---

## 1. `neon` — electric Sci-Fi (the signature look)

The flagship cyberpunk look: deep dark base, electric accents, strong controlled glow.

- **Palette**
  - background: `#05060a` → `#0b0420` (near-black to deep indigo, radial)
  - dieBase: `#0d1117` → `#11162a` with a cool thin-film overlay
  - dieStroke: `#22d3ee` @ ~1.5px
  - blockFill: `#141a2e` (dark translucent panel, ~0.85 alpha over die)
  - blockStroke: `#2dd4bf` / `#22d3ee`
  - accent: cyan `#22d3ee`, hot magenta `#ff2bd6`, violet `#a855f7`
  - text: `#e6f9ff`
- **Glow & contrast intent:** high contrast, bright-on-black. `shadowColor` = the element's accent,
  `shadowBlur` 18–40, `shadowOpacity` 0.7–0.9. Neon **lines** drawn with blend `lighter` so crossings
  bloom additively. Strong value separation between the dark die and the glowing strokes.
- **Background:** radial spotlight from center, indigo falloff to near-black corners.
- **Decorations:** glowing neon routing lines, hex tick framing, bright key-block halos.
- **Anti-reference:** **not** RGB-gamer-keyboard rainbow vomit. Use **2 accent hues max per chip**
  (e.g. cyan + magenta), not all three at once. Restraint is what separates "neon" from "garish."

## 2. `retro` — aged 80s computing / warm phosphor

Vintage hardware: ceramic packages, gold traces, amber/phosphor-green glow, slightly aged.

- **Palette**
  - background: `#1a1208` → `#0f0a04` (warm dark brown, radial)
  - dieBase: `#2a2416` ceramic with gold traces `#d4af37`
  - dieStroke: `#d4af37` @ ~1.5px
  - blockFill: `#3a3320` (muted olive-tan panel)
  - blockStroke: `#8a6d1f`
  - accent: amber phosphor `#ffb000`, phosphor green `#33ff66`, rust `#c2570f`
  - text: `#ffb000` (monospaced)
- **Glow & contrast intent:** **softer, warmer** glow than neon. `shadowColor` amber/green,
  `shadowBlur` 10–20, `shadowOpacity` 0.4–0.6. Lower overall contrast; everything reads slightly
  desaturated and "aged." Gold traces catch a soft specular line, not a bloom.
- **Background:** warm dark with an optional subtle scanline texture overlay (very low opacity).
- **Decorations:** gold routing traces, amber labels, small phosphor indicator dots.
- **Anti-reference:** **not** modern neon brightness. Pull saturation **down**, warm the hues, and
  add a touch of age. If it looks pristine and electric, it's drifted into `neon`.

## 3. `military` — defense / avionics, matte and utilitarian

Restrained, industrial, premium-utilitarian. Stencil type, hazard marks, brushed gunmetal — earns
its look through **weight and detail**, not glow.

- **Palette**
  - background: `#14181a` → `#0e1112` (matte gunmetal, near-flat)
  - dieBase: `#2a2f31` → `#2f3a2c` (brushed gunmetal / olive drab gradient)
  - dieStroke: `#6b7d4f` @ ~2px
  - blockFill: `#23282a` (dark slate panel)
  - blockStroke: `#4a5550`
  - accent: olive `#6b7d4f`, sand/tan `#c2a878`, hazard amber `#f4a000`, signal red `#c0392b` (sparing)
  - text: `#c2a878` (stencil / condensed)
- **Glow & contrast intent:** **minimal glow** — `shadowBlur` 4–10, `shadowOpacity` ≤0.4, matte not
  glossy. Hierarchy comes from stroke weight, hazard stripes, stencil labels, rivets/bolts, and
  brushed-metal gradient — not bloom. Hazard amber/red used only as warnings, never decoration.
- **Background:** matte gunmetal, minimal vignette; optional brushed-metal texture overlay.
- **Decorations:** black/yellow hazard stripes, warning triangles, stencil serials, bolt/rivet marks.
- **Anti-reference:** **not** glossy or candy-colored. No bright neon blooms; no saturated rainbow.
  If it glows like a sign, it's wrong — military reads as matte, heavy, and earned.

## 4. `keynote` — Apple-silicon premium, minimal and restrained

The product-reveal look: brushed metal package, dark graphite stage, a single tasteful bloom,
ultra-minimal type. **Restraint is the entire point.**

- **Palette**
  - background: `#0a0a0c` → `#15151a` (deep graphite, radial spotlight)
  - dieBase: `#2b2d31` → `#3a3d42` (brushed space-gray metal) with a thin specular highlight
  - dieStroke: `#4a4d52` @ ~1px (subtle)
  - blockFill: `#33363b` (low-contrast tonal panel)
  - blockStroke: `#44474d`
  - accent: **one** signature gradient used sparingly — warm→cool `#ff8a5c` → `#a06bff`
    (or `#f5a623` → `#ec4899` → `#8b5cf6`)
  - text: `#f5f5f7` (light weight, generous tracking)
- **Glow & contrast intent:** **one** soft bloom around the package — `shadowColor` near-white or the
  accent, `shadowBlur` 30–60, `shadowOpacity` 0.3–0.5, very soft. Otherwise the die is monochrome
  metal; the accent gradient touches exactly one hero element. Medium-high contrast, lots of black.
- **Background:** deep graphite radial gradient with a soft spotlight directly behind the chip.
- **Decorations:** almost none. One product name, a few sparse spec callouts. Whitespace is a feature.
- **Anti-reference:** **not** busy. No competing glows, no clutter, no more than one accent gradient,
  no decorative lines. If you're tempted to add another glowing element, delete something instead.

## 5. `mono` — monochrome / editorial-technical

Single-hue discipline: hierarchy through **value and line weight**, not color. Reads like a high-craft
technical drawing or editorial diagram — beautiful through restraint.

- **Palette**
  - background: `#0c0c0d` → `#101216` (near-black, faint cool tint)
  - dieBase: `#16181b` with a fine grid
  - dieStroke: `#3a3f45` @ ~1px
  - blockFill: tonal grays `#1e2125` / `#2a2e33` (differentiated only by value)
  - blockStroke: `#4a4f55`
  - accent: **one** low-saturation hue — ice blue `#9db4cf` — or pure grayscale + a near-white
    highlight `#e8ebef`
  - text: `#c8ccd2` (technical, restrained)
- **Glow & contrast intent:** subtle, cool/white glow — `shadowBlur` 8–16, `shadowOpacity` ~0.3.
  Hierarchy is built from **value steps and line weight**, not hue. High structural clarity.
- **Background:** near-black with a faint fine grid; minimal vignette.
- **Decorations:** thin reference lines, measurement ticks, a single highlighted block.
- **Anti-reference:** **not** multi-color. One hue maximum (or none). Don't add decoration for its own
  sake — if it doesn't clarify hierarchy, remove it. Color creep turns `mono` into a weaker `neon`.

---

## Cross-theme consistency checklist (for the M3 gate)

- One-click theme switch changes background, die, blocks, accents, glow, and text **together** — no
  element keeps a previous theme's color.
- Every required visual effect renders **inside Konva** and survives `toDataURL()` export.
- Each chip stays within its theme's accent budget (neon ≤2 hues/chip; keynote/mono ≤1).
- No chip reads as an EDA-tool screenshot (see the global anti-reference in `README.md`).
