'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface Skill { label: string; color: string; emoji: string }

const SKILLS: Skill[] = [
  { label: 'React',      color: '#61DAFB', emoji: '⚛️'  },
  { label: 'Next.js',    color: '#ffffff', emoji: '▲'   },
  { label: 'TypeScript', color: '#3178C6', emoji: 'TS'  },
  { label: 'Flutter',    color: '#54C5F8', emoji: '🦋'  },
  { label: 'WebRTC',     color: '#FF6B35', emoji: '📡'  },
  { label: 'Three.js',   color: '#00ffff', emoji: '3D'  },
  { label: 'Node.js',    color: '#68A063', emoji: '⬡'   },
  { label: 'Tailwind',   color: '#38BDF8', emoji: '💨'  },
  { label: 'Redux',      color: '#764ABC', emoji: 'RX'  },
  { label: 'MongoDB',    color: '#47A248', emoji: '🍃'  },
  { label: 'Figma',      color: '#F24E1E', emoji: '✦'   },
  { label: 'Docker',     color: '#2496ED', emoji: '🐳'  },
  { label: 'Git',        color: '#F05032', emoji: 'GIT' },
  { label: 'Firebase',   color: '#FFCA28', emoji: '🔥'  },
  { label: 'SignalR',    color: '#FF4081', emoji: 'SIG' },
  { label: 'GSAP',       color: '#88CE02', emoji: 'GS'  },
]

function makeTexture(label: string, color: string, emoji: string): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Fully opaque dark fill across the whole canvas — guarantees the sprite
  // can't be tinted by whatever (nebula, etc.) is behind it.
  ctx.fillStyle = '#0e0e1a'
  ctx.fillRect(0, 0, size, size)

  // Rounded panel on top (slightly inset) — the only purpose is the
  // colored border. Same dark fill so the corners stay dark, not transparent.
  ctx.fillStyle = '#0e0e1a'
  ctx.beginPath()
  ctx.roundRect(8, 8, size - 16, size - 16, 28)
  ctx.fill()

  // Border
  ctx.strokeStyle = color
  ctx.lineWidth   = 5
  ctx.beginPath()
  ctx.roundRect(8, 8, size - 16, size - 16, 28)
  ctx.stroke()

  // Emoji / glyph — large, top half
  ctx.font         = 'bold 96px "Apple Color Emoji","Segoe UI Emoji",Arial,sans-serif'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle    = '#ffffff'
  ctx.fillText(emoji, size / 2, size / 2 - 20)

  // Label — bottom
  ctx.font         = 'bold 28px ui-monospace, "SF Mono", monospace'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle    = color
  ctx.fillText(label, size / 2, size - 36)

  const tex = new THREE.CanvasTexture(canvas)
  tex.anisotropy  = 8
  tex.needsUpdate = true
  return tex
}

export function SkillsOrbit() {
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!groupRef.current) return
    // clear any existing children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0])
    }

    const total  = SKILLS.length
    const RADIUS = 3.2 // outside planet (r=1.15), inside camera view

    SKILLS.forEach((skill, i) => {
      const angle   = (i / total) * Math.PI * 2
      const texture = makeTexture(skill.label, skill.color, skill.emoji)
      const mat     = new THREE.SpriteMaterial({
        map:         texture,
        transparent: true,
        depthTest:   false,
        depthWrite:  false,
        toneMapped:  false, // keep canvas colors crisp
        opacity:     1,
      })
      const sprite = new THREE.Sprite(mat)

      sprite.position.set(
        Math.cos(angle) * RADIUS,
        Math.sin(i * 0.9) * 0.9, // gentle y variation, deterministic
        Math.sin(angle) * RADIUS,
      )
      sprite.scale.set(0.95, 0.95, 1)
      sprite.renderOrder = 10 // render after planet + nebula
      groupRef.current!.add(sprite)
    })

    // eslint-disable-next-line no-console
    console.log('Skills sprites created:', groupRef.current.children.length)
  }, [])

  useFrame((state) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += 0.003
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((sprite, i) => {
      const s = sprite as THREE.Sprite
      // additive bob around base y (track base via userData)
      const ud = s.userData as { baseY?: number }
      if (ud.baseY === undefined) ud.baseY = s.position.y
      s.position.y = ud.baseY + Math.sin(t + i * 0.5) * 0.1
    })
  })

  return <group ref={groupRef} />
}
