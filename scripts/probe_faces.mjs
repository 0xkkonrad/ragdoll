// Loads the generated-faces preview grid and writes a single screenshot.
// Used by the dev loop to eyeball each variant side-by-side with face.svg.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:5173/parts/generated/preview.html'
const OUT = process.env.OUT || '/tmp/faces-preview.png'

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 800 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))
await page.goto(URL + '?t=' + Date.now(), { waitUntil: 'networkidle' })
await page.waitForTimeout(120)
// Hide the PNG section (it may not exist yet) and crop the page tighter so
// the SVG row is fully visible without the page being absurdly tall.
await page.evaluate(() => {
    const h2s = [...document.querySelectorAll('h2')]
    const pngHeader = h2s.find((h) => /png/i.test(h.textContent || ''))
    if (pngHeader) {
        pngHeader.style.display = 'none'
        if (pngHeader.nextElementSibling) pngHeader.nextElementSibling.style.display = 'none'
    }
})
await page.waitForTimeout(80)
// Resize to natural fit and screenshot the SVG portion.
const dims = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }))
await page.setViewportSize({ width: Math.min(1600, dims.w), height: Math.min(900, dims.h + 24) })
await page.waitForTimeout(60)
await page.screenshot({ path: OUT, fullPage: false })
console.log('wrote', OUT)
await browser.close()
