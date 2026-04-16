'use client'

import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'

// ── CSS background pattern ────────────────────────────────────────────────────
// Two sets of diagonal lines at ±45°, creating a circuit-board / PCB feel.
// The canvas effect below is derived from these exact same line equations
// so highlights land precisely on top of the visible CSS lines.
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
// 4 px dot grid — very faint noise-like texture on dark screens
const noiseDots = `radial-gradient(rgba(168,85,247,0.025) 1px, transparent 1px)`

// ── AboutBackground ───────────────────────────────────────────────────────────
// Highlights the actual CSS diagonal lines near the cursor — not rectangular
// cells. Uses the exact line math derived from the CSS repeat intervals so
// the glow lands on top of the visible pattern rather than next to it.
//
// Coordinate system:
//   +45° CSS lines  → gradient direction (1/√2, -1/√2) → line eq: x − y = k · 50√2
//   -45° CSS lines  → gradient direction (-1/√2,-1/√2) → line eq: x + y = k · 70√2
//
// All mouse state in refs → zero React re-renders on movement.
// Off-screen early-exit → no wasted RAF work.

function AboutBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!

    const LERP = 0.10
    const SQ2  = Math.SQRT2

    // Spacing between consecutive lines in their respective "rotated" coordinate.
    // For repeating-linear-gradient(45deg, ..., 50px): perpendicular distance = 50 px
    // → consecutive lines differ by 50√2 in (x − y) space
    const STEP_POS = 50 * SQ2   // +45° line eq:  x − y = k · STEP_POS
    const STEP_NEG = 70 * SQ2   // -45° line eq:  x + y = k · STEP_NEG

    // Persistent brightness for each lit line index, fades per frame
    const posLines = new Map<number, number>()  // line index → brightness 0-1
    const negLines = new Map<number, number>()
    // Sparks at line intersections (key: "posIdx,negIdx")
    const sparks   = new Map<string, number>()

    let rawX = -1, rawY = -1
    let smoothX = -1, smoothY = -1
    let prevX = 0,   prevY = 0
    let active = false
    let W = 0, H = 0, rafId = 0

    const resize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H
    }

    const onMove  = (e: MouseEvent) => { rawX = e.clientX; rawY = e.clientY }
    const onLeave = () => {
      rawX = -1; rawY = -1
      active = false; smoothX = -1; smoothY = -1
      glow.style.opacity = '0'
    }

    // Clip +45° line  (x − y = c)  to the canvas rect.
    // These run top-left → bottom-right (slope +1 in screen coords).
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

    // Clip -45° line  (x + y = c)  to the canvas rect.
    // These run top-right → bottom-left (slope -1 in screen coords).
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
      rafId = requestAnimationFrame(draw)

      const rect = canvas.getBoundingClientRect()
      // skip entirely when section is not in the viewport
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return

      const inBounds = rawX > 0 &&
        rawX >= rect.left && rawX <= rect.right &&
        rawY >= rect.top  && rawY <= rect.bottom

      if (inBounds) {
        const tx = rawX - rect.left
        const ty = rawY - rect.top

        if (!active) {
          // snap on first entry — prevents cursor flying in from 0,0
          smoothX = tx; smoothY = ty
          prevX   = tx; prevY   = ty
          active  = true
        } else {
          prevX = smoothX; prevY = smoothY
          smoothX += (tx - smoothX) * LERP
          smoothY += (ty - smoothY) * LERP
        }

        // move pre-rendered glow via transform — no gradient rebuild, GPU layer
        glow.style.transform = `translate(${smoothX}px,${smoothY}px) translate(-50%,-50%)`
        glow.style.opacity   = '1'

        // ── find nearest diagonal lines and light them up ─────────────
        const posBase = Math.round((smoothX - smoothY) / STEP_POS)
        const negBase = Math.round((smoothX + smoothY) / STEP_NEG)

        for (let dp = -1; dp <= 1; dp++) {
          const pi   = posBase + dp
          const posC = pi * STEP_POS
          // perpendicular distance from smooth cursor to this line
          const d    = Math.abs((smoothX - smoothY) - posC) / SQ2
          const val  = Math.max(0, 1 - d / 45) * 0.9
          if (val > 0.02)
            posLines.set(pi, Math.max(posLines.get(pi) ?? 0, val))
        }

        for (let dn = -1; dn <= 1; dn++) {
          const ni   = negBase + dn
          const negC = ni * STEP_NEG
          const d    = Math.abs((smoothX + smoothY) - negC) / SQ2
          const val  = Math.max(0, 1 - d / 45) * 0.72
          if (val > 0.02)
            negLines.set(ni, Math.max(negLines.get(ni) ?? 0, val))
        }

        // ── spark at nearest intersection if cursor is close ──────────
        const sparkKey = `${posBase},${negBase}`
        if (!sparks.has(sparkKey)) {
          // intersection of  x−y = posBase·STEP_POS  and  x+y = negBase·STEP_NEG
          const ix = (posBase * STEP_POS + negBase * STEP_NEG) / 2
          const iy = (negBase * STEP_NEG - posBase * STEP_POS) / 2
          const d  = Math.sqrt((smoothX - ix) ** 2 + (smoothY - iy) ** 2)
          if (d < 40) sparks.set(sparkKey, 1.0)
        }

      } else if (active) {
        active = false; smoothX = -1; smoothY = -1
        glow.style.opacity = '0'
      }

      // skip canvas work when nothing to paint
      if (!active && posLines.size === 0 && negLines.size === 0 && sparks.size === 0) {
        ctx.clearRect(0, 0, W, H)
        return
      }

      ctx.clearRect(0, 0, W, H)

      // ── 1. +45° line glow (violet — matches the CSS line colour) ────
      posLines.forEach((b, pi) => {
        if (b < 0.012) { posLines.delete(pi); return }
        const clip = clip45(pi * STEP_POS)
        if (clip) {
          ctx.save()
          ctx.shadowColor = `rgba(168,85,247,${b * 0.85})`
          ctx.shadowBlur  = 10 * b
          ctx.strokeStyle = `rgba(168,85,247,${b * 0.8})`
          ctx.lineWidth   = 1 + b * 0.6
          ctx.beginPath()
          ctx.moveTo(clip[0][0], clip[0][1])
          ctx.lineTo(clip[1][0], clip[1][1])
          ctx.stroke()
          ctx.restore()
        }
        posLines.set(pi, b * 0.93)
      })

      // ── 2. -45° line glow (cyan — complementary accent) ─────────────
      negLines.forEach((b, ni) => {
        if (b < 0.012) { negLines.delete(ni); return }
        const clip = clipN45(ni * STEP_NEG)
        if (clip) {
          ctx.save()
          ctx.shadowColor = `rgba(34,211,238,${b * 0.8})`
          ctx.shadowBlur  = 10 * b
          ctx.strokeStyle = `rgba(34,211,238,${b * 0.75})`
          ctx.lineWidth   = 1 + b * 0.5
          ctx.beginPath()
          ctx.moveTo(clip[0][0], clip[0][1])
          ctx.lineTo(clip[1][0], clip[1][1])
          ctx.stroke()
          ctx.restore()
        }
        negLines.set(ni, b * 0.93)
      })

      // ── 3. Spark: cross at line intersection point ───────────────────
      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [pi, ni] = key.split(',').map(Number)
        const ix = (pi * STEP_POS + ni * STEP_NEG) / 2
        const iy = (ni * STEP_NEG - pi * STEP_POS) / 2

        // only draw if intersection is on-screen
        if (ix < 0 || ix > W || iy < 0 || iy > H) {
          sparks.set(key, life * 0.88); return
        }

        ctx.save()
        // centre dot
        ctx.fillStyle   = `rgba(255,255,255,${life})`
        ctx.shadowColor = 'rgba(210,235,255,0.95)'
        ctx.shadowBlur  = 8 * life
        ctx.beginPath()
        ctx.arc(ix, iy, 2.5 * life, 0, Math.PI * 2)
        ctx.fill()
        // ×-shaped cross aligned with the ±45° lines
        const arm = 8 * life
        ctx.strokeStyle = `rgba(220,245,255,${life * 0.8})`
        ctx.lineWidth   = 1
        ctx.shadowBlur  = 4 * life
        ctx.beginPath()
        ctx.moveTo(ix - arm * 0.7, iy - arm * 0.7)
        ctx.lineTo(ix + arm * 0.7, iy + arm * 0.7)
        ctx.moveTo(ix - arm * 0.7, iy + arm * 0.7)
        ctx.lineTo(ix + arm * 0.7, iy - arm * 0.7)
        ctx.stroke()
        ctx.restore()

        sparks.set(key, life * 0.88)
      })

      // ── 4. Neon travel beam (velocity from lerped delta) ─────────────
      if (active && smoothX > 0) {
        const vx  = smoothX - prevX
        const vy  = smoothY - prevY
        const spd = Math.sqrt(vx * vx + vy * vy)

        if (spd > 0.25) {
          const len = Math.min(spd * 10, 180)
          const nx  = vx / spd, ny = vy / spd

          const grad = ctx.createLinearGradient(
            smoothX - nx * len, smoothY - ny * len,
            smoothX, smoothY,
          )
          grad.addColorStop(0,   'rgba(168,85,247,0)')
          grad.addColorStop(0.5, 'rgba(34,211,238,0.30)')
          grad.addColorStop(1,   'rgba(168,85,247,0.85)')

          ctx.save()
          ctx.strokeStyle = grad
          ctx.lineWidth   = 1.5
          ctx.lineCap     = 'round'
          ctx.shadowColor = 'rgba(168,85,247,1)'
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
      {/* pre-rendered violet-primary glow, moved via GPU transform */}
      <div
        ref={glowRef}
        className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{
          width:      1000,
          height:     1000,
          top:        0,
          left:       0,
          background: 'radial-gradient(circle, rgba(168,85,247,0.14) 0%, rgba(34,211,238,0.07) 38%, transparent 70%)',
          willChange: 'transform, opacity',
        }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}

// ── section data ──────────────────────────────────────────────────────────────

const quickFacts = [
  { value: '6+',      label: 'Years Experience' },
  { value: '9+',      label: 'Projects Shipped'  },
  { value: '4+',      label: 'Companies'          },
  { value: 'Karachi', label: 'Pakistan'            },
]

const techStack = [
  'React.js', 'Next.js', 'Flutter', 'TypeScript',
  'WebRTC', 'SignalR', 'Redux', 'Tailwind CSS',
]

const paragraphs = [
  "Over the past 6+ years, I've built products people actually use — from real-time video platforms at MILETAP to modern hiring systems at DigitalHire.",
  "My expertise lies at the intersection of React, Next.js, Flutter, and real-time technologies like WebRTC and SignalR. I focus on writing clean, maintainable code while keeping the end-user experience at the center.",
  "Currently based in Karachi, always excited to work on challenging projects that push technical and product boundaries.",
]

export function About() {
  const sectionRef = useRef<HTMLElement>(null)
  const { ref: statsRef, isInView: statsVisible } = useInView()

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const scale   = useTransform(scrollYProgress, [0.45, 1], [1,   0.91])
  const opacity = useTransform(scrollYProgress, [0.45, 1], [1,   0.35])
  const rotateX = useTransform(scrollYProgress, [0.45, 1], [0,   10  ])

  return (
    <section ref={sectionRef} id="about" className="py-24 md:py-32 relative">

      {/* ── background: diagonal circuit lines + noise + interactive canvas ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{ backgroundImage: diagonalLines }} />
        <div className="absolute inset-0" style={{ backgroundImage: noiseDots, backgroundSize: '4px 4px' }} />
        <AboutBackground />
      </div>

      {/* decorative violet orb */}
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] pointer-events-none" aria-hidden="true">
        <div className="w-full h-full rounded-full bg-accent-violet/8 blur-[120px]" />
      </div>

      {/* EXIT: section recedes as it scrolls up */}
      <motion.div style={{ scale, opacity, rotateX, transformOrigin: 'center 20%' }}>

        {/* ENTER: comes forward from below on scroll-in */}
        <motion.div
          initial={{ opacity: 0, y: 70, rotateX: -8, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="max-w-content mx-auto px-6">

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

              <div className="flex-1 flex flex-col gap-6">
                {paragraphs.map((para, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.6, delay: i * 0.1, ease: 'easeOut' }}
                    className="text-text-secondary text-lg leading-relaxed"
                  >
                    {para}
                  </motion.p>
                ))}

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                  className="flex flex-wrap gap-2 pt-2"
                >
                  {techStack.map(skill => <SkillBadge key={skill} label={skill} />)}
                </motion.div>
              </div>

              <div ref={statsRef} className="flex-shrink-0 grid grid-cols-2 gap-6 lg:w-56">
                {quickFacts.map((fact, i) => (
                  <motion.div
                    key={fact.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={statsVisible ? { opacity: 1, y: 0 } : {}}
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
