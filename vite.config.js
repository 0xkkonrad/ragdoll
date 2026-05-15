import { spawnSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GEN_SCRIPT = resolve(__dirname, 'scripts/gen_faces.mjs')
const PNG_SCRIPT = resolve(__dirname, 'scripts/gen_pngs.mjs')
const GEN_DIR = resolve(__dirname, 'parts/generated')

function runGenerator() {
    const r = spawnSync(process.execPath, [GEN_SCRIPT], { stdio: 'inherit' })
    if (r.status !== 0) console.warn('[gen_faces] exited with status', r.status)
}

// PNG rasterization is run in the background (it spins up a headless browser
// and takes a couple of seconds — we don't want to block server boot on it).
// Each run resolves on its own; the next call sequences after the previous one
// so we don't overlap browser launches.
let pngRunChain = Promise.resolve()
function runPngGenerator() {
    pngRunChain = pngRunChain.then(
        () =>
            new Promise((done) => {
                const p = spawn(process.execPath, [PNG_SCRIPT], { stdio: 'inherit' })
                p.on('exit', (code) => {
                    if (code !== 0) console.warn('[gen_pngs] exited with status', code)
                    done()
                })
            }),
    )
}

// Re-runs scripts/gen_faces.mjs on server boot AND whenever the generator
// script itself changes — so editing the generator hot-reloads new sprites.
function facesGenerator() {
    return {
        name: 'peanut-faces-generator',
        // Build-time path (vite build): run once before bundling so generated
        // SVGs are present for any `?url` imports.
        buildStart() {
            if (process.env.NODE_ENV === 'production') runGenerator()
        },
        // Dev-server path: run on boot, then re-run whenever the generator
        // script itself changes (hot-edit your art knobs and reload). PNG
        // rasterization runs in the background after each SVG generation so
        // server boot isn't blocked on launching Chromium.
        configureServer(server) {
            runGenerator()
            runPngGenerator()
            server.watcher.add(GEN_SCRIPT)
            server.watcher.add(PNG_SCRIPT)
            server.watcher.on('change', (file) => {
                if (file === GEN_SCRIPT) {
                    runGenerator()
                    runPngGenerator()
                    server.ws.send({ type: 'full-reload', path: '*' })
                } else if (file === PNG_SCRIPT) {
                    runPngGenerator()
                }
            })
        },
    }
}

export default {
    plugins: [facesGenerator()],
    server: {
        watch: {
            usePolling: true,
            interval: 200,
        },
        fs: {
            // Allow Vite to serve files from parts/generated/.
            allow: ['.'],
        },
    },
}
