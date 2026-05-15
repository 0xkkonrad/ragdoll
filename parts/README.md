# Ragdoll body parts

One SVG per physics body. Each SVG is loaded by `src/main.js` and drawn over its
physics body every frame, rotated by `body.angle`.

## Convention

- **Origin (0, 0)** = the center of the physics body (the pivot Vite uses to rotate the part).
- **Scale**: `1 world unit = 100 SVG px`. The current physics scale puts the
  whole peanut at roughly 1.5 units tall, so the shell SVG is ~150 px tall.
- **Coordinates**: standard SVG y-down. In the physics world, +y is up, so when
  you draw "above the body center" in your editor, use a negative y value.
- **viewBox** is centered on the origin (e.g. `-50 -77.5 100 155` for the shell).
  Keep that property if you redesign — the renderer assumes origin is the center
  of the image bounding box.

## Pivots per part

| Part        | Pivot (0,0)       | Other named points                            |
|-------------|-------------------|-----------------------------------------------|
| shell       | body center       | shoulders ~(±35, -30), hips ~(±30, +45)       |
| arm         | center of segment | horizontal natural orientation. Shoulder end ~+x, wrist end ~-x. |
| leg         | center of segment | vertical natural orientation. Hip end -y, ankle end +y. |
| hand / foot | center            | —                                             |

## Stroke equalization

Each part's `width` / `height` is chosen so the visible black stroke matches
the shell's stroke, calibrated against the brand source artwork. Measured
source-px stroke widths:

| Part   | Source file             | Source stroke (px) | Source viewBox | display      |
|--------|-------------------------|-------------------:|---------------:|-------------:|
| shell  | Standing Body.svg       | 7.26               | 243×454        | 100×187      |
| arm    | Walking Legs 1.svg      | ~6.5               | 130×50         | 59.75×23.0   |
| leg    | Standing Legs 2.svg     | 6.62               | 67×144         | 30×64.5      |
| hand   | Standing right hand.svg | 6.60               | 142×150        | 64×67.6      |
| foot   | Standing Foot 4.svg     | 7.75               | 153×114        | 59×44.0      |
| face   | Cheers.svg              | 14.0               | 252×295        | 54×63        |

Formula: `display_width = (shell_width × shell_stroke / shell_viewBox) × (part_viewBox / part_stroke)`.
If you swap in new brand artwork, re-run the stroke measurement and recompute.

## Editing tips

- Yellow fill: `#FFCA05` (current brand) or `#FFC900` (Bruddle `yellow-1`).
- Outline / strokes: pure black `#000`.
- If you change the SVG's `width` / `height` attributes, the visible stroke
  changes. Recompute with the table above to keep strokes in sync.
- Edits hot-reload: Vite watches these via `?url` imports in `main.js`.
