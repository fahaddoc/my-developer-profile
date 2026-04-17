'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { RevealText } from '@/components/ui/RevealText'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { useInView } from '@/hooks/useInView'
import { skills } from '@/data/projects'

// ─────────────────────────────────────────────────────────────────────────────
// Hex Circuit Builder
//
// 10 hexagonal nodes placed in a ring-with-center layout.
// Player drags between nodes to draw connections.
// When all 10 nodes are in one connected component (spanning tree),
// the circuit is "complete": nodes pulse, skill names glow, overlay appears.
//
// Architecture:
//   • All game state (connections, drag, sparks) lives in closure vars — no React state
//   • Only progress count + complete flag bubble up via callbacks → minimal re-renders
//   • Canvas handles all drawing; DOM handles the overlay and reset button
//   • key prop on CircuitCanvas remounts it on reset (cleanest way to wipe state)
// ─────────────────────────────────────────────────────────────────────────────

// Node layout — ring of 9 + 1 center. Positions are 0-1 fractions of canvas W/H.
const HEX_NODES = [
  { id: 0, relX: 0.10, relY: 0.22, skill: 'React',      color: '#61dafb' },
  { id: 1, relX: 0.31, relY: 0.11, skill: 'Next.js',    color: '#e5e7eb' },
  { id: 2, relX: 0.55, relY: 0.17, skill: 'TypeScript', color: '#3b82f6' },
  { id: 3, relX: 0.80, relY: 0.11, skill: 'Flutter',    color: '#54c5f8' },
  { id: 4, relX: 0.91, relY: 0.48, skill: 'Node.js',    color: '#4ade80' },
  { id: 5, relX: 0.80, relY: 0.82, skill: 'WebRTC',     color: '#22d3ee' },
  { id: 6, relX: 0.55, relY: 0.89, skill: 'SignalR',    color: '#c084fc' },
  { id: 7, relX: 0.28, relY: 0.83, skill: 'Redux',      color: '#a78bfa' },
  { id: 8, relX: 0.08, relY: 0.57, skill: 'Tailwind',   color: '#38bdf8' },
  { id: 9, relX: 0.47, relY: 0.51, skill: 'AWS',        color: '#fb923c' },
] as const

type Connection = {
  from:      number
  to:        number
  flashLife: number   // 1→0, drives "new connection" white flash
}

type Spark = {
  x: number; y: number
  vx: number; vy: number
  life: number
  color: string
}

// ── helpers ───────────────────────────────────────────────────────────────────

// "#rrggbb" → "r,g,b" so we can use rgba() on canvas
function hexToRgb(hex: string): string {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ].join(',')
}

// Union-Find: all N nodes in one connected component?
function allConnected(n: number, conns: Connection[]): boolean {
  if (conns.length < n - 1) return false  // fast exit
  const p = Array.from({ length: n }, (_, i) => i)
  const find = (x: number): number => p[x] === x ? x : (p[x] = find(p[x]))
  conns.forEach(c => { p[find(c.from)] = find(c.to) })
  const root = find(0)
  return Array.from({ length: n }, (_, i) => find(i) === root).every(Boolean)
}

// Set of node IDs that appear in at least one connection
function poweredSet(conns: Connection[]): Set<number> {
  const s = new Set<number>()
  conns.forEach(c => { s.add(c.from); s.add(c.to) })
  return s
}

// ─────────────────────────────────────────────────────────────────────────────
// CircuitCanvas
// ─────────────────────────────────────────────────────────────────────────────
function CircuitCanvas({
  onProgress,
  onComplete,
}: {
  onProgress: (powered: number) => void
  onComplete: () => void
}) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => { onProgressRef.current = onProgress }, [onProgress])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx    = canvas.getContext('2d')!

    let W = 0, H = 0, R = 40   // R = hex circumradius, recomputed on resize
    let rafId = 0, lastTime = 0

    // ── game state (all in closure — zero React re-renders) ──────────────
    const connections: Connection[] = []
    const sparks: Spark[]            = []
    let dragging: { fromId: number; curX: number; curY: number } | null = null
    let hoveredHex  = -1
    let complete    = false
    let pulsePhase  = 0     // advances when complete, drives sine glow
    let dashOffset  = 0     // advances each frame, animates dashes

    // World positions — recomputed on resize from fractional layout
    const hexPos = HEX_NODES.map(n => ({ ...n, x: 0, y: 0 }))

    // ── layout ────────────────────────────────────────────────────────────
    const recompute = () => {
      R = Math.max(26, Math.min(W, H) * 0.092)
      HEX_NODES.forEach((n, i) => {
        hexPos[i].x = n.relX * W
        hexPos[i].y = n.relY * H
      })
    }

    const resize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H
      recompute()
    }

    // ── hit test ──────────────────────────────────────────────────────────
    const hitTest = (px: number, py: number): number => {
      const hitR = R * 1.18   // slightly generous, helps on touch
      for (const h of hexPos) {
        if (Math.hypot(px - h.x, py - h.y) < hitR) return h.id
      }
      return -1
    }

    const alreadyLinked = (a: number, b: number) =>
      connections.some(c => (c.from === a && c.to === b) || (c.from === b && c.to === a))

    // ── connection logic ──────────────────────────────────────────────────
    const connect = (fromId: number, toId: number) => {
      if (fromId === toId || alreadyLinked(fromId, toId)) return

      connections.push({ from: fromId, to: toId, flashLife: 1.0 })

      // Emerald sparks at both nodes
      const a = hexPos[fromId], b = hexPos[toId]
      for (const pt of [a, b]) {
        for (let i = 0; i < 9; i++) {
          const ang = Math.random() * Math.PI * 2
          const spd = 1.2 + Math.random() * 2.8
          sparks.push({ x: pt.x, y: pt.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd, life: 1, color: '#10b981' })
        }
      }

      const powered = poweredSet(connections).size
      onProgressRef.current(powered)

      if (!complete && allConnected(HEX_NODES.length, connections)) {
        complete = true
        onCompleteRef.current()
      }
    }

    // ── draw: hex shape path ──────────────────────────────────────────────
    function hexPath(cx: number, cy: number, r: number) {
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + (Math.PI / 3) * k
        k === 0
          ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
          : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
      }
      ctx.closePath()
    }

    // ── draw: single hexagon ──────────────────────────────────────────────
    function drawHex(h: typeof hexPos[0], powered: Set<number>) {
      const isHovered  = hoveredHex === h.id
      const isDragging = dragging?.fromId === h.id
      const isPowered  = complete || powered.has(h.id)

      const scale = isDragging || isHovered ? 1.11 : 1
      const r     = R * scale
      const pulse = complete ? 0.55 + 0.45 * Math.sin(pulsePhase + h.id * 0.6) : 1

      // Fill
      hexPath(h.x, h.y, r)
      ctx.fillStyle = isPowered
        ? `rgba(16,185,129,${0.09 * pulse})`
        : isHovered ? 'rgba(168,85,247,0.07)' : 'rgba(168,85,247,0.03)'
      ctx.fill()

      // Border
      ctx.save()
      if (isPowered) {
        ctx.shadowColor = `rgba(16,185,129,${0.75 * pulse})`
        ctx.shadowBlur  = 18 * pulse
        ctx.strokeStyle = `rgba(16,185,129,${0.90 * pulse})`
        ctx.lineWidth   = isHovered ? 2.5 : 2
      } else {
        ctx.shadowColor = `rgba(168,85,247,${isHovered ? 0.6 : 0.25})`
        ctx.shadowBlur  = isHovered ? 14 : 5
        ctx.strokeStyle = `rgba(168,85,247,${isHovered ? 0.7 : 0.38})`
        ctx.lineWidth   = isHovered ? 2 : 1.2
      }
      hexPath(h.x, h.y, r)
      ctx.stroke()
      ctx.restore()

      // Skill name
      const labelAlpha = complete ? 0.95 : isPowered ? 0.78 : 0.20
      const fontSize   = Math.max(9, Math.round(R * 0.27))

      ctx.save()
      ctx.font         = `${fontSize}px monospace`
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      if (isPowered) {
        ctx.shadowColor = h.color
        ctx.shadowBlur  = 9 * (complete ? pulse : 1)
      }
      ctx.fillStyle = `rgba(${hexToRgb(h.color)}, ${labelAlpha})`
      ctx.fillText(h.skill, h.x, h.y)
      ctx.restore()

      // Small center dot when node is idle (visual hint it's clickable)
      if (!isPowered && !isHovered) {
        ctx.save()
        ctx.fillStyle = 'rgba(168,85,247,0.45)'
        ctx.beginPath(); ctx.arc(h.x, h.y, 2.5, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
    }

    // ── draw: connection line ─────────────────────────────────────────────
    function drawConnection(c: Connection) {
      const a = hexPos[c.from], b = hexPos[c.to]
      const fl = c.flashLife

      ctx.save()
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)

      if (fl > 0.02) {
        // New connection: starts white-hot, fades to emerald
        ctx.strokeStyle = `rgba(16,185,129,${0.85 + fl * 0.15})`
        ctx.shadowColor = fl > 0.55 ? `rgba(255,255,255,${fl})` : 'rgba(16,185,129,0.9)'
        ctx.shadowBlur  = 22 * fl + 7
        ctx.lineWidth   = 1.5 + fl * 2.5
        ctx.setLineDash([])
      } else if (complete) {
        // Circuit complete: solid, pulsing
        const pulse = 0.55 + 0.45 * Math.sin(pulsePhase)
        ctx.strokeStyle = `rgba(16,185,129,${0.88 * pulse})`
        ctx.shadowColor = `rgba(16,185,129,${pulse})`
        ctx.shadowBlur  = 14 * pulse
        ctx.lineWidth   = 2
        ctx.setLineDash([])
      } else {
        // Normal: animated dashed neon
        ctx.strokeStyle = 'rgba(16,185,129,0.72)'
        ctx.shadowColor = 'rgba(16,185,129,0.55)'
        ctx.shadowBlur  = 7
        ctx.lineWidth   = 1.5
        ctx.setLineDash([9, 6])
        ctx.lineDashOffset = dashOffset
      }

      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // ── draw: drag-in-progress line ───────────────────────────────────────
    function drawDragLine(fromId: number, cx: number, cy: number) {
      const a = hexPos[fromId]
      ctx.save()
      ctx.strokeStyle = 'rgba(34,211,238,0.60)'
      ctx.shadowColor = 'rgba(34,211,238,0.75)'
      ctx.shadowBlur  = 10
      ctx.lineWidth   = 1.5
      ctx.setLineDash([7, 5])
      ctx.lineDashOffset = -dashOffset   // opposite direction feels natural
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(cx, cy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // ── draw: sparks ──────────────────────────────────────────────────────
    function drawSparks() {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy
        s.vx *= 0.91; s.vy *= 0.91
        s.life -= 0.042
        if (s.life <= 0) { sparks.splice(i, 1); continue }

        ctx.save()
        ctx.fillStyle   = `rgba(${hexToRgb(s.color)}, ${s.life})`
        ctx.shadowColor = s.color
        ctx.shadowBlur  = 6
        ctx.beginPath()
        ctx.arc(s.x, s.y, 2.4 * s.life, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    // ── RAF loop ──────────────────────────────────────────────────────────
    const draw = (ts: number) => {
      rafId = requestAnimationFrame(draw)
      const dt = Math.min((ts - lastTime) / 1000, 0.05)
      lastTime = ts

      const rect = canvas.getBoundingClientRect()
      if (rect.bottom < -50 || rect.top > window.innerHeight + 50) return

      ctx.clearRect(0, 0, W, H)

      // Advance timers
      dashOffset  -= 0.38
      if (complete) pulsePhase += dt * 2.4

      // Decay flash on connections
      connections.forEach(c => { if (c.flashLife > 0.01) c.flashLife *= 0.90 })

      // Compute powered set once — reused by drawHex for all nodes
      const powered = poweredSet(connections)

      connections.forEach(drawConnection)
      if (dragging) drawDragLine(dragging.fromId, dragging.curX, dragging.curY)
      hexPos.forEach(h => drawHex(h, powered))
      drawSparks()
    }

    // ── canvas event helpers ──────────────────────────────────────────────
    const relPos = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect()
      return { x: clientX - r.left, y: clientY - r.top }
    }

    // ── mouse events ──────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      const { x, y } = relPos(e.clientX, e.clientY)
      const hit = hitTest(x, y)
      if (hit !== -1) dragging = { fromId: hit, curX: x, curY: y }
    }

    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = relPos(e.clientX, e.clientY)
      hoveredHex = hitTest(x, y)
      if (dragging) { dragging.curX = x; dragging.curY = y }
      canvas.style.cursor = dragging ? 'grabbing' : hoveredHex !== -1 ? 'grab' : 'default'
    }

    const onMouseUp = (e: MouseEvent) => {
      if (!dragging) return
      const { x, y } = relPos(e.clientX, e.clientY)
      const hit = hitTest(x, y)
      if (hit !== -1 && hit !== dragging.fromId) connect(dragging.fromId, hit)
      dragging = null
      canvas.style.cursor = 'default'
    }

    // ── touch events (mirrors mouse, prevents scroll while dragging) ──────
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      const { x, y } = relPos(t.clientX, t.clientY)
      const hit = hitTest(x, y)
      if (hit !== -1) dragging = { fromId: hit, curX: x, curY: y }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return
      e.preventDefault()   // block page scroll while drawing a wire
      const t = e.touches[0]
      const { x, y } = relPos(t.clientX, t.clientY)
      hoveredHex    = hitTest(x, y)
      dragging.curX = x; dragging.curY = y
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!dragging) return
      const t = e.changedTouches[0]
      const { x, y } = relPos(t.clientX, t.clientY)
      const hit = hitTest(x, y)
      if (hit !== -1 && hit !== dragging.fromId) connect(dragging.fromId, hit)
      dragging = null
    }

    // ── init ──────────────────────────────────────────────────────────────
    resize()
    window.addEventListener('resize',    resize)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseup',   onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd)

    lastTime = performance.now()
    rafId    = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize',    resize)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full block" />
}

// ─────────────────────────────────────────────────────────────────────────────
// Skills section
// ─────────────────────────────────────────────────────────────────────────────

const BG_PRIMARY   = '16,185,129'   // emerald
const BG_SECONDARY = '34,211,238'   // cyan
const BG_COL = 28, BG_ROW = 28, BG_OFF = 14

export function Skills() {
  const sectionRef                          = useRef<HTMLElement>(null)
  const { ref: gridRef, isInView: gridVis } = useInView()

  const [poweredCount, setPoweredCount] = useState(0)
  const [circuitDone,  setCircuitDone]  = useState(false)
  const [gameKey,      setGameKey]      = useState(0)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const scale   = useTransform(scrollYProgress, [0.45, 1], [1,  0.91])
  const opacity = useTransform(scrollYProgress, [0.45, 1], [1,  0.35])
  const rotateX = useTransform(scrollYProgress, [0.45, 1], [0,  10  ])

  const handleProgress = useCallback((n: number) => setPoweredCount(n), [])
  const handleComplete = useCallback(() => setCircuitDone(true), [])
  const handleReset    = useCallback(() => {
    setCircuitDone(false)
    setPoweredCount(0)
    setGameKey(k => k + 1)
  }, [])

  return (
    <section ref={sectionRef} id="skills" className="relative py-24 md:py-32 bg-bg-surface overflow-hidden">

      {/* subtle hex-dot CSS texture */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle, rgba(${BG_PRIMARY},0.12) 1.5px, transparent 1.5px),
            radial-gradient(circle, rgba(${BG_SECONDARY},0.07) 1px, transparent 1px)
          `,
          backgroundSize:     `${BG_COL}px ${BG_ROW}px, ${BG_COL}px ${BG_ROW}px`,
          backgroundPosition: `0 0, ${BG_OFF}px ${BG_OFF}px`,
        }} />
      </div>

      <motion.div style={{ scale, opacity, rotateX, transformOrigin: 'center 20%' }}>
        <div className="max-w-content mx-auto px-6 relative z-10">

          <RevealText className="mb-10">
            <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">Expertise</span>
            <h2 className="font-display font-bold text-4xl md:text-5xl text-text-primary mt-2">
              Skills & Expertise
            </h2>
          </RevealText>

          {/* ── circuit game ─────────────────────────────────────────────── */}
          <div className="mb-10">

            {/* status bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <p className="font-mono text-xs text-text-muted">
                  {circuitDone
                    ? 'All systems online — circuit complete'
                    : poweredCount === 0
                      ? 'Drag between hexagons to build the circuit'
                      : `${poweredCount} / ${HEX_NODES.length} nodes powered`
                  }
                </p>

                {/* power bar */}
                {!circuitDone && poweredCount > 0 && (
                  <div className="flex items-end gap-[3px]">
                    {HEX_NODES.map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{
                          background: i < poweredCount
                            ? 'rgba(16,185,129,0.85)'
                            : 'rgba(255,255,255,0.08)',
                          boxShadow: i < poweredCount
                            ? '0 0 4px rgba(16,185,129,0.7)'
                            : 'none',
                        }}
                        transition={{ duration: 0.25 }}
                        className="w-1.5 h-3 rounded-sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              <AnimatePresence>
                {(poweredCount > 0 || circuitDone) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleReset}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="font-mono text-xs text-text-muted border border-white/10 px-3 py-1.5 rounded-lg hover:border-accent-green/40 hover:text-accent-green transition-colors duration-200"
                  >
                    Rebuild Circuit
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* canvas container */}
            <div
              className="relative rounded-2xl border border-white/[0.06] overflow-hidden"
              style={{ height: '420px' }}
            >
              {/* ambient emerald glow behind canvas */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 68%)',
              }} />

              {/* key remounts component on reset, wiping all closure state */}
              <CircuitCanvas
                key={gameKey}
                onProgress={handleProgress}
                onComplete={handleComplete}
              />

              {/* "SKILLS UNLOCKED" overlay */}
              <AnimatePresence>
                {circuitDone && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <div className="absolute inset-0" style={{
                      background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.09) 0%, transparent 60%)',
                    }} />

                    <motion.div
                      initial={{ scale: 0.65, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 22, delay: 0.12 }}
                      className="relative text-center px-8 py-5 rounded-2xl border border-accent-green/25 bg-bg-base/70 backdrop-blur-sm"
                    >
                      {/* top accent line */}
                      <div className="absolute top-0 left-8 right-8 h-px" style={{
                        background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.85), transparent)',
                      }} />

                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.28 }}
                        className="font-mono text-[10px] text-accent-green/60 uppercase tracking-[0.22em] mb-1"
                      >
                        System Online
                      </motion.p>

                      <motion.h3
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.38 }}
                        className="font-display font-extrabold text-3xl md:text-4xl"
                        style={{
                          color: '#10b981',
                          textShadow: '0 0 28px rgba(16,185,129,0.7), 0 0 55px rgba(16,185,129,0.3)',
                        }}
                      >
                        SKILLS UNLOCKED
                      </motion.h3>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.55 }}
                        className="font-mono text-xs text-text-muted mt-1"
                      >
                        full stack revealed ↓
                      </motion.p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── skills categories — dimmed until circuit complete ─────────── */}
          <motion.div
            animate={{
              opacity: circuitDone ? 1 : 0.32,
              filter:  circuitDone ? 'blur(0px)' : 'blur(0.8px)',
            }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
          >
            {!circuitDone && (
              <p className="font-mono text-xs text-center text-text-muted/60 mb-6">
                Complete the circuit above to unlock full detail
              </p>
            )}

            <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {skills.map((category, i) => (
                <motion.div
                  key={category.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={gridVis ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.09 }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <span className="font-mono text-xs text-accent-violet uppercase tracking-widest">
                      {category.label}
                    </span>
                    <div className="mt-2 h-px bg-[rgba(139,92,246,0.2)]" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map(skill => (
                      <SkillBadge key={skill} label={skill} />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>
      </motion.div>
    </section>
  )
}
