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
const ctx = await browser.newContext({ viewport: { width: 320, height: 380 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__ragdoll && window.__ragdoll.pause, { timeout: 5000 })
await page.evaluate(() => {
    window.__ragdoll.pause()
    window.__ragdoll.setShellPos(0, -0.55)
    const t = document.getElementById('tune'); if (t) t.style.display = 'none'
    const h = document.getElementById('hud'); if (h) h.style.display = 'none'
})

const shots = []
for (let i = 0; i < urls.length; i++) {
    // Swap the face sprite by loading a new Image into the running module.
    await page.evaluate(async (url) => {
        const img = new Image()
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url })
        // Patch both face slots so we don't care about dragging state.
        // We do this by reaching into the module-scope `sprites` map through the
        // global hook surface: expose a setter from main.js, or replace via
        // monkey patch on the canvas-context-bound state. The simplest is to
        // expose `setFaceSprite` in main.js — see __ragdoll.setFaceSprite below.
        window.__ragdoll.setFaceSprite(img)
    }, urls[i])
    await page.waitForTimeout(150)
    const buf = await page.screenshot({ clip: { x: 30, y: 20, width: 260, height: 340 } })
    shots.push({ buf, label: labels[i] })
}

// Stitch the shots into a 4-column composite via a tiny in-page canvas.
const dataURIs = shots.map((s) => `data:image/png;base64,${s.buf.toString('base64')}`)
await page.setContent(`<!doctype html><meta charset=utf-8/><style>
body{margin:0;background:#EFE4FF;font-family:system-ui;}
.g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px}
.c{background:white;border:2px solid #000;border-radius:12px;padding:6px;text-align:center;}
.c img{display:block;width:100%;height:auto}
.l{font:600 11px system-ui;margin-top:4px}
</style><div class=g>${shots.map((s, i) => `<div class=c><img src="${dataURIs[i]}"/><div class=l>${s.label}</div></div>`).join('')}</div>`)
await page.setViewportSize({ width: 1200, height: 900 })
await page.waitForTimeout(80)
await page.screenshot({ path: OUT, fullPage: true })
console.log('wrote', OUT)
await browser.close()
