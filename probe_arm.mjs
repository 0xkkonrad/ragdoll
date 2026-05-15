import { chromium } from 'playwright'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } })
const page = await ctx.newPage()
const angles = [0, -15, -30, -45, -60, -75, -90]
const cells = angles.map(deg => `
  <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
    <div style="font:11px sans-serif">${deg}°</div>
    <div style="position:relative;width:120px;height:60px;background:#fff;border:1px solid #000;display:flex;align-items:center;justify-content:center">
      <img src="http://localhost:5173/parts/arm.svg" style="transform:rotate(${deg}deg)"/>
      <div style="position:absolute;left:5px;right:5px;top:50%;height:1px;background:red"></div>
      <div style="position:absolute;left:10px;right:10px;top:30%;bottom:30%;border:1px dashed blue"></div>
    </div>
  </div>`).join('')
await page.setContent(`
<html><body style="margin:0;background:#EFE4FF;padding:20px;font-family:sans-serif">
  <p>arm.svg rotated by N°. Red = horizontal center line. Blue dashed = physics box outline (~ARM_L × ARM_W).</p>
  <div style="display:flex;gap:20px;flex-wrap:wrap">${cells}</div>
</body></html>`)
await page.waitForTimeout(500)
await page.screenshot({ path: '/tmp/arm-rotations.png' })
await browser.close()
