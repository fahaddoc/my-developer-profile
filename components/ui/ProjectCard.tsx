'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import type { Project } from '@/data/projects'

interface ProjectCardProps {
  project: Project
  index:   number
  onClick: (project: Project) => void
}

export function ProjectCard({ project, index, onClick }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const [tiltEnabled, setTiltEnabled] = useState(true)

  // disable tilt on touch devices — useless and slightly janky on mobile
  useEffect(() => {
    const noHover = window.matchMedia('(hover: none)').matches
    if (noHover) setTiltEnabled(false)
  }, [])

  const cardRef = useRef<HTMLDivElement>(null)

  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 120, damping: 16 })
  const springY = useSpring(mouseY, { stiffness: 120, damping: 16 })

  // tilt range: ±10 degrees — strong enough to feel 3D, not so much it looks broken
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7])

  // image parallax inside card — moves opposite to tilt direction (depth effect)
  const imgX = useTransform(springX, [-0.5, 0.5], ['4%', '-4%'])
  const imgY = useTransform(springY, [-0.5, 0.5], ['3%', '-3%'])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled) return
    const r = e.currentTarget.getBoundingClientRect()
    mouseX.set((e.clientX - r.left) / r.width  - 0.5)
    mouseY.set((e.clientY - r.top)  / r.height - 0.5)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
    setHovered(false)
  }

  return (
    <motion.div
      // stagger reveal — each card delays slightly based on its index
      initial={{ opacity: 0, y: 50, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="cursor-pointer"
      onClick={() => onClick(project)}
    >
      {/* the actual tilt card */}
      <motion.div
        ref={cardRef}
        style={{
          rotateY:        tiltEnabled ? rotateY : 0,
          rotateX:        tiltEnabled ? rotateX : 0,
          transformStyle: 'preserve-3d',
        }}
        className={`
          relative rounded-2xl overflow-hidden
          border transition-all duration-300
          ${hovered
            ? 'border-accent-violet/50 shadow-card-hover'
            : 'border-accent-violet/12'
          }
          bg-bg-surface
        `}
      >
        {/* image section */}
        <div className="relative aspect-video overflow-hidden bg-bg-elevated">
          <motion.div
            style={{
              x: tiltEnabled ? imgX : 0,
              y: tiltEnabled ? imgY : 0,
              // scale slightly bigger so parallax shift doesn't expose edges
              scale: 1.12,
            }}
            className="absolute inset-0"
          >
            <Image
              src={project.image}
              alt={project.title}
              fill
              className={`object-cover transition-transform duration-500 ${hovered ? 'scale-105' : 'scale-100'}`}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </motion.div>

          {/* hover overlay — cyan tint instead of violet for a different feel on cards */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}
            style={{ background: 'rgba(34, 211, 238, 0.55)' }}
          >
            <span className="text-white font-medium text-sm flex items-center gap-2">
              View Case Study
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </span>
          </div>

          {/* neon flicker on image edge when hovered */}
          {hovered && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 30px rgba(168, 85, 247, 0.2)' }}
            />
          )}
        </div>

        {/* card body */}
        <div className="p-6 flex flex-col gap-3">
          <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">
            {project.company}
          </span>

          {/* title lifts slightly on hover — translateZ gives it a floating feel */}
          <motion.h3
            style={{ z: hovered ? 20 : 0, transformStyle: 'preserve-3d' }}
            transition={{ duration: 0.2 }}
            className="font-display font-bold text-xl text-text-primary leading-snug"
          >
            {project.title}
          </motion.h3>

          <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">
            {project.description}
          </p>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {project.tech.slice(0, 4).map(t => (
              <span
                key={t}
                className="px-2 py-0.5 text-xs font-mono rounded-full bg-accent-violet/10 border border-accent-violet/20 text-text-secondary"
              >
                {t}
              </span>
            ))}
          </div>

          <p className={`mt-2 text-sm font-medium transition-colors duration-200 ${hovered ? 'text-accent-cyan' : 'text-accent-violet'}`}>
            View Case Study →
          </p>
        </div>

        {/* bottom neon line — appears on hover, sweeps across */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px transition-all duration-300"
          style={{
            background: hovered
              ? 'linear-gradient(90deg, transparent, rgba(168,85,247,0.8), rgba(34,211,238,0.8), transparent)'
              : 'transparent',
          }}
        />
      </motion.div>
    </motion.div>
  )
}
