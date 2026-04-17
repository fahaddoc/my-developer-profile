'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useAnimation, AnimatePresence } from 'framer-motion'
import type { Project } from '@/data/projects'

interface ProjectCardProps {
  project: Project
  index:   number
  onClick: (project: Project) => void
}

export function ProjectCard({ project, index, onClick }: ProjectCardProps) {
  const [hovered, setHovered] = useState(false)
  const [tiltEnabled, setTiltEnabled] = useState(true)
  const shakeControls = useAnimation()

  useEffect(() => {
    const noHover = window.matchMedia('(hover: none)').matches
    if (noHover) setTiltEnabled(false)
  }, [])

  // Arcade shake on hover enter
  useEffect(() => {
    if (hovered) {
      shakeControls.start({
        x: [0, -5, 5, -4, 4, -2, 2, 0],
        transition: { duration: 0.38, ease: 'easeInOut' },
      })
    }
  }, [hovered, shakeControls])

  const cardRef = useRef<HTMLDivElement>(null)

  const mouseX  = useMotionValue(0)
  const mouseY  = useMotionValue(0)
  const springX = useSpring(mouseX, { stiffness: 120, damping: 16 })
  const springY = useSpring(mouseY, { stiffness: 120, damping: 16 })

  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10])
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7])

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
      {/* shake wrapper — isolated from whileInView so they don't conflict */}
      <motion.div animate={shakeControls}>

        {/* tilt card */}
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
              ? 'border-accent-cyan/60 shadow-[0_0_28px_rgba(34,211,238,0.22),0_0_60px_rgba(34,211,238,0.08)]'
              : 'border-accent-violet/12'
            }
            bg-bg-surface
          `}
        >

          {/* ── image section ─────────────────────────────────── */}
          <div className="relative aspect-video overflow-hidden bg-bg-elevated">
            <motion.div
              style={{
                x: tiltEnabled ? imgX : 0,
                y: tiltEnabled ? imgY : 0,
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

            {/* ── INSERT COIN arcade overlay ─────────────────── */}
            <AnimatePresence>
              {hovered && (
                <motion.div
                  key="arcade-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: 'rgba(0,8,16,0.78)' }}
                >
                  {/* static CRT scanlines */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,200,0.035) 2px, rgba(0,255,200,0.035) 4px)',
                    }}
                  />

                  {/* sweeping scan beam */}
                  <motion.div
                    className="absolute left-0 right-0 pointer-events-none"
                    style={{
                      height: 3,
                      background: 'linear-gradient(90deg, transparent, rgba(34,211,238,0.55), transparent)',
                      boxShadow: '0 0 12px rgba(34,211,238,0.7)',
                    }}
                    initial={{ top: '-2%' }}
                    animate={{ top: '102%' }}
                    transition={{ duration: 1.4, ease: 'linear', repeat: Infinity }}
                  />

                  {/* INSERT COIN text */}
                  <div className="relative z-10 text-center select-none px-4">
                    <motion.p
                      className="font-mono text-sm font-bold tracking-[0.25em] uppercase"
                      style={{
                        color: '#22d3ee',
                        textShadow: '0 0 10px rgba(34,211,238,1), 0 0 22px rgba(34,211,238,0.6)',
                      }}
                      animate={{ opacity: [1, 0.15, 1] }}
                      transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      ▶ INSERT COIN ◀
                    </motion.p>
                    <p
                      className="mt-1.5 font-mono text-[10px] tracking-[0.3em] uppercase"
                      style={{ color: 'rgba(34,211,238,0.5)' }}
                    >
                      1 CREDIT · PRESS TO PLAY
                    </p>

                    {/* fake score display */}
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <span className="font-mono text-[9px] tracking-widest" style={{ color: 'rgba(168,85,247,0.7)' }}>
                        HI-SCORE
                      </span>
                      <span
                        className="font-mono text-xs font-bold"
                        style={{ color: '#a855f7', textShadow: '0 0 8px rgba(168,85,247,0.8)' }}
                      >
                        {String(project.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 137 % 90000 + 10000)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CRT vignette on hover */}
            {hovered && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), inset 0 0 12px rgba(34,211,238,0.12)',
                }}
              />
            )}
          </div>

          {/* ── card body ─────────────────────────────────────── */}
          <div className="p-6 flex flex-col gap-3">
            <span className="font-mono text-xs text-accent-cyan uppercase tracking-widest">
              {project.company}
            </span>

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

            <p className={`mt-2 text-sm font-medium font-mono transition-colors duration-200 ${hovered ? 'text-accent-cyan' : 'text-accent-violet'}`}>
              {hovered ? '▶ PLAY NOW →' : 'View Case Study →'}
            </p>
          </div>

          {/* ── coin slot at bottom ────────────────────────────── */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
            <motion.div
              style={{ width: 40, height: 3, borderRadius: '2px 2px 0 0' }}
              animate={hovered ? {
                backgroundColor: ['rgba(34,211,238,0.1)', 'rgba(34,211,238,0.85)', 'rgba(34,211,238,0.4)'],
                boxShadow: ['0 0 0px rgba(34,211,238,0)', '0 0 18px rgba(34,211,238,1)', '0 0 8px rgba(34,211,238,0.5)'],
              } : {
                backgroundColor: 'rgba(34,211,238,0)',
                boxShadow: '0 0 0px rgba(34,211,238,0)',
              }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>

          {/* bottom neon line — cyan arcade on hover */}
          <div
            className="absolute bottom-0 left-0 right-0 h-px transition-all duration-300"
            style={{
              background: hovered
                ? 'linear-gradient(90deg, transparent, rgba(34,211,238,0.9), rgba(34,211,238,0.9), transparent)'
                : 'transparent',
            }}
          />

        </motion.div>
      </motion.div>
    </motion.div>
  )
}
