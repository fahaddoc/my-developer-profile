'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { ProjectCard } from '@/components/ui/ProjectCard'
import { ProjectModal } from '@/components/ui/ProjectModal'
import { projects, type Project } from '@/data/projects'

// ── Constellation network background ─────────────────────────────────────────
// Sparse jittered dots. Near cursor: dots glow + connecting lines form between
// neighbouring lit dots — like a neural network / star-map activating.

const CELL   = 88    // base grid spacing for dot placement
const JITTER = 22    // max positional jitter per axis
const ACT_R  = 115   // activation radius around cursor
const CONN_R = 175   // max distance to draw a connection line

// stable seeded random — same value every call for same (a, b)
const frac = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// dot world position for grid cell (col, row)
const dotPos = (col: number, row: number): [number, number] => [
  col * CELL + frac(col, row)        * JITTER * 2 - JITTER,
  row * CELL + frac(col + 100, row)  * JITTER * 2 - JITTER,
]

function ProjectsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!
    const LERP   = 0.10

    let rawX = -1, rawY = -1
    let smoothX = -1, smoothY = -1, prevX = 0, prevY = 0
    let active = false
    let W = 0, H = 0, rafId = 0

    // "col,row" → brightness (0–1)
    const dots   = new Map<string, number>()
    const sparks = new Map<string, number>()

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

        // check dots in bounding grid region around cursor
        const cc = Math.round(smoothX / CELL), cr = Math.round(smoothY / CELL)
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const col = cc + dc, row = cr + dr
            const [dx, dy] = dotPos(col, row)
            const dist = Math.hypot(smoothX - dx, smoothY - dy)
            if (dist > ACT_R) continue
            const key  = `${col},${row}`
            const val  = 1 - dist / ACT_R
            const prev = dots.get(key) ?? 0
            dots.set(key, Math.max(prev, val))
            if (!sparks.has(key) && prev < 0.05) sparks.set(key, 1.0)
          }
        }
      } else if (active) {
        active = false; smoothX = -1; smoothY = -1
        glow.style.opacity = '0'
      }

      if (!active && dots.size === 0 && sparks.size === 0) {
        ctx.clearRect(0, 0, W, H); return
      }
      ctx.clearRect(0, 0, W, H)

      // ── 1. connection lines between nearby lit dots ───────────────────
      // collect active entries once to avoid repeated iteration
      const activeDots: [number, number, number, number, number][] = []  // [col,row,x,y,b]
      dots.forEach((b, key) => {
        if (b < 0.08) return
        const [col, row] = key.split(',').map(Number)
        const [x, y] = dotPos(col, row)
        activeDots.push([col, row, x, y, b])
      })

      for (let i = 0; i < activeDots.length; i++) {
        for (let j = i + 1; j < activeDots.length; j++) {
          const [,,ax, ay, ab] = activeDots[i]
          const [,,bx, by, bb] = activeDots[j]
          const dist = Math.hypot(ax - bx, ay - by)
          if (dist > CONN_R) continue
          const alpha = Math.min(ab, bb) * (1 - dist / CONN_R) * 0.75
          if (alpha < 0.02) continue

          const grad = ctx.createLinearGradient(ax, ay, bx, by)
          grad.addColorStop(0,   `rgba(34,211,238,${alpha})`)
          grad.addColorStop(0.5, `rgba(168,85,247,${alpha * 0.7})`)
          grad.addColorStop(1,   `rgba(34,211,238,${alpha})`)

          ctx.save()
          ctx.strokeStyle = grad
          ctx.lineWidth   = 0.8 + alpha
          ctx.shadowColor = `rgba(34,211,238,${alpha * 0.8})`
          ctx.shadowBlur  = 6
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke()
          ctx.restore()
        }
      }

      // ── 2. glowing dot nodes ──────────────────────────────────────────
      dots.forEach((b, key) => {
        if (b < 0.012) { dots.delete(key); return }
        const [col, row] = key.split(',').map(Number)
        const [x, y] = dotPos(col, row)
        const r = 2 + b * 4.5

        ctx.save()
        ctx.shadowColor = `rgba(34,211,238,${b * 0.9})`
        ctx.shadowBlur  = 16 * b
        ctx.fillStyle   = `rgba(34,211,238,${b * 0.88})`
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()

        // violet inner core on brightest dots
        if (b > 0.5) {
          ctx.save()
          ctx.fillStyle = `rgba(220,200,255,${(b - 0.5) * 0.8})`
          ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
        }

        dots.set(key, b * 0.935)
      })

      // ── 3. spark: expanding ring on first contact ─────────────────────
      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [col, row] = key.split(',').map(Number)
        const [x, y] = dotPos(col, row)
        const ringR = (1 - life) * 20 + 2
        ctx.save()
        ctx.strokeStyle = `rgba(168,85,247,${life * 0.75})`
        ctx.lineWidth   = life * 1.5
        ctx.shadowColor = 'rgba(168,85,247,0.9)'; ctx.shadowBlur = 8
        ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
        sparks.set(key, life * 0.87)
      })

      // ── 4. neon beam trail ────────────────────────────────────────────
      if (active && smoothX > 0) {
        const vx = smoothX - prevX, vy = smoothY - prevY
        const spd = Math.hypot(vx, vy)
        if (spd > 0.25) {
          const len = Math.min(spd * 12, 200)
          const nx = vx / spd, ny = vy / spd
          const grad = ctx.createLinearGradient(
            smoothX - nx * len, smoothY - ny * len, smoothX, smoothY,
          )
          grad.addColorStop(0,   'rgba(34,211,238,0)')
          grad.addColorStop(0.5, 'rgba(168,85,247,0.28)')
          grad.addColorStop(1,   'rgba(34,211,238,0.88)')
          ctx.save()
          ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
          ctx.shadowColor = 'rgba(34,211,238,1)'; ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.moveTo(smoothX - nx * len, smoothY - ny * len)
          ctx.lineTo(smoothX, smoothY)
          ctx.stroke(); ctx.restore()
        }
      }
    }

    resize()
    window.addEventListener('mousemove',    onMove,  { passive: true })
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
      <div ref={glowRef} className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{
          width: 1080, height: 1080, top: 0, left: 0,
          background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(168,85,247,0.06) 38%, transparent 70%)',
          willChange: 'transform, opacity',
        }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}

// ── filter / section logic ────────────────────────────────────────────────────

type Filter = 'all' | 'web' | 'mobile' | 'realtime'
const filters: { label: string; value: Filter }[] = [
  { label: 'All',       value: 'all'      },
  { label: 'Web',       value: 'web'      },
  { label: 'Mobile',    value: 'mobile'   },
  { label: 'Real-Time', value: 'realtime' },
]

export function Projects() {
  const [activeFilter, setActiveFilter]       = useState<Filter>('all')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const scale   = useTransform(scrollYProgress, [0.75, 1], [1,   0.91])
  const opacity = useTransform(scrollYProgress, [0.75, 1], [1,   0.35])
  const rotateX = useTransform(scrollYProgress, [0.75, 1], [0,   10  ])

  const filtered = projects.filter(p => activeFilter === 'all' || p.category === activeFilter)
  const featured = filtered.filter(p => p.featured)
  const rest     = filtered.filter(p => !p.featured)

  return (
    <section ref={sectionRef} id="projects" className="py-24 md:py-32 relative">

      {/* ── constellation dot CSS background + interactive canvas ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle, rgba(34,211,238,0.13) 1.5px, transparent 1.5px),
            radial-gradient(circle, rgba(168,85,247,0.08) 1px,   transparent 1px)
          `,
          backgroundSize:     `${CELL}px ${CELL}px, ${CELL}px ${CELL}px`,
          backgroundPosition: `0 0, ${CELL / 2}px ${CELL / 2}px`,
        }} />
        <ProjectsBackground />
      </div>

      {/* cyan orb top-left */}
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] pointer-events-none" aria-hidden="true">
        <div className="w-full h-full rounded-full bg-accent-cyan/6 blur-[120px]" />
      </div>

      <motion.div style={{ scale, opacity, rotateX, transformOrigin: 'center 20%' }}>
        <div className="max-w-content mx-auto px-6">

          <motion.div
            initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mb-10"
          >
            <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">My Work</span>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">Featured Projects</h2>
            <p className="text-text-secondary mt-3 max-w-lg">
              A selection of products I've designed and built. Click any project for the full case study.
            </p>
          </motion.div>

          {/* filter tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-10"
          >
            {filters.map(f => (
              <button key={f.value} onClick={() => setActiveFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-mono transition-all duration-200 ${
                  activeFilter === f.value
                    ? 'bg-accent-violet text-white shadow-neon-violet'
                    : 'text-text-muted border border-accent-violet/20 hover:text-text-primary hover:border-accent-violet/50'
                }`}
              >{f.label}</button>
            ))}
          </motion.div>

          {/* featured cards */}
          <AnimatePresence mode="wait">
            {featured.length > 0 && (
              <motion.div
                key={activeFilter + '-featured'}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
              >
                {featured.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} onClick={setSelectedProject} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* compact list */}
          {rest.length > 0 && (
            <div className="border-t border-accent-violet/10">
              <AnimatePresence>
                {rest.map((project, i) => (
                  <motion.button key={project.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}
                    onClick={() => setSelectedProject(project)}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-4 py-4 border-b border-accent-violet/10 text-left hover:bg-accent-violet/5 transition-colors duration-200 group"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs text-accent-cyan">{project.company}</span>
                      <span className="font-mono text-xs text-text-muted ml-2">•</span>
                      <span className="font-medium text-text-secondary group-hover:text-text-primary transition-colors ml-2 text-sm">{project.title}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                      {project.tech.slice(0, 3).map(t => (
                        <span key={t} className="px-2 py-0.5 text-xs font-mono rounded-full bg-accent-violet/8 border border-accent-violet/15 text-text-muted">{t}</span>
                      ))}
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="flex-shrink-0 text-text-muted group-hover:text-accent-violet transition-colors hidden sm:block" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* github cta */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex justify-center"
          >
            <a href="https://github.com/fahaddoc" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-accent-violet/20 text-text-secondary hover:text-text-primary hover:border-accent-violet/50 hover:shadow-neon-violet transition-all duration-200 text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View All on GitHub
            </a>
          </motion.div>

        </div>
      </motion.div>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </section>
  )
}
