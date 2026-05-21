'use client'

// ParticlePortrait — clean image kept intact; hover spawns small cyan dust
// particles at the cursor that drift upward and fade. Like sparks kicked
// up where you touch.

import { useEffect, useRef } from 'react'

interface ParticlePortraitProps {
  src:        string
  accentTint?: string
}

interface Particle {
  x:  number; y:  number
  vx: number; vy: number
  life: number   // 0..1, decays each frame
  size: number
}

export function ParticlePortrait({
  src,
  accentTint = '#5EEAD4',
}: ParticlePortraitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const particles    = useRef<Particle[]>([])
  const cursor       = useRef({ x: -9999, y: -9999, active: false })
  const lastSpawn    = useRef(0)
  const rafRef       = useRef(0)

  // Parse accent hex
  const tint = (() => {
    const h = accentTint.replace('#', '')
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    }
  })()

  useEffect(() => {
    const sizeCanvas = () => {
      const el = containerRef.current
      const c  = canvasRef.current
      if (!el || !c) return
      const rect = el.getBoundingClientRect()
      const dpr  = Math.min(window.devicePixelRatio || 1, 1.5)
      c.width    = Math.round(rect.width  * dpr)
      c.height   = Math.round(rect.height * dpr)
      c.style.width  = `${rect.width}px`
      c.style.height = `${rect.height}px`
      const ctx = c.getContext('2d')
      ctx?.scale(dpr, dpr)
    }
    sizeCanvas()
    window.addEventListener('resize', sizeCanvas)

    const tick = (now: number) => {
      const c = canvasRef.current
      if (!c) { rafRef.current = requestAnimationFrame(tick); return }
      const ctx = c.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return }
      const w = c.clientWidth
      const h = c.clientHeight
      ctx.clearRect(0, 0, w, h)

      // Spawn — burst small cluster at cursor while it's inside
      if (cursor.current.active && now - lastSpawn.current > 14) {
        lastSpawn.current = now
        const count = 3
        for (let i = 0; i < count; i++) {
          const a = Math.random() * Math.PI * 2
          const s = 0.4 + Math.random() * 0.9
          particles.current.push({
            x:  cursor.current.x + (Math.random() - 0.5) * 8,
            y:  cursor.current.y + (Math.random() - 0.5) * 8,
            vx: Math.cos(a) * s * 0.6,
            vy: Math.sin(a) * s * 0.6 - 0.4,    // upward bias
            life: 1,
            size: 1 + Math.random() * 2.2,
          })
        }
      }

      // Update + draw
      const ps = particles.current
      ctx.globalCompositeOperation = 'lighter'
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i]
        p.vy -= 0.012          // slight upward acceleration (rising dust)
        p.vx *= 0.985
        p.vy *= 0.985
        p.x  += p.vx
        p.y  += p.vy
        p.life -= 0.012

        if (p.life <= 0) {
          ps.splice(i, 1)
          continue
        }

        const alpha = p.life * 0.85
        const rad   = p.size * (0.5 + p.life * 0.5)
        // Glow halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 4)
        grd.addColorStop(0,   `rgba(${tint.r},${tint.g},${tint.b},${alpha * 0.9})`)
        grd.addColorStop(0.4, `rgba(${tint.r},${tint.g},${tint.b},${alpha * 0.35})`)
        grd.addColorStop(1,   `rgba(${tint.r},${tint.g},${tint.b},0)`)
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 4, 0, Math.PI * 2)
        ctx.fill()
        // Bright core
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, rad * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', sizeCanvas)
      cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    cursor.current.x = e.clientX - rect.left
    cursor.current.y = e.clientY - rect.top
    cursor.current.active = true
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMove}
      onMouseLeave={() => { cursor.current.active = false }}
      style={{
        position: 'absolute',
        inset:    0,
      }}
    >
      {/* The clean image — always visible, never dispersed */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Shah Fahad portrait"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'contain', objectPosition: 'bottom',
          pointerEvents: 'none',
        }}
      />
      {/* Particle overlay */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
