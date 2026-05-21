'use client'

// CircuitBackground — animated PCB-style trace pattern that lives behind
// everything. Procedurally laid out: a grid of nodes connected by L-shaped
// (right-angle) traces. Most strokes are muted; a handful are accent teal
// with an animated dash offset so a bright segment flows along them like
// current. Static SVG paths + CSS keyframes — no per-frame JS.

import { useMemo } from 'react'

const TILE_W   = 1600
const TILE_H   = 1000
const STEP     = 80                 // grid cell size
const COLS     = TILE_W / STEP      // 20
const ROWS     = TILE_H / STEP      // 12.5 → use 13

// Cheap deterministic PRNG so the layout is stable across renders
function makeRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

interface Trace {
  d:       string
  accent:  boolean
  animate: boolean
  length:  number   // approximate path length for dash-array
}

function buildTraces(): { traces: Trace[]; nodes: Array<{ x: number; y: number; accent: boolean }> } {
  const rng = makeRng(0xc1c1c1)
  const traces: Trace[] = []
  const nodes: Array<{ x: number; y: number; accent: boolean }> = []

  for (let i = 0; i < 38; i++) {
    // Start at a random grid intersection
    const startCol = Math.floor(rng() * COLS)
    const startRow = Math.floor(rng() * ROWS)
    let x = startCol * STEP
    let y = startRow * STEP

    const segments = 2 + Math.floor(rng() * 3) // 2-4 segments per trace
    let d = `M ${x} ${y}`
    let totalLength = 0
    // Alternate horizontal / vertical for the right-angle PCB feel
    let goHorizontal = rng() > 0.5

    for (let s = 0; s < segments; s++) {
      const stepCount = 1 + Math.floor(rng() * 4)
      const dir = rng() > 0.5 ? 1 : -1
      if (goHorizontal) {
        x += dir * stepCount * STEP
      } else {
        y += dir * stepCount * STEP
      }
      // Clamp to tile bounds so paths don't shoot off into nothing
      x = Math.max(0, Math.min(TILE_W, x))
      y = Math.max(0, Math.min(TILE_H, y))
      d += ` L ${x} ${y}`
      totalLength += stepCount * STEP
      goHorizontal = !goHorizontal
    }

    const accent = rng() < 0.18              // ~18% accent (teal)
    const animate = accent && rng() < 0.6    // most accents animate

    traces.push({ d, accent, animate, length: totalLength })

    // Drop a node at each endpoint (start + final)
    nodes.push({ x: startCol * STEP, y: startRow * STEP, accent })
    nodes.push({ x, y, accent })

    // Sometimes a junction node mid-trace
    if (rng() < 0.35) {
      nodes.push({ x: (startCol * STEP + x) / 2, y: (startRow * STEP + y) / 2, accent: false })
    }
  }

  return { traces, nodes }
}

export function CircuitBackground() {
  const { traces, nodes } = useMemo(buildTraces, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${TILE_W} ${TILE_H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}
      >
        {/* Base traces — muted color */}
        <g stroke="rgb(var(--text-primary) / 0.18)" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {traces.filter((t) => !t.accent).map((t, i) => (
            <path key={`b-${i}`} d={t.d} />
          ))}
        </g>

        {/* Accent traces — teal, some with animated dash flow */}
        <g
          stroke="rgb(var(--accent-cyan) / 0.55)"
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {traces.filter((t) => t.accent).map((t, i) => {
            const dashTotal  = Math.max(120, t.length)
            return (
              <path
                key={`a-${i}`}
                d={t.d}
                strokeDasharray={t.animate ? `40 ${dashTotal}` : undefined}
                style={
                  t.animate
                    ? {
                        animation: `cb-flow ${6 + (i % 5) * 1.5}s linear infinite`,
                        animationDelay: `${(i * 0.7) % 4}s`,
                      }
                    : undefined
                }
              />
            )
          })}
        </g>

        {/* Nodes — small empty circles for junctions; accent ones filled */}
        <g>
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={n.accent ? 4 : 3.5}
              fill={n.accent ? 'rgb(var(--accent-cyan) / 0.7)' : 'rgb(var(--bg-base))'}
              stroke={n.accent ? 'rgb(var(--accent-cyan) / 0.9)' : 'rgb(var(--text-primary) / 0.35)'}
              strokeWidth="1.1"
            />
          ))}
        </g>

        <style>{`
          @keyframes cb-flow {
            0%   { stroke-dashoffset: 0; }
            100% { stroke-dashoffset: -${Math.max(...traces.map((t) => t.length)) * 2}; }
          }
        `}</style>
      </svg>
    </div>
  )
}
