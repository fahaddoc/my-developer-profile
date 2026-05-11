'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SectionBackground } from '@/components/ui/SectionBackground'

const stats = [
  { value: '6+',  label: 'Years'     },
  { value: '9+',  label: 'Projects'  },
  { value: '4+',  label: 'Companies' },
  { value: '25+', label: 'Clients'   },
]

const ambientDots = [
  { x: '15%', y: '20%', size: 2, delay: '0s',   dur: '4.2s' },
  { x: '80%', y: '65%', size: 1, delay: '1.1s', dur: '3.8s' },
  { x: '45%', y: '80%', size: 2, delay: '0.5s', dur: '5.1s' },
  { x: '70%', y: '15%', size: 1, delay: '2.2s', dur: '4.6s' },
  { x: '25%', y: '55%', size: 1, delay: '1.7s', dur: '3.5s' },
  { x: '90%', y: '40%', size: 2, delay: '0.3s', dur: '4.9s' },
  { x: '10%', y: '75%', size: 2, delay: '1.4s', dur: '5.3s' },
  { x: '55%', y: '30%', size: 1, delay: '2.8s', dur: '3.7s' },
]

const fadeUp = (delay: number) => ({
  initial:    { opacity: 0, y: 40 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
})

// ─────────────────────────────────────────────────────────────────────────────
// Neon Particle Collector
//
// Particles float around the Hero. Cursor acts like a magnet — particles
// within 150px are pulled toward it. When a particle gets within 18px of
// the cursor it's "collected": flashes, scales out, triggers the callback.
//
// Architecture:
//  • rawX/rawY stored in mousemove (zero processing in handler)
//  • All physics + draw runs in a single RAF loop
//  • Particles wrap at canvas edges (no clipping weirdness)
//  • dt-based physics so it's framerate-independent
//  • Max 48 particles — oldest pruned when over limit
// ─────────────────────────────────────────────────────────────────────────────

type Particle = {
  id:      number
  x:       number
  y:       number
  vx:      number
  vy:      number
  radius:  number
  life:    number   // 1 → 0, drives alpha
  decay:   number   // life lost per second
  color:   string   // RGB triplet
  flash:   number   // 0 = normal, >0 = collecting (0→1 then removed)
}

const MAX_PARTICLES = 48
const ATTRACT_RADIUS = 150
const COLLECT_RADIUS = 18

let pidCounter = 0

function makeParticle(x: number, y: number): Particle {
  return {
    id:     pidCounter++,
    x,      y,
    vx:     (Math.random() - 0.5) * 1.4,
    vy:     (Math.random() - 0.5) * 1.4,
    radius: 1.8 + Math.random() * 2.8,
    life:   1,
    decay:  0.07 + Math.random() * 0.06,   // ~10–14s lifespan
    color:  Math.random() < 0.62 ? '34,211,238' : '168,85,247',
    flash:  0,
  }
}

function ParticleCollector({
  onCollect,
}: {
  onCollect: (x: number, y: number) => void
}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const onCollectRef = useRef(onCollect)

  // Keep callback ref fresh without restarting the effect
  useEffect(() => { onCollectRef.current = onCollect }, [onCollect])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!

    let W = 0, H = 0
    let rafId = 0
    let lastTime = 0

    // Raw viewport cursor coords — section-relative computed in RAF
    let rawX = -9999, rawY = -9999
    let prevRelX = 0, prevRelY = 0

    // Particle pool
    let pool: Particle[] = []

    // Timers (seconds)
    let ambientTimer = 1.0
    let spawnCooldown = 0

    // ── helpers ──────────────────────────────────────────────────────────

    const resize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H
    }

    const spawnAt = (x: number, y: number) => {
      if (pool.length >= MAX_PARTICLES) {
        // remove the oldest one that isn't in flash
        const idx = pool.findIndex(p => p.flash === 0)
        if (idx !== -1) pool.splice(idx, 1)
        else return
      }
      // offset slightly so it doesn't spawn right on cursor
      const angle = Math.random() * Math.PI * 2
      const d     = 55 + Math.random() * 70
      pool.push(makeParticle(x + Math.cos(angle) * d, y + Math.sin(angle) * d))
    }

    const spawnRandom = () => {
      if (pool.length >= MAX_PARTICLES) return
      pool.push(makeParticle(Math.random() * W, Math.random() * H))
    }

    // Seed initial particles so the section isn't empty on load
    const seedInitial = () => {
      for (let i = 0; i < 18; i++) spawnRandom()
    }

    // ── event listeners ──────────────────────────────────────────────────

    const onMouseMove = (e: MouseEvent) => {
      rawX = e.clientX
      rawY = e.clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      rawX = e.touches[0].clientX
      rawY = e.touches[0].clientY
    }

    const onMouseLeave = () => { rawX = -9999; rawY = -9999 }

    // ── main RAF loop ─────────────────────────────────────────────────────

    const draw = (ts: number) => {
      rafId = requestAnimationFrame(draw)

      const dt = Math.min((ts - lastTime) / 1000, 0.05)
      lastTime = ts

      const rect = canvas.getBoundingClientRect()

      // Skip if section is off-screen
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return

      // Section-relative cursor position
      const relX = rawX - rect.left
      const relY = rawY - rect.top

      // ── ambient particle spawning ──────────────────────────────────
      ambientTimer -= dt
      if (ambientTimer <= 0) {
        spawnRandom()
        ambientTimer = 1.2 + Math.random() * 1.0
      }

      // ── cursor-proximity spawning (throttled) ──────────────────────
      const cursorMoved = Math.hypot(relX - prevRelX, relY - prevRelY)
      spawnCooldown -= dt
      if (cursorMoved > 5 && spawnCooldown <= 0 && rawX > 0) {
        spawnAt(relX, relY)
        spawnCooldown = 0.10   // max ~10 cursor-spawns per second
      }
      prevRelX = relX
      prevRelY = relY

      ctx.clearRect(0, 0, W, H)

      // ── update + draw each particle ────────────────────────────────
      pool = pool.filter(p => p.life > 0)

      for (const p of pool) {
        // Collecting animation — scales out and fades
        if (p.flash > 0) {
          p.flash += dt * 6
          if (p.flash >= 1) { p.life = 0; continue }

          const fp = p.flash
          ctx.save()
          ctx.shadowColor = `rgba(${p.color}, ${1 - fp})`
          ctx.shadowBlur  = 30 * (1 - fp)
          ctx.fillStyle   = `rgba(${p.color}, ${1 - fp})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.radius * (1 + fp * 4), 0, Math.PI * 2)
          ctx.fill()
          // little cross burst
          ctx.strokeStyle = `rgba(255,255,255,${(1 - fp) * 0.7})`
          ctx.lineWidth   = 1
          const arm = 8 * fp
          ctx.beginPath()
          ctx.moveTo(p.x - arm, p.y); ctx.lineTo(p.x + arm, p.y)
          ctx.moveTo(p.x, p.y - arm); ctx.lineTo(p.x, p.y + arm)
          ctx.stroke()
          ctx.restore()
          continue
        }

        // Decay life
        p.life -= p.decay * dt

        // Magnetic attraction toward cursor
        const dx   = relX - p.x
        const dy   = relY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < ATTRACT_RADIUS && dist > 0) {
          const force = (1 - dist / ATTRACT_RADIUS) * 0.09
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
        }

        // Velocity damping
        p.vx *= 0.95
        p.vy *= 0.95

        // Move
        p.x += p.vx
        p.y += p.vy

        // Wrap at canvas edges (seamless)
        if (p.x < -10) p.x = W + 10
        if (p.x > W + 10) p.x = -10
        if (p.y < -10) p.y = H + 10
        if (p.y > H + 10) p.y = -10

        // Collection check — cursor must be inside the canvas (rawX > 0)
        if (dist < COLLECT_RADIUS && rawX > 0 && p.flash === 0) {
          p.flash = 0.001   // kick off flash animation
          onCollectRef.current(p.x, p.y)
          continue
        }

        // Normal draw
        const alpha = p.life * 0.82
        ctx.save()
        ctx.shadowColor = `rgba(${p.color}, ${alpha * 0.8})`
        ctx.shadowBlur  = 10
        ctx.fillStyle   = `rgba(${p.color}, ${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    resize()
    seedInitial()

    window.addEventListener('mousemove',    onMouseMove,  { passive: true })
    window.addEventListener('resize',       resize)
    window.addEventListener('mouseleave',   onMouseLeave)
    canvas.addEventListener('touchmove',    onTouchMove,  { passive: true })

    lastTime = performance.now()
    rafId = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('mousemove',  onMouseMove)
      window.removeEventListener('resize',     resize)
      window.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('touchmove',  onTouchMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 3 }}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PhotoCard — isolated so tilt state doesn't re-render Hero
// ─────────────────────────────────────────────────────────────────────────────
function PhotoCard() {
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 140, damping: 18 })
  const springY = useSpring(mouseY, { stiffness: 140, damping: 18 })
  const tiltY   = useTransform(springX, [-0.5, 0.5], [-13, 13])
  const tiltX   = useTransform(springY, [-0.5, 0.5], [8,  -8])

  const onMove  = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - r.left) / r.width  - 0.5)
    mouseY.set((e.clientY - r.top)  / r.height - 0.5)
  }
  const onLeave = () => { mouseX.set(0); mouseY.set(0) }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex-shrink-0 w-72 md:w-80 lg:w-96"
      style={{ perspective: 900 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'radial-gradient(circle at center, rgba(168,85,247,0.38) 0%, rgba(34,211,238,0.12) 50%, transparent 70%)',
          transform: 'scale(1.3)', filter: 'blur(55px)',
        }}
        aria-hidden="true"
      />
      <motion.div
        style={{ rotateY: tiltY, rotateX: tiltX, transformStyle: 'preserve-3d' }}
        className="relative rounded-2xl overflow-hidden border border-accent-violet/30 aspect-[4/5] glow-violet"
      >
        <Image
          src="/images/shah-fahad.jpeg"
          alt="Shah Fahad — Senior Software Engineer specializing in React, Next.js, Flutter, and WebRTC, based in Karachi, Pakistan"
          fill
          className="object-cover object-top"
          priority
          sizes="(max-width: 768px) 288px, (max-width: 1024px) 320px, 384px"
        />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(168,85,247,0.03) 3px, rgba(168,85,247,0.03) 4px)',
        }} aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg-base/60 to-transparent" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.5 }}
        className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl bg-bg-elevated border border-accent-cyan/25 backdrop-blur-sm flex items-center gap-2"
      >
        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-breathe" />
        <span className="font-mono text-xs text-accent-cyan">Open to work</span>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────
type CollectFlash = { id: number; x: number; y: number }
let flashIdCounter = 0

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)

  // Game state — kept minimal to avoid unnecessary renders
  const [networkCount, setNetworkCount] = useState(0)
  const [flashes, setFlashes]           = useState<CollectFlash[]>([])
  const [hintVisible, setHintVisible]   = useState(true)

  // Called by ParticleCollector each time a particle is collected
  const handleCollect = useCallback((x: number, y: number) => {
    setNetworkCount(c => c + 1)

    // Spawn a "+1" at collection point, auto-remove after 700ms
    const id = flashIdCounter++
    setFlashes(prev => [...prev, { id, x, y }])
    setTimeout(() => setFlashes(prev => prev.filter(f => f.id !== id)), 700)
  }, [])

  // Hide the hint after 4s (user gets it by then)
  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), 4000)
    return () => clearTimeout(t)
  }, [])

  // GSAP scroll exit — unchanged
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      gsap.set(sectionRef.current, { transformStyle: 'preserve-3d' })
      gsap.to(sectionRef.current, {
        rotateX:  14,
        z:        -180,
        scale:    0.88,
        opacity:  0.2,
        ease:     'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start:   '20% top',
          end:     'bottom top',
          scrub:   0.8,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center pt-16"
      style={{ willChange: 'transform' }}
    >

      {/* ── grid + interactive canvas layers ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(168,85,247,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />
        {/* Cell border neon effect (existing) */}
        <SectionBackground
          primary="34,211,238"
          secondary="168,85,247"
          cellSize={80}
          glowRadius={540}
        />
        {/* Particle collector game layer (new) */}
        <ParticleCollector onCollect={handleCollect} />
      </div>

      {/* ── ambient orbs ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px]">
          <div className="w-full h-full rounded-full bg-accent-violet/10 blur-[130px] animate-drift" />
        </div>
        <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px]">
          <div className="w-full h-full rounded-full bg-accent-cyan/7 blur-[110px]" />
        </div>
        {ambientDots.map((p, i) => (
          <div key={i} className="absolute rounded-full bg-accent-violet/45 animate-float-up" style={{
            left: p.x, top: p.y, width: p.size, height: p.size,
            animationDelay: p.delay, animationDuration: p.dur,
          }} />
        ))}
      </div>

      {/* ── "+1" collection flashes (DOM overlay, positioned inside section) ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true" style={{ zIndex: 20 }}>
        <AnimatePresence>
          {flashes.map(f => (
            <motion.span
              key={f.id}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -32, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute font-mono text-xs font-bold text-accent-cyan"
              style={{
                left: f.x,
                top:  f.y,
                transform: 'translate(-50%, -50%)',
                textShadow: '0 0 8px rgba(34,211,238,0.9)',
              }}
            >
              +1
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Network Strength counter badge ── */}
      <AnimatePresence>
        {networkCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0,   scale: 1   }}
            className="absolute top-20 right-6 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-elevated/80 backdrop-blur-sm border border-accent-cyan/25"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-accent-cyan"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            <span className="font-mono text-xs text-text-muted">Network</span>
            <motion.span
              key={networkCount}
              initial={{ scale: 1.6, color: '#22d3ee' }}
              animate={{ scale: 1,   color: '#22d3ee' }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
              className="font-mono text-xs font-bold text-accent-cyan"
            >
              {networkCount}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── hint that fades after 4s ── */}
      <AnimatePresence>
        {hintVisible && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.45 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] text-accent-cyan tracking-widest pointer-events-none z-20 whitespace-nowrap"
          >
            ↑ move cursor to collect neon signals
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── main content ── */}
      <div className="max-w-content mx-auto px-6 w-full py-20 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          <div className="flex-1 flex flex-col gap-6">
            <motion.div {...fadeUp(0.1)}>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono text-accent-green border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.06)]">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-breathe" />
                Available for opportunities
              </span>
            </motion.div>

            <h1 className="flex flex-col font-display font-extrabold text-7xl md:text-8xl leading-none text-text-primary">
              <span className="sr-only">
                Shah Fahad — Senior Software Engineer specializing in React, Next.js, TypeScript, Flutter, WebRTC, and SignalR. Real-time web and mobile application developer based in Karachi, Pakistan.
              </span>
              <motion.span {...fadeUp(0.2)} aria-hidden="true" style={{ display: 'block' }}>Shah</motion.span>
              <motion.span {...fadeUp(0.3)} aria-hidden="true" style={{ display: 'block' }}>
                Fahad<span className="text-accent-violet text-glow-violet animate-neon-flicker">.</span>
              </motion.span>
            </h1>

            <motion.p {...fadeUp(0.4)} className="font-mono text-lg md:text-xl text-accent-cyan text-glow-cyan tracking-widest uppercase">
              Senior Software Engineer
            </motion.p>

            <motion.p {...fadeUp(0.5)} className="text-base md:text-lg text-text-secondary max-w-lg leading-relaxed">
              React, Next.js, Flutter and WebRTC engineer crafting high-performance,
              real-time web and mobile experiences that scale.
              Currently at <span className="text-text-primary font-medium">DigitalHire</span>, based in{' '}
              <span className="text-text-primary font-medium">Karachi, Pakistan</span>.
            </motion.p>

            <motion.div {...fadeUp(0.6)} className="flex flex-wrap items-center gap-4">
              <a
                href="#projects"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-violet text-white font-medium text-sm transition-all duration-200 hover:shadow-neon-violet hover:scale-[1.03]"
                onClick={(e) => { e.preventDefault(); document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth' }) }}
              >
                View Projects
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="/Shah_Fahad_Resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[rgba(241,245,249,0.12)] text-text-primary font-medium text-sm transition-all duration-200 hover:border-accent-violet/50 hover:text-accent-violet hover:shadow-neon-violet"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Resume
              </a>
            </motion.div>

            <motion.div {...fadeUp(0.7)} className="flex flex-wrap items-center gap-8 pt-6 border-t border-accent-violet/10">
              {stats.map(s => (
                <div key={s.label} className="flex flex-col gap-0.5 group">
                  <span className="font-display font-bold text-2xl text-accent-violet transition-all duration-300 group-hover:text-glow-violet">
                    {s.value}
                  </span>
                  <span className="font-mono text-xs text-text-muted tracking-wide uppercase">{s.label}</span>
                </div>
              ))}
            </motion.div>
          </div>

          <PhotoCard />
        </div>
      </div>
    </section>
  )
}
