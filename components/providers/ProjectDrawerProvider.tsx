'use client'

// ProjectDrawerProvider — floating holographic project info panel. Detached
// from the right edge, vertically centered, glassmorphic dark-cyan HUD. Slides
// from right with fade + subtle scale on desktop, slides up from bottom on
// mobile. Triggered by `useProjectDrawer().open(id)` or by the
// `project-drawer-open` window CustomEvent (for cross-bundle dynamic imports).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { projects, type Project } from '@/data/projects'
import { lenisInstance } from '@/components/providers/SmoothScroll'

interface DrawerContextValue {
  openProjectId: string | null
  open:  (id: string) => void
  close: () => void
}

const DrawerContext = createContext<DrawerContextValue>({
  openProjectId: null,
  open:  () => {},
  close: () => {},
})

export function useProjectDrawer() {
  return useContext(DrawerContext)
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
const ACCENT = '#5EEAD4'

export function ProjectDrawerProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const sync = () => setIsMobile(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  const open  = useCallback((id: string) => setOpenId(id), [])
  const close = useCallback(() => setOpenId(null), [])

  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, close])

  // Pause Lenis smooth-scroll while drawer open — otherwise wheel events
  // on the drawer panel bubble up and scroll the tunnel behind it.
  useEffect(() => {
    if (!openId) return
    lenisInstance?.stop?.()
    return () => { lenisInstance?.start?.() }
  }, [openId])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (typeof id === 'string') open(id)
    }
    window.addEventListener('project-drawer-open', onOpen as EventListener)
    return () => window.removeEventListener('project-drawer-open', onOpen as EventListener)
  }, [open])

  const project: Project | null = useMemo(
    () => (openId ? projects.find(p => p.id === openId) ?? null : null),
    [openId],
  )

  const ctx = useMemo<DrawerContextValue>(
    () => ({ openProjectId: openId, open, close }),
    [openId, open, close],
  )

  return (
    <DrawerContext.Provider value={ctx}>
      {children}
      {mounted && createPortal(
        <Panel project={project} onClose={close} isMobile={isMobile} />,
        document.body,
      )}
    </DrawerContext.Provider>
  )
}

function Panel({ project, onClose, isMobile }: {
  project: Project | null
  onClose: () => void
  isMobile: boolean
}) {
  return (
    <AnimatePresence>
      {project && (
        <>
          {/* Soft dim — doesn't fully cover scene, keeps cards visible */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 4, 10, 0.35)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              zIndex: 999,
              cursor: 'pointer',
            }}
          />

          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} — details`}
            data-lenis-prevent
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            initial={isMobile
              ? { y: '100%', opacity: 0 }
              : { x: 40, y: '-50%', opacity: 0, scale: 0.97 }}
            animate={isMobile
              ? { y: 0, opacity: 1 }
              : { x: 0, y: '-50%', opacity: 1, scale: 1 }}
            exit={isMobile
              ? { y: '100%', opacity: 0 }
              : { x: 40, y: '-50%', opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{
              position: 'fixed',
              ...(isMobile ? {
                left: 0, right: 0, bottom: 0,
                width: '100vw',
                maxHeight: '85vh',
                borderRadius: '20px 20px 0 0',
              } : {
                right: 24,
                top: '50%',
                width: 'min(480px, calc(100vw - 48px))',
                maxHeight: 'calc(100vh - 48px)',
                borderRadius: 18,
              }),
              background: `
                radial-gradient(ellipse at 50% 0%, rgba(94,234,212,0.10) 0%, transparent 55%),
                linear-gradient(180deg, rgba(10,14,22,0.72) 0%, rgba(6,8,14,0.68) 100%)
              `,
              backdropFilter: 'blur(18px) saturate(140%)',
              WebkitBackdropFilter: 'blur(18px) saturate(140%)',
              border: '1px solid rgba(94, 234, 212, 0.22)',
              boxShadow: `
                0 0 0 1px rgba(94,234,212,0.04),
                0 20px 60px rgba(0,0,0,0.55),
                0 0 80px rgba(94,234,212,0.08)
              `,
              zIndex: 1000,
              overflowY: 'auto',
              color: '#ffffff',
              fontFamily: 'var(--font-body), system-ui, sans-serif',
            }}
          >
            {/* Holo scan line — slow vertical sweep */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage: `repeating-linear-gradient(
                  to bottom,
                  rgba(94,234,212,0.04) 0px,
                  rgba(94,234,212,0.04) 1px,
                  transparent 1px,
                  transparent 3px
                )`,
                mixBlendMode: 'overlay',
                opacity: 0.5,
                borderRadius: 'inherit',
              }}
            />

            {/* Mobile drag handle */}
            {isMobile && (
              <div
                aria-hidden
                style={{
                  position: 'sticky',
                  top: 0,
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: 10,
                }}
              >
                <span style={{
                  width: 44,
                  height: 4,
                  borderRadius: 2,
                  background: 'rgba(94,234,212,0.35)',
                }} />
              </div>
            )}

            <PanelBody project={project} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function PanelBody({ project, onClose }: { project: Project; onClose: () => void }) {
  const idx = projects.findIndex(p => p.id === project.id)
  const seq = String(idx + 1).padStart(2, '0')
  const categoryLabel = project.category === 'realtime'
    ? 'REAL-TIME'
    : project.category.toUpperCase()
  const typeLabel = project.category === 'mobile'
    ? 'Mobile App'
    : project.category === 'realtime'
      ? 'Real-Time'
      : 'Web App'

  return (
    <div style={{ position: 'relative', padding: '22px 24px 26px' }}>
      {/* Close × */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(94,234,212,0.22)',
          borderRadius: 6,
          color: '#ffffff',
          fontSize: 18,
          lineHeight: 1,
          cursor: 'pointer',
          transition: 'color 200ms, border-color 200ms, background 200ms',
          zIndex: 2,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = ACCENT
          e.currentTarget.style.borderColor = ACCENT
          e.currentTarget.style.background = 'rgba(94,234,212,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.borderColor = 'rgba(94,234,212,0.22)'
          e.currentTarget.style.background = 'rgba(0,0,0,0.35)'
        }}
      >
        ×
      </button>

      {/* Eyebrow: seq + category */}
      <div style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 11,
        letterSpacing: '0.28em',
        textTransform: 'uppercase',
        color: ACCENT,
        marginBottom: 10,
        textShadow: '0 0 10px rgba(94,234,212,0.45)',
      }}>
        {seq} · {categoryLabel}
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'var(--font-display), sans-serif',
        fontWeight: 800,
        fontSize: 26,
        lineHeight: 1.15,
        letterSpacing: '-0.01em',
        margin: '0 0 16px 0',
        paddingRight: 32,
      }}>
        {project.title}
      </h2>

      {/* Tech pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {project.tech.slice(0, 4).map((t) => (
          <span key={t} style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 9.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#cbd5e1',
            padding: '4px 9px',
            border: '1px solid rgba(94,234,212,0.30)',
            borderRadius: 4,
            background: 'rgba(94,234,212,0.04)',
          }}>{t}</span>
        ))}
      </div>

      {/* Description (full) */}
      <p style={{
        color: 'rgba(245,245,247,0.78)',
        fontSize: 13,
        lineHeight: 1.65,
        margin: '0 0 18px 0',
      }}>
        {project.description}
      </p>

      {/* Live site CTA (only if URL exists; case-study button removed —
          full detail is rendered inline here in the drawer). */}
      {project.liveUrl && (
        <div style={{ marginBottom: 22 }}>
          <NeonButton href={project.liveUrl} kind="solid">VISIT PROJECT ↗</NeonButton>
        </div>
      )}

      {/* Problem */}
      {project.problem && (
        <Group label="THE PROBLEM">
          <p style={{ color: 'rgba(245,245,247,0.74)', fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>
            {project.problem}
          </p>
        </Group>
      )}

      {/* Solution */}
      {project.solution && (
        <Group label="THE SOLUTION">
          <p style={{ color: 'rgba(245,245,247,0.74)', fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>
            {project.solution}
          </p>
        </Group>
      )}

      {/* Key features — ALL items (no slice) */}
      {project.features.length > 0 && (
        <Group label="KEY FEATURES">
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {project.features.map((f) => (
              <li key={f} style={{ display: 'flex', gap: 9, fontSize: 12.5, color: 'rgba(245,245,247,0.82)', lineHeight: 1.5 }}>
                <CheckIcon />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {/* Technologies — icon + name row */}
      <Group label="TECHNOLOGIES">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {project.tech.slice(0, 6).map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <TechIcon name={t} />
              <span style={{
                fontFamily: 'var(--font-body), sans-serif',
                fontSize: 12.5,
                color: 'rgba(245,245,247,0.88)',
              }}>{t}</span>
            </div>
          ))}
        </div>
      </Group>

      {/* Metadata grid */}
      <Group label={null} style={{ marginTop: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 16px' }}>
          <MetaCell title="TYPE"     value={typeLabel} />
          <MetaCell title="ROLE"     value="Full Stack Dev" />
          <MetaCell title="YEAR"     value={project.year} />
          <MetaCell title="CLIENT"   value={project.company} />
          <MetaCell title="STATUS"   value={project.liveUrl ? 'Live' : 'Completed'} dotColor={ACCENT} />
          <MetaCell title="CATEGORY" value={typeLabel} />
        </div>
      </Group>

      {/* Hero image — optional, smaller, at bottom for context */}
      <div style={{
        marginTop: 22,
        position: 'relative',
        aspectRatio: '16/9',
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(94,234,212,0.18)',
      }}>
        <Image
          src={project.image}
          alt={`${project.title} preview`}
          fill
          sizes="480px"
          style={{ objectFit: 'cover' }}
        />
        <div aria-hidden style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, transparent 50%, rgba(6,8,14,0.6) 100%)',
        }} />
      </div>
    </div>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function Group({ label, children, style }: {
  label: string | null
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      {label && (
        <div style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(94,234,212,0.85)',
          marginBottom: 10,
        }}>{label}</div>
      )}
      {children}
    </div>
  )
}

function MetaCell({ title, value, dotColor }: {
  title: string; value: string; dotColor?: string
}) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 9,
        letterSpacing: '0.25em',
        textTransform: 'uppercase',
        color: 'rgba(245,245,247,0.45)',
        marginBottom: 4,
      }}>{title}</div>
      <div style={{
        fontSize: 13,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {dotColor && (
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}`,
          }} />
        )}
        {value}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

function TechIcon({ name }: { name: string }) {
  // Tiny generic chip icon, color-coded per common tech name
  const color = pickTechColor(name)
  return (
    <span style={{
      width: 22, height: 22,
      borderRadius: 5,
      background: `${color}22`,
      border: `1px solid ${color}55`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color,
      fontFamily: 'var(--font-mono), ui-monospace, monospace',
      fontSize: 10,
      fontWeight: 700,
      boxShadow: `0 0 8px ${color}33`,
    }}>{name[0]?.toUpperCase() ?? '·'}</span>
  )
}

function pickTechColor(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('flutter') || n.includes('dart'))     return '#54C5F8'
  if (n.includes('react')   || n.includes('next'))     return '#5EEAD4'
  if (n.includes('three')   || n.includes('webgl'))    return '#22d3ee'
  if (n.includes('sql')     || n.includes('postgres')) return '#a78bfa'
  if (n.includes('node'))                              return '#86efac'
  if (n.includes('typescript'))                        return '#60a5fa'
  if (n.includes('webrtc')  || n.includes('signalr'))  return '#f0abfc'
  if (n.includes('electron'))                          return '#67e8f9'
  if (n.includes('redux')   || n.includes('gsap'))     return '#fda4af'
  return ACCENT
}

function NeonButton({
  href, kind, target, children,
}: {
  href: string
  kind: 'solid' | 'ghost'
  target?: string
  children: React.ReactNode
}) {
  const baseStyle: React.CSSProperties = {
    display: 'block',
    textAlign: 'center',
    padding: '11px 16px',
    fontFamily: 'var(--font-mono), ui-monospace, monospace',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    borderRadius: 8,
    textDecoration: 'none',
    transition: 'background 220ms, color 220ms, box-shadow 220ms, border-color 220ms',
  }
  if (kind === 'solid') {
    return (
      <a
        href={href}
        target={target ?? '_blank'}
        rel="noopener noreferrer"
        style={{
          ...baseStyle,
          color: '#ffffff',
          background: 'linear-gradient(135deg, rgba(94,234,212,0.18), rgba(99,102,241,0.22))',
          border: '1px solid rgba(94,234,212,0.45)',
          boxShadow: '0 0 0 1px rgba(94,234,212,0.06) inset, 0 0 24px rgba(94,234,212,0.18)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(94,234,212,0.28), rgba(99,102,241,0.32))'
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(94,234,212,0.12) inset, 0 0 36px rgba(94,234,212,0.32)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(94,234,212,0.18), rgba(99,102,241,0.22))'
          e.currentTarget.style.boxShadow = '0 0 0 1px rgba(94,234,212,0.06) inset, 0 0 24px rgba(94,234,212,0.18)'
        }}
      >
        {children}
      </a>
    )
  }
  return (
    <a
      href={href}
      target={target ?? '_blank'}
      rel="noopener noreferrer"
      style={{
        ...baseStyle,
        color: ACCENT,
        background: 'rgba(94,234,212,0.03)',
        border: '1px solid rgba(94,234,212,0.35)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(94,234,212,0.10)'
        e.currentTarget.style.boxShadow = '0 0 22px rgba(94,234,212,0.22)'
        e.currentTarget.style.borderColor = 'rgba(94,234,212,0.6)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(94,234,212,0.03)'
        e.currentTarget.style.boxShadow = 'none'
        e.currentTarget.style.borderColor = 'rgba(94,234,212,0.35)'
      }}
    >
      {children}
    </a>
  )
}

