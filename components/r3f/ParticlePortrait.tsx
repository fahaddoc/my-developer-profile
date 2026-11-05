'use client'

// ParticlePortrait — the portrait's pixels become a field of particles.
//   Idle:   particles form the portrait, lit like the scene: a warm ember key
//           rim from the upper left and a soft cold fill from the right
//           (DESIGN.md §7, the same light as the planets).
//   Hover:  particles burst outward, then settle into a few lines of text.
//   Leave:  another burst, then they re-form the portrait.
//
// Colours come from lib/palette.ts so both themes work. Text is set in the
// site's Archivo, read from the live --font-display variable.
//
// Cost: the loop only runs while particles are moving. Once they settle the
// last frame stays on the canvas and requestAnimationFrame stops, so an idle
// portrait costs nothing per frame.

import { useEffect, useRef } from 'react'
import { useScenePalette, type ScenePalette } from '@/lib/palette'

interface ParticlePortraitProps {
  src:    string
  width:  number
  height: number
  cssWidth?:  string
  cssHeight?: string
  step?:      number
  /** Lines shown when the particles re-form on hover ("\n" separated). */
  intro?:    string
  /** Starting font px for the text (shrunk until every line fits). */
  fontPx?:   number
}

interface Particle {
  px: number; py: number    // portrait home
  tx: number; ty: number    // text home
  x:  number; y:  number    // current
  vx: number; vy: number
  r: number; g: number; b: number  // source pixel
  a: number                 // source alpha 0..1
  lum: number               // source luminance 0..1
  rim: number               // warm key-rim weight 0..1 (upper-left edges)
  fill: number              // cold fill weight 0..1 (right-hand edges)
  // resolved rest colour for the current palette
  rr: number; rg: number; rb: number
  rest: string
}

const DEFAULT_INTRO = [
  'Senior software engineer',
  'React · Next.js',
  'Flutter · WebRTC',
  'Karachi, Pakistan',
].join('\n')

type RGB = { r: number; g: number; b: number }
function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}

/** Bake the scene lighting into each particle's rest colour. */
function light(ps: Particle[], pal: ScenePalette) {
  const ember = hexToRgb(pal.accent)
  const cold  = hexToRgb(pal.keyLight.rim)
  const dark  = pal.mode === 'dark'
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i]
    let r = p.r, g = p.g, b = p.b
    // Soft cold fill: in space the black turtleneck would vanish into the
    // background, so its shadows pick up a little cold light.
    if (dark) {
      const lift = 0.2 * (1 - p.lum)
      r += (cold.r - r) * lift; g += (cold.g - g) * lift; b += (cold.b - b) * lift
    }
    const f = p.fill * (dark ? 0.4 : 0.3)
    r += (cold.r - r) * f; g += (cold.g - g) * f; b += (cold.b - b) * f
    // Warm key rim from the upper left.
    const k = p.rim * 0.8
    r += (ember.r - r) * k; g += (ember.g - g) * k; b += (ember.b - b) * k
    p.rr = Math.round(r); p.rg = Math.round(g); p.rb = Math.round(b)
    p.rest = `rgba(${p.rr},${p.rg},${p.rb},${p.a.toFixed(3)})`
  }
}

function displayFamily(): string {
  if (typeof document === 'undefined') return 'system-ui, sans-serif'
  const v = getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim()
  return v ? `${v}, system-ui, sans-serif` : 'system-ui, sans-serif'
}

export function ParticlePortrait({
  src, width, height,
  cssWidth = '100%', cssHeight = '100%',
  step = 3,
  intro = DEFAULT_INTRO,
  fontPx = 44,
}: ParticlePortraitProps) {
  const palette      = useScenePalette()
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const hoverRef     = useRef(false)
  const rafRef       = useRef(0)
  const lastDrawRef  = useRef(0)
  const paletteRef   = useRef(palette)
  const reducedRef   = useRef(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const on = () => { reducedRef.current = mq.matches }
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  // ── draw loop: runs only while something moves ────────────────────────────
  const tick = (now: number) => {
    rafRef.current = 0
    // ~40fps is plenty for the particle field.
    if (now - lastDrawRef.current < 1000 / 40) { rafRef.current = requestAnimationFrame(tick); return }
    lastDrawRef.current = now

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const pal   = paletteRef.current
    const ember = hexToRgb(pal.accent)
    const ink   = hexToRgb(pal.ink)
    const hover = hoverRef.current
    const ps    = particlesRef.current
    // Idle squares slightly overlap (step 3) so the portrait reads as a solid,
    // finely textured photo rather than a see-through halftone.
    const size  = hover ? 1.4 : step + 0.2
    let moving  = false

    ctx.clearRect(0, 0, width, height)
    for (let i = 0; i < ps.length; i++) {
      const p   = ps[i]
      const tgX = hover ? p.tx : p.px
      const tgY = hover ? p.ty : p.py

      // Tight spring + strong damping: the burst impulse gives the fly-out,
      // then particles settle exactly on their home pixel.
      p.vx = (p.vx + (tgX - p.x) * 0.18) * 0.72
      p.vy = (p.vy + (tgY - p.y) * 0.18) * 0.72
      p.x += p.vx
      p.y += p.vy

      const dx = p.x - tgX
      const dy = p.y - tgY
      const d2 = dx * dx + dy * dy
      if (d2 > 0.04 || p.vx * p.vx + p.vy * p.vy > 0.0025) moving = true
      else { p.x = tgX; p.y = tgY; p.vx = 0; p.vy = 0 }

      const drift = Math.min(1, Math.sqrt(d2) / 22)
      if (drift < 0.01 && !hover) {
        ctx.fillStyle = p.rest
      } else {
        // In flight particles warm toward ember; settled text is ink.
        const base = hover ? ink : { r: p.rr, g: p.rg, b: p.rb }
        const r = Math.round(base.r + (ember.r - base.r) * drift)
        const g = Math.round(base.g + (ember.g - base.g) * drift)
        const b = Math.round(base.b + (ember.b - base.b) * drift)
        const a = (hover ? 1 : p.a) * Math.max(0.55, 1 - drift * 0.3)
        ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`
      }
      ctx.fillRect(p.x, p.y, size, size)
    }

    if (moving) rafRef.current = requestAnimationFrame(tick)
  }

  const kick = () => {
    if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
  }

  // ── theme change: relight and redraw once ─────────────────────────────────
  useEffect(() => {
    paletteRef.current = palette
    if (particlesRef.current.length) {
      light(particlesRef.current, palette)
      kick()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette])

  // ── build the particle field ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      const family = displayFamily()
      if ('fonts' in document) {
        try {
          await document.fonts.load(`600 ${fontPx}px ${family}`)
          await document.fonts.ready
        } catch { /* fall back to whatever is loaded */ }
      }
      if (cancelled) return

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res() })
      if (cancelled) return

      const off = document.createElement('canvas')
      off.width = width; off.height = height
      const offCtx = off.getContext('2d', { willReadFrequently: true })
      if (!offCtx) return
      offCtx.drawImage(img, 0, 0, width, height)
      const px = offCtx.getImageData(0, 0, width, height).data
      const alphaAt = (x: number, y: number) =>
        x < 0 || y < 0 || x >= width || y >= height ? 0 : px[(y * width + x) * 4 + 3] / 255

      // ── text targets ──
      const txt = document.createElement('canvas')
      txt.width = width; txt.height = height
      const tctx = txt.getContext('2d', { willReadFrequently: true })
      if (!tctx) return
      const lines = intro.split('\n').filter((l) => l.length > 0)
      const maxW  = width - 24
      const fits = (size: number) => {
        tctx.font = `600 ${size}px ${family}`
        const lineH = Math.round(size * 1.3)
        return lines.every((l) => tctx.measureText(l).width <= maxW) && lines.length * lineH <= height - 24
      }
      let used = fontPx
      while (used > 12 && !fits(used)) used -= 1
      tctx.clearRect(0, 0, width, height)
      tctx.fillStyle = 'white' // offscreen mask: only alpha is sampled
      tctx.font = `600 ${used}px ${family}`
      tctx.textAlign = 'center'
      tctx.textBaseline = 'middle'
      const lineH  = Math.round(used * 1.3)
      const startY = (height - lines.length * lineH) / 2 + lineH / 2
      lines.forEach((l, i) => tctx.fillText(l, width / 2, startY + i * lineH))
      const td = tctx.getImageData(0, 0, width, height).data
      const textPos: Array<{ x: number; y: number }> = []
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (td[(y * width + x) * 4 + 3] > 120) textPos.push({ x, y })
        }
      }

      // ── portrait particles + baked lighting weights ──
      const ps: Particle[] = []
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (y * width + x) * 4
          const a = px[i + 3]
          if (a < 30) continue
          const r = px[i], g = px[i + 1], b = px[i + 2]
          // Rim: how exposed this pixel is toward the key light (upper left).
          // One particle deep, so it reads as light on the edge, not an outline.
          const rim = Math.max(
            1 - alphaAt(x - 3, y - 3),
            0.35 * (1 - alphaAt(x - 6, y - 5)),
          )
          // Fill: exposure toward the right.
          const fill = 1 - alphaAt(x + 4, y + 1)
          ps.push({
            px: x, py: y, tx: x, ty: y, x, y, vx: 0, vy: 0,
            r, g, b, a: a / 255,
            lum: (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255,
            rim: Math.pow(rim, 1.4), fill,
            rr: r, rg: g, rb: b, rest: '',
          })
        }
      }
      // Spread particles evenly across all text pixels so every line fills.
      const tLen = textPos.length
      for (let i = 0; i < ps.length; i++) {
        const t = tLen ? textPos[Math.floor((i * tLen) / ps.length)] : { x: width / 2, y: height / 2 }
        ps[i].tx = t.x; ps[i].ty = t.y
      }
      light(ps, paletteRef.current)
      particlesRef.current = ps
      kick()
    }

    init()
    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, width, height, step, intro, fontPx])

  // Outward radial impulse on every hover change.
  const burst = () => {
    const cx = width / 2
    const cy = height / 2
    const ps = particlesRef.current
    for (let i = 0; i < ps.length; i++) {
      const p  = ps[i]
      const dx = p.x - cx
      const dy = p.y - cy
      const d  = Math.sqrt(dx * dx + dy * dy) + 0.5
      const r1 = ((Math.sin(p.px * 12.9898 + p.py * 78.233) * 43758.5) % 1 + 1) % 1
      const speed = 2.8 + r1 * 2.4
      p.vx += (dx / d) * speed + (r1 - 0.5) * 1.2
      p.vy += (dy / d) * speed + (r1 - 0.5) * 1.2
    }
  }

  const setHover = (v: boolean) => {
    if (reducedRef.current) return
    hoverRef.current = v
    burst()
    kick()
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'absolute', inset: 0, width: cssWidth, height: cssHeight }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        aria-hidden="true"
        style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
    </div>
  )
}
