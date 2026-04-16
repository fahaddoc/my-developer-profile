'use client'

import Image from 'next/image'
import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SectionBackground } from '@/components/ui/SectionBackground'

const stats = [
  { value: '6+',  label: 'Years'     },
  { value: '9+',  label: 'Projects'  },
  { value: '4+',  label: 'Companies' },
  { value: '25+', label: 'Clients'   },
]

const particles = [
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
// PhotoCard — isolated so mouse tilt state doesn't re-render the whole Hero
// ─────────────────────────────────────────────────────────────────────────────
function PhotoCard() {
  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 140, damping: 18 })
  const springY = useSpring(mouseY, { stiffness: 140, damping: 18 })
  const tiltY   = useTransform(springX, [-0.5, 0.5], [-13, 13])
  const tiltX   = useTransform(springY, [-0.5, 0.5], [8,  -8])

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
          alt="Shah Fahad — Software Engineer"
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
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const ctx = gsap.context(() => {
      gsap.set(sectionRef.current, { transformStyle: 'preserve-3d' })

      // EXIT — starts at 20% so About enter overlaps with Hero going back
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

      {/* ── grid background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(168,85,247,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168,85,247,0.07) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }} />
        {/* interactive canvas — cyan primary, 80px cell matches grid size */}
        <SectionBackground
          primary="34,211,238"
          secondary="168,85,247"
          cellSize={80}
          glowRadius={540}
        />
      </div>

      {/* ── ambient orbs ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px]">
          <div className="w-full h-full rounded-full bg-accent-violet/10 blur-[130px] animate-drift" />
        </div>
        <div className="absolute -bottom-32 -right-32 w-[550px] h-[550px]">
          <div className="w-full h-full rounded-full bg-accent-cyan/7 blur-[110px]" />
        </div>
        {particles.map((p, i) => (
          <div key={i} className="absolute rounded-full bg-accent-violet/45 animate-float-up" style={{
            left: p.x, top: p.y, width: p.size, height: p.size,
            animationDelay: p.delay, animationDuration: p.dur,
          }} />
        ))}
      </div>

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
              <motion.span {...fadeUp(0.2)} style={{ display: 'block' }}>Shah</motion.span>
              <motion.span {...fadeUp(0.3)} style={{ display: 'block' }}>
                Fahad<span className="text-accent-violet text-glow-violet animate-neon-flicker">.</span>
              </motion.span>
            </h1>

            <motion.p {...fadeUp(0.4)} className="font-mono text-lg md:text-xl text-accent-cyan text-glow-cyan tracking-widest uppercase">
              Software Engineer
            </motion.p>

            <motion.p {...fadeUp(0.5)} className="text-base md:text-lg text-text-secondary max-w-lg leading-relaxed">
              I craft high-performance, real-time web and mobile experiences that scale.
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
