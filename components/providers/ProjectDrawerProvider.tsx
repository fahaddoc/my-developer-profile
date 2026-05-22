'use client'

// ProjectDrawerProvider — global side-drawer that slides in from the right
// when any project tile is clicked (tunnel, grid, anywhere). Renders into
// document.body via a portal so it sits above the R3F canvas. Any component
// can trigger it via `useProjectDrawer().open(id)`.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { projects, type Project } from '@/data/projects'

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
const ACCENT = '#00ffff'

export function ProjectDrawerProvider({ children }: { children: React.ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const open  = useCallback((id: string) => setOpenId(id), [])
  const close = useCallback(() => setOpenId(null), [])

  // ESC key closes
  useEffect(() => {
    if (!openId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId, close])

  // Cross-bundle trigger — components loaded via dynamic import (TunnelScene)
  // get their own copy of the React module tree and can't see this context.
  // Dispatching a CustomEvent on window lets them trigger the drawer.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (typeof id === 'string') open(id)
    }
    window.addEventListener('project-drawer-open', onOpen as EventListener)
    return () => window.removeEventListener('project-drawer-open', onOpen as EventListener)
  }, [open])

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!openId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [openId])

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
      {mounted && createPortal(<Drawer project={project} onClose={close} />, document.body)}
    </DrawerContext.Provider>
  )
}

function Drawer({ project, onClose }: { project: Project | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {project && (
        <>
          {/* Dim overlay — covers everything left of the drawer */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(2, 4, 10, 0.65)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
              zIndex: 999,
              cursor: 'pointer',
            }}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} — case study`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: EASE }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(520px, 100vw)',
              background: `
                radial-gradient(ellipse at 50% 20%, rgba(0,255,255,0.08) 0%, transparent 45%),
                radial-gradient(ellipse at 50% 80%, rgba(0,255,255,0.04) 0%, transparent 50%),
                #05050A
              `,
              borderLeft: '1px solid rgba(0, 255, 255, 0.15)',
              boxShadow: '-20px 0 60px rgba(0, 0, 0, 0.8)',
              zIndex: 1000,
              overflowY: 'auto',
              color: '#ffffff',
              fontFamily: 'var(--font-body), system-ui, sans-serif',
            }}
          >
            <DrawerBody project={project} onClose={onClose} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function DrawerBody({ project, onClose }: { project: Project; onClose: () => void }) {
  const idx = projects.findIndex(p => p.id === project.id)
  const seq = String(idx + 1).padStart(2, '0')

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close project drawer"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(0, 255, 255, 0.25)',
          borderRadius: 6,
          color: '#ffffff',
          fontSize: 20,
          lineHeight: 1,
          cursor: 'pointer',
          zIndex: 2,
          transition: 'color 200ms, border-color 200ms, background 200ms',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = ACCENT
          e.currentTarget.style.borderColor = ACCENT
          e.currentTarget.style.background = 'rgba(0,255,255,0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.borderColor = 'rgba(0,255,255,0.25)'
          e.currentTarget.style.background = 'rgba(0,0,0,0.6)'
        }}
      >
        ×
      </button>

      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', height: 200, overflow: 'hidden' }}>
        <Image
          src={project.image}
          alt={`${project.title} thumbnail`}
          fill
          sizes="520px"
          style={{ objectFit: 'cover' }}
          priority
        />
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(5,5,10,0.95) 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ padding: '28px 28px 0 28px' }}>
        {/* Sequence number + category label */}
        <div
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 11,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: ACCENT,
            marginBottom: 14,
            textShadow: '0 0 10px rgba(0,255,255,0.5)',
          }}
        >
          {seq} · {project.category}
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display), sans-serif',
            fontWeight: 800,
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: '-0.01em',
            color: '#ffffff',
            margin: '0 0 18px 0',
          }}
        >
          {project.title}
        </h2>

        {/* Tech stack pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {project.tech.map((t) => (
            <span
              key={t}
              style={{
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: ACCENT,
                padding: '5px 10px',
                border: `1px solid rgba(0, 255, 255, 0.45)`,
                borderRadius: 4,
                background: 'rgba(0, 255, 255, 0.04)',
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Description */}
        <p
          style={{
            color: '#a0a0b0',
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 22,
          }}
        >
          {project.description}
        </p>

        {/* Divider */}
        <div
          aria-hidden
          style={{
            height: 1,
            background: 'rgba(0, 255, 255, 0.2)',
            margin: '8px 0 22px 0',
          }}
        />

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={`/projects/${project.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '12px 16px',
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: ACCENT,
              border: `1px solid rgba(0, 255, 255, 0.5)`,
              borderRadius: 6,
              background: 'transparent',
              textDecoration: 'none',
              transition: 'background 200ms, color 200ms, box-shadow 200ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ACCENT
              e.currentTarget.style.color = '#0A0A12'
              e.currentTarget.style.boxShadow = '0 0 24px rgba(0,255,255,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = ACCENT
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            View Case Study →
          </a>

          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px 16px',
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#a0a0b0',
                border: `1px solid rgba(255, 255, 255, 0.12)`,
                borderRadius: 6,
                background: 'transparent',
                textDecoration: 'none',
                transition: 'color 200ms, border-color 200ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = ACCENT
                e.currentTarget.style.borderColor = 'rgba(0,255,255,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#a0a0b0'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
              }}
            >
              Live Site ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
