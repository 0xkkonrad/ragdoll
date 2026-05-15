// Renders the ragdoll with each generated face swapped in, and screenshots
// them all into a single composite tile. Lets us check style consistency at
// game scale, not just preview-grid scale.
import { chromium } from 'playwright'
import { readdir } from 'node:fs/promises'

const VARIANTS_DIR = '/workspaces/sandbox/ragdoll/parts/generated'
const URL = 'http://localhost:5173/?t=' + Date.now()
const OUT = '/tmp/faces-in-context.png'

const files = (await readdir(VARIANTS_DIR)).filter((f) => f.endsWith('.svg')).sort()
const labels = ['face.svg (original)', ...files.map((f) => f.replace('.svg', ''))]
const urls = ['/parts/face.svg', ...files.map((f) => `/parts/generated/${f}`)]

const browser = await chromium.launch()
// Big viewport → big render → big face when we crop tight to the head.
const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__ragdoll && window.__ragdoll.pause, { timeout: 5000 })
await page.evaluate(() => {
    window.__ragdoll.pause()
    // Also disable the auto-sleepy swap so it doesn't override our custom face.
    window.__ragdoll.setTune({ SLEEPY: false })
    window.__ragdoll.setShellPos(0, -1.0)  // shift down a bit so head is near canvas top
    const t = document.getElementById('tune'); if (t) t.style.display = 'none'
    const h = document.getElementById('hud'); if (h) h.style.display = 'none'
})

// Probe the canvas position of the upper lobe so we can crop exactly to the
// face. With pixelsPerUnit = min(w,h)/6 and shell.position[1] = -1.0 + 0.5
// (build adds +0.5), face center is at canvas (cx, cy_face). Just compute
// it in-page to be robust to render-loop tweaks.
const { faceX, faceY, ppu } = await page.evaluate(() => {
    const w = window.innerWidth, h = window.innerHeight
    const ppu = Math.min(w, h) / 6
    // Mirrors worldToScreen with cameraOffset {x:0, y:-1.5} and the current
    // shell position. Upper-lobe center ≈ shell.position[1] + 0.275 in world.
    const sx = w / 2
    const shellY = -1.0 + 0.5 + 0.275
    const sy = h / 2 - (shellY - (-1.5)) * ppu
    return { faceX: sx, faceY: sy, ppu }
})
// Face sprite is drawn at faceCfg.w = 54 SVG-px, scaled by ppu/100.
const halfW = (54 / 100) * ppu * 1.4 // a bit of padding
const halfH = (63 / 100) * ppu * 1.4
const clip = {
    x: Math.max(0, Math.round(faceX - halfW)),
    y: Math.max(0, Math.round(faceY - halfH)),
    width: Math.round(halfW * 2),
    height: Math.round(halfH * 2),
}

const shots = []
for (let i = 0; i < urls.length; i++) {
    await page.evaluate(async (url) => {
        const img = new Image()
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
        window.__ragdoll.setFaceSprite(img)
    }, urls[i])
    await page.waitForTimeout(120)
    const buf = await page.screenshot({ clip })
    shots.push({ buf, label: labels[i] })
}

// Stitch the shots into a 4-column composite via a tiny in-page canvas.
const dataURIs = shots.map((s) => `data:image/png;base64,${s.buf.toString('base64')}`)
await page.setContent(`<!doctype html><meta charset=utf-8/><style>
body{margin:0;background:#EFE4FF;font-family:system-ui;}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:16px}
.c{background:white;border:2px solid #000;border-radius:12px;padding:8px;text-align:center;}
.c img{display:block;width:100%;height:auto;image-rendering:-webkit-optimize-contrast;}
.l{font:600 13px system-ui;margin-top:6px}
</style><div class=g>${shots.map((s, i) => `<div class=c><img src="${dataURIs[i]}"/><div class=l>${s.label}</div></div>`).join('')}</div>`)
const cols = 4
const rows = Math.ceil(shots.length / cols)
// Keep output ≤1000 px wide for downstream viewers.
await page.setViewportSize({ width: 980, height: 120 + rows * 220 })
await page.waitForTimeout(120)
await page.screenshot({ path: OUT, fullPage: true })
console.log('wrote', OUT)
await browser.close()
