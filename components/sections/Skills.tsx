// components/sections/Skills.tsx
'use client'

import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'
import { skills } from '@/data/projects'

// ── staggered hex-dot grid constants (match CSS background) ──────────────────
const COL_W  = 28   // horizontal spacing
const ROW_H  = 28   // vertical spacing
const OFFSET = 14   // odd-row horizontal offset (half of COL_W)

// Two-layer CSS produces:
//   layer-1 dots: x = col*28,        y = row*28
//   layer-2 dots: x = col*28 + 14,   y = row*28 + 14
// Canvas mirrors both grids so highlights land on actual CSS dots.

const PRIMARY   = '16,185,129'   // emerald-500
const SECONDARY = '34,211,238'   // cyan-400

function SkillsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!
    const LERP   = 0.10
    const ACT_R  = 70   // activation radius

    let rawX = -1, rawY = -1
    let smoothX = -1, smoothY = -1
    let prevX = 0, prevY = 0
    let active = false

    const dots   = new Map<string, number>()   // "layer:col,row" → brightness
    const sparks = new Map<string, number>()   // "layer:col,row" → life

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

    // dot centre for a given layer (0=even, 1=odd), col, row
    const center = (layer: number, col: number, row: number): [number, number] => [
      col * COL_W + layer * OFFSET,
      row * ROW_H + layer * OFFSET,
    ]

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

        // activate dots in both grid layers
        for (let layer = 0; layer < 2; layer++) {
          const ox = layer * OFFSET, oy = layer * OFFSET
          const cc = Math.round((smoothX - ox) / COL_W)
          const cr = Math.round((smoothY - oy) / ROW_H)
          for (let dr = -3; dr <= 3; dr++) {
            for (let dc = -3; dc <= 3; dc++) {
              const col = cc + dc, row = cr + dr
              const [cx, cy] = center(layer, col, row)
              const dist = Math.sqrt((smoothX - cx) ** 2 + (smoothY - cy) ** 2)
              if (dist > ACT_R) continue
              const key  = `${layer}:${col},${row}`
              const val  = 1 - dist / ACT_R
              const prev = dots.get(key) ?? 0
              dots.set(key, Math.max(prev, val))
              if (!sparks.has(key) && prev < 0.05) sparks.set(key, 1.0)
            }
          }
        }
      } else if (active) {
        active = false; smoothX = -1; smoothY = -1
        glow.style.opacity = '0'
      }

      if (!active && dots.size === 0 && sparks.size === 0) { ctx.clearRect(0, 0, W, H); return }
      ctx.clearRect(0, 0, W, H)

      // ── 1. glowing dots ──────────────────────────────────────────────────
      dots.forEach((b, key) => {
        if (b < 0.015) { dots.delete(key); return }
        const [layerS, coords] = key.split(':')
        const [col, row] = coords.split(',').map(Number)
        const layer = Number(layerS)
        const [x, y] = center(layer, col, row)
        const r = 1.5 + b * 4

        ctx.save()
        ctx.shadowColor = `rgba(${PRIMARY},${b * 0.85})`
        ctx.shadowBlur  = 14 * b
        ctx.fillStyle   = `rgba(${PRIMARY},${b * 0.9})`
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        // soft halo ring
        ctx.save()
        ctx.strokeStyle = `rgba(${SECONDARY},${b * 0.25})`
        ctx.lineWidth   = 1
        ctx.beginPath(); ctx.arc(x, y, r + 4 * b, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()

        dots.set(key, b * 0.935)
      })

      // ── 2. spark: expanding ring on first contact ─────────────────────
      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [layerS, coords] = key.split(':')
        const [col, row] = coords.split(',').map(Number)
        const [x, y] = center(Number(layerS), col, row)
        const ringR = (1 - life) * 16 + 1.5

        ctx.save()
        ctx.strokeStyle = `rgba(${SECONDARY},${life * 0.85})`
        ctx.lineWidth   = life * 1.5
        ctx.shadowColor = `rgba(${SECONDARY},0.9)`
        ctx.shadowBlur  = 8
        ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()

        sparks.set(key, life * 0.87)
      })

      // ── 3. neon beam trail ───────────────────────────────────────────
      if (active && smoothX > 0) {
        const vx = smoothX - prevX, vy = smoothY - prevY
        const spd = Math.sqrt(vx * vx + vy * vy)
        if (spd > 0.25) {
          const len = Math.min(spd * 10, 160)
          const nx = vx / spd, ny = vy / spd
          const grad = ctx.createLinearGradient(
            smoothX - nx * len, smoothY - ny * len, smoothX, smoothY,
          )
          grad.addColorStop(0,   `rgba(${PRIMARY},0)`)
          grad.addColorStop(0.5, `rgba(${SECONDARY},0.28)`)
          grad.addColorStop(1,   `rgba(${PRIMARY},0.82)`)
          ctx.save()
          ctx.strokeStyle = grad
          ctx.lineWidth   = 1.5
          ctx.lineCap     = 'round'
          ctx.shadowColor = `rgba(${PRIMARY},1)`
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
  }, [])

  return (
    <>
      <div
        ref={glowRef}
        className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{
          width: 1000, height: 1000, top: 0, left: 0,
          background: `radial-gradient(circle,
            rgba(${PRIMARY},0.10)   0%,
            rgba(${SECONDARY},0.05) 38%,
            transparent             70%)`,
          willChange: 'transform, opacity',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function Skills() {
  const sectionRef = useRef<HTMLElement>(null)
  const { ref, isInView } = useInView()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const scale   = useTransform(scrollYProgress, [0.45, 1], [1,  0.91])
  const opacity = useTransform(scrollYProgress, [0.45, 1], [1,  0.35])
  const rotateX = useTransform(scrollYProgress, [0.45, 1], [0,  10  ])

  return (
    <section ref={sectionRef} id="skills" className="relative py-24 md:py-32 bg-bg-surface overflow-hidden">

      {/* ── hex-dot CSS background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle, rgba(${PRIMARY},0.18) 1.5px, transparent 1.5px),
            radial-gradient(circle, rgba(${SECONDARY},0.10) 1px,   transparent 1px)
          `,
          backgroundSize:     `${COL_W}px ${ROW_H}px, ${COL_W}px ${ROW_H}px`,
          backgroundPosition: `0 0, ${OFFSET}px ${OFFSET}px`,
        }} />
        <SkillsBackground />
      </div>

      <motion.div style={{ scale, opacity, rotateX, transformOrigin: 'center 20%' }}>
        <div className="max-w-content mx-auto px-6 relative z-10">

          <RevealText className="mb-14">
            <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Expertise</span>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
              Skills & Expertise
            </h2>
          </RevealText>

          <div ref={ref} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {skills.map((category, i) => (
              <motion.div
                key={category.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col gap-4"
              >
                <div>
                  <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">
                    {category.label}
                  </span>
                  <div className="mt-2 h-px bg-[rgba(139,92,246,0.2)]" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill) => (
                    <SkillBadge key={skill} label={skill} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </motion.div>
    </section>
  )
}
