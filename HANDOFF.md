# Handoff: embed peanut ragdoll as easter egg

Two things to do before this ships inside the host app's easter-egg modal.

## Scope

1. Make the canvas responsive to its container (the modal) instead of the viewport.
2. Strip all dev-only chrome so only the playable ragdoll remains.

---

## 1. Container-responsive sizing

The widget will mount inside a modal whose size depends on the device. Today everything reads from `window.innerWidth/Height` and listens to `window.resize`. Rewire to read from a wrapping element.

### `index.html`
- Wrap `<canvas id="stage">` in `<div id="stage-wrap" style="position:relative;width:100%;height:100%">`.
- Canvas CSS: drop `100vw/100vh`, use `display:block; width:100%; height:100%`.
- If any HUD/overlay survives the strip, switch it from `position:fixed` to `position:absolute` inside `#stage-wrap`.

### `src/main.js`
- Replace every `window.innerWidth` / `window.innerHeight` in `resize()` and `drawPhoneFrame()` with `wrap.clientWidth` / `wrap.clientHeight`.
- Replace `window.addEventListener('resize', resize)` with `new ResizeObserver(resize).observe(wrap)`.
- Pointer math already uses `canvas.getBoundingClientRect()` — no changes needed for drag interactions.

That's the whole responsive change. Maybe 15 lines of diff.

---

## 2. Strip dev-only chrome

### `index.html` — delete
- The entire `#tune` panel (`<div id="tune">…</div>`) and the wire-up `<script>` below it.
- The `#debug-toggle` `<button>` and the `~`-key toggle script.
- The `#hud` div (or replace with a one-line "tap to play").
- The `#err` `<pre>` overlay and its global error / unhandledrejection listeners.

### `src/main.js` — delete
- `tune.WIREFRAMES` and `drawDebug()` (the blue shape outlines + green/red joint dots).
- `tune.HAND_FLIPX`, `tune.HAND_FLIPY` — these were panel-only knobs; bake the actual booleans into the hand setup.
- `window.__ragdoll` debug API: `setTune`, `tune` getter, `setFace`, `getFace`, `pause`, `resume`, `thaw`, `respawn`. Keep only what the host actually needs (see below).
- The `R` key reset handler — decide based on the host's UX whether reset should be tied to a host control instead.
- Inline the surviving entries from the `tune` object (ARM_L, LEG_L, SHOULDER_X, HIP_X, joint-degree limits, HAND_DEG) as plain constants at module top; there's no panel left to override them.

### Keep
- Face state machine (cheers → idle pool → sleep, mood-weighted, with smug winks).
- Surprised-on-grab face.
- Face bobble inertia.
- Phone-cage walls + responsive cage fit.
- Mouse drag (`mousedown`/`move`/`up` on canvas).
- Sprite bitmap cache.

---

## Optional public API

Once stripped, expose a tiny lifecycle on a default export rather than `window`:

```js
export function mount(containerEl) { /* … */ }
export function unmount() { /* tear down listeners + ResizeObserver */ }
```

Host imports and mounts on modal open, unmounts on close. Makes it easy to ship as an npm package or inline module in the peanut-ui repo.

---

## Out of scope

- Visual styling of the modal itself (host's concern).
- The face-generator scripts under `scripts/` and `parts/generated*` — those are authoring tools, not runtime assets. Either delete or keep in the dev branch but exclude from the production bundle.
