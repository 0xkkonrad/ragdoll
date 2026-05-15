# Ragdoll prototype

Local sandbox for a Peanut-mascot ragdoll. Eventual goal: ship this as an
easter-egg game inside `peanut-ui`.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173/
```

Drag any body part with the mouse. Press `R` to reset.

## What's in here

```
ragdoll/
├── index.html        page shell + canvas + error overlay
├── src/
│   └── main.js       physics world, render loop, mouse drag
├── parts/
│   ├── shell.svg ⎫
│   ├── arm.svg   ⎪ one SVG per physics body — edit these to
│   ├── leg.svg   ⎬ redesign the mascot. Hot-reloads on save.
│   ├── hand.svg  ⎪ See parts/README.md for pivot/stroke conventions.
│   ├── foot.svg  ⎪
│   └── README.md ⎭ edit rules + pivot/coord/stroke conventions
├── probe.mjs         Playwright screenshot helper (dev only)
└── package.json      vite + p2-es
```

## Stack

- **Physics**: [p2-es](https://github.com/pmndrs/p2-es) — 2D rigid body physics.
  Faithful re-creation of the upstream
  [ragdoll demo](https://p2-es.pmnd.rs/demos/ragdoll.html) but restructured for
  the Peanut mascot's anatomy (peanut-shell torso instead of head+upperBody).
- **Rendering**: plain Canvas2D + `drawImage` with loaded SVGs.
  No `@p2-es/sandbox` — the sandbox UI was useful for the upstream demo but
  not for an embedded easter-egg.
- **Build**: Vite. SVGs are imported as `?url` so file changes trigger HMR.

## How a frame works

```
requestAnimationFrame ─┐
   │                   │
   │  world.step(1/60) │   ← p2 advances bodies + resolves constraints
   │                   │
   │  render()         │
   │    ├─ drawGround()│
   │    └─ for each body:                ┐
   │         drawSprite(body)            │
   │           translate to body.position│
   │           rotate by -body.angle     │  ← physics → screen mapping
   │           scale by pixelsPerUnit/100│
   │           drawImage(body.__sprite)  ┘
   └───────────────────┘
```

The shell is a compound body of two `p2.Circle` shapes at `±SHELL_OVERLAP/2`,
producing the peanut silhouette automatically. Limbs are `p2.Box` segments,
hands/feet are `p2.Circle`. Joints are all `RevoluteConstraint` with
`setLimits()` for cartoon-stiff ragdoll behaviour.

## Coordinate conventions

- **World**: y-up, meters-ish. Gravity `[0, -10]`. Camera centered on
  `(0, -1.5)`, ground at `y = -1.5`.
- **Canvas**: y-down. `worldToScreen()` flips and scales.
- **SVG**: y-down (matches canvas). 1 world unit = 100 SVG px. ViewBox of each
  part is centered on `(0, 0)` so the SVG origin lines up with the physics body
  center.

## Editing the mascot

1. Open any file in [parts/](parts/) in Figma/Inkscape/Illustrator.
2. Edit. Save back to the same path.
3. The page hot-reloads.

Hard rules — see [parts/README.md](parts/README.md) for the full list:

- Don't move the SVG origin off `(0, 0)`.
- Don't change `width` / `height` unless you also bump the matching constant in
  [src/main.js](src/main.js) (`SHELL_LOBE_R`, `ARM_L`, `ARM_W`, `LEG_L`, `LEG_W`, `HAND_R`, …).
- Physics shape ≠ SVG shape. If you redraw a foot as a shoe, the *collision*
  is still a circle. To change collisions, edit the physics shape in
  `makeShellBody` / `makeLimbSegment` / `makeEndCap`.

## Known limitations

- Hands/feet collide as circles even if drawn otherwise.
- The ragdoll has no balance — it always tips over. That's the
  point of a ragdoll, but if we want a "stand still until disturbed" mode we'd
  need motor constraints on hips/spine.
- Mouse interaction only — no touch yet.
- Single fixed camera. No zoom/pan.

## What's next

Eventual home is [peanut-ui](../mono/peanut-ui/) as an easter egg. Likely shape:

1. `<PeanutRagdoll />` client component — fullscreen canvas overlay with close
   button.
2. Trigger: konami code, secret long-press on the logo, or a hidden route.
3. Optional score/leaderboard via `localStorage`.

When we port: the SVGs and `main.js` move under `peanut-ui/src/`; the canvas
becomes a `useRef` inside a `'use client'` component; `p2-es` lands as a real
dependency (subject to the repo's 14-day supply-chain floor).
