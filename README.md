# Ragdoll prototype

Local sandbox for a Peanut-mascot ragdoll.

> **Shipped in peanut-ui** — the engine + sprites were ported into `peanut-ui` as the
> rewards-screen easter egg. See **[peanutprotocol/peanut-ui#2061](https://github.com/peanutprotocol/peanut-ui/pull/2061)**
> for the integration (component, feature flag, drawer wiring).
>
> This repo stays as the **authoring sandbox** for the engine + parts. Edits land here
> first (hot-reload, no Next.js build cycle), then get ported across to
> [`peanut-ui/src/components/PeanutRagdoll/`](https://github.com/peanutprotocol/peanut-ui/tree/dev/src/components/PeanutRagdoll)
> when ready.

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

## Shipped — divergences from the original "What's next"

The integration in [peanut-ui#2061](https://github.com/peanutprotocol/peanut-ui/pull/2061)
landed with these calls (different from this README's original speculation):

- **Trigger** is **triple-click on the "Rewards" heading** in `/rewards`, not a konami
  code or hidden route. Discovered organically, no docs needed.
- **Modal** is the existing vaul-based bottom-sheet **Drawer** (`max-h-[80vh]`,
  `md:max-w-xl`), not a fullscreen canvas overlay. Matches the rest of the app's
  design system (BadgeStatusDrawer, ChooseNetworkDrawer, ContributorsDrawer).
- **Sizing** is **container-responsive** via `ResizeObserver` on the canvas's parent,
  not viewport-locked. The cage reflows to the drawer panel.
- **Lifecycle** wrapped in `startRagdoll(canvas) → cleanup` instead of the old
  module-level `start()` + `window.__ragdoll` debug API. Clean mount/unmount, no
  leaked RAF or listeners.
- **No leaderboard / scoring.** Just the toy.
- **Feature-flagged** but **on by default** — `NEXT_PUBLIC_RAGDOLL_ENABLED=false`
  is the kill-switch (build-time, dead-code-eliminates the chunk + `p2-es`).
- **Dev chrome stripped** from the production port: `tune` struct, `drawDebug`,
  `WIREFRAMES`, R-key reset, `window.__ragdoll` — all gone. Still here in this
  sandbox for authoring.
- **`p2-es` pinned exact** (`1.2.3`, no caret) in peanut-ui's package.json.

### Future placements (post-launch, pending team buy-in)

The `PeanutRagdoll` component is reusable wherever a peanut would soften the moment.
Ideas listed in the [component header in peanut-ui](https://github.com/peanutprotocol/peanut-ui/blob/dev/src/components/PeanutRagdoll/index.tsx):

- KYC "verifying" wait modal — flop a peanut while Sumsub takes 1–3 days.
- 404 page — face-planted ragdoll instead of the static crying-peanut GIF.
- Activation milestones — 2 s ragdoll-confetti when a step flips done.
- Tier-up moment on `/rewards` — auto-open this drawer, drop the new badge as
  a physics body that lands on the peanut.
- Card activation — peanut + card + coins, all in one physics box.
- Peanut Jail / waitlist — peanut bumping the bars beats a static "you're on
  the list" gif.

### Authoring workflow now

Edit here → smoke-test in Vite (`npm run dev`) → mirror the change to
[`peanut-ui/src/components/PeanutRagdoll/`](https://github.com/peanutprotocol/peanut-ui/tree/dev/src/components/PeanutRagdoll)
and open a PR against `dev`. Keep the two `main.js` ↔ `ragdoll.ts` files in
sync manually for now — the runtime port is intentionally minimally diverged
(refactored to take a canvas + return a cleanup, container-sized rather than
viewport-sized; everything else is one-for-one).
