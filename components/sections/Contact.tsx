// components/sections/Contact.tsx
'use client'

import { useState, FormEvent, useRef, useEffect, useMemo } from 'react'
import emailjs from '@emailjs/browser'
import { motion, AnimatePresence } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'

// ────────────────────────────────────────────────────────────────────────────
type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

// Floating char trails shown in the ticker strip above the form
type CharTrail = { id: number; char: string }
let _trailId = 0

// ── Background: sparse dot grid + cursor-trail beam (unchanged) ──────────────
const STEP      = 56
const PRIMARY   = '34,211,238'
const SECONDARY = '196,116,232'

function ContactBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const glowRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return

    const canvas = canvasRef.current!
    const glow   = glowRef.current!
    const ctx    = canvas.getContext('2d')!
    const LERP   = 0.08
    const ACT_R  = 90

    let rawX = -1, rawY = -1
    let smoothX = -1, smoothY = -1
    let prevX = 0, prevY = 0
    let active = false

    const dots   = new Map<string, number>()
    const sparks = new Map<string, number>()
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

    const center = (col: number, row: number): [number, number] => [
      col * STEP + STEP / 2,
      row * STEP + STEP / 2,
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

        const cc = Math.floor(smoothX / STEP), cr = Math.floor(smoothY / STEP)
        for (let dr = -3; dr <= 3; dr++) {
          for (let dc = -3; dc <= 3; dc++) {
            const col = cc + dc, row = cr + dr
            const [cx, cy] = center(col, row)
            const dist = Math.sqrt((smoothX - cx) ** 2 + (smoothY - cy) ** 2)
            if (dist > ACT_R) continue
            const key  = `${col},${row}`
            const val  = Math.cos((dist / ACT_R) * Math.PI * 0.5)
            const prev = dots.get(key) ?? 0
            dots.set(key, Math.max(prev, val))
            if (!sparks.has(key) && prev < 0.05) sparks.set(key, 1.0)
          }
        }
      } else if (active) {
        active = false; smoothX = -1; smoothY = -1
        glow.style.opacity = '0'
      }

      if (!active && dots.size === 0 && sparks.size === 0) { ctx.clearRect(0, 0, W, H); return }
      ctx.clearRect(0, 0, W, H)

      dots.forEach((b, key) => {
        if (b < 0.012) { dots.delete(key); return }
        const [col, row] = key.split(',').map(Number)
        const [x, y] = center(col, row)
        const r = 1.5 + b * 5
        ctx.save()
        ctx.fillStyle = `rgba(${PRIMARY},${b * 0.06})`
        ctx.beginPath(); ctx.arc(x, y, r + 14 * b, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        ctx.save()
        ctx.shadowColor = `rgba(${PRIMARY},${b * 0.75})`; ctx.shadowBlur = 20 * b
        ctx.fillStyle   = `rgba(${PRIMARY},${b * 0.8})`
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
        ctx.save()
        ctx.strokeStyle = `rgba(${SECONDARY},${b * 0.3})`; ctx.lineWidth = 0.8
        ctx.beginPath(); ctx.arc(x, y, r + 6 * b, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
        dots.set(key, b * 0.940)
      })

      sparks.forEach((life, key) => {
        if (life < 0.02) { sparks.delete(key); return }
        const [col, row] = key.split(',').map(Number)
        const [x, y] = center(col, row)
        const ringR = (1 - life) * 20 + 2
        ctx.save()
        ctx.strokeStyle = `rgba(${SECONDARY},${life * 0.75})`; ctx.lineWidth = life * 1.5
        ctx.shadowColor = `rgba(${SECONDARY},0.8)`; ctx.shadowBlur = 10
        ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
        ctx.restore()
        sparks.set(key, life * 0.88)
      })

      if (active && smoothX > 0) {
        const vx = smoothX - prevX, vy = smoothY - prevY
        const spd = Math.sqrt(vx * vx + vy * vy)
        if (spd > 0.2) {
          const len = Math.min(spd * 9, 140)
          const nx = vx / spd, ny = vy / spd
          const grad = ctx.createLinearGradient(smoothX - nx * len, smoothY - ny * len, smoothX, smoothY)
          grad.addColorStop(0,   `rgba(${PRIMARY},0)`)
          grad.addColorStop(0.5, `rgba(${SECONDARY},0.22)`)
          grad.addColorStop(1,   `rgba(${PRIMARY},0.75)`)
          ctx.save()
          ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.lineCap = 'round'
          ctx.shadowColor = `rgba(${PRIMARY},0.9)`; ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.moveTo(smoothX - nx * len, smoothY - ny * len)
          ctx.lineTo(smoothX, smoothY)
          ctx.stroke(); ctx.restore()
        }
      }
    }

    resize()
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('resize', resize)
    document.addEventListener('mouseleave', onLeave)
    rafId = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      <div ref={glowRef} className="absolute pointer-events-none rounded-full opacity-0 transition-opacity duration-300"
        style={{
          width: 1200, height: 1200, top: 0, left: 0,
          background: `radial-gradient(circle, rgba(${PRIMARY},0.09) 0%, rgba(${SECONDARY},0.05) 35%, transparent 65%)`,
          willChange: 'transform, opacity',
        }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </>
  )
}

// ── SparkCanvas: fires electric particles on every keydown in the form ────────
// Listens to 'keydown' on the passed formRef div so no React state churn.
type Spark = {
  x: number; y: number; vx: number; vy: number
  life: number; decay: number; size: number
  color: '34,211,238' | '168,85,247' | '167,243,208'
}

function SparkCanvas({ formRef }: { formRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!
    const sparks: Spark[] = []
    let W = 0, H = 0, rafId = 0

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W; canvas.height = H
    }

    // Spawn a small burst at a random position in the form
    const fireSparks = () => {
      const cx = W * 0.12 + Math.random() * W * 0.76
      const cy = H * 0.15 + Math.random() * H * 0.70
      const palette: Spark['color'][] = ['34,211,238', '168,85,247', '167,243,208']
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2
        const spd   = 1.0 + Math.random() * 3.5
        sparks.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd - 0.7,   // slight upward bias
          life: 0.85 + Math.random() * 0.15,
          decay: 0.025 + Math.random() * 0.04,
          size: 1.2 + Math.random() * 2.5,
          color: palette[Math.floor(Math.random() * palette.length)],
        })
      }
    }

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      if (sparks.length === 0) { ctx.clearRect(0, 0, W, H); return }
      ctx.clearRect(0, 0, W, H)

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x   += s.vx
        s.y   += s.vy
        s.vy  += 0.065   // gravity
        s.vx  *= 0.98    // mild air friction
        s.life -= s.decay

        if (s.life <= 0) { sparks.splice(i, 1); continue }

        ctx.save()
        ctx.globalAlpha = s.life * 0.85
        ctx.shadowColor = `rgba(${s.color},1)`
        ctx.shadowBlur  = 10
        ctx.fillStyle   = `rgba(${s.color},1)`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    // Attach to form container — fires on any keydown inside any child input
    const form = formRef.current
    form?.addEventListener('keydown', fireSparks)
    rafId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      form?.removeEventListener('keydown', fireSparks)
    }
  }, [formRef])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}

// ── SubmitExplosion: particle burst + radial flash on successful send ─────────
function SubmitExplosion({ onDone }: { onDone: () => void }) {
  // Auto-dismiss after animation completes
  useEffect(() => {
    const t = setTimeout(onDone, 1600)
    return () => clearTimeout(t)
  }, [onDone])

  // Generate particles once on mount — scattered around bottom-center of form
  const particles = useMemo(() =>
    Array.from({ length: 32 }, (_, i) => {
      const angle = (i / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const dist  = 55 + Math.random() * 130
      const colors = ['#22d3ee', '#a855f7', '#34d399', '#f0abfc', '#67e8f9']
      return {
        id:    i,
        tx:    Math.cos(angle) * dist,
        ty:    Math.sin(angle) * dist - 20,   // bias upward
        color: colors[i % colors.length],
        size:  2 + Math.random() * 3.5,
        delay: Math.random() * 0.15,
        dur:   0.7 + Math.random() * 0.5,
      }
    }), [])

  return (
    // Overlay positioned over form container — flexed to bottom-center where button lives
    <div className="absolute inset-0 pointer-events-none flex items-end justify-center pb-14"
      style={{ zIndex: 30 }}>

      {/* Radial flash emanating from button area */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0.75 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 90%, rgba(34,211,238,0.55) 0%, rgba(168,85,247,0.2) 45%, transparent 70%)',
        }}
      />

      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size, height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1.5 }}
          animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0 }}
          transition={{ duration: p.dur, delay: p.delay, ease: [0.2, 0.8, 0.4, 1] }}
        />
      ))}

      {/* Ring burst */}
      <motion.div
        className="absolute rounded-full border"
        style={{ borderColor: 'rgba(34,211,238,0.6)' }}
        initial={{ width: 16, height: 16, opacity: 0.9 }}
        animate={{ width: 200, height: 200, opacity: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function Contact() {
  const [form, setForm]   = useState({ name: '', email: '', subject: '', message: '' })
  const [status, setStatus]         = useState<FormStatus>('idle')
  const [trails, setTrails]         = useState<CharTrail[]>([])       // glowing ticker chars
  const [overclocked, setOverclocked] = useState(false)               // fast typing badge
  const [exploding, setExploding]   = useState(false)                 // submit explosion
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [inputFlash, setInputFlash] = useState(false)                 // brief border pulse per key

  const formRef          = useRef<HTMLDivElement>(null)
  const keystampsRef     = useRef<number[]>([])                       // for speed detection
  const inputFlashTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const overclockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Signal strength: 0–100 based on total characters typed across all fields
  const signalStrength = useMemo(() => {
    const total = form.name.length + form.email.length +
                  form.subject.length + form.message.length
    return Math.min(100, Math.round(total / 180 * 100))
  }, [form])

  // Signal bar color: cyan at low, blends toward violet at high charge
  const signalColor = signalStrength > 80
    ? 'linear-gradient(90deg, rgba(34,211,238,0.6), rgba(168,85,247,1))'
    : 'linear-gradient(90deg, rgba(34,211,238,0.7), rgba(168,85,247,0.7))'

  // Called on every keydown in any form input
  const handleKeyActivity = (key: string) => {
    const now = Date.now()

    // Speed tracking — keep timestamps from last 2s
    keystampsRef.current.push(now)
    keystampsRef.current = keystampsRef.current.filter(t => now - t < 2000)

    // Overclocked: >9 keypresses in 2s window (~270+ WPM burst)
    const isOC = keystampsRef.current.length > 9
    setOverclocked(isOC)
    if (isOC) {
      if (overclockedTimer.current) clearTimeout(overclockedTimer.current)
      overclockedTimer.current = setTimeout(() => setOverclocked(false), 2200)
    }

    // Brief border flash on the active input
    setInputFlash(true)
    if (inputFlashTimer.current) clearTimeout(inputFlashTimer.current)
    inputFlashTimer.current = setTimeout(() => setInputFlash(false), 110)

    // Add printable char to the glowing ticker
    if (key.length === 1 && key !== ' ') {
      const id = ++_trailId
      setTrails(prev => [...prev.slice(-7), { id, char: key }])
      setTimeout(() => setTrails(prev => prev.filter(t => t.id !== id)), 950)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => handleKeyActivity(e.key)

  const handleReset = () => {
    setForm({ name: '', email: '', subject: '', message: '' })
    setStatus('idle')
    setTrails([])
    setOverclocked(false)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    try {
      await emailjs.send(
        process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
        process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID!,
        { from_name: form.name, from_email: form.email, subject: form.subject, message: form.message },
        process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
      )
      setStatus('sent')
      setExploding(true)
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch {
      setStatus('error')
    }
  }

  // Input visual state: border + shadow via inline style to avoid Tailwind JIT purge
  const getInputStyle = (name: string): React.CSSProperties => {
    const focused = focusedField === name
    return {
      background: 'rgba(2,18,28,0.65)',
      border: `1px solid ${focused
        ? (inputFlash ? 'rgba(34,211,238,0.95)' : 'rgba(34,211,238,0.65)')
        : 'rgba(34,211,238,0.14)'}`,
      boxShadow: focused
        ? `0 0 ${inputFlash ? '22' : '10'}px rgba(34,211,238,0.22), inset 0 0 8px rgba(34,211,238,0.03)`
        : 'none',
      borderRadius: '8px',
      padding: '12px 16px',
      color: '#cff6ff',
      caretColor: '#22d3ee',
      fontFamily: '"Fira Code", "JetBrains Mono", monospace',
      fontSize: '13px',
      outline: 'none',
      width: '100%',
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }
  }

  return (
    <section id="contact" className="relative py-24 md:py-32 overflow-hidden">

      {/* ── dot grid + cursor trail background ──────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle, rgba(${PRIMARY},0.12) 1.5px, transparent 1.5px)`,
          backgroundSize:  `${STEP}px ${STEP}px`,
          backgroundPosition: `${STEP / 2}px ${STEP / 2}px`,
        }} />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{ background: `radial-gradient(circle, rgba(${SECONDARY},0.06) 0%, transparent 70%)`, filter: 'blur(40px)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: `radial-gradient(circle, rgba(${PRIMARY},0.05) 0%, transparent 70%)`, filter: 'blur(50px)' }} />
        <ContactBackground />
      </div>

      <div className="max-w-content mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">

          {/* ── Left column: heading + contact info + socials ─────────────── */}
          <div className="flex-1">
            <RevealText>
              <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Contact</span>
              <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2 mb-4">
                Drop a Message
              </h2>
              <p className="text-text-secondary leading-relaxed max-w-sm">
                Have a project in mind? I'm currently open to new opportunities and exciting projects.
              </p>
            </RevealText>

            <RevealText delay={0.15} className="mt-8 flex flex-col gap-4">
              <a href="mailto:hello@shahfahad.dev"
                className="flex items-center gap-3 text-text-secondary hover:text-accent-cyan transition-colors duration-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="text-accent-violet flex-shrink-0" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span className="text-sm">hello@shahfahad.dev</span>
              </a>
              <a href="tel:+923042186009"
                className="flex items-center gap-3 text-text-secondary hover:text-accent-cyan transition-colors duration-200">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                  className="text-accent-violet flex-shrink-0" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span className="text-sm">+92 304 2186009</span>
              </a>
            </RevealText>

            <RevealText delay={0.25} className="mt-8 flex items-center gap-4">
              <a href="https://github.com/fahaddoc" target="_blank" rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary transition-colors" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/in/fahaddoc600" target="_blank" rel="noopener noreferrer"
                className="text-text-muted hover:text-text-primary transition-colors" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </RevealText>
          </div>

          {/* ── Right column: NEON TERMINAL ─────────────────────────────────── */}
          <div className="flex-1">

            {/* Terminal window chrome */}
            <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-lg"
              style={{
                background: 'rgba(2,18,28,0.65)',
                border: '1px solid rgba(34,211,238,0.18)',
              }}>
              {/* fake traffic-light dots */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,95,87,0.55)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(255,189,46,0.55)' }} />
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgba(40,200,64,0.55)' }} />
                <span className="ml-3 font-mono text-[10px] tracking-widest uppercase"
                  style={{ color: 'rgba(34,211,238,0.45)' }}>
                  neon-terminal
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* pulsing status dot */}
                <motion.span className="w-1.5 h-1.5 rounded-full" style={{ background: '#22d3ee' }}
                  animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
                <span className="font-mono text-[10px] tracking-widest uppercase"
                  style={{ color: 'rgba(34,211,238,0.50)' }}>
                  open channel
                </span>
              </div>
            </div>

            {/* ── Signal Strength meter ──────────────────────────────────── */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] tracking-widest uppercase"
                  style={{ color: 'rgba(34,211,238,0.50)' }}>
                  Signal Strength
                </span>
                <div className="flex items-center gap-2">

                  {/* Overclocked badge — appears when user types very fast */}
                  <AnimatePresence>
                    {overclocked && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7, x: 8 }}
                        animate={{ opacity: 1, scale: 1,   x: 0 }}
                        exit={{ opacity: 0,  scale: 0.7, x: 8 }}
                        transition={{ duration: 0.18 }}
                        className="font-mono text-[9px] tracking-wider px-2 py-0.5 rounded-sm"
                        style={{
                          color: '#c084fc',
                          background: 'rgba(168,85,247,0.12)',
                          border: '1px solid rgba(168,85,247,0.55)',
                          textShadow: '0 0 8px rgba(168,85,247,0.9)',
                          boxShadow: '0 0 8px rgba(168,85,247,0.18)',
                        }}
                      >
                        ⚡ OVERCLOCKED
                      </motion.span>
                    )}
                  </AnimatePresence>

                  <span className="font-mono text-[12px] font-bold"
                    style={{ color: '#22d3ee', textShadow: '0 0 8px rgba(34,211,238,0.65)' }}>
                    {signalStrength}%
                  </span>
                </div>
              </div>

              {/* Bar track */}
              <div className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(34,211,238,0.07)', border: '1px solid rgba(34,211,238,0.1)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: signalColor, boxShadow: '0 0 8px rgba(34,211,238,0.45)' }}
                  animate={{ width: `${signalStrength}%` }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                />
              </div>

              {/* Tick marks */}
              <div className="flex justify-between mt-1 px-0.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <span key={i} className="font-mono text-[8px]"
                    style={{ color: signalStrength >= (i + 1) * 10 ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.12)' }}>
                    |
                  </span>
                ))}
              </div>
            </div>

            {/* ── Character trail ticker — glowing chars float across ────── */}
            <div className="flex items-center gap-1 mb-4 h-7 overflow-hidden px-1">
              <span className="font-mono text-[9px] tracking-wider flex-shrink-0 mr-1"
                style={{ color: 'rgba(34,211,238,0.28)' }}>
                INPUT:
              </span>
              <AnimatePresence>
                {trails.map(t => (
                  <motion.span
                    key={t.id}
                    initial={{ opacity: 0, y: 8,  scale: 0.5 }}
                    animate={{ opacity: 1, y: 0,  scale: 1   }}
                    exit={{ opacity: 0,   y: -12, scale: 0.7 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="font-mono text-sm font-bold flex-shrink-0"
                    style={{
                      color: '#22d3ee',
                      textShadow: '0 0 8px rgba(34,211,238,1), 0 0 18px rgba(34,211,238,0.5)',
                    }}
                  >
                    {t.char}
                  </motion.span>
                ))}
              </AnimatePresence>

              {/* Blinking cursor when a field is focused */}
              <AnimatePresence>
                {focusedField && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="font-mono text-base flex-shrink-0"
                    style={{ color: 'rgba(34,211,238,0.65)' }}
                  >
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.85, repeat: Infinity }}
                    >_</motion.span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* ── Form container (SparkCanvas lives here) ──────────────── */}
            <div ref={formRef} className="relative">
              {/* Keypress spark particles */}
              <SparkCanvas formRef={formRef} />

              <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text" name="name" placeholder="// your_name"
                    value={form.name} onChange={handleChange} required
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    style={getInputStyle('name')}
                  />
                  <input
                    type="email" name="email" placeholder="// your@signal.io"
                    value={form.email} onChange={handleChange} required
                    onKeyDown={handleKeyDown}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    style={getInputStyle('email')}
                  />
                </div>

                <input
                  type="text" name="subject" placeholder="// subject_line"
                  value={form.subject} onChange={handleChange} required
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFocusedField('subject')}
                  onBlur={() => setFocusedField(null)}
                  style={getInputStyle('subject')}
                />

                <div className="relative">
                  <textarea
                    name="message"
                    placeholder={"// transmit your message...\n// recommended: 100-200 chars for full signal"}
                    value={form.message} onChange={handleChange} required
                    rows={5} onKeyDown={handleKeyDown}
                    onFocus={() => setFocusedField('message')}
                    onBlur={() => setFocusedField(null)}
                    style={{ ...getInputStyle('message'), resize: 'none' }}
                  />
                  {/* Char counter — bottom-right corner of textarea */}
                  <span
                    className="absolute bottom-3 right-3 font-mono text-[10px] pointer-events-none"
                    style={{ color: 'rgba(34,211,238,0.28)' }}
                  >
                    {form.message.length} chars
                  </span>
                </div>

                {/* ── Button row ─────────────────────────────────────── */}
                <div className="flex gap-3 mt-1">

                  {/* CLR — clear all fields */}
                  <motion.button
                    type="button" onClick={handleReset}
                    className="px-5 py-3 rounded-lg font-mono text-xs tracking-widest uppercase"
                    style={{
                      background: 'rgba(168,85,247,0.06)',
                      border: '1px solid rgba(168,85,247,0.28)',
                      color: 'rgba(168,85,247,0.65)',
                    }}
                    whileHover={{
                      borderColor: 'rgba(168,85,247,0.7)',
                      color: '#c084fc',
                      boxShadow: '0 0 12px rgba(168,85,247,0.22)',
                    }}
                    whileTap={{ scale: 0.96 }}
                  >
                    CLR
                  </motion.button>

                  {/* SEND TRANSMISSION — main action */}
                  <motion.button
                    type="submit"
                    disabled={status === 'sending' || status === 'sent'}
                    className="relative flex-1 py-3 rounded-lg font-mono text-sm tracking-widest uppercase font-bold overflow-hidden"
                    style={{
                      background: status === 'sent'
                        ? 'rgba(16,185,129,0.12)'
                        : 'linear-gradient(90deg, rgba(34,211,238,0.12), rgba(168,85,247,0.18))',
                      border: `1px solid ${status === 'sent' ? 'rgba(52,211,153,0.55)' : 'rgba(34,211,238,0.38)'}`,
                      color: status === 'sent' ? '#34d399' : '#22d3ee',
                      textShadow: status === 'sent'
                        ? '0 0 10px rgba(52,211,153,0.7)'
                        : '0 0 10px rgba(34,211,238,0.65)',
                      boxShadow: '0 0 14px rgba(34,211,238,0.1)',
                      opacity: status === 'sending' ? 0.7 : 1,
                    }}
                    whileHover={status === 'idle' ? {
                      boxShadow: '0 0 28px rgba(34,211,238,0.32)',
                      borderColor: 'rgba(34,211,238,0.8)',
                    } : {}}
                    whileTap={status === 'idle' ? { scale: 0.98 } : {}}
                  >
                    {/* Shimmer sweep — always running on idle button */}
                    {status === 'idle' && (
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.14) 50%, transparent 100%)',
                          width: '55%',
                        }}
                        animate={{ x: ['-120%', '260%'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}
                      />
                    )}
                    <span className="relative">
                      {status === 'sending' ? '▶ TRANSMITTING...'
                        : status === 'sent'  ? '✓ SIGNAL RECEIVED'
                        : '▶ SEND TRANSMISSION'}
                    </span>
                  </motion.button>
                </div>

                {/* Error state */}
                {status === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-xs text-center"
                    style={{ color: 'rgba(248,113,113,0.8)' }}
                  >
                    // TRANSMISSION FAILED — direct channel: hello@shahfahad.dev
                  </motion.p>
                )}
              </form>

              {/* Submit explosion overlay — mounts on successful send */}
              <AnimatePresence>
                {exploding && (
                  <SubmitExplosion onDone={() => setExploding(false)} />
                )}
              </AnimatePresence>
            </div>

            {/* ── Success message — appears after explosion settles ──────── */}
            <AnimatePresence>
              {status === 'sent' && !exploding && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0,  scale: 1    }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-5 p-4 rounded-lg text-center"
                  style={{
                    background: 'rgba(2,18,28,0.7)',
                    border: '1px solid rgba(34,211,238,0.28)',
                    boxShadow: '0 0 20px rgba(34,211,238,0.08)',
                  }}
                >
                  <motion.p
                    className="font-mono text-sm font-bold"
                    style={{ color: '#22d3ee', textShadow: '0 0 12px rgba(34,211,238,0.85)' }}
                    animate={{ opacity: [1, 0.55, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  >
                    ✓ Message Sent to Shah Fahad's Network
                  </motion.p>
                  <p className="font-mono text-[10px] mt-1.5 tracking-wider uppercase"
                    style={{ color: 'rgba(34,211,238,0.38)' }}>
                    Signal delivered // Response incoming
                  </p>
                  {/* Decorative scan line */}
                  <motion.div
                    className="mt-3 h-px rounded-full mx-auto"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.6), transparent)',
                      width: '70%',
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </section>
  )
}
