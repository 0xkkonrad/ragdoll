import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const GEN_SCRIPT = resolve(__dirname, 'scripts/gen_faces.mjs')
const GEN_DIR = resolve(__dirname, 'parts/generated')

function runGenerator() {
    const r = spawnSync(process.execPath, [GEN_SCRIPT], { stdio: 'inherit' })
    if (r.status !== 0) console.warn('[gen_faces] exited with status', r.status)
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
        // script itself changes (hot-edit your art knobs and reload).
        configureServer(server) {
            runGenerator()
            server.watcher.add(GEN_SCRIPT)
            server.watcher.on('change', (file) => {
                if (file === GEN_SCRIPT) {
                    runGenerator()
                    server.ws.send({ type: 'full-reload', path: '*' })
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
