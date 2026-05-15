// Pair-comparison probe: stacks each generated variant beside its closest
// brand-source reference so we can eyeball topology side-by-side at readable
// size. Writes /tmp/faces-pairs.png.
import { chromium } from 'playwright'

// Each pair: [brand source filename, generated variant filename, label]
// Only the variants whose topology I just fixed — focus on what changed.
const PAIRS = [
    ['face.svg',     'smile_4_laugh.svg', 'smile_4_laugh vs face.svg'],
    ['Talking.svg',  'smile_3_open.svg',  'smile_3_open vs Talking'],
    ['Excited.svg',  'oh.svg',            'oh vs Excited'],
]

const OUT = '/tmp/faces-pairs.png'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 980, height: 1200 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const cells = PAIRS.map(([brand, gen, label]) => `
<div class="pair">
  <div class="lab">${label}</div>
  <div class="row">
    <div class="img"><img src="http://localhost:5173/parts/${brand}"/><div class="sub">brand</div></div>
    <div class="img"><img src="http://localhost:5173/parts/generated/${gen}"/><div class="sub">generated</div></div>
  </div>
</div>`).join('')

await page.setContent(`<!doctype html><meta charset=utf-8/><style>
body { margin:0; padding:18px; background:#EFE4FF; font-family:system-ui,sans-serif; }
.grid { display:grid; grid-template-columns: 1fr; gap:14px; }
.pair { background:#fff; border:2px solid #000; border-radius:14px; padding:10px; }
.lab { font-size:12px; font-weight:700; margin-bottom:6px; }
.row { display:flex; gap:8px; }
.img { flex:1; background:#FFCA05; border:2px solid #000; border-radius:10px; padding:8px;
       display:flex; flex-direction:column; align-items:center; }
.img img { width:380px; height:380px; object-fit:contain; image-rendering:-webkit-optimize-contrast; }
.sub { font-size:10px; opacity:0.7; margin-top:4px; }
</style><div class="grid">${cells}</div>`, { waitUntil: 'networkidle' })
await page.waitForTimeout(150)
const dims = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
}))
await page.setViewportSize({ width: Math.min(980, dims.w), height: Math.min(2000, dims.h + 24) })
await page.waitForTimeout(80)
await page.screenshot({ path: OUT, fullPage: true })
console.log('wrote', OUT)
await browser.close()
