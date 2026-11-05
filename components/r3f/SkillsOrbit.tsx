'use client'

// SkillsOrbit — 16 monochrome tiles on a tilted ring around the skills planet.
//
// Tiles are solid surface panels with a hairline, the logo in ink-2 and the
// name below it; hover/focus turns the logo and border ember. No glass, no
// glows, no brand colours: the orbit reads as one object, not a logo wall.
// The ring spins slowly (time-based, stops under reduced motion); clicking or
// pressing any tile spins it one full turn. Tiles fade with proximity to the
// station and with depth, so the back of the ring recedes.

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import type { IconType } from 'react-icons'
import {
  SiReact, SiNextdotjs, SiTypescript, SiFlutter, SiWebrtc, SiThreedotjs,
  SiNodedotjs, SiTailwindcss, SiRedux, SiMongodb, SiFigma, SiDocker, SiGit,
  SiFirebase, SiGreensock,
} from 'react-icons/si'
import { TbBroadcast } from 'react-icons/tb'

interface Skill {
  label: string
  Icon:  IconType
}

const SKILLS: Skill[] = [
  { label: 'React',      Icon: SiReact       },
  { label: 'Next.js',    Icon: SiNextdotjs   },
  { label: 'TypeScript', Icon: SiTypescript  },
  { label: 'Flutter',    Icon: SiFlutter     },
  { label: 'WebRTC',     Icon: SiWebrtc      },
  { label: 'Three.js',   Icon: SiThreedotjs  },
  { label: 'Node.js',    Icon: SiNodedotjs   },
  { label: 'Tailwind',   Icon: SiTailwindcss },
  { label: 'Redux',      Icon: SiRedux       },
  { label: 'MongoDB',    Icon: SiMongodb     },
  { label: 'Figma',      Icon: SiFigma       },
  { label: 'Docker',     Icon: SiDocker      },
  { label: 'Git',        Icon: SiGit         },
  { label: 'Firebase',   Icon: SiFirebase    },
  { label: 'SignalR',    Icon: TbBroadcast   },
  { label: 'GSAP',       Icon: SiGreensock   },
]

const RADIUS        = 3.1
const SPIN_SPEED    = 0.11            // rad/s (≈ the old 0.003 rad/frame at 36fps)
const RING_TILT: [number, number, number] = [0.34, 0, -0.1]
const PROX_WINDOW   = 0.07
// drei Html (non-transform) scale = distanceFactor / (2·tan(fov/2)·distance):
// 9.8 puts a front tile at ~1:1 CSS pixels when the camera sits at the station.
const DISTANCE_FACTOR = 9.8

// Hover / focus / press are real CSS states (keyboard and pointer get the same
// feedback). Injected once; every value is a token from globals.css.
const STYLE_ID = 'skill-tile-css'
const TILE_CSS = `
.skill-tile {
  width: 80px;
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgb(var(--line));
  background: rgb(var(--surface) / 0.85);
  color: rgb(var(--ink-2));
  font-family: var(--font-body), system-ui, sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.005em;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 10px 24px -14px rgb(var(--space-0) / 0.9);
  transition:
    border-color var(--dur-1) var(--ease-out),
    color var(--dur-1) var(--ease-out),
    transform var(--dur-1) var(--ease-out);
}
.skill-tile svg {
  color: rgb(var(--ink-2));
  transition: color var(--dur-1) var(--ease-out);
}
.skill-tile:hover,
.skill-tile:focus-visible {
  border-color: rgb(var(--accent));
  color: rgb(var(--ink));
}
.skill-tile:hover svg,
.skill-tile:focus-visible svg {
  color: rgb(var(--accent));
}
.skill-tile:focus-visible {
  outline: 2px solid rgb(var(--accent-text));
  outline-offset: 3px;
}
.skill-tile:active {
  transform: translateY(1px) scale(0.985);
}
@media (prefers-reduced-motion: reduce) {
  .skill-tile, .skill-tile svg { transition: none; }
  .skill-tile:active { transform: none; }
}
`

function useTileStyles() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = TILE_CSS
    document.head.appendChild(el)
  }, [])
}

export function SkillsOrbit({ stationT = 0.35, motion = 1 }: { stationT?: number; motion?: number }) {
  useTileStyles()

  const spinRef     = useRef<THREE.Group>(null)
  const tweeningRef = useRef(false)
  const cardGroups  = useRef<(THREE.Group | null)[]>([])
  const cardEls     = useRef<(HTMLDivElement | null)[]>([])
  const btnEls      = useRef<(HTMLButtonElement | null)[]>([])
  const liveRef     = useRef<boolean[]>([])
  const tmpVec      = useMemo(() => new THREE.Vector3(), [])
  const depths      = useMemo(() => new Float32Array(SKILLS.length), [])

  useFrame(({ camera }, delta) => {
    const spin = spinRef.current
    if (!spin) return
    if (!tweeningRef.current) spin.rotation.y += Math.min(delta, 0.25) * SPIN_SPEED * motion

    const scroll = (window as unknown as { __scrollRef?: { current: number } }).__scrollRef?.current ?? 0
    const proximity   = Math.max(0, 1 - Math.abs(scroll - stationT) / PROX_WINDOW)
    // Steep curve with a floor: inside the band the tiles read as solid, with
    // no long half-transparent mid-fade; outside it they vanish.
    const baseOpacity = proximity > 0.05 ? Math.max(0.85, Math.pow(proximity, 1.6)) : 0

    // Depth in camera space (works for any camera heading along the curve):
    // view-space z is negative in front, so the largest z is the nearest tile.
    let nearest = -Infinity
    for (let i = 0; i < SKILLS.length; i++) {
      const g = cardGroups.current[i]
      if (!g) { depths[i] = -Infinity; continue }
      g.getWorldPosition(tmpVec).applyMatrix4(camera.matrixWorldInverse)
      depths[i] = tmpVec.z
      if (tmpVec.z > nearest) nearest = tmpVec.z
    }

    for (let i = 0; i < SKILLS.length; i++) {
      const el = cardEls.current[i]
      if (!el) continue
      const depthT  = Math.max(0, Math.min(1, (depths[i] - (nearest - 2 * RADIUS)) / (2 * RADIUS)))
      const opacity = baseOpacity * Math.pow(depthT, 2.2)
      el.style.opacity = opacity.toFixed(3)
      const live = opacity > 0.35
      if (live !== liveRef.current[i]) {
        liveRef.current[i] = live
        el.style.pointerEvents = live ? 'auto' : 'none'
        const btn = btnEls.current[i]
        if (btn) btn.tabIndex = live ? 0 : -1
      }
    }
  })

  const triggerSpin = () => {
    const spin = spinRef.current
    if (!spin || tweeningRef.current || motion === 0) return
    tweeningRef.current = true
    gsap.to(spin.rotation, {
      y:        spin.rotation.y + Math.PI * 2,
      duration: 0.9,
      ease:     'power3.out',
      onComplete: () => { tweeningRef.current = false },
    })
  }

  return (
    <group rotation={RING_TILT}>
      <group ref={spinRef}>
        {SKILLS.map((skill, i) => {
          const angle = (i / SKILLS.length) * Math.PI * 2
          const Icon  = skill.Icon
          return (
            <group
              key={skill.label}
              ref={(g) => { cardGroups.current[i] = g }}
              position={[Math.cos(angle) * RADIUS, 0, Math.sin(angle) * RADIUS]}
            >
              <Html center distanceFactor={DISTANCE_FACTOR} zIndexRange={[40, 0]}>
                <div
                  ref={(el) => { cardEls.current[i] = el }}
                  style={{ opacity: 0, pointerEvents: 'none' }}
                >
                  <button
                    ref={(el) => { btnEls.current[i] = el }}
                    type="button"
                    className="skill-tile"
                    tabIndex={-1}
                    aria-label={`${skill.label}. Spin the skills orbit`}
                    onClick={(e) => { e.stopPropagation(); triggerSpin() }}
                  >
                    <Icon size={28} aria-hidden="true" />
                    <span>{skill.label}</span>
                  </button>
                </div>
              </Html>
            </group>
          )
        })}
      </group>
    </group>
  )
}
