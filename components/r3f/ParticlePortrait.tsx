'use client'

// ParticlePortrait — the portrait's pixels become thousands of particles.
//   Idle:      particles form the portrait.
//   Hover:     particles re-form into successive frames of a written intro,
//              auto-advancing every ~3.4 s with cyan-tinted drift.
//   Hover-out: particles spring back to the portrait.
//
// Each frame is a few short lines (rendered at chosen font sizes via Sora)
// pre-sampled into an array of (x,y). Particles map to text pixels by index
// cycling, so the same particles form every frame.

import { useEffect, useRef } from 'react'

interface ParticlePortraitProps {
  src:    string
  width:  number
  height: number
  cssWidth?:  string
  cssHeight?: string
  step?:      number
  accentTint?: string
  frames?:    Frame[]
  /** Per-frame duration in ms before advancing. */
  frameDuration?: number
}

interface FrameLine {
  text:   string
  size:   number
  weight?: number
  letter?: number   // letter-spacing px
}
type Frame = FrameLine[]

interface Particle {
  px: number; py: number   // portrait home
  x:  number; y:  number   // current
  vx: number; vy: number
  r:  number; g:  number; b: number
  a:  number
  phase:  number           // 0..1 stagger
  wobble: number           // 0..2π per-particle wobble seed
  tx: number; ty: number   // current text target (updated when frame changes)
}

// Default narrative — the user's written intro, broken into readable pages.
const DEFAULT_FRAMES: Frame[] = [
  [ { text: "HI, I'M",                 size: 22, weight: 600 },
    { text: "SHAH FAHAD",              size: 40, weight: 800 } ],

  [ { text: "SENIOR",                  size: 22, weight: 600 },
    { text: "SOFTWARE ENGINEER",       size: 24, weight: 800 },
    { text: "KARACHI · PAKISTAN",      size: 12, weight: 500, letter: 1 } ],

  [ { text: "6+ YEARS",                size: 30, weight: 800 },
    { text: "BUILDING REAL-TIME",      size: 16, weight: 600 },
    { text: "WEB · MOBILE",            size: 14, weight: 500 } ],

  [ { text: "REACT  ·  NEXT.JS",       size: 18, weight: 700 },
    { text: "TYPESCRIPT",              size: 18, weight: 700 },
    { text: "FLUTTER · WEBRTC",        size: 18, weight: 700 } ],

  [ { text: "FINTECH",                 size: 22, weight: 800 },
    { text: "HEALTHCARE",              size: 22, weight: 800 },
    { text: "LIVE  COMMUNICATION",     size: 16, weight: 600 } ],

  [ { text: "CURRENTLY AT",            size: 14, weight: 500 },
    { text: "DIGITALHIRE",             size: 36, weight: 800 },
    { text: "LEAD FRONTEND",           size: 14, weight: 600 } ],

  [ { text: "BUILT",                   size: 18, weight: 600 },
    { text: "KONNECT.IM",              size: 36, weight: 800 },
    { text: "VIDEO CONFERENCING",      size: 12, weight: 500 } ],

  [ { text: "AGENT SHAH",              size: 32, weight: 800 },
    { text: "3D STEALTH GAME",         size: 16, weight: 600 },
    { text: "BUILT IN THREE.JS",       size: 12, weight: 500 } ],

  [ { text: "4 COMPANIES",             size: 22, weight: 700 },
    { text: "9+ PROJECTS",             size: 22, weight: 700 },
    { text: "25+ CLIENTS SHIPPED",     size: 14, weight: 600 } ],

  [ { text: "OPEN TO NEW",             size: 18, weight: 600 },
    { text: "OPPORTUNITIES",           size: 30, weight: 800 },
    { text: "REMOTE OR ON-SITE",       size: 12, weight: 500 } ],

  [ { text: "REACH ME AT",             size: 14, weight: 500 },
    { text: "HELLO@",                  size: 24, weight: 700 },
    { text: "SHAHFAHAD.DEV",           size: 24, weight: 800 } ],
]

export function ParticlePortrait({
  src, width, height,
  cssWidth = '100%', cssHeight = '100%',
  step = 3,
  accentTint = '#5EEAD4',
  frames = DEFAULT_FRAMES,
  frameDuration = 3400,
}: ParticlePortraitProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const framesPosRef = useRef<Array<Array<{ x: number; y: number }>>>([])
  const hoverRef     = useRef(false)
  const frameIdxRef  = useRef(0)
  const frameStartRef= useRef(0)
  const rafRef       = useRef(0)

  const tint = (() => {
    const h = accentTint.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    }
  })()

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Wait for web fonts so the sampled text uses the right family
      if (typeof document !== 'undefined' && 'fonts' in document) {
        try { await (document as Document).fonts.ready } catch { /* noop */ }
      }
      if (cancelled) return

      // ── Sample portrait pixels ─────────────────────────────────────────
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      await new Promise<void>((res) => {
        img.onload  = () => res()
        img.onerror = () => res()   // continue even on error
      })

      const off = document.createElement('canvas')
      off.width = width; off.height = height
      const offCtx = off.getContext('2d', { willReadFrequently: true })
      if (!offCtx) return
      offCtx.drawImage(img, 0, 0, width, height)
      const imgData = offCtx.getImageData(0, 0, width, height).data

      const portraitPixels: Array<{ x: number; y: number; r: number; g: number; b: number; a: number }> = []
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (y * width + x) * 4
          const a = imgData[i + 3]
          if (a < 30) continue
          portraitPixels.push({ x, y, r: imgData[i], g: imgData[i + 1], b: imgData[i + 2], a })
        }
      }

      // ── Pre-sample every frame's text pixels ──────────────────────────
      const txtCanvas = document.createElement('canvas')
      txtCanvas.width = width; txtCanvas.height = height
      const txtCtx = txtCanvas.getContext('2d', { willReadFrequently: true })
      if (!txtCtx) return

      const family = "'Sora', 'Inter', system-ui, sans-serif"
      const framesPositions: Array<Array<{ x: number; y: number }>> = []
      const tStep = Math.max(1, Math.floor(step / 2))

      for (const frame of frames) {
        txtCtx.clearRect(0, 0, width, height)
        txtCtx.fillStyle = 'white'
        txtCtx.textAlign  = 'center'
        txtCtx.textBaseline = 'top'

        const totalH = frame.reduce((s, l) => s + l.size * 1.4, 0)
        let y = (height - totalH) / 2
        for (const line of frame) {
          txtCtx.font = `${line.weight ?? 700} ${line.size}px ${family}`
          // letter-spacing emulation by drawing char-by-char
          if (line.letter && line.letter > 0) {
            const widths = [...line.text].map(c => txtCtx.measureText(c).width)
            const totalW = widths.reduce((s, w) => s + w, 0) + line.letter * (line.text.length - 1)
            let xPos = (width - totalW) / 2
            for (let ci = 0; ci < line.text.length; ci++) {
              txtCtx.textAlign = 'left'
              txtCtx.fillText(line.text[ci], xPos, y)
              xPos += widths[ci] + line.letter
            }
            txtCtx.textAlign = 'center'
          } else {
            txtCtx.fillText(line.text, width / 2, y)
          }
          y += line.size * 1.4
        }
        const td = txtCtx.getImageData(0, 0, width, height).data
        const pos: Array<{ x: number; y: number }> = []
        for (let yy = 0; yy < height; yy += tStep) {
          for (let xx = 0; xx < width; xx += tStep) {
            const i = (yy * width + xx) * 4
            if (td[i + 3] > 120) pos.push({ x: xx, y: yy })
          }
        }
        framesPositions.push(pos)
      }
      framesPosRef.current = framesPositions

      // ── Build particles ──────────────────────────────────────────────
      const firstFrame = framesPositions[0] ?? [{ x: width / 2, y: height / 2 }]
      const ps: Particle[] = portraitPixels.map((p, idx) => {
        const t = firstFrame[idx % firstFrame.length]
        return {
          px: p.x, py: p.y,
          x:  p.x, y:  p.y,
          tx: t.x, ty: t.y,
          vx: 0,   vy: 0,
          r:  p.r, g: p.g, b: p.b, a: p.a,
          phase:  ((idx * 73) % 100) / 100,        // 0..1, deterministic stagger
          wobble: ((idx * 113) % 628) / 100,       // 0..2π
        }
      })
      particlesRef.current = ps
      startLoop()
    }

    init()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, width, height, step, frames])

  function reassignTargets(frameIdx: number) {
    const frame = framesPosRef.current[frameIdx]
    if (!frame || frame.length === 0) return
    const ps = particlesRef.current
    for (let i = 0; i < ps.length; i++) {
      const t = frame[i % frame.length]
      ps[i].tx = t.x
      ps[i].ty = t.y
    }
  }

  function startLoop() {
    const tick = (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }

      ctx.clearRect(0, 0, width, height)
      const hover = hoverRef.current
      const ps    = particlesRef.current

      // Auto-advance through frames while hovered.
      if (hover && framesPosRef.current.length > 0) {
        if (frameStartRef.current === 0) {
          frameStartRef.current = now
          reassignTargets(frameIdxRef.current)
        } else if (now - frameStartRef.current > frameDuration) {
          frameIdxRef.current = (frameIdxRef.current + 1) % framesPosRef.current.length
          frameStartRef.current = now
          reassignTargets(frameIdxRef.current)
        }
      } else {
        frameStartRef.current = 0
        if (frameIdxRef.current !== 0) {
          frameIdxRef.current = 0
        }
      }

      // Stagger window — particles arrive in a wave (their phase delays them
      // by up to ~280 ms after a target switch). Wobble adds a tiny living
      // motion at rest.
      const elapsedMs    = hover ? (now - frameStartRef.current) : 0
      const wobbleT      = now * 0.001

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const tgX = hover ? p.tx : p.px
        const tgY = hover ? p.ty : p.py

        // Particle activation ramp — 0 during its delay, 1 after
        const delayMs = p.phase * 320
        const k = elapsedMs > delayMs || !hover ? 0.07 : 0.0
        p.vx += (tgX - p.x) * k
        p.vy += (tgY - p.y) * k
        p.vx *= 0.85
        p.vy *= 0.85
        p.x  += p.vx
        p.y  += p.vy

        // Tiny idle wobble (sub-pixel) — adds a "breathing dust" feel
        const wx = Math.sin(wobbleT * 1.2 + p.wobble) * 0.18
        const wy = Math.cos(wobbleT * 0.9 + p.wobble) * 0.18

        // Tint shifts toward accent as drift distance grows
        const dx = (p.x + wx) - tgX
        const dy = (p.y + wy) - tgY
        const drift = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 22)
        const r = Math.round(p.r * (1 - drift) + tint.r * drift)
        const g = Math.round(p.g * (1 - drift) + tint.g * drift)
        const b = Math.round(p.b * (1 - drift) + tint.b * drift)
        const a = (p.a / 255) * Math.max(0.45, 1 - drift * 0.35)

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`
        ctx.fillRect(p.x + wx, p.y + wy, 1.4, 1.4)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => { hoverRef.current = true  }}
      onMouseLeave={() => { hoverRef.current = false }}
      style={{
        position: 'absolute',
        inset:    0,
        width:    cssWidth,
        height:   cssHeight,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width:  '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
