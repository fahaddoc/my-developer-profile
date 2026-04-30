// components/ui/ProjectModal.tsx
'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SkillBadge } from '@/components/ui/SkillBadge'
import { lenisInstance } from '@/components/providers/SmoothScroll'
import type { Project } from '@/data/projects'

interface ProjectModalProps {
  project: Project | null
  onClose: () => void
}

// ── tiny label + text section reused throughout body ─────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'monospace',
      fontSize: 10,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#a855f7',
      textShadow: '0 0 8px rgba(168,85,247,0.55)',
    }}>
      {children}
    </p>
  )
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <SectionLabel>{label}</SectionLabel>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(203,213,225,0.78)', margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Escape key
  useEffect(() => {
    if (!project) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [project, onClose])

  // Freeze all scrolling while modal is open.
  // Must stop Lenis (JS-level smooth scroll) — body overflow:hidden alone
  // has no effect on Lenis because it intercepts wheel events in JS, not CSS.
  useEffect(() => {
    if (project) {
      lenisInstance?.stop()
      document.body.style.overflow = 'hidden'
    } else {
      lenisInstance?.start()
      document.body.style.overflow = ''
    }
    return () => {
      lenisInstance?.start()
      document.body.style.overflow = ''
    }
  }, [project])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {project && (
        // ── Full-screen fixed overlay ──────────────────────────────────────
        <motion.div
          key="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            zIndex: 9999,
          }}
          role="dialog"
          aria-modal="true"
          aria-label={project.title}
        >
          {/* Dark backdrop */}
          <div
            onClick={onClose}
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.88)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />

          {/* ── Panel ── CRITICAL: explicit height + flex-col for scroll ── */}
          <motion.article
            initial={{ opacity: 0, scale: 0.93, y: 30 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0,  scale: 0.93, y: 30 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              zIndex: 10000,
              width: '100%',
              maxWidth: 672,
              // Fixed height budget — percentage of viewport
              height: 'min(88vh, 760px)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 16,
              overflow: 'hidden',           // clip image + rounded corners
              background: '#0b0b18',
              border: '1px solid rgba(139,92,246,0.35)',
              boxShadow: '0 0 0 1px rgba(139,92,246,0.08), 0 32px 80px rgba(0,0,0,0.75), 0 0 50px rgba(139,92,246,0.07)',
            }}
          >

            {/* ── IMAGE BANNER — fixed 200px, never shrinks ────────────── */}
            <div style={{ position: 'relative', flexShrink: 0, height: 200 }}>
              <Image
                src={project.image}
                alt={`${project.title} — ${project.tagline}`}
                fill
                style={{ objectFit: 'cover', objectPosition: 'top' }}
                sizes="(max-width: 768px) 100vw, 672px"
                priority
              />

              {/* Gradient so title text is legible */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, rgba(11,11,24,0.15) 0%, rgba(11,11,24,0.9) 100%)',
              }} />

              {/* Title overlaid on image */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 24px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.14em',
                    textTransform: 'uppercase', color: '#22d3ee',
                    textShadow: '0 0 10px rgba(34,211,238,0.7)',
                  }}>
                    {project.company}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.38)' }}>
                    · {project.year}
                  </span>
                </div>
                <h2 style={{
                  margin: 0,
                  fontWeight: 700, fontSize: 'clamp(16px,3vw,22px)',
                  color: '#fff',
                  lineHeight: 1.25,
                  textShadow: '0 2px 16px rgba(0,0,0,0.9)',
                }}>
                  {project.title}
                </h2>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  position: 'absolute', top: 12, right: 12,
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(255,255,255,0.75)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => {
                  const b = e.currentTarget
                  b.style.borderColor = 'rgba(168,85,247,0.65)'
                  b.style.color = '#fff'
                  b.style.background = 'rgba(139,92,246,0.25)'
                }}
                onMouseLeave={e => {
                  const b = e.currentTarget
                  b.style.borderColor = 'rgba(255,255,255,0.18)'
                  b.style.color = 'rgba(255,255,255,0.75)'
                  b.style.background = 'rgba(0,0,0,0.6)'
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── SCROLLABLE BODY — takes remaining height ──────────────── */}
            {/* minHeight:0 is mandatory for flex children to scroll in all browsers */}
            {/* data-lenis-prevent: tells Lenis to skip preventDefault() on wheel events
                that pass through this element — without it Lenis calls preventDefault()
                even when stopped, which kills native overflow scroll entirely */}
            <div data-lenis-prevent style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>

              {/* custom thin neon scrollbar */}
              <style>{`
                .modal-body::-webkit-scrollbar { width: 4px }
                .modal-body::-webkit-scrollbar-track { background: rgba(139,92,246,0.05) }
                .modal-body::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.35); border-radius: 4px }
                .modal-body::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.6) }
              `}</style>

              <div
                className="modal-body"
                style={{
                  height: '100%', overflowY: 'auto',
                  padding: '24px 24px 32px',
                  display: 'flex', flexDirection: 'column', gap: 20,
                }}
              >
                {/* Short description */}
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'rgba(203,213,225,0.72)' }}>
                  {project.description}
                </p>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(139,92,246,0.12)' }} />

                {/* Problem */}
                <Section label="Problem" text={project.problem} />

                {/* Solution */}
                <Section label="Solution & Approach" text={project.solution} />

                {/* Key Features */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <SectionLabel>Key Features</SectionLabel>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {project.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{
                          marginTop: 6, flexShrink: 0,
                          width: 5, height: 5, borderRadius: '50%',
                          background: '#a855f7',
                          boxShadow: '0 0 6px rgba(168,85,247,0.6)',
                          display: 'inline-block',
                        }} />
                        <span style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(203,213,225,0.75)' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tech Stack */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <SectionLabel>Tech Stack</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {project.tech.map(t => (
                      <SkillBadge key={t} label={t} />
                    ))}
                  </div>
                </div>

                {/* Links */}
                {(project.liveUrl || project.githubUrl) && (
                  <div style={{
                    display: 'flex', gap: 12,
                    paddingTop: 20,
                    borderTop: '1px solid rgba(139,92,246,0.14)',
                  }}>
                    {project.githubUrl && (
                      <LinkButton
                        href={project.githubUrl}
                        variant="violet"
                        icon={
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                          </svg>
                        }
                      >
                        GitHub
                      </LinkButton>
                    )}
                    {project.liveUrl && (
                      <LinkButton
                        href={project.liveUrl}
                        variant="cyan"
                        icon={
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                          </svg>
                        }
                      >
                        Live Demo
                      </LinkButton>
                    )}
                  </div>
                )}

              </div>
            </div>

          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Link button used for GitHub / Live Demo ───────────────────────────────────
function LinkButton({
  href, children, icon, variant,
}: {
  href: string
  children: React.ReactNode
  icon: React.ReactNode
  variant: 'violet' | 'cyan'
}) {
  const c = variant === 'cyan' ? '34,211,238' : '168,85,247'
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px',
        borderRadius: 8,
        fontFamily: 'monospace', fontSize: 13,
        color: `rgba(${c},0.9)`,
        background: `rgba(${c},0.07)`,
        border: `1px solid rgba(${c},0.28)`,
        textDecoration: 'none',
        transition: 'all 0.18s',
      }}
      onMouseEnter={e => {
        const a = e.currentTarget as HTMLAnchorElement
        a.style.borderColor = `rgba(${c},0.65)`
        a.style.background  = `rgba(${c},0.12)`
        a.style.boxShadow   = `0 0 14px rgba(${c},0.18)`
      }}
      onMouseLeave={e => {
        const a = e.currentTarget as HTMLAnchorElement
        a.style.borderColor = `rgba(${c},0.28)`
        a.style.background  = `rgba(${c},0.07)`
        a.style.boxShadow   = ''
      }}
    >
      {icon}
      {children}
    </a>
  )
}
