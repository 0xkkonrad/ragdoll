import { chromium } from 'playwright'
const offsets = process.argv[2] ? JSON.parse(process.argv[2]) : [{ oy: -10 }]
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', e => console.log('PAGEERROR:', e.message))
await page.goto('http://localhost:5173/?t=' + Date.now(), { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__ragdoll && window.__ragdoll.pause, { timeout: 5000 })
await page.evaluate(() => {
  window.__ragdoll.pause()
  window.__ragdoll.setShellPos(0, -0.45)
})
for (const cfg of offsets) {
  await page.evaluate((c) => window.__ragdoll.setFace(c), cfg)
  await page.waitForTimeout(100)
  const name = `/tmp/ragdoll-face_${Object.entries(cfg).map(([k,v])=>`${k}${v}`).join('_')}.png`
  await page.screenshot({ path: name, clip: { x: 0, y: 0, width: 512, height: 512 } })
  console.log('wrote', name)
}
await browser.close()
