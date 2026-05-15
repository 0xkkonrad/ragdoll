// Loads the generated-faces preview grid and writes a single screenshot.
// Used by the dev loop to eyeball each variant side-by-side with face.svg.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:5173/parts/generated/preview.html'
const OUT = process.env.OUT || '/tmp/faces-preview.png'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle' })
await page.waitForTimeout(120)
await page.screenshot({ path: OUT, fullPage: true })
console.log('wrote', OUT)
await browser.close()
