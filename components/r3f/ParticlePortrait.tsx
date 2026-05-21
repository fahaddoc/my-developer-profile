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
  const hoverRef     = useRef(false)
  const rafRef       = useRef(0)
  const burstTimeRef = useRef(0)   // ms timestamp of last hover-enter

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
    const cx = width  / 2
    const cy = height / 2.2  // bias toward face for nicer outward fan

    const tick = (now: number) => {
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }

      ctx.clearRect(0, 0, width, height)
      const hover = hoverRef.current

      const ps = particlesRef.current
      const burstAge = (now - burstTimeRef.current) * 0.001  // sec since hover-enter
      // Stronger initial impulse, decays after ~0.4s
      const burstStrength = hover ? Math.max(0, 1 - burstAge / 0.4) : 0

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        if (hover) {
          if (burstStrength > 0) {
            // Initial outward impulse from center, only applied at hover-start
            const dx = p.ox - cx
            const dy = p.oy - cy
            const d  = Math.sqrt(dx * dx + dy * dy) + 1
            const ux = dx / d
            const uy = dy / d
            // Per-particle randomness so they don't move in perfect radial sync
            const r1 = ((Math.sin(p.ox * 12.9898 + p.oy * 78.233) * 43758.5) % 1 + 1) % 1
            const r2 = ((Math.sin(p.ox * 39.346 + p.oy * 11.135) * 43758.5) % 1 + 1) % 1
            const impulse = burstStrength * (0.6 + r1 * 0.8)
            p.vx += ux * impulse + (r1 - 0.5) * 0.3
            p.vy += uy * impulse + (r2 - 0.5) * 0.3 - 0.04   // tiny upward bias
          }
          // Slow upward drift like dust on a draft
          p.vy -= 0.005
        } else {
          // Spring back home
          p.vx += (p.ox - p.x) * 0.06
          p.vy += (p.oy - p.y) * 0.06
        }
        p.vx *= 0.92
        p.vy *= 0.92
        p.x  += p.vx
        p.y  += p.vy

        // Tint: shift color toward accent as particle drifts further from home
        const dx2 = p.x - p.ox
        const dy2 = p.y - p.oy
        const drift = Math.min(1, Math.sqrt(dx2 * dx2 + dy2 * dy2) / 30)
        const r = Math.round(p.r * (1 - drift) + tint.r * drift)
        const g = Math.round(p.g * (1 - drift) + tint.g * drift)
        const b = Math.round(p.b * (1 - drift) + tint.b * drift)
        const a = (p.a / 255) * (hover ? Math.max(0.35, 1 - drift * 0.6) : 1)

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`
        ctx.fillRect(p.x, p.y, 1.4, 1.4)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => {
        if (!hoverRef.current) burstTimeRef.current = performance.now()
        hoverRef.current = true
      }}
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
