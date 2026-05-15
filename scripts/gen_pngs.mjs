// Rasterizes every parts/generated/*.svg to a high-resolution transparent PNG
// in parts/generated-png/. Engine: headless Chromium via Playwright — same
// renderer the runtime uses for SVG `<img>` loads, so the PNGs are pixel-for-
// pixel what a browser would draw, but baked in. Output is at 4× the SVG's
// declared display size, which gives the runtime headroom for HiDPI / zoomed
// canvases without blurring.

import { chromium } from 'playwright'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const IN_DIR = resolve(ROOT, 'parts/generated')
const OUT_DIR = resolve(ROOT, 'parts/generated-png')

// Output scale relative to the SVG viewBox. The faces use viewBox 252×295,
// so SCALE=4 → ~1008×1180 PNG. That's enough for 3× DPR at 2× page zoom.
const SCALE = 4

function parseSvgDims(svgRaw) {
    const vb = svgRaw.match(/viewBox="([\d.\-\s]+)"/)
    if (vb) {
        const [, , vw, vh] = vb[1].trim().split(/\s+/).map(Number)
        return { vw, vh }
    }
    const w = +(svgRaw.match(/\bwidth="(\d+)"/)?.[1] || 252)
    const h = +(svgRaw.match(/\bheight="(\d+)"/)?.[1] || 295)
    return { vw: w, vh: h }
}

async function main() {
    await mkdir(OUT_DIR, { recursive: true })
    const files = (await readdir(IN_DIR)).filter((f) => f.endsWith('.svg')).sort()
    if (files.length === 0) {
        console.warn('[gen_pngs] no SVGs in', IN_DIR)
        return
    }

    const browser = await chromium.launch()
    // deviceScaleFactor: 1 — we control output resolution via the viewport
    // size + SVG dimensions explicitly; baking dpr in would double again.
    const ctx = await browser.newContext({ deviceScaleFactor: 1 })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => console.log('PAGEERROR:', e.message))

    for (const f of files) {
        const svgRaw = await readFile(resolve(IN_DIR, f), 'utf8')
        const { vw, vh } = parseSvgDims(svgRaw)
        const outW = Math.round(vw * SCALE)
        const outH = Math.round(vh * SCALE)
        // Force the SVG to render at the output size by overriding its declared
        // width/height — the viewBox stays so the artwork scales without crop.
        const sized = svgRaw.replace(
            /<svg([^>]*)\bwidth="\d+(?:\.\d+)?"\s*height="\d+(?:\.\d+)?"/,
            `<svg$1width="${outW}" height="${outH}"`,
        )
        await page.setViewportSize({ width: outW, height: outH })
        await page.setContent(
            `<!doctype html><html><body style="margin:0;background:transparent;">${sized}</body></html>`,
            { waitUntil: 'domcontentloaded' },
        )
        const outPath = resolve(OUT_DIR, f.replace(/\.svg$/, '.png'))
        await page.screenshot({
            path: outPath,
            omitBackground: true,
            clip: { x: 0, y: 0, width: outW, height: outH },
        })
        console.log('wrote', outPath, `(${outW}×${outH})`)
    }
    await browser.close()
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
