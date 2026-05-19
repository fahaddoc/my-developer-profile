'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'
import { useReduceScrollFx } from '@/hooks/useReduceScrollFx'

// ── CSS background (unchanged) ────────────────────────────────────────────────
const diagonalLines = `
  repeating-linear-gradient(
    45deg,
    transparent           0px,
    transparent           49px,
    rgba(168,85,247,0.07) 49px,
    rgba(168,85,247,0.07) 50px
  ),
  repeating-linear-gradient(
    -45deg,
    transparent           0px,
    transparent           69px,
    rgba(168,85,247,0.05) 69px,
    rgba(168,85,247,0.05) 70px
  )
`
const noiseDots = `radial-gradient(rgba(168,85,247,0.025) 1px, transparent 1px)`

// ── AboutBackground (unchanged — diagonal circuit lines canvas) ───────────────
function AboutBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!
    const LERP   = 0.10
    const SQ2    = Math.SQRT2
    const STEP_POS = 50 * SQ2
    const STEP_NEG = 70 * SQ2

    const posLines = new Map<number, number>()
    const negLines = new Map<number, number>()
    const sparks   = new Map<string, number>()

    let rawX = -1, rawY = -1
    let smoothX = -1, smoothY = -1
    let prevX = 0, prevY = 0
    let active = false
    let W = 0, H = 0, rafId = 0
    let visible = true

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W; canvas.height = H
    }
    const onMove  = (e: MouseEvent) => { rawX = e.clientX; rawY = e.clientY }
    const onLeave = () => {
      rawX = -1; rawY = -1; active = false; smoothX = -1; smoothY = -1
      glow.style.opacity = '0'
    }

    const clip45 = (c: number): [[number,number],[number,number]] | null => {
      const pts: [number,number][] = []
      const y0 = -c;    if (y0 >= 0 && y0 <= H) pts.push([0, y0])
      const x0 =  c;    if (x0 >= 0 && x0 <= W) pts.push([x0, 0])
      const yW = W - c; if (yW >= 0 && yW <= H) pts.push([W, yW])
      const xH = H + c; if (xH >= 0 && xH <= W) pts.push([xH, H])
      if (pts.length < 2) return null
      pts.sort((a, b) => a[0] - b[0])
      return [pts[0], pts[pts.length - 1]]
    }
    const clipN45 = (c: number): [[number,number],[number,number]] | null => {
      const pts: [number,number][] = []
      if (c >= 0 && c <= H)       pts.push([0, c])
      if (c >= 0 && c <= W)       pts.push([c, 0])
      const yW = c - W; if (yW >= 0 && yW <= H) pts.push([W, yW])
      const xH = c - H; if (xH >= 0 && xH <= W) pts.push([xH, H])
      if (pts.length < 2) return null
      pts.sort((a, b) => a[0] - b[0])
      return [pts[0], pts[pts.length - 1]]
    }

    const draw = () => {
      if (!visible) { rafId = 0; return }
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

        const posBase = Math.round((smoothX - smoothY) / STEP_POS)
        const negBase = Math.round((smoothX + smoothY) / STEP_NEG)

        for (let dp = -1; dp <= 1; dp++) {
          const pi = posBase + dp
          const d  = Math.abs((smoothX - smoothY) - pi * STEP_POS) / SQ2
          const val = Math.max(0, 1 - d / 45) * 0.9
          if (val > 0.02) posLines.set(pi, Math.max(posLines.get(pi) ?? 0, val))
        }
        for (let dn = -1; dn <= 1; dn++) {
          const ni = negBase + dn
          const d  = Math.abs((smoothX + smoothY) - ni * STEP_NEG) / SQ2
          const val = Math.max(0, 1 - d / 45) * 0.72
          if (val > 0.02) negLines.set(ni, Math.max(negLines.get(ni) ?? 0, val))
        }

        const sk = `${posBase},${negBase}`
        if (!sparks.has(sk)) {
          const ix = (posBase * STEP_POS + negBase * STEP_NEG) / 2
          const iy = (negBase * STEP_NEG - posBase * STEP_POS) / 2
          if (Math.hypot(smoothX - ix, smoothY - iy) < 40) sparks.set(sk, 1.0)
        }
      } else if (active) {
        active = false; smoothX = -1; smoothY = -1; glow.style.opacity = '0'
      }

      if (!active && posLines.size === 0 && negLines.size === 0 && sparks.size === 0) {
        ctx.clearRect(0, 0, W, H); return
      }
      ctx.clearRect(0, 0, W, H)

      posLines.forEach((b, pi) => {
        if (b < 0.012) { posLines.delete(pi); return }
        const clip = clip45(pi * STEP_POS)
        if (clip) {
          ctx.save()
          ctx.shadowColor = `rgba(168,85,247,${b * 0.85})`; ctx.shadowBlur = 10 * b
          ctx.strokeStyle = `rgba(168,85,247,${b * 0.8})`;  ctx.lineWidth  = 1 + b * 0.6
          ctx.beginPath(); ctx.moveTo(clip[0][0], clip[0][1]); ctx.lineTo(clip[1][0], clip[1][1]); ctx.stroke()
          ctx.restore()
        }
        posLines.set(pi, b * 0.93)
      })
      negLines.forEach((b, ni) => {
        if (b < 0.012) { negLines.delete(ni); return }
        const clip = clipN45(ni * STEP_NEG)
        if (clip) {
          ctx.save()
          ctx.shadowColor = `rgba(34,211,238,${b * 0.8})`;  ctx.shadowBlur = 10 * b
          ctx.strokeStyle = `rgba(34,211,238,${b * 0.75})`; ctx.lineWidth  = 1 + b * 0.5
          ctx.beginPath(); ctx.moveTo(clip[0][0], clip[0][1]); ctx.lineTo(clip[1][0], clip[1][1]); ctx.stroke()
          ctx.restore()
        }
        negLines.set(ni, b * 0.93)
      })
      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [pi, ni] = key.split(',').map(Number)
        const ix = (pi * STEP_POS + ni * STEP_NEG) / 2
        const iy = (ni * STEP_NEG - pi * STEP_POS) / 2
        if (ix < 0 || ix > W || iy < 0 || iy > H) { sparks.set(key, life * 0.88); return }
        ctx.save()
        ctx.fillStyle = `rgba(255,255,255,${life})`; ctx.shadowColor = 'rgba(210,235,255,0.95)'; ctx.shadowBlur = 8 * life
        ctx.beginPath(); ctx.arc(ix, iy, 2.5 * life, 0, Math.PI * 2); ctx.fill()
        const arm = 8 * life
        ctx.strokeStyle = `rgba(220,245,255,${life * 0.8})`; ctx.lineWidth = 1; ctx.shadowBlur = 4 * life
        ctx.beginPath()
        ctx.moveTo(ix - arm*0.7, iy - arm*0.7); ctx.lineTo(ix + arm*0.7, iy + arm*0.7)
        ctx.moveTo(ix - arm*0.7, iy + arm*0.7); ctx.lineTo(ix + arm*0.7, iy - arm*0.7)
        ctx.stroke(); ctx.restore()
        sparks.set(key, life * 0.88)
      })

      if (active && smoothX > 0) {
        const vx = smoothX - prevX, vy = smoothY - prevY
        const spd = Math.hypot(vx, vy)
        if (spd > 0.25) {
          const len = Math.min(spd * 10, 180)
          const nx = vx / spd, ny = vy / spd
          const grad = ctx.createLinearGradient(smoothX - nx*len, smoothY - ny*len, smoothX, smoothY)
          grad.addColorStop(0, 'rgba(168,85,247,0)'); grad.addColorStop(0.5, 'rgba(34,211,238,0.30)'); grad.addColorStop(1, 'rgba(168,85,247,0.85)')
          ctx.save(); ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
          ctx.shadowColor = 'rgba(168,85,247,1)'; ctx.shadowBlur = 10
          ctx.beginPath(); ctx.moveTo(smoothX - nx*len, smoothY - ny*len); ctx.lineTo(smoothX, smoothY); ctx.stroke(); ctx.restore()
        }
      }
    }

    resize()
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    document.addEventListener('mouseleave', onLeave)

    const io = new IntersectionObserver(([entry]) => {
      const was = visible
      visible = entry.isIntersecting
      if (!was && visible && rafId === 0) {
        rafId = requestAnimationFrame(draw)
      }
    }, { rootMargin: '200px 0px' })
    io.observe(canvas)

    rafId = requestAnimationFrame(draw)
    return () => {
      io.disconnect()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={glowRef} className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{ width: 1000, height: 1000, top: 0, left: 0,
          background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, rgba(34,211,238,0.07) 38%, transparent 70%)',
          willChange: 'transform, opacity' }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}

// ── Choose Your Path data ─────────────────────────────────────────────────────

const paths = [
  {
    id:       'career',
    label:    'Career',
    color:    '#a855f7',
    rgb:      '168,85,247',
    border:   'border-accent-violet/40',
    bg:       'bg-accent-violet/10',
    textCol:  'text-accent-violet',
    heading:  'The Professional Path',
    body:     "6+ years building products people actually use — from MILETAP's real-time video platform to DigitalHire's modern hiring system. 4 companies, 9+ projects, 25+ clients. Every line of code taught me something I couldn't find in any tutorial.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
      </svg>
    ),
  },
  {
    id:       'passion',
    label:    'Passion',
    color:    '#22d3ee',
    rgb:      '34,211,238',
    border:   'border-accent-cyan/40',
    bg:       'bg-accent-cyan/10',
    textCol:  'text-accent-cyan',
    heading:  'What Drives Me',
    body:     "Real-time is where I come alive. WebRTC, SignalR, live video — the moment two people connect through infrastructure I built, that rush never gets old. I obsess over milliseconds, frame drops, and experiences that feel instant no matter the network.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
  {
    id:       'facts',
    label:    'Fun Facts',
    color:    '#10b981',
    rgb:      '16,185,129',
    border:   'border-accent-green/40',
    bg:       'bg-accent-green/10',
    textCol:  'text-accent-green',
    heading:  'The Human Behind the Code',
    body:     "I debug best at 2am. I've shipped code that ran during a live TV broadcast. I name variables descriptively and regret it when refactoring. Based in Karachi — where the chai is strong and the internet is, let's say, character-building.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    id:       'vision',
    label:    'Vision',
    color:    '#f59e0b',
    rgb:      '245,158,11',
    border:   'border-yellow-500/40',
    bg:       'bg-yellow-500/10',
    textCol:  'text-yellow-400',
    heading:  "Where I'm Heading",
    body:     "AI-native interfaces, collaborative real-time tools, software that feels alive. I want to build things that make people faster and more creative. The next 6 years? Harder pushes, bigger ships — and making the interface between human and machine disappear.",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    ),
  },
]

const techStack = [
  'React.js', 'Next.js', 'Flutter', 'TypeScript',
  'WebRTC', 'SignalR', 'Redux', 'Tailwind CSS',
]

const quickFacts = [
  { value: '6+',      label: 'Years Experience' },
  { value: '9+',      label: 'Projects Shipped'  },
  { value: '4+',      label: 'Companies'          },
  { value: 'Karachi', label: 'Pakistan'            },
]

// ── Burst particles ───────────────────────────────────────────────────────────
// When a path button is clicked, small dots scatter outward from it.

type BurstState = {
  id:    number
  x:     number
  y:     number
  color: string
  dots:  { angle: number; dist: number }[]
}

let burstIdCounter = 0

// ── About ─────────────────────────────────────────────────────────────────────
export function About() {
  const sectionRef                          = useRef<HTMLElement>(null)
  const { ref: statsRef, isInView: statsV } = useInView()

  const [activePath, setActivePath] = useState<string>('career')
  const [bursts, setBursts]         = useState<BurstState[]>([])

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const reduceFx = useReduceScrollFx()
  const scale   = useTransform(scrollYProgress, [0.45, 1], reduceFx ? [1, 1] : [1,   0.91])
  const opacity = useTransform(scrollYProgress, [0.45, 1], reduceFx ? [1, 1] : [1,   0.35])
  const rotateX = useTransform(scrollYProgress, [0.45, 1], reduceFx ? [0, 0] : [0,   10  ])

  const handlePathClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    pathId: string,
    color: string,
  ) => {
    setActivePath(pathId)

    // Calculate position relative to section for burst origin
    const btnRect = e.currentTarget.getBoundingClientRect()
    const secRect = sectionRef.current!.getBoundingClientRect()
    const x = btnRect.left + btnRect.width  / 2 - secRect.left
    const y = btnRect.top  + btnRect.height / 2 - secRect.top

    const id   = burstIdCounter++
    const dots = Array.from({ length: 12 }, (_, i) => ({
      angle: (i / 12) * 360 + Math.random() * 30,
      dist:  28 + Math.random() * 38,
    }))

    setBursts(prev => [...prev, { id, x, y, color, dots }])
    setTimeout(() => setBursts(prev => prev.filter(b => b.id !== id)), 650)
  }

  const active = paths.find(p => p.id === activePath)!

  return (
    <section ref={sectionRef} id="about" className="py-24 md:py-32 relative">

      {/* ── backgrounds ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{ backgroundImage: diagonalLines }} />
        <div className="absolute inset-0" style={{ backgroundImage: noiseDots, backgroundSize: '4px 4px' }} />
        <AboutBackground />
      </div>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] pointer-events-none" aria-hidden="true">
        <div className="w-full h-full rounded-full bg-accent-violet/8 blur-[120px]" />
      </div>

      {/* ── burst particles overlay ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 20 }} aria-hidden="true">
        <AnimatePresence>
          {bursts.map(b => (
            <div key={b.id} style={{ position: 'absolute', left: b.x, top: b.y }}>
              {b.dots.map((dot, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x:       Math.cos(dot.angle * Math.PI / 180) * dot.dist,
                    y:       Math.sin(dot.angle * Math.PI / 180) * dot.dist,
                    opacity: 0,
                    scale:   0,
                  }}
                  transition={{ duration: 0.55, ease: [0.2, 0.8, 0.4, 1] }}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    background:  b.color,
                    boxShadow:   `0 0 6px ${b.color}`,
                    marginLeft:  -4,
                    marginTop:   -4,
                  }}
                />
              ))}
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── scroll exit ── */}
      <motion.div style={{ scale, opacity, rotateX, transformOrigin: 'center 20%' }}>

        {/* ── scroll enter ── */}
        <motion.div
          initial={{ opacity: 0, y: 70, rotateX: -8, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-content mx-auto px-6">

            {/* heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-12"
            >
              <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">About Me</span>
              <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
                Turning ideas into products
              </h2>
            </motion.div>

            <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">

              {/* ── left column — interactive story ── */}
              <div className="flex-1 flex flex-col gap-8">

                {/* choose your path label */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="font-mono text-xs text-text-muted uppercase tracking-widest mb-4">
                    Choose your path
                  </p>

                  {/* path buttons */}
                  <div className="flex flex-wrap gap-3">
                    {paths.map(path => {
                      const isActive = activePath === path.id
                      return (
                        <motion.button
                          key={path.id}
                          onClick={e => handlePathClick(e, path.id, path.color)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`
                            relative flex items-center gap-2 px-4 py-2 rounded-lg border font-mono text-xs
                            transition-colors duration-200 overflow-hidden
                            ${isActive
                              ? `${path.border} ${path.bg} ${path.textCol}`
                              : 'border-white/10 text-text-muted hover:border-white/20 hover:text-text-secondary'
                            }
                          `}
                        >
                          {/* active indicator glow behind button */}
                          {isActive && (
                            <motion.span
                              layoutId="pathGlow"
                              className="absolute inset-0 rounded-lg"
                              style={{
                                background: `radial-gradient(ellipse at center, ${path.color}22 0%, transparent 70%)`,
                              }}
                              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            />
                          )}
                          <span className={isActive ? path.textCol : 'text-text-muted'}>
                            {path.icon}
                          </span>
                          <span className="relative">{path.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </motion.div>

                {/* story panel — animates on path change */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePath}
                    initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
                    exit={{    opacity: 0, y: -12, filter: 'blur(4px)' }}
                    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                    className={`
                      relative rounded-xl border p-6
                      ${active.border} ${active.bg}
                    `}
                    style={{ boxShadow: `0 0 24px ${active.color}18` }}
                  >
                    {/* corner accent line */}
                    <div
                      className="absolute top-0 left-6 right-6 h-px"
                      style={{ background: `linear-gradient(90deg, transparent, ${active.color}80, transparent)` }}
                    />

                    <h3 className={`font-display font-bold text-lg mb-3 ${active.textCol}`}>
                      {active.heading}
                    </h3>
                    <p className="text-text-secondary text-base leading-relaxed">
                      {active.body}
                    </p>

                    {/* bottom right path indicator */}
                    <span className="absolute bottom-4 right-5 font-mono text-[10px] opacity-30" style={{ color: active.color }}>
                      {active.label.toLowerCase()}.path
                    </span>
                  </motion.div>
                </AnimatePresence>

                {/* tech stack */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex flex-wrap gap-2"
                >
                  {techStack.map(skill => <SkillBadge key={skill} label={skill} />)}
                </motion.div>
              </div>

              {/* ── right column — stats (unchanged) ── */}
              <div ref={statsRef} className="flex-shrink-0 grid grid-cols-2 gap-6 lg:w-56 self-start lg:pt-16">
                {quickFacts.map((fact, i) => (
                  <motion.div
                    key={fact.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={statsV ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    className="flex flex-col gap-1"
                  >
                    <span className="font-display font-bold text-3xl md:text-4xl text-accent-violet">
                      {fact.value}
                    </span>
                    <span className="font-mono text-xs text-text-muted uppercase tracking-wide">
                      {fact.label}
                    </span>
                  </motion.div>
                ))}
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
