'use client'

// SkillsOrbit — 16 glassmorphic DOM cards orbiting the SKILLS planet.
// Auto-rotates on Y axis with a gentle per-card vertical bob.
// Click on ANY card → GSAP power3.out spin (one full revolution) of the ring.
// No drag, no active state, no scale changes — just the spin reaction.

import { useRef } from 'react'
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
  color: string
  Icon:  IconType
}

const SKILLS: Skill[] = [
  { label: 'React',      color: '#61DAFB', Icon: SiReact      },
  { label: 'Next.js',    color: '#ffffff', Icon: SiNextdotjs  },
  { label: 'TypeScript', color: '#3178C6', Icon: SiTypescript },
  { label: 'Flutter',    color: '#54C5F8', Icon: SiFlutter    },
  { label: 'WebRTC',     color: '#FF6B35', Icon: SiWebrtc     },
  { label: 'Three.js',   color: '#00ffff', Icon: SiThreedotjs },
  { label: 'Node.js',    color: '#68A063', Icon: SiNodedotjs  },
  { label: 'Tailwind',   color: '#38BDF8', Icon: SiTailwindcss},
  { label: 'Redux',      color: '#764ABC', Icon: SiRedux      },
  { label: 'MongoDB',    color: '#47A248', Icon: SiMongodb    },
  { label: 'Figma',      color: '#F24E1E', Icon: SiFigma      },
  { label: 'Docker',     color: '#2496ED', Icon: SiDocker     },
  { label: 'Git',        color: '#F05032', Icon: SiGit        },
  { label: 'Firebase',   color: '#FFCA28', Icon: SiFirebase   },
  { label: 'SignalR',    color: '#FF4081', Icon: TbBroadcast  },
  { label: 'GSAP',       color: '#88CE02', Icon: SiGreensock  },
]

const RADIUS = 3.2

export function SkillsOrbit({ stationT = 0.55 }: { stationT?: number }) {
  const groupRef     = useRef<THREE.Group>(null)
  const tweeningRef  = useRef(false)
  const cardGroups   = useRef<(THREE.Group | null)[]>([])
  const cardEls      = useRef<(HTMLDivElement | null)[]>([])
  const tmpVec       = useRef(new THREE.Vector3()).current

  useFrame(({ clock, camera }) => {
    if (!groupRef.current) return
    if (!tweeningRef.current) {
      groupRef.current.rotation.y += 0.003
    }
    const t = clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      const ud = child.userData as { baseY?: number }
      if (ud.baseY === undefined) ud.baseY = child.position.y
      child.position.y = ud.baseY + Math.sin(t + i * 0.5) * 0.12
    })

    // Proximity + per-card depth fade — mirrors ProjectTiles behaviour so
    // skill cards appear/disappear the same way project cards do.
    const scroll      = (typeof window !== 'undefined'
      ? (window as unknown as { __scrollRef?: { current: number } }).__scrollRef?.current ?? 0
      : 0)
    const dist        = Math.abs(scroll - stationT)
    const proximity   = Math.max(0, 1 - dist / 0.07)
    // Steep curve with a floor — once inside the band cards quickly read as
    // solid (no long "skeleton" mid-fade), but outside the band they vanish.
    const baseOpacity = proximity > 0.05 ? Math.max(0.85, Math.pow(proximity, 1.6)) : 0

    let bestZ = -Infinity
    const cardZs = cardGroups.current.map(g => {
      if (!g) return -Infinity
      g.getWorldPosition(tmpVec)
      return tmpVec.z
    })
    for (let i = 0; i < cardZs.length; i++) if (cardZs[i] > bestZ) bestZ = cardZs[i]

    for (let i = 0; i < cardEls.current.length; i++) {
      const el = cardEls.current[i]
      if (!el) continue
      const depthT      = Math.max(0, Math.min(1, (cardZs[i] - (bestZ - 2 * RADIUS)) / (2 * RADIUS)))
      const depthFade   = Math.pow(depthT, 2.2)
      const cardOpacity = baseOpacity * depthFade
      el.style.opacity       = cardOpacity.toFixed(3)
      el.style.pointerEvents = cardOpacity > 0.35 ? 'auto' : 'none'
    }
  })

  const triggerSpin = () => {
    if (!groupRef.current || tweeningRef.current) return
    tweeningRef.current = true
    const cur = groupRef.current.rotation.y
    gsap.to(groupRef.current.rotation, {
      y:        cur + Math.PI * 2,
      duration: 0.9,
      ease:     'power3.out',
      onComplete: () => { tweeningRef.current = false },
    })
  }

  return (
    <group ref={groupRef}>
      {SKILLS.map((skill, i) => {
        const angle = (i / SKILLS.length) * Math.PI * 2
        const baseY = Math.sin(i * 0.9) * 0.9
        return (
          <group
            key={skill.label}
            ref={(g) => { cardGroups.current[i] = g }}
            position={[Math.cos(angle) * RADIUS, baseY, Math.sin(angle) * RADIUS]}
          >
            <Html center distanceFactor={6} zIndexRange={[40, 0]}>
              <div
                ref={(el) => { cardEls.current[i] = el }}
                style={{ opacity: 0, transition: 'opacity 140ms linear' }}
              >
                <SkillCard skill={skill} onClick={triggerSpin} />
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

function SkillCard({ skill, onClick }: { skill: Skill; onClick: () => void }) {
  const Icon = skill.Icon
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick() }}
      style={{
        width:                92,
        height:               92,
        borderRadius:         20,
        background: `
          linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.02) 100%),
          linear-gradient(180deg, rgb(14,18,32) 0%, rgb(8,10,20) 100%)
        `,
        backdropFilter:       'blur(14px) saturate(160%)',
        WebkitBackdropFilter: 'blur(14px) saturate(160%)',
        border:               `1.5px solid ${skill.color}66`,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.14),
          inset 0 -1px 0 rgba(0,0,0,0.30),
          0 10px 28px rgba(0,0,0,0.50),
          0 0 28px ${skill.color}33
        `,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            6,
        fontFamily:     'var(--font-mono), ui-monospace, "SF Mono", monospace',
        userSelect:     'none',
        cursor:         'pointer',
        transition:     'transform 220ms cubic-bezier(0.16,1,0.3,1), box-shadow 240ms ease-out',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      <Icon
        size={34}
        color={skill.color}
        style={{ filter: `drop-shadow(0 0 6px ${skill.color}aa)` }}
      />
      <span style={{
        fontSize:      10,
        fontWeight:    700,
        color:         '#ffffff',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        textShadow:    `0 0 8px ${skill.color}88`,
      }}>
        {skill.label}
      </span>
    </div>
  )
}
