'use client'

import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { TimelineItem } from '@/components/ui/TimelineItem'
import { experience } from '@/data/projects'

// ── Hexagonal honeycomb background ───────────────────────────────────────────
// Pointy-top hexagons. Hexes near cursor glow with neon violet border.
// Sparkle ring on first contact. Beam trail through the honeycombs.

const R      = 36                       // hex circumradius (center → vertex)
const SQ3    = Math.sqrt(3)
const HEX_W  = R * SQ3                  // hex width  (flat-to-flat)
const COL_SP = HEX_W                    // horizontal distance between centers in same row
const ROW_SP = R * 1.5                  // vertical   distance between row centers

const PRIMARY   = '139,92,246'   // violet-500
const SECONDARY = '34,211,238'   // cyan-400

// Hex center for (col, row) in pointy-top grid
// Odd rows are offset right by half a column
const hexCenter = (col: number, row: number): [number, number] => [
  col * COL_SP + (row & 1) * (COL_SP / 2),
  row * ROW_SP,
]

// Six vertices of a pointy-top hex at (cx, cy)
const hexVerts = (cx: number, cy: number): [number, number][] =>
  Array.from({ length: 6 }, (_, k) => {
    const a = Math.PI / 6 + (Math.PI / 3) * k
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)]
  }) as [number, number][]

function ExperienceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!
    const LERP   = 0.10
    const ACT_R  = R * 2.2   // activate hexes within this radius of cursor center

    let rawX = -1, rawY = -1
    let smoothX = -1, smoothY = -1, prevX = 0, prevY = 0
    let active = false

    const hexes  = new Map<string, number>()   // "col,row" → brightness
    const sparks = new Map<string, number>()   // "col,row" → life

    let W = 0, H = 0, rafId = 0

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W; canvas.height = H
    }
    const onMove  = (e: MouseEvent) => { rawX = e.clientX; rawY = e.clientY }
    const onLeave = () => {
      rawX = -1; rawY = -1; active = false; smoothX = -1; smoothY = -1
      glow.style.opacity = '0'
    }

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      const rect = canvas.getBoundingClientRect()
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return

      const inBounds = rawX > 0 &&
        rawX >= rect.left && rawX <= rect.right &&
        rawY >= rect.top  && rawY <= rect.bottom

      if (inBounds) {
        const tx = rawX - rect.left, ty = rawY - rect.top
        if (!active) {
          smoothX = tx; smoothY = ty; prevX = tx; prevY = ty; active = true
        } else {
          prevX = smoothX; prevY = smoothY
          smoothX += (tx - smoothX) * LERP
          smoothY += (ty - smoothY) * LERP
        }
        glow.style.transform = `translate(${smoothX}px,${smoothY}px) translate(-50%,-50%)`
        glow.style.opacity   = '1'

        // find nearby hexes by checking grid region around cursor
        const cc = Math.round(smoothX / COL_SP)
        const cr = Math.round(smoothY / ROW_SP)
        for (let dr = -3; dr <= 3; dr++) {
          for (let dc = -3; dc <= 3; dc++) {
            const col = cc + dc, row = cr + dr
            const [cx, cy] = hexCenter(col, row)
            const dist = Math.hypot(smoothX - cx, smoothY - cy)
            if (dist > ACT_R) continue
            const key  = `${col},${row}`
            const val  = 1 - dist / ACT_R
            const prev = hexes.get(key) ?? 0
            hexes.set(key, Math.max(prev, val))
            if (!sparks.has(key) && prev < 0.05) sparks.set(key, 1.0)
          }
        }
      } else if (active) {
        active = false; smoothX = -1; smoothY = -1
        glow.style.opacity = '0'
      }

      if (!active && hexes.size === 0 && sparks.size === 0) {
        ctx.clearRect(0, 0, W, H); return
      }
      ctx.clearRect(0, 0, W, H)

      // ── 1. glowing hex cell borders ───────────────────────────────────
      hexes.forEach((b, key) => {
        if (b < 0.012) { hexes.delete(key); return }
        const [col, row] = key.split(',').map(Number)
        const [cx, cy]   = hexCenter(col, row)
        const verts       = hexVerts(cx, cy)

        // subtle fill
        ctx.save()
        ctx.fillStyle = `rgba(${PRIMARY},${b * 0.06})`
        ctx.beginPath()
        ctx.moveTo(verts[0][0], verts[0][1])
        verts.forEach(([x, y]) => ctx.lineTo(x, y))
        ctx.closePath(); ctx.fill()
        ctx.restore()

        // neon border
        ctx.save()
        ctx.shadowColor = `rgba(${PRIMARY},${b * 0.85})`
        ctx.shadowBlur  = 14 * b
        ctx.strokeStyle = `rgba(${PRIMARY},${b * 0.8})`
        ctx.lineWidth   = 1 + b * 1.2
        ctx.beginPath()
        ctx.moveTo(verts[0][0], verts[0][1])
        verts.forEach(([x, y]) => ctx.lineTo(x, y))
        ctx.closePath(); ctx.stroke()
        ctx.restore()

        // vertex dots on brightest hexes
        if (b > 0.45) {
          verts.forEach(([x, y]) => {
            ctx.save()
            ctx.fillStyle   = `rgba(${SECONDARY},${(b - 0.45) * 0.9})`
            ctx.shadowColor = `rgba(${SECONDARY},0.8)`
            ctx.shadowBlur  = 6
            ctx.beginPath(); ctx.arc(x, y, 2.5 * b, 0, Math.PI * 2); ctx.fill()
            ctx.restore()
          })
        }

        hexes.set(key, b * 0.935)
      })

      // ── 2. spark rings on new hex entry ──────────────────────────────
      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [col, row] = key.split(',').map(Number)
        const [cx, cy]   = hexCenter(col, row)
        const ringR      = R * 0.4 + (1 - life) * R * 0.9

        ctx.save()
        ctx.strokeStyle = `rgba(${SECONDARY},${life * 0.75})`
        ctx.lineWidth   = life * 2
        ctx.shadowColor = `rgba(${SECONDARY},0.9)`
        ctx.shadowBlur  = 10
        ctx.beginPath(); ctx.arc(cx, cy, ringR, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()

        sparks.set(key, life * 0.86)
      })

      // ── 3. neon beam trail ────────────────────────────────────────────
      if (active && smoothX > 0) {
        const vx = smoothX - prevX, vy = smoothY - prevY
        const spd = Math.hypot(vx, vy)
        if (spd > 0.25) {
          const len = Math.min(spd * 11, 180)
          const nx = vx / spd, ny = vy / spd
          const grad = ctx.createLinearGradient(
            smoothX - nx * len, smoothY - ny * len, smoothX, smoothY,
          )
          grad.addColorStop(0,   `rgba(${PRIMARY},0)`)
          grad.addColorStop(0.5, `rgba(${SECONDARY},0.28)`)
          grad.addColorStop(1,   `rgba(${PRIMARY},0.88)`)
          ctx.save()
          ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
          ctx.shadowColor = `rgba(${PRIMARY},1)`; ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.moveTo(smoothX - nx * len, smoothY - ny * len)
          ctx.lineTo(smoothX, smoothY)
          ctx.stroke(); ctx.restore()
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
  }, [])

  return (
    <>
      <div
        ref={glowRef}
        className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{
          width: 1040, height: 1040, top: 0, left: 0,
          background: `radial-gradient(circle,
            rgba(${PRIMARY},0.12)   0%,
            rgba(${SECONDARY},0.06) 38%,
            transparent             70%)`,
          willChange: 'transform, opacity',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function Experience() {
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const scale   = useTransform(scrollYProgress, [0.65, 1], [1,  0.91])
  const opacity = useTransform(scrollYProgress, [0.65, 1], [1,  0.35])
  const rotateX = useTransform(scrollYProgress, [0.65, 1], [0,  10  ])

  return (
    <section ref={sectionRef} id="experience" className="relative py-24 md:py-32 overflow-hidden">

      {/* ── hex honeycomb CSS background (approximate) ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            repeating-linear-gradient(60deg,
              transparent 0px, transparent 30px,
              rgba(${PRIMARY},0.07) 30px, rgba(${PRIMARY},0.07) 31px),
            repeating-linear-gradient(-60deg,
              transparent 0px, transparent 30px,
              rgba(${PRIMARY},0.07) 30px, rgba(${PRIMARY},0.07) 31px),
            repeating-linear-gradient(0deg,
              transparent 0px, transparent 52px,
              rgba(${PRIMARY},0.04) 52px, rgba(${PRIMARY},0.04) 53px)
          `,
        }} />
        <ExperienceBackground />
      </div>

      <motion.div style={{ scale, opacity, rotateX, transformOrigin: 'center 20%' }}>
        <div className="max-w-content mx-auto px-6 relative z-10">

          <RevealText className="mb-14">
            <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Experience</span>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
              Professional Journey
            </h2>
          </RevealText>

          <div className="max-w-2xl">
            {experience.map((item, i) => (
              <TimelineItem key={item.id} item={item} index={i} />
            ))}
          </div>

          {/* Resume CTA */}
          <div className="mt-14">
            <a
              href="/Shah_Fahad_Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm hover:bg-opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all duration-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Resume
            </a>
          </div>

        </div>
      </motion.div>
    </section>
  )
}
