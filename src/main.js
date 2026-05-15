import * as p2 from 'p2-es'

import shellUrl from '/parts/shell.svg?url'
import armUrl from '/parts/arm.svg?url'
import legUrl from '/parts/leg.svg?url'
import handUrl from '/parts/hand.svg?url'
import footUrl from '/parts/foot.svg?url'
import faceUrl from '/parts/face.svg?url'
import faceSurprisedUrl from '/parts/face_surprised.svg?url'

const SVG_PX_PER_UNIT = 100

// Sizes are picked so the visible black stroke on every part matches the
// shell's — see parts/README.md for the calibration table.
const SHELL_LOBE_R = 0.45
const SHELL_OVERLAP = 0.55
const ARM_W = 0.2
const LEG_W = 0.2
const HAND_R = 0.28
const FOOT_R = 0.22

// `tune` holds runtime-tunable knobs. Edit via window.__ragdoll.tune({...})
// or the slider panel in index.html — both call rebuildWorld().
// Lengths in world units; X offsets in world units; limits in degrees.
const tune = {
    ARM_L: 0.5975,
    LEG_L: 0.96,
    SHOULDER_X: 0.18,
    HIP_X: 0.3,
    SHOULDER_DEG: 90,
    HIP_DEG: 60,
    WRIST_DEG: 30,
    ANKLE_DEG: 30,
    HAND_DEG: 20,
    HAND_FLIPX: false,
    HAND_FLIPY: false,
    DEBUG: false,
}
const deg2rad = (d) => (d * Math.PI) / 180

const BODYPARTS = 1 << 2
const GROUND = 1 << 3

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')

let world
let parts
let pixelsPerUnit = 140
const cameraOffset = { x: 0, y: -1.5 }

function loadImage(url) {
    return new Promise((res, rej) => {
        const img = new Image()
        img.onload = () => res(img)
        img.onerror = (e) => rej(new Error('failed to load ' + url + ': ' + e))
        img.src = url
    })
}

const sprites = {
    shell: await loadImage(shellUrl),
    arm: await loadImage(armUrl),
    leg: await loadImage(legUrl),
    hand: await loadImage(handUrl),
    foot: await loadImage(footUrl),
    face: await loadImage(faceUrl),
    faceSurprised: await loadImage(faceSurprisedUrl),
}

// Bobble-inertia state for the face: an angle (and angular velocity) that
// trails shell.angle via a damped spring, so the face wobbles after the body
// turns. Reset on world rebuild so we don't keep momentum across resets.
let faceAngle = 0
let faceAngularVel = 0
const FACE_STIFF = 200   // ω² — natural freq ~2.25 Hz
const FACE_DAMP = 14     // 2ζω — ζ ≈ 0.5

// Face overlay drawn on top of the shell, in shell-local SVG-px.
// (y is SVG y-down; negative oy = up). Tunable at runtime via
// window.__ragdoll.setFace() — used for screenshot probe iteration and v2 swaps.
const faceCfg = { ox: 0, oy: -25, w: 54, h: 63 }

function resize() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    pixelsPerUnit = Math.min(window.innerWidth, window.innerHeight) / 6
}

function worldToScreen(x, y) {
    return {
        x: window.innerWidth / 2 + (x - cameraOffset.x) * pixelsPerUnit,
        y: window.innerHeight / 2 - (y - cameraOffset.y) * pixelsPerUnit,
    }
}

function screenToWorld(sx, sy) {
    return {
        x: (sx - window.innerWidth / 2) / pixelsPerUnit + cameraOffset.x,
        y: -(sy - window.innerHeight / 2) / pixelsPerUnit + cameraOffset.y,
    }
}

function makeShellBody() {
    const body = new p2.Body({ mass: 3, position: [0, 0.5] })
    const top = new p2.Circle({ radius: SHELL_LOBE_R })
    const bot = new p2.Circle({ radius: SHELL_LOBE_R })
    body.addShape(top, [0, SHELL_OVERLAP / 2])
    body.addShape(bot, [0, -SHELL_OVERLAP / 2])
    for (const s of body.shapes) {
        s.collisionGroup = BODYPARTS
        s.collisionMask = GROUND
    }
    body.__sprite = sprites.shell
    return body
}

function makeLimbSegment({ position, width, length, sprite, vertical = false, mass = 0.5 }) {
    const body = new p2.Body({ mass, position })
    const box = vertical
        ? new p2.Box({ width, height: length })
        : new p2.Box({ width: length, height: width })
    box.collisionGroup = BODYPARTS
    box.collisionMask = GROUND
    body.addShape(box)
    body.__sprite = sprite
    return body
}

function makeEndCap({ position, radius, sprite, mass = 0.3 }) {
    const body = new p2.Body({ mass, position })
    const circle = new p2.Circle({ radius })
    circle.collisionGroup = BODYPARTS
    circle.collisionMask = GROUND
    body.addShape(circle)
    body.__sprite = sprite
    return body
}

function buildWorld() {
    // Detach the mouse-drag singletons from the previous world before we
    // replace it — otherwise `mouseBody.world` still points at the old world
    // and the next addBody throws "Body is already added to a World".
    if (world) {
        if (mouseConstraint) world.removeConstraint(mouseConstraint)
        if (mouseBody.world === world) world.removeBody(mouseBody)
    }
    mouseConstraint = null
    dragging = false

    const { ARM_L, LEG_L, SHOULDER_X, HIP_X } = tune
    const SHOULDER_LIMIT = deg2rad(tune.SHOULDER_DEG)
    const HIP_LIMIT = deg2rad(tune.HIP_DEG)
    const WRIST_LIMIT = deg2rad(tune.WRIST_DEG)
    const ANKLE_LIMIT = deg2rad(tune.ANKLE_DEG)
    // Hand rest angle (CCW for left, CW for right). Tunable via HAND_DEG slider.
    const HAND_REST = deg2rad(tune.HAND_DEG)

    // Sprite display dims (SVG-px). Length follows ARM_L/LEG_L; perpendicular
    // thickness is the visual baseline from the source artwork (see parts/README.md).
    const ARM_SPRITE_W = ARM_L * 100
    const ARM_SPRITE_H = 22.983
    const LEG_SPRITE_W = 30
    const LEG_SPRITE_H = LEG_L * 100

    world = new p2.World({ gravity: [0, -10] })
    world.solver.iterations = 60
    world.solver.tolerance = 0.002

    const shell = makeShellBody()
    world.addBody(shell)

    const SHOULDER_Y = 0.1
    const ARM_TILT = deg2rad(20)  // arms tilt upward so wrists sit higher than shoulders
    const armDx = Math.cos(ARM_TILT) * ARM_L / 2
    const armDy = Math.sin(ARM_TILT) * ARM_L / 2
    const leftArm = makeLimbSegment({
        position: [-SHOULDER_X - armDx, shell.position[1] + SHOULDER_Y + armDy],
        width: ARM_W, length: ARM_L, sprite: sprites.arm,
    })
    leftArm.angle = -ARM_TILT  // tilt left arm: shoulder side (local +x) goes down-right, wrist side (-x) goes up-left
    leftArm.__sw = ARM_SPRITE_W
    leftArm.__sh = ARM_SPRITE_H
    const rightArm = makeLimbSegment({
        position: [SHOULDER_X + armDx, shell.position[1] + SHOULDER_Y + armDy],
        width: ARM_W, length: ARM_L, sprite: sprites.arm,
    })
    rightArm.angle = ARM_TILT
    rightArm.__sw = ARM_SPRITE_W
    rightArm.__sh = ARM_SPRITE_H
    rightArm.__flipX = true
    // Hand body sits at the wrist joint (HAND_PIVOT = body origin). The hand
    // sprite is shifted upward (in body-local) so its bottom edge (the wrist
    // of the drawing at angle 0) lands on the body origin. After rotation, the
    // hand swings around its anatomical wrist.
    const HAND_PIVOT = [0, 0]
    // Wrist world position = arm body position + arm-local pivot rotated by arm angle.
    const leftWristX = leftArm.position[0] + Math.cos(leftArm.angle) * (-ARM_L / 2)
    const leftWristY = leftArm.position[1] + Math.sin(leftArm.angle) * (-ARM_L / 2)
    const rightWristX = rightArm.position[0] + Math.cos(rightArm.angle) * (ARM_L / 2)
    const rightWristY = rightArm.position[1] + Math.sin(rightArm.angle) * (ARM_L / 2)
    // Sprite anchor: 1.0 means body origin is at the bottom edge of the sprite
    // (so the drawing extends UP from the origin). At angle 0 the hand sprite
    // has fingers up and wrist at the bottom — perfect for pivoting on the wrist.
    const HAND_SPRITE_ANCHOR_Y = 1.0
    const leftHand = makeEndCap({
        position: [leftWristX, leftWristY],
        radius: HAND_R, sprite: sprites.hand,
    })
    leftHand.angle = HAND_REST
    leftHand.__flipX = tune.HAND_FLIPX
    leftHand.__flipY = tune.HAND_FLIPY
    leftHand.__spriteAnchorY = HAND_SPRITE_ANCHOR_Y
    const rightHand = makeEndCap({
        position: [rightWristX, rightWristY],
        radius: HAND_R, sprite: sprites.hand,
    })
    rightHand.angle = -HAND_REST
    rightHand.__flipX = !tune.HAND_FLIPX
    rightHand.__flipY = tune.HAND_FLIPY
    rightHand.__spriteAnchorY = HAND_SPRITE_ANCHOR_Y

    const hipY = shell.position[1] - SHELL_LOBE_R
    const leftLeg = makeLimbSegment({
        position: [-HIP_X, hipY - LEG_L / 2],
        width: LEG_W, length: LEG_L, vertical: true, sprite: sprites.leg,
    })
    leftLeg.__sw = LEG_SPRITE_W
    leftLeg.__sh = LEG_SPRITE_H
    const rightLeg = makeLimbSegment({
        position: [HIP_X, hipY - LEG_L / 2],
        width: LEG_W, length: LEG_L, vertical: true, sprite: sprites.leg,
    })
    rightLeg.__sw = LEG_SPRITE_W
    rightLeg.__sh = LEG_SPRITE_H
    // Foot bodies shifted right so the ankle pivot (offset left in foot-local)
    // lands at the leg tip.
    const FOOT_DX = FOOT_R * 0.5
    const leftFoot = makeEndCap({
        position: [leftLeg.position[0] + FOOT_DX, leftLeg.position[1] - LEG_L / 2],
        radius: FOOT_R, sprite: sprites.foot,
    })
    const rightFoot = makeEndCap({
        position: [rightLeg.position[0] + FOOT_DX, rightLeg.position[1] - LEG_L / 2],
        radius: FOOT_R, sprite: sprites.foot,
    })

    const limbs = [leftArm, rightArm, leftHand, rightHand, leftLeg, rightLeg, leftFoot, rightFoot]
    for (const b of limbs) world.addBody(b)

    const addRev = (a, b, pa, pb, lo, hi) => {
        const c = new p2.RevoluteConstraint(a, b, { localPivotA: pa, localPivotB: pb })
        c.setLimits(lo, hi)
        world.addConstraint(c)
        return c
    }

    addRev(shell, leftArm, [-SHOULDER_X, SHOULDER_Y], [ARM_L / 2, 0], -SHOULDER_LIMIT, SHOULDER_LIMIT)
    addRev(shell, rightArm, [SHOULDER_X, SHOULDER_Y], [-ARM_L / 2, 0], -SHOULDER_LIMIT, SHOULDER_LIMIT)
    // Wrist pivot is the hand body origin; sprite is offset so its visible wrist sits at the origin.
    addRev(leftArm, leftHand, [-ARM_L / 2, 0], HAND_PIVOT, HAND_REST - WRIST_LIMIT, HAND_REST + WRIST_LIMIT)
    addRev(rightArm, rightHand, [ARM_L / 2, 0], HAND_PIVOT, -HAND_REST - WRIST_LIMIT, -HAND_REST + WRIST_LIMIT)

    addRev(shell, leftLeg, [-HIP_X, -SHELL_LOBE_R], [0, LEG_L / 2], -HIP_LIMIT, HIP_LIMIT)
    addRev(shell, rightLeg, [HIP_X, -SHELL_LOBE_R], [0, LEG_L / 2], -HIP_LIMIT, HIP_LIMIT)
    // Ankle pivot on the foot shifted left to align with the heel of the boot.
    const FOOT_PIVOT_X = -FOOT_R * 0.5
    addRev(leftLeg, leftFoot, [0, -LEG_L / 2], [FOOT_PIVOT_X, 0], -ANKLE_LIMIT, ANKLE_LIMIT)
    addRev(rightLeg, rightFoot, [0, -LEG_L / 2], [FOOT_PIVOT_X, 0], -ANKLE_LIMIT, ANKLE_LIMIT)

    const ground = new p2.Body({ position: [0, -3.0] })
    const plane = new p2.Plane()
    plane.collisionGroup = GROUND
    plane.collisionMask = BODYPARTS
    ground.addShape(plane)
    world.addBody(ground)

    parts = { shell, ground }
    faceAngle = shell.angle
    faceAngularVel = 0
}

function drawSprite(body) {
    const img = body.__sprite
    if (!img) return
    ctx.save()
    const s = worldToScreen(body.position[0], body.position[1])
    ctx.translate(s.x, s.y)
    ctx.rotate(-body.angle)
    const scale = pixelsPerUnit / SVG_PX_PER_UNIT
    ctx.scale(body.__flipX ? -scale : scale, body.__flipY ? -scale : scale)
    const w = body.__sw ?? img.width
    const h = body.__sh ?? img.height
    // __spriteAnchorY: where the body origin sits on the sprite vertically.
    // 0.5 (default) = center, 1.0 = bottom edge, 0.0 = top edge.
    const ay = body.__spriteAnchorY ?? 0.5
    ctx.drawImage(img, -w / 2, -h * ay, w, h)
    ctx.restore()
}

function drawFace() {
    const shell = parts.shell
    // Held = surprised. Otherwise the default Cheers face.
    const img = (dragging || mouseConstraint) ? sprites.faceSurprised : sprites.face
    ctx.save()
    const s = worldToScreen(shell.position[0], shell.position[1])
    ctx.translate(s.x, s.y)
    // Anchor (faceCfg.ox/oy) rotates with the shell so the face stays glued
    // to the upper lobe. The face *image* then rotates by the bobble lag
    // (faceAngle - shell.angle) for the wobble effect.
    ctx.rotate(-shell.angle)
    const scale = pixelsPerUnit / SVG_PX_PER_UNIT
    ctx.scale(scale, scale)
    ctx.translate(faceCfg.ox, faceCfg.oy)
    ctx.rotate(-(faceAngle - shell.angle))
    // Preserve each sprite's own aspect ratio off faceCfg.w as the size knob.
    const w = faceCfg.w
    const h = w * (img.height / img.width)
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
    ctx.restore()
}

function drawGround() {
    const groundY = parts.ground.position[1]
    const top = worldToScreen(0, groundY)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, top.y, window.innerWidth, 4)
    ctx.fillStyle = 'rgba(0,0,0,0.06)'
    ctx.fillRect(0, top.y + 4, window.innerWidth, window.innerHeight)
}

function render() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    drawGround()
    for (const b of world.bodies) {
        if (b === parts.shell || b === parts.ground) continue
        drawSprite(b)
    }
    drawSprite(parts.shell)
    drawFace()
    if (tune.DEBUG) drawDebug()
}

function drawDebug() {
    // Outlines for every shape on every body (except ground).
    ctx.lineWidth = 1.5
    ctx.strokeStyle = 'rgba(0, 150, 255, 0.9)'
    for (const b of world.bodies) {
        if (b === parts.ground) continue
        for (const s of b.shapes) {
            ctx.save()
            const sp = worldToScreen(b.position[0], b.position[1])
            ctx.translate(sp.x, sp.y)
            ctx.rotate(-b.angle)
            // Shape offset (in body-local). p2 stores it on s.position.
            const ox = (s.position?.[0] ?? 0) * pixelsPerUnit
            const oy = -(s.position?.[1] ?? 0) * pixelsPerUnit
            ctx.translate(ox, oy)
            ctx.rotate(-(s.angle ?? 0))
            if (s instanceof p2.Circle) {
                ctx.beginPath()
                ctx.arc(0, 0, s.radius * pixelsPerUnit, 0, Math.PI * 2)
                ctx.stroke()
            } else if (s instanceof p2.Box) {
                const w = s.width * pixelsPerUnit
                const h = s.height * pixelsPerUnit
                ctx.strokeRect(-w / 2, -h / 2, w, h)
            }
            ctx.restore()
        }
    }
    // Body centers (small green dots).
    for (const b of world.bodies) {
        if (b === parts.ground) continue
        const sp = worldToScreen(b.position[0], b.position[1])
        ctx.fillStyle = '#0a0'
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2)
        ctx.fill()
    }
    // Each RevoluteConstraint: dot A (red) on body A's pivot, dot B (orange)
    // on body B's pivot, plus a spoke from each body center to its pivot so
    // you can see which body owns which point.
    const out = p2.vec2.create()
    for (const c of world.constraints) {
        if (!(c instanceof p2.RevoluteConstraint)) continue
        const pivots = [
            { body: c.bodyA, pivot: c.pivotA, color: '#e11' },
            { body: c.bodyB, pivot: c.pivotB, color: '#f80' },
        ]
        for (const { body, pivot, color } of pivots) {
            body.toWorldFrame(out, pivot)
            const sp = worldToScreen(out[0], out[1])
            const center = worldToScreen(body.position[0], body.position[1])
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(center.x, center.y)
            ctx.lineTo(sp.x, sp.y)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, 4, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
            ctx.lineWidth = 1
            ctx.strokeStyle = '#fff'
            ctx.stroke()
        }
    }
}

let paused = false
let frozen = true  // freeze at spawn pose until first interaction
function thaw() { frozen = false }
let lastT = performance.now()
function loop(t) {
    const dt = Math.min((t - lastT) / 1000, 1 / 30)
    lastT = t
    if (!paused && !frozen) world.step(1 / 60, dt, 6)
    updateFaceBobble(dt)
    render()
    requestAnimationFrame(loop)
}

function updateFaceBobble(dt) {
    const target = parts.shell.angle
    const a = (target - faceAngle) * FACE_STIFF - faceAngularVel * FACE_DAMP
    faceAngularVel += a * dt
    faceAngle += faceAngularVel * dt
}
window.__ragdoll = {
    pause: () => { paused = true },
    resume: () => { paused = false },
    thaw,
    isFrozen: () => frozen,
    setShellPos: (x, y) => {
        const dy = y - parts.shell.position[1]
        const dx = x - parts.shell.position[0]
        for (const b of world.bodies) {
            if (b !== parts.ground) {
                b.position[0] += dx
                b.position[1] += dy
                b.angle = 0
                b.angularVelocity = 0
                b.velocity[0] = 0
                b.velocity[1] = 0
            }
        }
    },
    setFace: (cfg) => Object.assign(faceCfg, cfg),
    getFace: () => ({ ...faceCfg }),
    tune,
    setTune: (patch) => {
        Object.assign(tune, patch)
        const renderOnly = new Set(['DEBUG'])
        if (Object.keys(patch).every((k) => renderOnly.has(k))) return
        buildWorld()
    },
}

const mouseBody = new p2.Body({ mass: 0, type: p2.Body.STATIC })
let mouseConstraint = null
let dragging = false

function pointerWorld(e) {
    const rect = canvas.getBoundingClientRect()
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
}

canvas.addEventListener('mousedown', (e) => {
    if (frozen) thaw()
    const w = pointerWorld(e)
    const hit = world.hitTest([w.x, w.y], world.bodies, 0.05).filter((b) => b.mass > 0)[0]
    if (!hit) return
    if (!world.bodies.includes(mouseBody)) world.addBody(mouseBody)
    mouseBody.position[0] = w.x
    mouseBody.position[1] = w.y
    const localPoint = p2.vec2.create()
    hit.toLocalFrame(localPoint, [w.x, w.y])
    mouseConstraint = new p2.RevoluteConstraint(mouseBody, hit, {
        localPivotA: [0, 0],
        localPivotB: localPoint,
        maxForce: 1e5,
    })
    world.addConstraint(mouseConstraint)
    dragging = true
    canvas.classList.add('dragging')
})

window.addEventListener('mousemove', (e) => {
    if (!dragging) return
    const w = pointerWorld(e)
    mouseBody.position[0] = w.x
    mouseBody.position[1] = w.y
})

window.addEventListener('mouseup', () => {
    if (!dragging) return
    dragging = false
    canvas.classList.remove('dragging')
    if (mouseConstraint) {
        world.removeConstraint(mouseConstraint)
        mouseConstraint = null
    }
})

window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        frozen = true
        buildWorld()
    }
})

window.addEventListener('resize', resize)
resize()
buildWorld()
requestAnimationFrame(loop)
