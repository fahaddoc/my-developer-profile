'use client'

// ParticlePortrait — the portrait's pixels become thousands of particles.
//   Idle:   particles form the portrait.
//   Hover:  particles BURST outward from the centre, then magnetically pull
//           in to spell out the intro paragraph.
//   Leave:  another outward burst, then particles re-form into the portrait.

import { useEffect, useRef } from 'react'

interface ParticlePortraitProps {
  src:    string
  width:  number
  height: number
  cssWidth?:  string
  cssHeight?: string
  step?:      number
  accentTint?: string
  /** The text shown when particles re-form. Single paragraph, auto-wraps. */
  intro?:    string
  /** Font px for the paragraph (auto-shrunk to fit if needed). */
  fontPx?:   number
}

interface Particle {
  px: number; py: number   // portrait home
  tx: number; ty: number   // text home (computed from intro)
  x:  number; y:  number   // current
  vx: number; vy: number
  r:  number; g:  number; b: number
  a:  number
  wobble: number
}

// Full intro paragraph — the user's actual written script. Rendered in
// Sora weight 800 (matches the LET'S STAY IN TOUCH bold). Auto-shrink picks
// the largest font size that lets the whole para fit inside the canvas.
const DEFAULT_INTRO =
  "Hi, I'm Shah Fahad — a Senior Software Engineer based in Karachi, " +
  "Pakistan, with over 6 years of experience building real-time web and " +
  "mobile applications that scale. I specialize in React, Next.js, " +
  "TypeScript, Flutter, and WebRTC — crafting high-performance products " +
  "across fintech, healthcare, and live-communication domains. " +
  "Currently at DigitalHire, I lead frontend development for a modern " +
  "hiring platform — building reusable component libraries, complex " +
  "application flows, and optimizing for exceptional user experience. " +
  "Before that, at MILETAP, I built Konnect.im — an enterprise-grade " +
  "real-time video conferencing platform with screen sharing, live chat, " +
  "and participant management, powered by WebRTC and SignalR. Some of my " +
  "proudest work includes Agent Shah — a playable 3D stealth shooter " +
  "built entirely in Three.js where the agent is me. I've also built a " +
  "WhatsApp ChatBot Simulator, a farmer loan management system called " +
  "Reap Agro, an offline-first hospital OPD app in Flutter, and a " +
  "service booking platform called Helpers. Across 4 companies, 9+ " +
  "shipped projects, and 25+ clients — I've learned that great software " +
  "isn't just about clean code. It's about products people actually use. " +
  "I'm currently open to new opportunities — remote or on-site. Explore " +
  "my work at shahfahad.dev or reach me at hello@shahfahad.dev."

export function ParticlePortrait({
  src, width, height,
  cssWidth = '100%', cssHeight = '100%',
  step = 3,
  accentTint = '#5EEAD4',
  intro = DEFAULT_INTRO,
  fontPx = 26,
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
      if (typeof document !== 'undefined' && 'fonts' in document) {
        try { await (document as Document).fonts.ready } catch { /* noop */ }
      }
      if (cancelled) return

      // Portrait pixels
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = src
      await new Promise<void>((res) => {
        img.onload  = () => res()
        img.onerror = () => res()
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

      // Render the intro paragraph onto an offscreen, word-wrapped to fit
      const txt = document.createElement('canvas')
      txt.width = width; txt.height = height
      const txtCtx = txt.getContext('2d', { willReadFrequently: true })
      if (!txtCtx) return
      const family = "'Sora', 'Inter', system-ui, sans-serif"
      txtCtx.fillStyle = 'white'

      // Render with explicit line breaks. Each paragraph (line) wraps only
      // when it overflows. Empty strings produce visual spacing.
      const maxW = width - 14
      const renderWith = (size: number) => {
        txtCtx.clearRect(0, 0, width, height)
        txtCtx.font = `800 ${size}px ${family}`
        txtCtx.textBaseline = 'top'
        const paras = intro.split('\n')
        const lineHeight = Math.round(size * 1.35)
        const lines: string[] = []
        for (const para of paras) {
          if (para === '') { lines.push(''); continue }
          const words = para.split(/\s+/)
          let line = ''
          for (const w of words) {
            const cand = line ? line + ' ' + w : w
            if (txtCtx.measureText(cand).width > maxW) {
              if (line) lines.push(line)
              line = w
            } else {
              line = cand
            }
          }
          if (line) lines.push(line)
        }
        const totalH = lines.length * lineHeight
        let yPos = Math.max(6, (height - totalH) / 2)
        for (const l of lines) {
          if (l) {
            const lineW = txtCtx.measureText(l).width
            txtCtx.fillText(l, (width - lineW) / 2, yPos)
          }
          yPos += lineHeight
        }
        return totalH <= height - 10
      }
      let used = fontPx
      while (used > 6 && !renderWith(used)) used -= 1
      const td = txtCtx.getImageData(0, 0, width, height).data

      const textPositions: Array<{ x: number; y: number }> = []
      const tStep = Math.max(1, Math.floor(step / 2))
      for (let yy = 0; yy < height; yy += tStep) {
        for (let xx = 0; xx < width; xx += tStep) {
          const i = (yy * width + xx) * 4
          if (td[i + 3] > 120) textPositions.push({ x: xx, y: yy })
        }
      }

      // Build particles — text target sourced by cycling
      const ps: Particle[] = portraitPixels.map((p, idx) => {
        const t = textPositions.length > 0
          ? textPositions[idx % textPositions.length]
          : { x: width / 2, y: height / 2 }
        return {
          px: p.x, py: p.y,
          tx: t.x, ty: t.y,
          x:  p.x, y:  p.y,
          vx: 0,   vy: 0,
          r:  p.r, g: p.g, b: p.b, a: p.a,
          wobble: ((idx * 113) % 628) / 100,
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
  }, [src, width, height, step, intro, fontPx])

  // Inject an outward radial burst on each hover state change
  function burst() {
    const cx = width  / 2
    const cy = height / 2
    const ps = particlesRef.current
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i]
      const dx = p.x - cx
      const dy = p.y - cy
      const d  = Math.sqrt(dx * dx + dy * dy) + 0.5
      // Deterministic per-particle variance via index
      const r1 = ((Math.sin(p.px * 12.9898 + p.py * 78.233) * 43758.5) % 1 + 1) % 1
      const speed = 2.8 + r1 * 2.4
      p.vx += (dx / d) * speed + (r1 - 0.5) * 1.2
      p.vy += (dy / d) * speed + (r1 - 0.5) * 1.2
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
      const wobT  = now * 0.001

      for (let i = 0; i < ps.length; i++) {
        const p   = ps[i]
        const tgX = hover ? p.tx : p.px
        const tgY = hover ? p.ty : p.py

        // Magnetic spring toward target with high damping for organic settle
        p.vx += (tgX - p.x) * 0.025
        p.vy += (tgY - p.y) * 0.025
        p.vx *= 0.91
        p.vy *= 0.91
        p.x  += p.vx
        p.y  += p.vy

        // Sub-pixel idle wobble for living dust
        const wx = Math.sin(wobT * 1.1 + p.wobble) * 0.22
        const wy = Math.cos(wobT * 0.85 + p.wobble) * 0.22

        const dx = (p.x + wx) - tgX
        const dy = (p.y + wy) - tgY
        const drift = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 26)

        // Color: in hover mode, particles render in CLEAN cream-white settling
        // to accent as they near their text target — so the words read
        // crisply, not as a muddy mix of original portrait colors.
        // In idle mode, particles use their original portrait pixel color
        // and shift toward accent only when far from home (transition).
        let r: number, g: number, b: number
        if (hover) {
          // Far from target → accent. Near target → cream-white (legible).
          const cream = { r: 240, g: 252, b: 248 }
          r = Math.round(tint.r * drift + cream.r * (1 - drift))
          g = Math.round(tint.g * drift + cream.g * (1 - drift))
          b = Math.round(tint.b * drift + cream.b * (1 - drift))
        } else {
          r = Math.round(p.r * (1 - drift) + tint.r * drift)
          g = Math.round(p.g * (1 - drift) + tint.g * drift)
          b = Math.round(p.b * (1 - drift) + tint.b * drift)
        }
        const a = (hover ? 1 : (p.a / 255)) * Math.max(0.55, 1 - drift * 0.3)

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`
        // Bigger rect when settled into text shape — boosts readability at
        // the canvas's now-larger native resolution.
        const settled = hover && drift < 0.3 ? 2.8 : 2.0
        ctx.fillRect(p.x + wx, p.y + wy, settled, settled)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => { hoverRef.current = true;  burst() }}
      onMouseLeave={() => { hoverRef.current = false; burst() }}
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
