'use client'

// ParticlePortrait — samples a transparent PNG into thousands of tiny pixel
// particles drawn on a Canvas2D. On hover the particles drift outward (random
// impulse scaled by distance from center) and dissolve; on hover-out they
// spring back to their home pixel positions.
//
// Designed to drop into FlipPhotoCard in place of a plain <img>. Visually
// matches the cutout when idle; on hover it explodes into dust.

import { useEffect, useRef } from 'react'

interface ParticlePortraitProps {
  src:    string
  /** Internal canvas width — sampled image resolution. */
  width:  number
  height: number
  /** CSS pixel width (the actual rendered DOM size). */
  cssWidth?:  string
  cssHeight?: string
  /** Sample every N internal pixels — higher = sparser/cheaper. */
  step?:      number
  /** Tint factor 0..1 mixing pixel color toward accent on dispersion. */
  accentTint?: string
}

interface Particle {
  ox: number; oy: number   // home position
  x:  number; y:  number   // current
  vx: number; vy: number
  r:  number; g:  number; b: number
  a:  number               // 0..255
}

export function ParticlePortrait({
  src, width, height,
  cssWidth = '100%', cssHeight = '100%',
  step = 5,
  accentTint = '#5EEAD4',
}: ParticlePortraitProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const rafRef       = useRef(0)
  // Cursor position in canvas-internal coordinate space. -9999 = no cursor.
  const cursorRef    = useRef({ x: -9999, y: -9999, active: false })

  // Parse accent hex once for tint
  const tint = (() => {
    const h = accentTint.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    }
  })()

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      // Draw image into an offscreen canvas at the target resolution so we
      // can sample pixel data efficiently.
      const off = document.createElement('canvas')
      off.width  = width
      off.height = height
      const offCtx = off.getContext('2d', { willReadFrequently: true })
      if (!offCtx) return
      offCtx.drawImage(img, 0, 0, width, height)
      const data = offCtx.getImageData(0, 0, width, height).data

      const ps: Particle[] = []
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (y * width + x) * 4
          const a = data[i + 3]
          if (a < 30) continue
          ps.push({
            ox: x, oy: y, x, y,
            vx: 0, vy: 0,
            r: data[i], g: data[i + 1], b: data[i + 2],
            a,
          })
        }
      }
      particlesRef.current = ps
      startLoop()
    }
    img.onerror = () => { /* silent */ }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, width, height, step])

  function startLoop() {
    // Influence radius in canvas-internal coords. Particles within this radius
    // of the cursor get pushed away; everything else stays put / springs back.
    const RADIUS    = 32
    const STRENGTH  = 0.85

    const tick = () => {
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }

      ctx.clearRect(0, 0, width, height)

      const ps = particlesRef.current
      const cur = cursorRef.current

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]

        // Cursor repulsion — only particles within RADIUS feel a push.
        if (cur.active) {
          const dx = p.x - cur.x
          const dy = p.y - cur.y
          const d2 = dx * dx + dy * dy
          if (d2 < RADIUS * RADIUS) {
            const d = Math.sqrt(d2) + 0.001
            const force = (1 - d / RADIUS) * STRENGTH
            p.vx += (dx / d) * force
            p.vy += (dy / d) * force
          }
        }

        // Always spring back home so untouched particles stay put and pushed
        // particles drift back as the cursor moves away.
        p.vx += (p.ox - p.x) * 0.08
        p.vy += (p.oy - p.y) * 0.08
        p.vx *= 0.86
        p.vy *= 0.86
        p.x  += p.vx
        p.y  += p.vy

        // Tint: shift toward accent as drift distance grows
        const dx2 = p.x - p.ox
        const dy2 = p.y - p.oy
        const drift = Math.min(1, Math.sqrt(dx2 * dx2 + dy2 * dy2) / 20)
        const r = Math.round(p.r * (1 - drift) + tint.r * drift)
        const g = Math.round(p.g * (1 - drift) + tint.g * drift)
        const b = Math.round(p.b * (1 - drift) + tint.b * drift)
        const a = (p.a / 255) * Math.max(0.45, 1 - drift * 0.4)

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`
        ctx.fillRect(p.x, p.y, 1.4, 1.4)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    // Map screen → canvas-internal coords. Canvas is rendered with
    // objectFit: contain so we honour the same aspect-fit math.
    const containerAR = rect.width / rect.height
    const imgAR       = width / height
    let drawW = rect.width, drawH = rect.height, offsetX = 0, offsetY = 0
    if (containerAR > imgAR) {
      drawW   = rect.height * imgAR
      offsetX = (rect.width - drawW) / 2
    } else {
      drawH   = rect.width / imgAR
      offsetY = (rect.height - drawH) / 2
    }
    const localX = (e.clientX - rect.left - offsetX) / drawW * width
    const localY = (e.clientY - rect.top  - offsetY) / drawH * height
    cursorRef.current.x = localX
    cursorRef.current.y = localY
    cursorRef.current.active = true
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={() => { cursorRef.current.active = false }}
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
