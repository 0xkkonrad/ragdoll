// Generates Peanut-mascot face sprite variants from a small set of parametric
// primitives. Eye paths are pulled verbatim from the master face.svg so the
// brand style (yellow squint-pupils, curl highlights, sharp peaks) is identical
// across every output. Only the *mouth* varies between most outputs, plus an
// "eyes closed" override for sleeping / blink states.
//
// Coordinate system: viewBox `0 0 252 295` (matches parts/face.svg). The render
// in src/main.js scales by `faceCfg.w` (default 54 px) so any width/height
// attributes here only affect the file's pixel size for previews — the runtime
// renderer reads viewBox-units and applies its own scale.

import { writeFile, readFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_DIR = resolve(ROOT, 'parts/generated')

// Extracted from parts/face.svg. Each "open eye" is built from:
//   - black outer outline (with internal subpaths for the curl + pupil holes)
//   - white sclera fill over the curl region
//   - white pupil highlight glint
// The left eye also has the yellow pupil-fill that gives Peanut his squinty grin.
const EYE_LEFT_OUTLINE =
    'M53.4308 4.39833e-06H57.8316C67.9527 0.584445 77.5224 5.2305 84.9408 11.9933C94.5893 20.6863 101.161 32.2916 105.508 44.4027C111.218 60.6836 112.902 78.2561 111.09 95.3718C118.258 99.2812 124.209 105.46 127.424 112.989C128.103 114.693 128.994 116.446 128.841 118.337C128.748 119.722 127.911 120.896 127.049 121.927C125.11 123.479 122.132 123.818 120.118 122.227C118.41 121.102 118.011 118.985 117.209 117.252C114.295 110.543 108.245 105.464 101.368 103.122C93.5851 100.445 84.6455 100.759 77.291 104.58C71.7087 107.39 67.3669 112.537 65.5947 118.528C63.5764 125.173 63.7979 132.427 65.7719 139.053C68.312 147.755 75.002 155.245 83.5871 158.349C89.0168 160.402 95.1209 160.029 100.561 158.216C106.094 156.34 110.568 152.072 113.374 147.029C114.378 145.305 115.013 143.144 116.943 142.196C119.419 140.776 122.614 141.818 124.258 144.013C125.061 145.663 125.376 147.638 124.563 149.347C121.438 156.188 116.402 162.278 109.815 166.04C103.45 169.723 95.9233 171.104 88.6279 170.652C81.3571 170.077 74.4949 166.934 68.7748 162.519C59.8696 165.578 49.8815 165.411 41.1684 161.792C29.9102 157.224 21.0641 148.168 14.7336 138.016C4.90299 122.114 0.452887 103.353 0 84.7979V79.7147C0.27567 70.0837 1.55064 60.4528 4.16459 51.1656C8.18149 36.8738 15.1422 23.024 26.0705 12.7447C33.4693 5.67743 43.1276 0.775984 53.4308 4.39833e-06ZM33.5776 20.7305C24.2639 29.3939 18.5683 41.2301 15.1028 53.297C9.75675 72.7898 9.88474 93.8101 15.6443 113.2C19.1591 124.569 24.7315 135.644 33.4939 143.895C40.0854 150.064 49.0447 154.243 58.2304 153.369C57.9399 153.084 57.6249 152.824 57.2951 152.593C47.3808 146.316 39.9279 136.828 34.4194 126.603C25.6176 109.904 21.6647 90.8437 22.1028 72.0384C31.0916 73.2024 40.7204 71.9598 48.4638 67.0142C52.2247 64.5045 55.6607 60.6934 55.8773 55.9688C56.1678 51.6321 53.544 47.7129 50.2803 45.1001C44.2057 40.2773 36.2506 38.4699 28.6205 38.3373C32.7211 28.2692 38.9089 18.7856 47.8091 12.3224C42.4729 13.9284 37.6142 16.9242 33.5776 20.7305ZM59.0623 89.8516C53.416 90.9615 48.6164 95.4357 47.11 100.976C45.1065 107.591 48.2029 115.169 54.1052 118.7C54.6614 116.436 55.3211 114.192 56.217 112.041C59.4463 104.173 65.7916 97.8078 73.4267 94.1146C69.7347 90.436 64.1721 88.7269 59.0623 89.8516Z'
const EYE_LEFT_SCLERA =
    'M33.5776 20.7305C37.6142 16.9242 42.4729 13.9284 47.8091 12.3224C38.9089 18.7856 32.7211 28.2692 28.6205 38.3373C36.2506 38.4699 44.2057 40.2773 50.2803 45.1001C53.544 47.7129 56.1678 51.6321 55.8773 55.9688C55.6607 60.6934 52.2247 64.5045 48.4638 67.0142C40.7204 71.9598 31.0916 73.2024 22.1028 72.0384C21.6647 90.8437 25.6176 109.904 34.4194 126.603C39.9279 136.828 47.3808 146.316 57.2951 152.593C57.6249 152.824 57.9399 153.084 58.2304 153.369C49.0447 154.243 40.0854 150.064 33.4939 143.895C24.7315 135.644 19.1591 124.569 15.6443 113.2C9.88474 93.8101 9.75675 72.7898 15.1028 53.297C18.5683 41.2301 24.2639 29.3939 33.5776 20.7305Z'
const EYE_LEFT_GLINT =
    'M59.0623 89.8516C64.1721 88.7269 69.7347 90.436 73.4267 94.1146C65.7916 97.8078 59.4463 104.173 56.217 112.041C55.3211 114.192 54.6614 116.436 54.1052 118.7C48.2029 115.169 45.1065 107.591 47.11 100.976C48.6164 95.4357 53.416 90.9615 59.0623 89.8516Z'
const EYE_LEFT_PUPIL =
    'M77.291 104.58C84.6455 100.759 93.5851 100.445 101.368 103.122C108.245 105.464 114.295 110.543 117.209 117.252C118.011 118.985 118.41 121.102 120.118 122.227C122.132 123.818 125.11 123.479 127.049 121.927C128.477 129.343 127.522 137.196 124.258 144.013C122.614 141.818 119.419 140.776 116.943 142.196C115.013 143.144 114.378 145.305 113.374 147.029C110.568 152.072 106.094 156.34 100.561 158.216C95.1209 160.029 89.0168 160.402 83.5871 158.349C75.002 155.245 68.312 147.755 65.7719 139.053C63.7979 132.427 63.5764 125.173 65.5947 118.528C67.3669 112.537 71.7087 107.39 77.291 104.58Z'

const EYE_RIGHT_OUTLINE =
    'M193.717 0H198.133C208.722 0.618819 218.665 5.70198 226.212 12.9854C235.245 21.5162 241.492 32.6108 245.656 44.221C250.382 57.56 252.356 71.8027 251.948 85.9226C251.421 103.274 247.296 120.739 238.563 135.85C233.965 143.713 228.083 150.967 220.644 156.321C213.388 161.61 204.508 164.901 195.45 164.68C185.551 164.567 176.055 160.309 168.582 153.983C157.9 144.931 150.688 132.418 146.184 119.309C139.72 100.224 138.637 79.4593 142.374 59.7013C145.529 43.7397 152.022 28.0433 163.128 15.9272C170.994 7.24412 181.849 0.849649 193.717 0ZM170.226 24.3893C161.306 34.6391 156.221 47.6736 153.538 60.8457C150.073 78.6588 150.87 97.3756 156.349 114.707C160.076 126.19 166.037 137.319 175.316 145.28C181.672 150.702 190.035 154.165 198.497 153.374C197.217 152.234 195.672 151.458 194.323 150.417C185.516 143.831 178.846 134.799 173.83 125.105C165.633 108.735 161.882 90.2838 162.311 72.0286C170.876 73.1729 180.003 72.063 187.564 67.6969C191.561 65.3591 195.268 61.7297 196.001 56.9707C196.769 52.2313 193.949 47.6786 190.266 44.9135C184.212 40.2724 176.424 38.4405 168.897 38.3521C172.894 28.2447 179.156 18.7659 188.061 12.3273C181.036 14.3851 174.996 18.9477 170.226 24.3893ZM199.674 89.7681C193.673 90.824 188.514 95.6321 187.18 101.585C185.688 107.404 188.012 113.882 192.728 117.571C197.414 121.377 204.336 122.011 209.682 119.241C216.322 115.97 219.881 107.709 217.578 100.666C215.461 93.2207 207.299 88.2014 199.674 89.7681Z'
const EYE_RIGHT_SCLERA =
    'M170.226 24.3893C174.996 18.9477 181.036 14.3851 188.061 12.3273C179.156 18.7659 172.894 28.2447 168.897 38.3521C176.424 38.4405 184.212 40.2724 190.266 44.9135C193.949 47.6786 196.769 52.2313 196.001 56.9707C195.268 61.7297 191.561 65.3591 187.564 67.6969C180.003 72.063 170.876 73.1729 162.311 72.0286C161.882 90.2838 165.633 108.735 173.83 125.105C178.846 134.799 185.516 143.831 194.323 150.417C195.672 151.458 197.217 152.234 198.497 153.374C190.035 154.165 181.672 150.702 175.316 145.28C166.037 137.319 160.076 126.19 156.349 114.707C150.87 97.3756 150.073 78.6588 153.538 60.8457C156.221 47.6736 161.306 34.6391 170.226 24.3893Z'
const EYE_RIGHT_GLINT =
    'M199.674 89.7681C207.299 88.2014 215.461 93.2207 217.578 100.666C219.881 107.709 216.322 115.97 209.682 119.241C204.336 122.011 197.414 121.377 192.728 117.571C188.012 113.882 185.688 107.404 187.18 101.585C188.514 95.6321 193.673 90.824 199.674 89.7681Z'

const YELLOW = '#FFCA05'
const RED = '#C44055'
const PINK = '#FFB8C6'
const CREAM = '#FFF9F6'

// Render the "open eyes" stack (used by every face except sleeping/closed).
function eyesOpen() {
    return [
        `<path d="${EYE_LEFT_OUTLINE}" fill="black"/>`,
        `<path d="${EYE_RIGHT_OUTLINE}" fill="black"/>`,
        `<path d="${EYE_LEFT_SCLERA}" fill="white"/>`,
        `<path d="${EYE_RIGHT_SCLERA}" fill="white"/>`,
        `<path d="${EYE_LEFT_GLINT}" fill="white"/>`,
        `<path d="${EYE_RIGHT_GLINT}" fill="white"/>`,
        `<path d="${EYE_LEFT_PUPIL}" fill="${YELLOW}"/>`,
    ].join('\n')
}

// Closed eyes: gentle ^^ smile-eye lines. Match the face stroke (~14 px in
// 252×295) and use round caps so the linework matches the rest of the brand.
function eyesClosedHappy() {
    const w = 14
    return [
        `<path d="M12 95 Q 65 50 118 95" stroke="black" stroke-width="${w}" fill="none" stroke-linecap="round"/>`,
        `<path d="M134 95 Q 187 50 240 95" stroke="black" stroke-width="${w}" fill="none" stroke-linecap="round"/>`,
    ].join('\n')
}

// Sleeping eyes: shallower downward crescents (peaceful, not squeezed).
function eyesSleeping() {
    const w = 14
    return [
        `<path d="M14 80 Q 65 110 116 80" stroke="black" stroke-width="${w}" fill="none" stroke-linecap="round"/>`,
        `<path d="M136 80 Q 187 110 238 80" stroke="black" stroke-width="${w}" fill="none" stroke-linecap="round"/>`,
    ].join('\n')
}

// Wink: left eye open (regular brand eye), right eye closed (^ smile-eye line).
function eyesWinkRight() {
    const w = 14
    return [
        `<path d="${EYE_LEFT_OUTLINE}" fill="black"/>`,
        `<path d="${EYE_LEFT_SCLERA}" fill="white"/>`,
        `<path d="${EYE_LEFT_GLINT}" fill="white"/>`,
        `<path d="${EYE_LEFT_PUPIL}" fill="${YELLOW}"/>`,
        `<path d="M134 95 Q 187 50 240 95" stroke="black" stroke-width="${w}" fill="none" stroke-linecap="round"/>`,
    ].join('\n')
}

// ============ MOUTH VARIANTS ============
// All mouths sit inside a "smile band" roughly y=180..280, x=18..235 in
// viewBox-units. Stroke matches the eye stroke for consistency.

// All mouths are centered horizontally around x≈126 and sit in the lower
// third of the face (y≈210..280) — the same band the Cheers original uses.
const SW = 14  // shared stroke width, matches the brand-stroke calibration in parts/README.md

// Stage 0 — fully closed neutral: a single near-flat curve.
function mouthClosedNeutral() {
    return `<path d="M85 240 Q 126 250 167 240" stroke="black" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`
}

// Stage 1 — small smile: gentle upward curve, slightly wider.
function mouthSmileSmall() {
    return `<path d="M70 230 Q 126 268 182 230" stroke="black" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`
}

// Stage 2 — medium smile: bigger arc, still no opening (closed mouth grin).
function mouthSmileMedium() {
    return `<path d="M52 218 Q 126 282 200 218" stroke="black" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`
}

// Stage 3 — mouth open, visibly grinning. Black "banana" outer with a fat
// cream-white tooth band at top and a thick red tongue/lower lip filling out
// the bottom — mirrors the layered fill order used in the Cheers original.
function mouthSmileOpen() {
    return [
        `<path d="M40 200 Q 126 296 212 200 Q 126 268 40 200 Z" fill="black"/>`,
        // cream-white teeth band (sits inside the outer banana)
        `<path d="M58 213 Q 126 248 194 213 Q 126 238 58 213 Z" fill="${CREAM}"/>`,
        // red tongue (lower crescent)
        `<path d="M70 240 Q 126 292 182 240 Q 126 270 70 240 Z" fill="${RED}"/>`,
    ].join('\n')
}

// Stage 4 — full open laugh. Larger version of stage 3, with a pink upper-lip
// echo (à la the brand's Surprised face) to add a third color band.
function mouthLaugh() {
    return [
        `<path d="M26 192 Q 126 308 226 192 Q 126 278 26 192 Z" fill="black"/>`,
        // teeth
        `<path d="M48 207 Q 126 248 204 207 Q 126 237 48 207 Z" fill="${CREAM}"/>`,
        // pink interior highlight just below teeth
        `<path d="M62 230 Q 126 263 190 230 Q 126 252 62 230 Z" fill="${PINK}"/>`,
        // tongue
        `<path d="M70 244 Q 126 295 182 244 Q 126 274 70 244 Z" fill="${RED}"/>`,
    ].join('\n')
}

// Tiny neutral mouth — short relaxed line. Used in sleeping faces so the face
// reads as "asleep, content" rather than "frowning".
function mouthTiny() {
    return `<path d="M99 235 Q 126 247 153 235" stroke="black" stroke-width="13" fill="none" stroke-linecap="round"/>`
}

// Sad / disappointed — mirror image of mouthSmileSmall, curving down.
function mouthFrownSmall() {
    return `<path d="M70 252 Q 126 214 182 252" stroke="black" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`
}

// Bigger frown — corners pulled further down.
function mouthFrownBig() {
    return `<path d="M55 268 Q 126 195 197 268" stroke="black" stroke-width="${SW}" fill="none" stroke-linecap="round"/>`
}

// "O" / surprise mouth — small round black oval, separate from the eye change.
// Useful as a "speechless" reaction independent of the held/surprised swap.
function mouthOh() {
    return [
        `<ellipse cx="126" cy="235" rx="22" ry="26" fill="black"/>`,
        `<ellipse cx="126" cy="240" rx="14" ry="16" fill="${RED}"/>`,
    ].join('\n')
}

// Decorative "Z"s for sleeping. Each Z is a chunky filled polygon (not a
// polyline) so the corner geometry matches the rest of the face's solid fills.
// Two Z's only — at the in-game raster size (~54 px wide) a third Z dissolves
// into the line work and just adds noise. Big-then-small reads clearly.
function sleepZ() {
    // Z = top bar + diagonal + bottom bar, as a single filled path.
    const z = (cx, cy, s, rot = -8) => {
        const t = s * 0.34  // bar thickness ratio
        const d = [
            `M ${-s} ${-s}`,
            `L ${s} ${-s}`,
            `L ${s} ${-s + t}`,
            `L ${-s + t * 1.5} ${s - t}`,
            `L ${s} ${s - t}`,
            `L ${s} ${s}`,
            `L ${-s} ${s}`,
            `L ${-s} ${s - t}`,
            `L ${s - t * 1.5} ${-s + t}`,
            `L ${-s} ${-s + t}`,
            `Z`,
        ].join(' ')
        return `<path d="${d}" fill="black" transform="translate(${cx} ${cy}) rotate(${rot})"/>`
    }
    // Big Z up top-right; smaller Z below-left of it. Both sit above the
    // closed-eye band (which is at y≈80) so they don't overlap the eyes.
    return [z(218, 30, 28), z(168, 60, 18)].join('\n')
}

// Compose a face SVG. Width/height match the face.svg display sizing (54×63).
function composeFace({ eyes, mouth, extras = '' }) {
    return `<svg width="54" height="63" viewBox="0 0 252 295" fill="none" xmlns="http://www.w3.org/2000/svg">
${eyes}
${mouth}
${extras}
</svg>
`
}

// ============ OUTPUT SET ============
const variants = [
    // Smile progression — flat → small → medium → open → full laugh.
    { name: 'smile_0_closed', eyes: eyesOpen(), mouth: mouthClosedNeutral() },
    { name: 'smile_1_small', eyes: eyesOpen(), mouth: mouthSmileSmall() },
    { name: 'smile_2_medium', eyes: eyesOpen(), mouth: mouthSmileMedium() },
    { name: 'smile_3_open', eyes: eyesOpen(), mouth: mouthSmileOpen() },
    { name: 'smile_4_laugh', eyes: eyesOpen(), mouth: mouthLaugh() },
    // Eye states (blink, sleep, wink).
    { name: 'closed', eyes: eyesClosedHappy(), mouth: mouthClosedNeutral() },
    { name: 'sleeping', eyes: eyesSleeping(), mouth: mouthTiny(), extras: sleepZ() },
    { name: 'wink', eyes: eyesWinkRight(), mouth: mouthSmileMedium() },
    // Negative-emotion mouths.
    { name: 'frown_small', eyes: eyesOpen(), mouth: mouthFrownSmall() },
    { name: 'frown_big', eyes: eyesOpen(), mouth: mouthFrownBig() },
    // Surprise / speechless ("oh") — keeps open eyes (the held/dragging state
    // already uses face_surprised.svg for the *grabbed* surprise).
    { name: 'oh', eyes: eyesOpen(), mouth: mouthOh() },
]

// Brand-source SVGs in parts/ (dropped in by the user) used as the style
// reference. Listed manually because not every file in parts/ is a face.
const BRAND_SOURCES = [
    'face.svg', 'face_surprised.svg', 'sleepy.svg',
    'Cheers.svg', 'Curious.svg', 'Excited.svg', 'Neutral.svg', 'Surprise.svg',
    'Talking.svg', 'Toughtful.svg', 'Whistling.svg', 'Winking.svg',
]

// Build a preview HTML page that shows the brand reference row above the
// generated row, so the styles can be compared at a glance.
function previewHtml(variants) {
    const sourceCells = BRAND_SOURCES.map(
        (f) => `<div class="cell src"><img src="/parts/${f}"/><div class="lab">${f}</div></div>`,
    ).join('\n')
    const genCells = variants.map(
        (v) => `<div class="cell gen"><img src="/parts/generated/${v.name}.svg"/><div class="lab">${v.name}</div></div>`,
    ).join('\n')
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>face preview</title>
<style>
  body { margin:0; padding:24px; background:#EFE4FF; font-family:system-ui,sans-serif; }
  h2 { margin: 16px 0 8px; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.6; }
  .grid { display:grid; grid-template-columns: repeat(6, 1fr); gap:12px; }
  .cell { background:#FFCA05; border:3px solid #000; border-radius:18px; padding:12px;
          display:flex; flex-direction:column; align-items:center; gap:6px; }
  .cell img { width:130px; height:130px; object-fit: contain; image-rendering: -webkit-optimize-contrast; }
  .lab { font-size:11px; font-weight:600; text-align:center; }
  .src { background: #FFE995; }
  .gen { background: #FFCA05; }
</style></head><body>
<h2>brand sources (reference)</h2>
<div class="grid">${sourceCells}</div>
<h2>generated variants</h2>
<div class="grid">${genCells}</div>
</body></html>
`
}

async function main() {
    await mkdir(OUT_DIR, { recursive: true })
    for (const v of variants) {
        const svg = composeFace({ eyes: v.eyes, mouth: v.mouth, extras: v.extras })
        const p = resolve(OUT_DIR, `${v.name}.svg`)
        await writeFile(p, svg, 'utf8')
        console.log('wrote', p)
    }
    const previewPath = resolve(OUT_DIR, 'preview.html')
    await writeFile(previewPath, previewHtml(variants), 'utf8')
    console.log('wrote', previewPath)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
