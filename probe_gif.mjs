import { chromium } from 'playwright'
import { readFileSync } from 'fs'
const buf = readFileSync('/workspaces/sandbox/ragdoll/parts/512X512_ALPHA_GIF_konradurban_01.2f08c28c.gif')
const b64 = buf.toString('base64')
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 600, height: 600 } })
const page = await ctx.newPage()
await page.setContent(`
<html><body style="margin:0;background:#EFE4FF;display:flex;align-items:center;justify-content:center;height:100vh">
  <img src="data:image/gif;base64,${b64}" style="width:512px;height:512px;background:#fff"/>
</body></html>`)
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/mascot-orig.png' })
await browser.close()
