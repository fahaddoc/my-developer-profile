'use client'

// SkillsOrbit — the Skills station's visual: eight core skills on a tilted
// ring that owns the right half of the frame, a small ice planet at its centre.
//
// The eight come from data/projects.ts `skills` (the same data mobile lists),
// so the orbit never claims a tool the rest of the site does not. Tiles are
// solid surface panels with a hairline, the logo in ink-2 and the name in ink;
// hover turns the border and logo ember. No glass, no glows, no brand colours.
//
// Motion: tiles arrive with the station (presence = smoothstep(0.05, 0.35,
// proximity), staggered 40ms per tile) and recede with depth (opacity floor
// 0.4, a slight scale). The ring spins slowly and pauses while a tile is
// hovered; clicking a tile brings it to the front along the shortest arc
// (600ms, ease-in-out). Reduced motion: no spin, clicks jump.
//
// The ring geometry (radius, tilt) comes from TunnelScene's viewport-aware
// layout, sized so neighbouring tiles never overlap at any rotation and the
// tile labels never drop below 13px on screen.
//
// Accessibility: the orbit is decorative. Every tile sits in an aria-hidden
// wrapper and is not focusable; the same skills are in the HUD lead and in
// the crawlable SeoContent. Pointer users can still play with it.

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { IconType } from 'react-icons'
import {
  SiReact, SiNextdotjs, SiTypescript, SiFlutter, SiWebrtc, SiNodedotjs, SiPostgresql,
} from 'react-icons/si'
import { TbBroadcast } from 'react-icons/tb'
import { skills as skillGroups } from '@/data/projects'

interface Skill {
  label: string
  Icon:  IconType
}

// Order = order around the ring (React arrives at the front first).
const CORE: Skill[] = [
  { label: 'React.js',   Icon: SiReact      },
  { label: 'Next.js',    Icon: SiNextdotjs  },
  { label: 'TypeScript', Icon: SiTypescript },
  { label: 'Flutter',    Icon: SiFlutter    },
  { label: 'WebRTC',     Icon: SiWebrtc     },
  { label: 'SignalR',    Icon: TbBroadcast  },
  { label: 'Node.js',    Icon: SiNodedotjs  },
  { label: 'PostgreSQL', Icon: SiPostgresql },
]
const KNOWN  = new Set(skillGroups.flatMap((g) => g.skills))
const SKILLS = CORE.filter((s) => KNOWN.has(s.label))

/** Tile size in CSS px and its depth scale range. TunnelScene sizes the ring
 *  from these, so they stay the single source of truth. Label 14px x 0.93 =
 *  13px at the back of the ring. */
export const SKILL_TILE = {
  width:    88,
  height:   76,
  label:    14,
  minScale: 0.93,
  maxScale: 1.1,
} as const

const SPIN_SPEED   = 0.11   // rad/s
const PROX_WINDOW  = 0.07   // station proximity window (scroll progress)
const STAGGER      = 0.04   // s per tile
const MIN_OPACITY  = 0.4
const FRONT_MS     = 600
const HISTORY_S    = 0.5

// Hover / press are CSS states, injected once; every value is a token.
const STYLE_ID = 'skill-tile-css'
const TILE_CSS = `
.skill-slot {
  will-change: opacity, transform;
}
.skill-tile {
  box-sizing: border-box;
  width: ${SKILL_TILE.width}px;
  height: ${SKILL_TILE.height}px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 6px;
  border-radius: 12px;
  border: 1px solid rgb(var(--line));
  background: rgb(var(--surface) / 0.9);
  color: rgb(var(--ink));
  font-family: var(--font-body), system-ui, sans-serif;
  font-size: ${SKILL_TILE.label}px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.005em;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  box-shadow: 0 12px 28px -16px rgb(var(--space-0) / 0.9);
  transition:
    border-color var(--dur-1) var(--ease-out),
    transform 80ms var(--ease-out);
}
.skill-tile svg {
  flex: none;
  color: rgb(var(--ink-2));
  transition: color var(--dur-1) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .skill-tile:hover { border-color: rgb(var(--accent)); }
  .skill-tile:hover svg { color: rgb(var(--accent)); }
}
.skill-tile:active {
  transform: scale(0.97);
}
@media (prefers-reduced-motion: reduce) {
  .skill-tile, .skill-tile svg { transition: none; }
}
`

function useTileStyles() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ID
      document.head.appendChild(el)
    }
    // Rewrite on mount so a hot reload or an older copy never lingers.
    if (el.textContent !== TILE_CSS) el.textContent = TILE_CSS
  }, [])
}

const smooth01 = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
// --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1) is easeInOutCubic.
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const TAU = Math.PI * 2

export interface SkillsOrbitProps {
  stationT?: number
  motion?:   number
  /** ring radius in world units (TunnelScene's layout) */
  radius?:   number
  /** ring tilt (Euler XYZ) so the camera sees it at the planned elevation */
  tilt?:     [number, number, number]
  /** asks the render driver for full-rate frames while the orbit animates */
  onActive?: (ms?: number) => void
}

export function SkillsOrbit({
  stationT = 0.35,
  motion = 1,
  radius = 4.5,
  tilt = [0.6, 0, -0.05],
  onActive,
}: SkillsOrbitProps) {
  useTileStyles()

  const tiltRef    = useRef<THREE.Group>(null)
  const spinRef    = useRef<THREE.Group>(null)
  const cardGroups = useRef<(THREE.Group | null)[]>([])
  const slotEls    = useRef<(HTMLDivElement | null)[]>([])
  const liveRef    = useRef<boolean[]>([])
  const shownRef   = useRef<boolean[]>([])
  const lastOp     = useRef<number[]>([])
  const lastScale  = useRef<number[]>([])
  const tmpVec     = useMemo(() => new THREE.Vector3(), [])
  const camLocal   = useMemo(() => new THREE.Vector3(), [])
  const depths     = useMemo(() => new Float32Array(SKILLS.length), [])

  // Motion state (refs: nothing here re-renders React).
  const hovered    = useRef(-1)
  const spinK      = useRef(motion > 0 ? 1 : 0)        // 0 paused .. 1 spinning
  const tween      = useRef<{ from: number; to: number; start: number } | null>(null)
  const pendingTo  = useRef<number | null>(null)       // click target, resolved in the frame loop
  const primed     = useRef(false)
  const history    = useRef<{ t: number; p: number }[]>([])
  const lastChange = useRef(-Infinity)
  const motionRef  = useRef(motion)
  useEffect(() => { motionRef.current = motion }, [motion])

  // Azimuth (in the tilted ring's own frame) that faces a world point.
  const azimuthOf = (world: THREE.Vector3) => {
    const g = tiltRef.current
    if (!g) return 0
    g.updateWorldMatrix(true, false)
    g.worldToLocal(camLocal.copy(world))
    return Math.atan2(camLocal.z, camLocal.x)
  }
  // Where the camera rests at the station: the station anchor's origin
  // (tilt group → offset group → anchor).
  const restAzimuth = () => {
    const anchor = tiltRef.current?.parent?.parent
    if (!anchor) return 0
    return azimuthOf(anchor.getWorldPosition(tmpVec))
  }

  useFrame(({ camera, clock }, delta) => {
    const spin = spinRef.current
    if (!spin) return
    const now = clock.elapsedTime
    const dt  = Math.min(delta, 0.25)

    // First frame: start with React.js just before the front, so the lead's
    // "React and Next.js" arrive at the front first.
    if (!primed.current) {
      primed.current = true
      spin.rotation.y = 0 - restAzimuth() - 0.35
    }

    // Click → bring that tile to the front along the shortest arc.
    if (pendingTo.current !== null) {
      const i   = pendingTo.current
      pendingTo.current = null
      const cur = spin.rotation.y
      let to    = (i / SKILLS.length) * TAU - azimuthOf(camera.position)
      to = cur + ((((to - cur) % TAU) + TAU + Math.PI) % TAU) - Math.PI
      if (motionRef.current === 0 || Math.abs(to - cur) < 1e-3) {
        spin.rotation.y = to
        tween.current = null
      } else {
        tween.current = { from: cur, to, start: now }
      }
    }

    let busy = false
    if (tween.current) {
      const k = Math.min(1, ((now - tween.current.start) * 1000) / FRONT_MS)
      spin.rotation.y = tween.current.from + (tween.current.to - tween.current.from) * easeInOutCubic(k)
      if (k >= 1) tween.current = null
      busy = true
    }

    // Presence: scroll proximity to the station, then a per-tile delay.
    const scroll    = (window as unknown as { __scrollRef?: { current: number } }).__scrollRef?.current ?? 0
    const proximity = Math.max(0, 1 - Math.abs(scroll - stationT) / PROX_WINDOW)
    const presence  = smooth01(0.05, 0.35, proximity)
    const hist = history.current
    const prev = hist.length ? hist[hist.length - 1].p : -1
    if (Math.abs(presence - prev) > 1e-4) lastChange.current = now
    hist.push({ t: now, p: presence })
    while (hist.length > 2 && hist[1].t < now - HISTORY_S) hist.shift()
    if (now - lastChange.current < STAGGER * SKILLS.length + 0.1) busy = true

    // Ambient spin: only while visible, eased to a stop while a tile is hovered.
    const wantK = motionRef.current > 0 && hovered.current < 0 ? 1 : 0
    spinK.current = THREE.MathUtils.damp(spinK.current, wantK, 9, dt)
    if (Math.abs(spinK.current - wantK) < 1e-3) spinK.current = wantK
    else busy = true
    if (!tween.current && presence > 0) spin.rotation.y += dt * SPIN_SPEED * spinK.current

    // Depth in camera space: view-space z is negative in front, so the
    // largest z is the nearest tile.
    let nearest = -Infinity
    for (let i = 0; i < SKILLS.length; i++) {
      const g = cardGroups.current[i]
      if (!g) { depths[i] = -Infinity; continue }
      g.getWorldPosition(tmpVec).applyMatrix4(camera.matrixWorldInverse)
      depths[i] = tmpVec.z
      if (tmpVec.z > nearest) nearest = tmpVec.z
    }

    for (let i = 0; i < SKILLS.length; i++) {
      const el = slotEls.current[i]
      if (!el) continue
      // Delayed presence for this tile (reduced motion: no stagger).
      const at = motionRef.current > 0 ? now - i * STAGGER : now
      let p = hist[0].p
      for (let h = hist.length - 1; h >= 0; h--) {
        if (hist[h].t <= at) { p = hist[h].p; break }
      }
      const depthT  = Math.max(0, Math.min(1, (depths[i] - (nearest - 2 * radius)) / (2 * radius)))
      const opacity = p * (MIN_OPACITY + (1 - MIN_OPACITY) * Math.pow(depthT, 1.4))
      const scale   = SKILL_TILE.minScale + (SKILL_TILE.maxScale - SKILL_TILE.minScale) * depthT
      if (Math.abs(opacity - (lastOp.current[i] ?? -1)) > 0.002) {
        lastOp.current[i] = opacity
        el.style.opacity = opacity.toFixed(3)
      }
      if (Math.abs(scale - (lastScale.current[i] ?? -1)) > 0.001) {
        lastScale.current[i] = scale
        el.style.transform = `scale(${scale.toFixed(3)})`
      }
      const shown = p > 0.001
      if (shown !== shownRef.current[i]) {
        shownRef.current[i] = shown
        el.style.visibility = shown ? 'visible' : 'hidden'
      }
      const live = p > 0.6
      if (live !== liveRef.current[i]) {
        liveRef.current[i] = live
        el.style.pointerEvents = live ? 'auto' : 'none'
        // A tile that stops taking the pointer can no longer report a leave.
        if (!live && hovered.current === i) hovered.current = -1
      }
    }

    if (busy) onActive?.(150)
  })

  const bringToFront = (i: number) => {
    pendingTo.current = i
    onActive?.(FRONT_MS + 200)
  }

  return (
    <group ref={tiltRef} rotation={tilt}>
      <group ref={spinRef}>
        {SKILLS.map((skill, i) => {
          const angle = (i / SKILLS.length) * TAU
          const Icon  = skill.Icon
          return (
            <group
              key={skill.label}
              ref={(g) => { cardGroups.current[i] = g }}
              position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            >
              <Html center zIndexRange={[40, 0]}>
                <div
                  ref={(el) => { slotEls.current[i] = el }}
                  className="skill-slot"
                  aria-hidden="true"
                  style={{ opacity: 0, visibility: 'hidden', pointerEvents: 'none' }}
                >
                  {/* A plain div: never focusable, so a click cannot move
                      focus into the aria-hidden orbit. */}
                  <div
                    className="skill-tile"
                    onClick={(e) => { e.stopPropagation(); bringToFront(i) }}
                    onPointerEnter={() => { hovered.current = i; onActive?.(300) }}
                    onPointerLeave={() => { if (hovered.current === i) hovered.current = -1; onActive?.(300) }}
                  >
                    <Icon size={24} aria-hidden="true" focusable="false" />
                    <span>{skill.label}</span>
                  </div>
                </div>
              </Html>
            </group>
          )
        })}
      </group>
    </group>
  )
}
