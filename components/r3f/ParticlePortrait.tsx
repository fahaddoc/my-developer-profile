'use client'

// ParticlePortrait — the portrait's pixels are sampled into thousands of
// particles. Idle: particles form the portrait. Hover: particles fly to
// secondary positions sampled from rendered TEXT, spelling out the intro
// from the same particles. Mouse-leave: particles return to the portrait.

import { useEffect, useRef } from 'react'

interface ParticlePortraitProps {
  src:    string
  /** Internal canvas resolution. */
  width:  number
  height: number
  cssWidth?:  string
  cssHeight?: string
  step?:      number
  accentTint?: string
  /** Lines to spell out on hover (rendered top-to-bottom). */
  textLines?: Array<{ text: string; size: number; weight?: number }>
}

interface Particle {
  px: number; py: number   // portrait home
  tx: number; ty: number   // text target
  x:  number; y:  number   // current
  vx: number; vy: number
  r:  number; g:  number; b: number
  a:  number
}

export function ParticlePortrait({
  src, width, height,
  cssWidth = '100%', cssHeight = '100%',
  step = 5,
  accentTint = '#5EEAD4',
  textLines = [
    { text: 'SHAH FAHAD',                 size: 30, weight: 800 },
    { text: 'SENIOR SOFTWARE ENGINEER',   size: 12, weight: 600 },
    { text: 'REACT · NEXT.JS · FLUTTER',  size: 10, weight: 500 },
  ],
}: ParticlePortraitProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const hoverRef     = useRef(false)
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
      // Wait for web fonts so the sampled text uses the right family.
      if (typeof document !== 'undefined' && 'fonts' in document) {
        try { await (document as Document).fonts.ready } catch { /* noop */ }
      }
      if (cancelled) return

      // ── Sample portrait pixels ─────────────────────────────────────────
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      await new Promise<void>((res, rej) => {
        img.onload = () => res()
        img.onerror = () => rej(new Error('image load failed'))
      }).catch(() => { /* ignore */ })

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

      // ── Sample text pixels onto a separate offscreen ──────────────────
      const txtOff = document.createElement('canvas')
      txtOff.width = width; txtOff.height = height
      const txtCtx = txtOff.getContext('2d', { willReadFrequently: true })
      if (!txtCtx) return
      txtCtx.fillStyle = 'white'
      txtCtx.textAlign  = 'center'
      txtCtx.textBaseline = 'top'
      // Stack lines vertically, centred. Gaps proportional to size.
      const totalH = textLines.reduce((s, l) => s + l.size * 1.45, 0)
      let y = (height - totalH) / 2
      for (const line of textLines) {
        const family = "'Sora', 'Inter', system-ui, sans-serif"
        txtCtx.font = `${line.weight ?? 700} ${line.size}px ${family}`
        txtCtx.fillText(line.text, width / 2, y)
        y += line.size * 1.45
      }
      const txtData = txtCtx.getImageData(0, 0, width, height).data

      const textPositions: Array<{ x: number; y: number }> = []
      const tStep = Math.max(1, Math.floor(step / 2))
      for (let yy = 0; yy < height; yy += tStep) {
        for (let xx = 0; xx < width; xx += tStep) {
          const i = (yy * width + xx) * 4
          if (txtData[i + 3] > 120) textPositions.push({ x: xx, y: yy })
        }
      }

      // ── Build particles, mapping each portrait pixel to a text pixel ──
      const ps: Particle[] = portraitPixels.map((p, idx) => {
        const t = textPositions.length > 0
          ? textPositions[idx % textPositions.length]
          : { x: width / 2, y: height / 2 }
        return {
          px: p.x, py: p.y,
          tx: t.x, ty: t.y,
          x:  p.x, y:  p.y,
          vx: 0,   vy: 0,
          r: p.r,  g: p.g, b: p.b, a: p.a,
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
  }, [src, width, height, step])

  function startLoop() {
    const tick = () => {
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return }
      const ctx = canvas.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }

      ctx.clearRect(0, 0, width, height)
      const hover = hoverRef.current
      const ps = particlesRef.current

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i]
        const tgX = hover ? p.tx : p.px
        const tgY = hover ? p.ty : p.py
        // Spring toward target
        p.vx += (tgX - p.x) * 0.05
        p.vy += (tgY - p.y) * 0.05
        // Per-particle damping
        p.vx *= 0.86
        p.vy *= 0.86
        p.x  += p.vx
        p.y  += p.vy

        // Tint shifts toward accent during the transition (when far from
        // either home position).
        const dx = p.x - tgX
        const dy = p.y - tgY
        const drift = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 25)
        const r = Math.round(p.r * (1 - drift) + tint.r * drift)
        const g = Math.round(p.g * (1 - drift) + tint.g * drift)
        const b = Math.round(p.b * (1 - drift) + tint.b * drift)
        const a = (p.a / 255) * (hover ? 1 : Math.max(0.45, 1 - drift * 0.4))

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
