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
// All mouths sit inside a "smile band" roughly y=180..295, x=18..235 in
// viewBox-units. Stroke matches the eye stroke for consistency.
const SW = 14  // shared stroke width, matches the brand-stroke calibration in parts/README.md

// Brand mouth-corner "lip C" dimples — modeled on Talking.svg's pink paths
// 10/11. Two tiny crescents tucked INSIDE the bottom corners of an open mouth
// (they sit at the corners of the red tongue/lower-lip area, not on the
// outside of the face).
function lipCorners(scale = 1, mouthCx = 126, mouthCy = 245) {
    const s = (n) => mouthCx + (n - mouthCx) * scale
    const sy = (n) => mouthCy + (n - mouthCy) * scale
    // Left corner: small leftward-pointing crescent. Talking.svg uses bbox
    // ≈(82, 232) → (104, 240): wedge slanting up-right.
    const left = `M ${s(82)} ${sy(258)} C ${s(88)} ${sy(248)}, ${s(100)} ${sy(250)}, ${s(108)} ${sy(258)} C ${s(102)} ${sy(266)}, ${s(90)} ${sy(266)}, ${s(82)} ${sy(258)} Z`
    // Right corner: mirror.
    const right = `M ${s(144)} ${sy(258)} C ${s(152)} ${sy(250)}, ${s(164)} ${sy(248)}, ${s(170)} ${sy(258)} C ${s(162)} ${sy(266)}, ${s(150)} ${sy(266)}, ${s(144)} ${sy(258)} Z`
    return [
        `<path d="${left}" fill="${PINK}"/>`,
        `<path d="${right}" fill="${PINK}"/>`,
    ].join('\n')
}

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

// Brand mouth paths — copied verbatim from parts/face.svg (the canonical
// "Cheers" expression). Composing my own curves from scratch never gets the
// corner curls and lip-mass distribution right, so I'm just inheriting the
// path data. Same viewBox (252×295) as face.svg, so no transform is needed
// when used at stage-4 scale; stage-3 wraps these in a `<g transform>` shrink.
const FACE_MOUTH_OUTLINE =
    'M177.315 178.367C180.145 175.175 185.841 175.558 188.224 179.089C189.631 180.789 189.508 183.062 189.759 185.12C190.65 189.084 193.693 192.281 197.183 194.196C204.591 198.145 214.269 197.531 221.033 192.536C223.061 191.117 224.391 188.686 226.931 188.062C230.598 186.824 234.95 189.265 235.855 193.013C236.618 195.601 235.624 198.454 233.699 200.281C226.808 207.624 216.568 211.278 206.585 211.017C206.733 222.505 204.527 233.987 200.57 244.763C195.332 259.015 186.171 272.035 173.623 280.782C165.171 286.739 155.389 290.703 145.273 292.795C137.658 294.45 129.846 294.862 122.073 295C114.625 294.563 107.147 293.733 99.9747 291.577C86.3389 287.672 74.0912 279.461 65.004 268.627C57.4969 259.693 51.9983 249.202 48.2226 238.201C45.4806 230.068 43.4722 221.65 42.6993 213.095C36.7084 213.832 30.6584 214.092 24.6331 213.699C21.1478 213.458 18.1499 210.266 18.1991 206.764C18.017 202.997 21.3103 199.486 25.1106 199.53C33.7942 199.697 43.2851 200.07 50.8611 195.12C53.9969 193.027 56.6404 189.943 57.4821 186.206C58.0532 183.087 60.8739 180.597 64.049 180.435C67.1453 180.18 70.2073 182.247 71.2066 185.16C72.2452 187.969 71.0736 190.925 70.099 193.577C68.4302 197.762 65.5504 201.347 62.2276 204.353C73.6531 211.818 86.2552 217.623 99.5563 220.84C122.54 226.331 147.178 223.497 168.779 214.156C175.085 211.469 181.105 208.169 186.954 204.613C181.445 200.419 176.901 194.53 175.681 187.6C175.11 184.497 174.849 180.769 177.315 178.367ZM173.593 227.598C154.144 235.883 132.607 239.38 111.538 237.298C99.9353 236.139 88.5639 233.103 77.7783 228.708C77.7783 230.387 77.7833 232.072 77.7685 233.757C83.5773 235.952 89.5386 237.725 95.5443 239.282C98.936 240.097 101.363 243.687 100.772 247.135C100.359 250.99 96.3024 253.947 92.4922 253.161C87.161 251.913 81.9478 250.234 76.7298 248.579C76.4738 252.125 76.0259 255.656 75.7256 259.197C83.1047 268.145 93.1666 274.869 104.371 277.982C115.196 281.057 126.68 281.204 137.771 279.657C147.602 278.213 157.27 274.859 165.422 269.103C173.5 263.46 179.84 255.558 184.187 246.766C174.42 249.63 164.496 251.963 154.528 254.011C151.156 254.87 147.351 252.852 146.233 249.556C144.742 245.961 146.932 241.443 150.659 240.338C163.989 237.288 177.551 234.69 190.271 229.543C191.108 225.781 191.709 221.969 192.088 218.134C186.156 221.719 179.968 224.882 173.593 227.598ZM57.812 218.497C59.018 225.073 60.8099 231.556 63.286 237.774C63.729 233.344 63.3943 228.88 63.5124 224.435C63.4484 223.521 63.6798 222.529 63.3057 221.675C61.499 220.58 59.6481 219.543 57.812 218.497Z'
const FACE_MOUTH_CREAM =
    'M173.593 227.598C179.968 224.882 186.156 221.719 192.088 218.134C191.709 221.969 191.108 225.781 190.271 229.543C177.551 234.69 163.989 237.288 150.659 240.338C146.932 241.443 144.742 245.961 146.233 249.556C147.351 252.852 151.156 254.87 154.528 254.011C164.496 251.963 174.42 249.63 184.187 246.766C179.84 255.558 173.5 263.46 165.422 269.103C157.27 274.859 147.602 278.213 137.771 279.657C126.68 281.204 115.196 281.057 104.371 277.982C93.1666 274.869 83.1047 268.145 75.7256 259.197C76.0259 255.656 76.4738 252.125 76.7298 248.579C81.9478 250.234 87.161 251.913 92.4922 253.161C96.3024 253.947 100.359 250.99 100.772 247.135C101.363 243.687 98.936 240.097 95.5443 239.282C89.5386 237.725 83.5773 235.952 77.7685 233.757C77.7833 232.072 77.7783 230.387 77.7783 228.708C88.5639 233.103 99.9353 236.139 111.538 237.298C132.607 239.38 154.144 235.883 173.593 227.598Z'
const FACE_MOUTH_RED =
    'M57.812 218.497C59.6481 219.543 61.499 220.58 63.3057 221.675C63.6798 222.529 63.4484 223.521 63.5124 224.435C63.3943 228.88 63.729 233.344 63.286 237.774C60.8099 231.556 59.018 225.073 57.812 218.497Z'

// Stage 4 — full open laugh. Brand mouth paths verbatim + the pink lip-corner
// dimples that read as "cheeky".
function mouthLaugh() {
    return [
        `<path d="${FACE_MOUTH_OUTLINE}" fill="black"/>`,
        `<path d="${FACE_MOUTH_CREAM}" fill="${CREAM}"/>`,
        `<path d="${FACE_MOUTH_RED}" fill="${RED}"/>`,
        lipCorners(),
    ].join('\n')
}

// Stage 3 — same brand silhouette, scaled to 0.8 around the mouth center for
// a slightly smaller / less "open" reading. `<g transform>` shrinks the
// inherited paths in place — much cleaner than re-tracing them.
function mouthSmileOpen() {
    const SC = 0.8
    const cx = 126, cy = 235  // center of the face.svg mouth bbox
    // Wrap brand paths in a scaling group, then layer the pink dimples on top
    // (scaled identically so they still anchor to the bottom corners).
    return [
        `<g transform="translate(${cx} ${cy}) scale(${SC}) translate(-${cx} -${cy})">`,
        `  <path d="${FACE_MOUTH_OUTLINE}" fill="black"/>`,
        `  <path d="${FACE_MOUTH_CREAM}" fill="${CREAM}"/>`,
        `  <path d="${FACE_MOUTH_RED}" fill="${RED}"/>`,
        `  ${lipCorners(1, 126, 245)}`,  // inside the scaled group
        `</g>`,
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

// "O" / surprise mouth — same topology as Excited.svg's mouth: a thick black
// ring (a single filled path with an outer + inner contour, even-odd fill) and
// a red interior centered inside it. No offset between black and red — the
// previous implementation drew the red shifted down, which read as a drop
// shadow rather than a brand-style mouth.
function mouthOh() {
    const cx = 126, cy = 244
    // Sized to roughly match Excited.svg's mouth (bbox ≈ 50 × 50 px on a 251×255 face).
    const rxO = 30, ryO = 34    // outer outline ellipse
    const rxI = 22, ryI = 26    // inner contour — gap = ~8 px ring thickness
    const rxR = 23, ryR = 27    // red interior — slightly bigger than inner so no yellow ring shows through
    // Two-subpath even-odd path: outer ring + inner ring → solid black donut.
    const ellipsePath = (rx, ry) =>
        `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
    return [
        `<path fill-rule="evenodd" d="${ellipsePath(rxO, ryO)} ${ellipsePath(rxI, ryI)}" fill="black"/>`,
        `<ellipse cx="${cx}" cy="${cy}" rx="${rxR}" ry="${ryR}" fill="${RED}"/>`,
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

// Build a preview HTML page that shows the brand reference row, the generated
// SVG row, and the rasterized PNG row (../generated-png/) so all three can be
// compared at a glance. PNG cells display broken-image icons until
// scripts/gen_pngs.mjs has run.
function previewHtml(variants) {
    // Relative paths so the file opens correctly over file:// / UNC as well as via the dev server.
    const sourceCells = BRAND_SOURCES.map(
        (f) => `<div class="cell src"><img src="../${f}"/><div class="lab">${f}</div></div>`,
    ).join('\n')
    const genCells = variants.map(
        (v) => `<div class="cell gen"><img src="./${v.name}.svg"/><div class="lab">${v.name}</div></div>`,
    ).join('\n')
    const pngCells = variants.map(
        (v) => `<div class="cell png"><img src="../generated-png/${v.name}.png"/><div class="lab">${v.name}.png</div></div>`,
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
  .png { background: #FFD84A; }
</style></head><body>
<h2>brand sources (reference)</h2>
<div class="grid">${sourceCells}</div>
<h2>generated variants — SVG</h2>
<div class="grid">${genCells}</div>
<h2>generated variants — PNG (rasterized)</h2>
<div class="grid">${pngCells}</div>
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
