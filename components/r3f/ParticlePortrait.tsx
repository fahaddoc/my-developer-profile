'use client'

// ParticlePortrait — the hero portrait.
//
//   Rest:   the real photo (480/720 webp via srcset, crisp at 1x and 2x), lit
//           like the scene by a static CSS composite (FlipPhotoCard.module.css):
//           an ember rim on the edges facing the upper-left key light, a soft
//           cold fill from the right and, in dark, a slight lift of the black
//           sweater (DESIGN.md §7, the same light as the planets).
//   Active: only on intent, which the caller decides (hover dwell, keyboard
//           focus, click). The photo hands over to a particle field built from
//           the same image at device resolution; the particles burst and
//           settle into a few lines of text.
//   Off:    they fly home, the photo returns underneath, the canvas fades off
//           it and the loop stops.
//
// Cost: no canvas work before the first intent. The field is built once per
// size and DPR, as soon as the pointer arrives (so it is ready when the dwell
// fires). Each frame writes one Uint32 pixel buffer and does one putImageData;
// physics is a fixed 60 Hz step with zeroed impulses and a clamped speed; rAF
// stops once every particle has settled. Reduced motion or a coarse pointer:
// no particles at all, just the lit photo.

import { useEffect, useRef, useState } from 'react'
import { useScenePalette, type ScenePalette } from '@/lib/palette'
import s from './FlipPhotoCard.module.css'

export const PORTRAIT_480 = '/images/shah-fahad-sticker-480.webp'
export const PORTRAIT_720 = '/images/shah-fahad-sticker-720.webp'

const DEFAULT_INTRO = [
  'Senior software engineer',
  'React · Next.js',
  'Flutter · WebRTC',
  'Karachi, Pakistan',
].join('\n')

const STEP_CSS    = 2.5          // particle grid pitch, CSS px
const DPR_CAP     = 2
const PHYS_DT     = 1000 / 60    // fixed physics step, ms
const DRAW_MIN    = 1000 / 48    // draw at most ~48 fps
const SPRING      = 0.07         // pull toward the target per step
const DAMP        = 0.7          // velocity kept per step (near critical, no wobble)
const VMAX_CSS    = 16           // |v| clamp, CSS px per step
const TEXT_CENTER = 0.37         // text block centre, fraction of height (ends above the cue at 57%)
const EMBER_MAX   = 0.5          // most a particle in flight warms toward ember

interface ParticlePortraitProps {
  /** Intent from the caller: particles form the intro text while true. */
  active: boolean
  /** The pointer is near: build the particle field ahead of the dwell. */
  warm?: boolean
  /** Lines the particles form ("\n" separated). */
  intro?: string
  /** Starting font size for the text in CSS px (shrunk until it fits). */
  fontPx?: number
  /** `sizes` for the rest photo's srcset. Matches .portraitDock's width. */
  sizes?: string
}

/** True when particles are allowed: a fine hover pointer and no reduced-motion
 *  preference. Live, so toggling either setting takes effect immediately. */
export function useParticleGate(): boolean {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setOk(fine.matches && !calm.matches)
    sync()
    fine.addEventListener('change', sync)
    calm.addEventListener('change', sync)
    return () => {
      fine.removeEventListener('change', sync)
      calm.removeEventListener('change', sync)
    }
  }, [])
  return ok
}

// ── pixel helpers ───────────────────────────────────────────────────────────
type RGB = { r: number; g: number; b: number }
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x0a0b0c0d]).buffer)[0] === 0x0d
/** Pack RGBA (0..255 ints) into one Uint32 in ImageData byte order. */
function pack(r: number, g: number, b: number, a: number): number {
  return LITTLE_ENDIAN
    ? ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
    : ((r << 24) | (g << 16) | (b << 8) | a) >>> 0
}

function displayFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim()
  return v ? `${v}, system-ui, sans-serif` : 'system-ui, sans-serif'
}

// ── the particle field (struct of arrays) ───────────────────────────────────
interface Field {
  key: string
  dpr: number
  W: number; H: number               // canvas backing size, device px
  n: number
  hx: Float32Array; hy: Float32Array // portrait home
  tx: Float32Array; ty: Float32Array // text home
  x:  Float32Array; y:  Float32Array
  vx: Float32Array; vy: Float32Array
  src: Uint8ClampedArray             // source RGBA per particle
  lum: Float32Array; rim: Float32Array; fill: Float32Array
  lr: Uint8ClampedArray; lg: Uint8ClampedArray; lb: Uint8ClampedArray // lit rest colour
  rest: Uint32Array                  // packed lit rest colour
  restSize: number                   // square size at rest, device px
  textSize: number                   // square size in the text, device px
  frame: ImageData
  px32: Uint32Array
  ink: RGB; ember: RGB
}

/** Bake the scene lighting into each particle's rest colour (same light as
 *  the CSS composite on the photo, so the hand-over does not shift colour). */
function light(f: Field, pal: ScenePalette) {
  const ember = hexToRgb(pal.accent)
  const cold  = hexToRgb(pal.keyLight.rim)
  const dark  = pal.mode === 'dark'
  for (let i = 0; i < f.n; i++) {
    let r = f.src[i * 4], g = f.src[i * 4 + 1], b = f.src[i * 4 + 2]
    if (dark) {
      const lift = 0.2 * (1 - f.lum[i])
      r += (cold.r - r) * lift; g += (cold.g - g) * lift; b += (cold.b - b) * lift
    }
    const fl = f.fill[i] * (dark ? 0.4 : 0.3)
    r += (cold.r - r) * fl; g += (cold.g - g) * fl; b += (cold.b - b) * fl
    const k = f.rim[i] * 0.8
    r += (ember.r - r) * k; g += (ember.g - g) * k; b += (ember.b - b) * k
    f.lr[i] = r; f.lg[i] = g; f.lb[i] = b
    f.rest[i] = pack(f.lr[i], f.lg[i], f.lb[i], f.src[i * 4 + 3])
  }
  f.ink = hexToRgb(pal.ink)
  f.ember = ember
}

async function buildField(
  cssW: number, cssH: number, dpr: number, intro: string, fontPx: number,
): Promise<Field | null> {
  const family = displayFamily()
  const W = Math.max(1, Math.round(cssW * dpr))
  const H = Math.max(1, Math.round(cssH * dpr))
  try { await document.fonts.load(`600 ${Math.round(fontPx * dpr)}px ${family}`) } catch { /* use what is loaded */ }

  const img = new Image()
  img.decoding = 'async'
  img.src = PORTRAIT_480
  try { await img.decode() } catch { return null }

  // Sample the photo at CSS resolution, in the same box as the <img>
  // (object-fit: contain, anchored bottom centre).
  const sw = Math.max(1, Math.round(cssW))
  const sh = Math.max(1, Math.round(cssH))
  const off = document.createElement('canvas')
  off.width = sw; off.height = sh
  const octx = off.getContext('2d', { willReadFrequently: true })
  if (!octx) return null
  const sc = Math.min(sw / img.naturalWidth, sh / img.naturalHeight)
  const dw = img.naturalWidth * sc
  const dh = img.naturalHeight * sc
  octx.drawImage(img, (sw - dw) / 2, sh - dh, dw, dh)
  const px = octx.getImageData(0, 0, sw, sh).data
  const alphaAt = (x: number, y: number) => {
    const ix = Math.round(x), iy = Math.round(y)
    return ix < 0 || iy < 0 || ix >= sw || iy >= sh ? 0 : px[(iy * sw + ix) * 4 + 3] / 255
  }

  const hx: number[] = [], hy: number[] = [], src: number[] = []
  const lum: number[] = [], rim: number[] = [], fill: number[] = []
  for (let y = STEP_CSS / 2; y < sh; y += STEP_CSS) {
    for (let x = STEP_CSS / 2; x < sw; x += STEP_CSS) {
      const i = ((y | 0) * sw + (x | 0)) * 4
      const a = px[i + 3]
      if (a < 30) continue
      const r = px[i], g = px[i + 1], b = px[i + 2]
      // Exposure toward the key light (upper left), one cell deep, so it
      // reads as light on the edge rather than an outline.
      const k = Math.max(1 - alphaAt(x - 3, y - 3), 0.35 * (1 - alphaAt(x - 6, y - 5)))
      hx.push(x * dpr); hy.push(y * dpr)
      src.push(r, g, b, a)
      lum.push((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255)
      rim.push(Math.pow(k, 1.4))
      fill.push(1 - alphaAt(x + 4, y + 1))
    }
  }
  const n = hx.length
  if (!n) return null

  // Text targets at device resolution, so the text is as sharp as the screen.
  const tc = document.createElement('canvas')
  tc.width = W; tc.height = H
  const tctx = tc.getContext('2d', { willReadFrequently: true })
  if (!tctx) return null
  const lines = intro.split('\n').filter((l) => l.length > 0)
  const pad = 20 * dpr
  const fits = (size: number) => {
    tctx.font = `600 ${size}px ${family}`
    return lines.every((l) => tctx.measureText(l).width <= W - pad * 2)
      && lines.length * size * 1.28 <= H * 0.6
  }
  let size = Math.round(fontPx * dpr)
  while (size > 13 * dpr && !fits(size)) size -= 1
  tctx.font = `600 ${size}px ${family}`
  tctx.textAlign = 'center'
  tctx.textBaseline = 'middle'
  tctx.fillStyle = '#fff' // offscreen mask: only alpha is sampled
  const lineH  = size * 1.28
  const blockH = lines.length * lineH
  const top    = Math.max(pad, H * TEXT_CENTER - blockH / 2)
  lines.forEach((l, k) => tctx.fillText(l, W / 2, top + lineH * (k + 0.5)))
  const y0 = Math.max(0, Math.floor(top - lineH))
  const y1 = Math.min(H, Math.ceil(top + blockH + lineH))
  const td = tctx.getImageData(0, y0, W, y1 - y0).data
  const tp: number[] = []
  for (let y = y0; y < y1; y++) {
    const row = (y - y0) * W
    for (let x = 0; x < W; x++) {
      if (td[(row + x) * 4 + 3] > 120) tp.push(x, y)
    }
  }
  const tLen = tp.length / 2

  const f: Field = {
    key: `${sw}x${sh}@${dpr}`,
    dpr, W, H, n,
    hx: Float32Array.from(hx), hy: Float32Array.from(hy),
    tx: new Float32Array(n), ty: new Float32Array(n),
    x: Float32Array.from(hx), y: Float32Array.from(hy),
    vx: new Float32Array(n), vy: new Float32Array(n),
    src: Uint8ClampedArray.from(src),
    lum: Float32Array.from(lum), rim: Float32Array.from(rim), fill: Float32Array.from(fill),
    lr: new Uint8ClampedArray(n), lg: new Uint8ClampedArray(n), lb: new Uint8ClampedArray(n),
    rest: new Uint32Array(n),
    restSize: Math.ceil((STEP_CSS + 0.4) * dpr),
    textSize: Math.max(1, Math.round(1.2 * dpr)),
    frame: new ImageData(W, H),
    px32: new Uint32Array(0),
    ink: { r: 0, g: 0, b: 0 }, ember: { r: 0, g: 0, b: 0 },
  }
  f.px32 = new Uint32Array(f.frame.data.buffer)
  // Spread particles evenly across every text pixel so all lines fill. The
  // pairing is a seeded shuffle: paired in scan order, whole rows would slide
  // together like blinds; shuffled, they cross and read as one dust cloud.
  const order = new Uint32Array(n)
  for (let i = 0; i < n; i++) order[i] = i
  let seed = 0x2f6b1d
  for (let i = n - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const j = seed % (i + 1)
    const o = order[i]; order[i] = order[j]; order[j] = o
  }
  for (let i = 0; i < n; i++) {
    if (tLen) {
      const t = Math.floor((order[i] * tLen) / n) * 2
      f.tx[i] = tp[t]; f.ty[i] = tp[t + 1]
    } else {
      f.tx[i] = W / 2; f.ty[i] = H * TEXT_CENTER
    }
  }
  return f
}

/** One fixed physics step. Returns the worst error and speed (device px). */
function step(f: Field, toText: boolean): { err: number; speed: number } {
  const vmax = VMAX_CSS * f.dpr
  const vmax2 = vmax * vmax
  let err = 0, speed = 0
  for (let i = 0; i < f.n; i++) {
    const gx = toText ? f.tx[i] : f.hx[i]
    const gy = toText ? f.ty[i] : f.hy[i]
    let vx = (f.vx[i] + (gx - f.x[i]) * SPRING) * DAMP
    let vy = (f.vy[i] + (gy - f.y[i]) * SPRING) * DAMP
    const v2 = vx * vx + vy * vy
    if (v2 > vmax2) { const k = vmax / Math.sqrt(v2); vx *= k; vy *= k }
    f.vx[i] = vx; f.vy[i] = vy
    f.x[i] += vx; f.y[i] += vy
    const e = Math.abs(f.x[i] - gx) + Math.abs(f.y[i] - gy)
    if (e > err) err = e
    const sp = Math.abs(vx) + Math.abs(vy)
    if (sp > speed) speed = sp
  }
  return { err, speed }
}

function snap(f: Field, toText: boolean) {
  f.x.set(toText ? f.tx : f.hx); f.y.set(toText ? f.ty : f.hy)
  f.vx.fill(0); f.vy.fill(0)
}

/** Zero every velocity, then one outward kick from the centre: repeated
 *  toggles never stack, and the clamp in step() bounds the flight. */
function impulse(f: Field, strength: number) {
  const cx = f.W / 2, cy = f.H / 2
  for (let i = 0; i < f.n; i++) {
    const dx = f.x[i] - cx, dy = f.y[i] - cy
    const d  = Math.sqrt(dx * dx + dy * dy) + 0.5
    const r1 = ((Math.sin(f.hx[i] * 12.9898 + f.hy[i] * 78.233) * 43758.5) % 1 + 1) % 1
    const sp = (4 + r1 * 4) * strength * f.dpr
    f.vx[i] = (dx / d) * sp + (r1 - 0.5) * 1.2 * f.dpr
    f.vy[i] = (dy / d) * sp + (r1 - 0.5) * 1.2 * f.dpr
  }
}

function draw(f: Field, ctx: CanvasRenderingContext2D, toText: boolean) {
  const buf = f.px32
  buf.fill(0)
  const { W, H, ember, ink } = f
  const size = toText ? f.textSize : f.restSize
  const half = size / 2
  const inv  = 1 / (22 * f.dpr)
  for (let i = 0; i < f.n; i++) {
    const gx = toText ? f.tx[i] : f.hx[i]
    const gy = toText ? f.ty[i] : f.hy[i]
    const dx = f.x[i] - gx, dy = f.y[i] - gy
    const drift = Math.min(1, Math.sqrt(dx * dx + dy * dy) * inv)
    let c: number
    if (!toText && drift < 0.01) {
      c = f.rest[i]
    } else {
      // In flight particles warm toward ember (capped, so the one accent
      // stays a glint, not a fill); settled text is ink.
      const br = toText ? ink.r : f.lr[i]
      const bg = toText ? ink.g : f.lg[i]
      const bb = toText ? ink.b : f.lb[i]
      const w  = drift * EMBER_MAX
      const a  = (toText ? 255 : f.src[i * 4 + 3]) * Math.max(0.55, 1 - drift * 0.3)
      c = pack(
        (br + (ember.r - br) * w) | 0,
        (bg + (ember.g - bg) * w) | 0,
        (bb + (ember.b - bb) * w) | 0,
        a | 0,
      )
    }
    const sx = Math.round(f.x[i] - half), sy = Math.round(f.y[i] - half)
    const x0 = sx < 0 ? 0 : sx, x1 = sx + size > W ? W : sx + size
    const y0 = sy < 0 ? 0 : sy, y1 = sy + size > H ? H : sy + size
    for (let yy = y0; yy < y1; yy++) {
      let o = yy * W + x0
      for (let xx = x0; xx < x1; xx++) buf[o++] = c
    }
  }
  ctx.putImageData(f.frame, 0, 0)
}

type Mode = 'idle' | 'text' | 'home'

export function ParticlePortrait({
  active,
  warm = false,
  intro = DEFAULT_INTRO,
  fontPx = 38,
  sizes = '(max-width: 1466px) 30vw, 440px',
}: ParticlePortraitProps) {
  const palette  = useScenePalette()
  const gate     = useParticleGate()
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fieldRef = useRef<Field | null>(null)
  const buildRef = useRef<{ key: string; p: Promise<Field | null> } | null>(null)
  const modeRef  = useRef<Mode>('idle')
  const wantRef  = useRef(false)
  const rafRef   = useRef(0)
  const lastRef  = useRef(0)
  const accRef   = useRef(0)
  const drawnRef = useRef(0)
  const palRef   = useRef(palette)
  const aliveRef = useRef(true)
  const introRef = useRef({ intro, fontPx })

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  // Show the canvas (on) or the lit photo (off). Imperative so React never
  // re-renders mid-flight.
  const show = (on: boolean) => {
    const el = stageRef.current
    if (el) el.dataset.particles = on ? 'on' : 'off'
  }

  const measure = () => {
    const el = stageRef.current
    if (!el || !el.offsetWidth || !el.offsetHeight) return null
    const dpr = Math.min(DPR_CAP, Math.max(1, window.devicePixelRatio || 1))
    // offset* is the layout size, unaffected by the :active press scale.
    return { w: el.offsetWidth, h: el.offsetHeight, dpr, key: `${el.offsetWidth}x${el.offsetHeight}@${dpr}` }
  }

  /** The field for the current size/DPR: cached, in flight, or built now. */
  const ensureField = (): Promise<Field | null> => {
    const m = measure()
    if (!m) return Promise.resolve(null)
    if (fieldRef.current?.key === m.key) return Promise.resolve(fieldRef.current)
    if (buildRef.current?.key === m.key) return buildRef.current.p
    const { intro: txt, fontPx: fp } = introRef.current
    const p = buildField(m.w, m.h, m.dpr, txt, fp).then((f) => {
      if (buildRef.current?.p === p) buildRef.current = null
      if (!f || !aliveRef.current) return null
      light(f, palRef.current)
      // Never swap the field under a running animation; the next intent
      // picks up the new size instead.
      if (modeRef.current === 'idle' || !fieldRef.current) fieldRef.current = f
      return fieldRef.current
    }).catch(() => null)
    buildRef.current = { key: m.key, p }
    return p
  }

  const ctxFor = (f: Field) => {
    const cv = canvasRef.current
    if (!cv) return null
    if (cv.width !== f.W || cv.height !== f.H) { cv.width = f.W; cv.height = f.H }
    return cv.getContext('2d')
  }

  const tick = (now: number) => {
    rafRef.current = 0
    const f = fieldRef.current
    const ctx = f && ctxFor(f)
    if (!f || !ctx || modeRef.current === 'idle') { lastRef.current = 0; return }
    const toText = modeRef.current === 'text'

    let acc = accRef.current + Math.min(100, lastRef.current ? now - lastRef.current : PHYS_DT)
    lastRef.current = now
    let res = { err: Infinity, speed: Infinity }
    let steps = 0
    while (acc >= PHYS_DT && steps < 6) { res = step(f, toText); acc -= PHYS_DT; steps++ }
    accRef.current = steps === 6 ? 0 : acc

    const settled = steps > 0 && res.err < 0.3 * f.dpr && res.speed < 0.1 * f.dpr
    if (settled) snap(f, toText)
    if (settled || now - drawnRef.current >= DRAW_MIN) {
      draw(f, ctx, toText)
      drawnRef.current = now
    }
    // Nearly home: bring the crisp photo back underneath and let the canvas
    // fade off it (CSS), while the last particles land.
    if (!toText && steps > 0 && res.err < 2 * f.dpr) show(false)

    if (settled) {
      if (!toText) modeRef.current = 'idle'
      lastRef.current = 0
      accRef.current = 0
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const kick = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }

  const stopNow = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    lastRef.current = 0
    accRef.current = 0
    const f = fieldRef.current
    if (f) snap(f, false)
    modeRef.current = 'idle'
    show(false)
  }

  // ── intent → mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    const want = active && gate
    wantRef.current = want
    if (!gate) { if (modeRef.current !== 'idle') stopNow(); return }

    if (want) {
      let cancelled = false
      ensureField().then((f) => {
        if (cancelled || !f || !wantRef.current || !aliveRef.current) return
        if (!ctxFor(f)) return
        if (modeRef.current === 'idle') snap(f, false)
        modeRef.current = 'text'
        impulse(f, 1)
        show(true)
        kick()
      })
      return () => { cancelled = true }
    }

    if (modeRef.current === 'text') {
      const f = fieldRef.current
      if (!f) { stopNow(); return }
      modeRef.current = 'home'
      impulse(f, 0.6)
      kick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, gate])

  // ── pointer is near: build ahead of the dwell ──────────────────────────────
  useEffect(() => {
    if (warm && gate) void ensureField()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warm, gate])

  // ── theme change: relight; redraw if particles are on screen ───────────────
  useEffect(() => {
    palRef.current = palette
    const f = fieldRef.current
    if (!f) return
    light(f, palette)
    if (modeRef.current !== 'idle' && !rafRef.current) {
      const ctx = ctxFor(f)
      if (ctx) draw(f, ctx, modeRef.current === 'text')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette])

  // ── copy change: drop the field so the next intent rebuilds it ─────────────
  useEffect(() => {
    const prev = introRef.current
    if (prev.intro === intro && prev.fontPx === fontPx) return
    introRef.current = { intro, fontPx }
    if (modeRef.current === 'idle') fieldRef.current = null
    buildRef.current = null
  }, [intro, fontPx])

  return (
    <div ref={stageRef} className={s.stage}>
      <div className={s.lit} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- the lighting
            masks reference these exact files; next/image would rename them */}
        <img
          className={s.photo}
          src={PORTRAIT_720}
          srcSet={`${PORTRAIT_480} 480w, ${PORTRAIT_720} 720w`}
          sizes={sizes}
          width={720}
          height={956}
          alt=""
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
        <span className={`${s.light} ${s.lift}`} />
        <span className={`${s.light} ${s.fill}`} />
        <span className={`${s.light} ${s.rimSoft}`} />
        <span className={`${s.light} ${s.rim}`} />
      </div>
      <canvas ref={canvasRef} className={s.canvas} width={1} height={1} aria-hidden="true" />
    </div>
  )
}
