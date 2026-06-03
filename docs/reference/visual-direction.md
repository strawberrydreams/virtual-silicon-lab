# Visual Direction — Five Themes

Source tokens for the M3 theme catalog (`src/themes/themeTokens.ts`). One note per theme:
palette (hex), glow/contrast intent, background, decorations, and one anti-reference. All glow is
Konva node settings (`shadowColor`/`shadowBlur`/`shadowOpacity`); neon lines use additive blend
(`globalCompositeOperation: 'lighter'`). A one-click theme switch must recolor the whole die.

## `neon` — electric Sci-Fi (signature)

- Palette: bg `#05060a`→`#0b0420`; die `#0d1117`→`#11162a`; stroke `#22d3ee`; accents cyan
  `#22d3ee`, magenta `#ff2bd6`, violet `#a855f7`; text `#e6f9ff`.
- Glow: high contrast; `shadowBlur` 18–40, opacity 0.7–0.9; neon lines blend `lighter`.
- Anti-reference: not RGB-gamer rainbow — **max 2 accent hues per chip** (e.g. cyan + magenta).

## `retro` — aged 80s / warm phosphor

- Palette: bg `#1a1208`→`#0f0a04`; die ceramic `#2a2416` + gold `#d4af37`; accents amber `#ffb000`,
  phosphor green `#33ff66`, rust `#c2570f`; text `#ffb000` (mono).
- Glow: softer/warmer; `shadowBlur` 10–20, opacity 0.4–0.6; lower contrast, slightly aged.
- Anti-reference: not modern neon — pull saturation down, warm the hues.

## `military` — defense/avionics, matte

- Palette: bg `#14181a`→`#0e1112`; die brushed gunmetal/olive `#2a2f31`→`#2f3a2c`; stroke `#6b7d4f`;
  accents olive `#6b7d4f`, sand `#c2a878`, hazard amber `#f4a000`, signal red `#c0392b` (sparing);
  text `#c2a878` (stencil).
- Glow: minimal (`shadowBlur` 4–10, opacity ≤0.4); hierarchy from stroke weight, hazard marks, stencil.
- Anti-reference: not glossy/candy — matte, heavy, earned.

## `keynote` — Apple-silicon premium, minimal

- Palette: bg `#0a0a0c`→`#15151a` (radial spotlight); die brushed space-gray `#2b2d31`→`#3a3d42`;
  stroke `#4a4d52`; one accent gradient `#ff8a5c`→`#a06bff`; text `#f5f5f7` (light, tracked).
- Glow: exactly one soft package bloom (`shadowBlur` 30–60, opacity 0.3–0.5); rest is monochrome metal.
- Anti-reference: not busy — one accent gradient, no decorative lines; whitespace is a feature.

## `mono` — monochrome / editorial-technical

- Palette: bg `#0c0c0d`→`#101216`; die `#16181b` + fine grid; stroke `#3a3f45`; tonal-gray blocks
  `#1e2125`/`#2a2e33`; one low-sat accent ice-blue `#9db4cf`; text `#c8ccd2`.
- Glow: subtle cool/white (`shadowBlur` 8–16, opacity ~0.3); hierarchy from value + line weight.
- Anti-reference: not multi-color — one hue max; color creep turns it into a weaker `neon`.

## M3 gate checklist

- One-click theme switch recolors background, die, blocks, accents, glow, and text together.
- Every required effect renders inside Konva and survives `toDataURL()`.
- Accent budget respected (neon ≤2 hues/chip; keynote/mono ≤1). No chip reads as an EDA screenshot.
