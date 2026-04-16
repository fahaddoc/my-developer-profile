'use client'

// SectionBackground — reusable interactive mouse effect for every section.
//
// Architecture (why it's smooth):
//  • mousemove handler stores only raw viewport coords — zero processing
//  • RAF computes section-relative position from fresh getBoundingClientRect each frame
//    (always correct after scroll / Framer transforms, no stale cache issues)
//  • Cursor position is lerped toward target each frame → no sudden jumps
//  • First-entry snap guard prevents the cursor "flying in" from 0,0
//  • Glow = pre-rendered radial gradient div moved via CSS transform
//    (GPU composited layer, never triggers a style recalc / paint)
//  • Beam velocity comes from lerped-position delta, not raw mousemove delta
//    (raw delta is irregular; lerped delta is frame-stable)
//  • Off-screen sections skip all work (one rect check per frame)
//  • Touch devices exit immediately — no RAF started

import { useEffect, useRef } from 'react'

interface SectionBackgroundProps {
  /** RGB triplet for primary colour e.g. "34,211,238"  (cyan)   */
  primary?: string
  /** RGB triplet for secondary colour e.g. "168,85,247" (violet) */
  secondary?: string
  /** Canvas cell size — match to your pattern's repeat interval  */
  cellSize?: number
  /** Beam trail length multiplier (default 1)                    */
  beamMult?: number
  /** Ambient glow circle radius in px (default 520)              */
  glowRadius?: number
}

export function SectionBackground({
  primary    = '34,211,238',
  secondary  = '168,85,247',
  cellSize   = 80,
  beamMult   = 1,
  glowRadius = 520,
}: SectionBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // touch / stylus only → no hover effect needed, skip the RAF entirely
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!
    const CELL   = cellSize
    const LERP   = 0.10   // lower = smoother, higher = more responsive

    // ── state (all refs/locals — zero React state updates) ──────────────
    let rawX = -1, rawY = -1          // raw viewport coords from mousemove
    let smoothX = -1, smoothY = -1    // lerped section-relative position
    let prevX   = 0,  prevY   = 0     // previous smooth pos for velocity
    let active  = false               // true while cursor is inside section

    // brightness map: key "gx,gy" → 0-1, decays per frame
    const cells  = new Map<string, number>()
    // spark lifetime: key "gx,gy" → 0-1, decays faster than cells
    const sparks = new Map<string, number>()

    let W = 0, H = 0, rafId = 0

    // ── resize ────────────────────────────────────────────────────────────
    const resize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H
    }

    // ── mousemove: just store viewport coords, nothing else ───────────────
    const onMove = (e: MouseEvent) => {
      rawX = e.clientX
      rawY = e.clientY
    }

    const onLeave = () => {
      rawX = -1; rawY = -1
      active = false
      smoothX = -1; smoothY = -1
      glow.style.opacity = '0'
    }

    // ── main RAF loop ──────────────────────────────────────────────────────
    const draw = () => {
      rafId = requestAnimationFrame(draw)

      // get fresh canvas rect every frame — correct after scroll + transforms
      const rect = canvas.getBoundingClientRect()

      // off-screen? skip everything — no canvas work, no cell updates
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return

      // ── cursor state ────────────────────────────────────────────────────
      const inBounds = rawX > 0 &&
        rawX >= rect.left && rawX <= rect.right &&
        rawY >= rect.top  && rawY <= rect.bottom

      if (inBounds) {
        const targetX = rawX - rect.left
        const targetY = rawY - rect.top

        if (!active) {
          // first frame inside section: snap to avoid cursor flying in from 0
          smoothX = targetX
          smoothY = targetY
          prevX   = targetX   // zero velocity on entry frame
          prevY   = targetY
          active  = true
        } else {
          prevX = smoothX
          prevY = smoothY
          smoothX += (targetX - smoothX) * LERP
          smoothY += (targetY - smoothY) * LERP
        }

        // move glow div via transform — no gradient rebuild, GPU composited
        glow.style.transform = `translate(${smoothX}px,${smoothY}px) translate(-50%,-50%)`
        glow.style.opacity   = '1'

        // activate cells under the smooth (lerped) cursor position
        const cx = Math.floor(smoothX / CELL)
        const cy = Math.floor(smoothY / CELL)

        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > 2.5) continue
            const key  = `${cx + dx},${cy + dy}`
            const val  = (2.5 - dist) / 2.5
            const prev = cells.get(key) ?? 0
            cells.set(key, Math.max(prev, val))
            // only spark cells that weren't already lit
            if (!sparks.has(key) && prev < 0.05) sparks.set(key, 1.0)
          }
        }

      } else if (active) {
        active  = false
        smoothX = -1; smoothY = -1
        glow.style.opacity = '0'
      }

      // ── skip canvas draw if nothing to paint ─────────────────────────
      if (!active && cells.size === 0 && sparks.size === 0) {
        ctx.clearRect(0, 0, W, H)
        return
      }

      ctx.clearRect(0, 0, W, H)

      // ── 1. cell border neon ─────────────────────────────────────────
      cells.forEach((b, key) => {
        if (b < 0.012) { cells.delete(key); return }
        const [gx, gy] = key.split(',').map(Number)
        const x0 = gx * CELL, y0 = gy * CELL

        ctx.save()
        ctx.shadowColor = `rgba(${primary},${b * 0.9})`
        ctx.shadowBlur  = 12 * b
        ctx.strokeStyle = `rgba(${primary},${b * 0.85})`
        ctx.lineWidth   = 1 + b * 0.6
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, CELL - 1, CELL - 1)
        ctx.restore()

        ctx.fillStyle = `rgba(${secondary},${b * 0.055})`
        ctx.fillRect(x0 + 1, y0 + 1, CELL - 2, CELL - 2)

        cells.set(key, b * 0.93) // exponential fade
      })

      // ── 2. spark: corner dots on fresh cell contact ─────────────────
      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [gx, gy] = key.split(',').map(Number)

        ctx.save()
        ctx.shadowColor = `rgba(${primary},0.9)`
        ctx.shadowBlur  = 7
        ctx.fillStyle   = `rgba(210,245,255,${life})`
        const cs: [number, number][] = [
          [gx * CELL,        gy * CELL       ],
          [gx * CELL + CELL, gy * CELL       ],
          [gx * CELL,        gy * CELL + CELL],
          [gx * CELL + CELL, gy * CELL + CELL],
        ]
        cs.forEach(([cx, cy]) => {
          ctx.beginPath()
          ctx.arc(cx, cy, 2.5 * life, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
        sparks.set(key, life * 0.87)
      })

      // ── 3. neon travel beam — velocity from lerped delta ────────────
      if (active && smoothX > 0) {
        const vx  = smoothX - prevX
        const vy  = smoothY - prevY
        const spd = Math.sqrt(vx * vx + vy * vy)

        if (spd > 0.25) {
          const len = Math.min(spd * 10 * beamMult, 180 * beamMult)
          const nx  = vx / spd, ny = vy / spd

          const grad = ctx.createLinearGradient(
            smoothX - nx * len, smoothY - ny * len,
            smoothX, smoothY,
          )
          grad.addColorStop(0,   `rgba(${primary},0)`)
          grad.addColorStop(0.5, `rgba(${secondary},0.3)`)
          grad.addColorStop(1,   `rgba(${primary},0.85)`)

          ctx.save()
          ctx.strokeStyle = grad
          ctx.lineWidth   = 1.5
          ctx.lineCap     = 'round'
          ctx.shadowColor = `rgba(${primary},1)`
          ctx.shadowBlur  = 10
          ctx.beginPath()
          ctx.moveTo(smoothX - nx * len, smoothY - ny * len)
          ctx.lineTo(smoothX, smoothY)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    resize()
    window.addEventListener('mousemove',    onMove,   { passive: true })
    window.addEventListener('resize',       resize)
    document.addEventListener('mouseleave', onLeave)
    rafId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('mousemove',    onMove)
      window.removeEventListener('resize',       resize)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafId)
    }
  // props are mount-time constants — effect only needs to run once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* pre-rendered radial gradient div — position updated via CSS transform
          (GPU-composited layer, never causes style recalc or paint)           */}
      <div
        ref={glowRef}
        className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{
          width:      glowRadius * 2,
          height:     glowRadius * 2,
          top:        0,
          left:       0,
          background: `radial-gradient(circle,
            rgba(${primary},0.13)   0%,
            rgba(${secondary},0.07) 38%,
            transparent             70%)`,
          willChange: 'transform, opacity',
        }}
      />
      {/* canvas: cell borders + sparks + beam */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </>
  )
}
