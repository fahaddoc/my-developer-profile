'use client'

// Drawer — the one drawer shell for the site (contact form, project detail).
//
// Desktop (> 768px): a floating solid panel on the right, inset 16px, that
// slides in from the right. Mobile (≤ 768px): a bottom sheet with a grabber
// you can drag down to dismiss. Both: overlay click, Escape, a close button,
// a focus trap, initial focus ([data-autofocus] inside the content, else the
// panel), focus return to whatever opened it, Lenis paused while open, and a
// reduced-motion path that is a plain opacity crossfade.
//
// While any drawer is open, <html data-drawer-open> is set (the film grain
// pauses) and DRAWER_OPEN_EVENT / DRAWER_CLOSE_EVENT fire on window, once per
// transition, so heavy layers (the WebGL RenderDriver) can stop drawing under
// the overlay. The overlay is a static scrim, not a blur.
//
// This module is the only place framer-motion is imported for the drawers.
// The providers load it with next/dynamic on first open, so framer-motion is
// not part of the initial bundle on any route (and never on the mobile path
// until someone opens a drawer).

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type PanInfo,
  type Transition,
} from 'framer-motion'
import { FaXmark } from 'react-icons/fa6'
import { lenisInstance } from '@/components/providers/SmoothScroll'
import { DRAWER_CLOSE_EVENT, DRAWER_OPEN_EVENT } from './drawerPrefetch'
import styles from './Drawer.module.css'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  /** id of the visible heading that names the dialog */
  labelledBy: string
  /** desktop panel width in px (clamped to the viewport) */
  width?: number
  /** when this changes while open, the content scrolls back to the top */
  resetKey?: string
  children: React.ReactNode
}

const MOBILE_QUERY = '(max-width: 768px)'

// iOS-like drawer curve for the entrance, quint ease-out for the exit.
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]
const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const sync = () => setMobile(mql.matches)
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])
  return mobile
}

// Several drawers may overlap (one closing while another opens), so the
// page-level "a drawer is open" state is a count, and the events fire only on
// 0 → 1 and 1 → 0.
let openDrawers = 0
function markDrawerOpen() {
  openDrawers += 1
  if (openDrawers !== 1) return
  document.documentElement.setAttribute('data-drawer-open', '')
  window.dispatchEvent(new Event(DRAWER_OPEN_EVENT))
}
function markDrawerClosed() {
  openDrawers = Math.max(0, openDrawers - 1)
  if (openDrawers !== 0) return
  document.documentElement.removeAttribute('data-drawer-open')
  window.dispatchEvent(new Event(DRAWER_CLOSE_EVENT))
}

/** Mobile sheet: dismiss when dragged past this share of its height… */
const DISMISS_DISTANCE = 0.25
/** …or flicked down faster than this (px/s). */
const DISMISS_VELOCITY = 300

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest('[inert]'),
  )
}

export function Drawer({ open, onClose, labelledBy, width = 480, resetKey, children }: DrawerProps) {
  const [mounted, setMounted] = useState(false)
  const isMobile = useIsMobile()
  const reduce = useReducedMotion() ?? false
  const dragControls = useDragControls()

  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => { setMounted(true) }, [])

  // Page-level open state. Runs from the moment the drawer opens until it
  // starts to close (or unmounts), so the scene resumes as the exit plays.
  useEffect(() => {
    if (!open || !mounted) return
    markDrawerOpen()
    return markDrawerClosed
  }, [open, mounted])

  // Focus, keyboard and scroll management for one open session.
  useEffect(() => {
    if (!open || !mounted) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const panel = panelRef.current

    if (panel) {
      const target = panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel
      target.focus({ preventScroll: true })
    }
    lenisInstance?.stop?.()

    const onKey = (e: KeyboardEvent) => {
      const p = panelRef.current
      if (!p) return
      if (e.key === 'Escape' && !e.isComposing) {
        e.preventDefault()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables(p)
      const active = document.activeElement as HTMLElement | null
      if (items.length === 0) {
        e.preventDefault()
        p.focus({ preventScroll: true })
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const outside = !active || active === p || !p.contains(active)
      if (e.shiftKey && (outside || active === first)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (outside || active === last)) {
        e.preventDefault()
        first.focus()
      }
    }
    // Anything that pulls focus out (a stray click target, a script) gets
    // pulled back, so the trap holds for pointer + AT as well as Tab.
    const onFocusIn = (e: FocusEvent) => {
      const p = panelRef.current
      if (p && e.target instanceof Node && !p.contains(e.target)) {
        p.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('focusin', onFocusIn)
      lenisInstance?.start?.()
      // preventScroll: returning focus into the tunnel must never move the camera.
      if (opener && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open, mounted])

  // New content in an already open drawer starts at the top.
  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [resetKey, open])

  if (!mounted) return null

  const sheet = isMobile && !reduce

  const panelMotion = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } as Transition },
        exit: { opacity: 0, transition: { duration: 0.16, ease: 'easeOut' } as Transition },
      }
    : isMobile
      ? {
          initial: { y: '100%' },
          animate: { y: 0, transition: { duration: 0.5, ease: EASE_DRAWER } as Transition },
          exit: { y: '100%', transition: { duration: 0.28, ease: EASE_OUT } as Transition },
        }
      : {
          // A full transform string keeps this on the compositor (WAAPI), so
          // the slide stays smooth while the WebGL scene is busy.
          initial: { opacity: 0, transform: 'translateX(56px)' },
          animate: {
            opacity: 1,
            transform: 'translateX(0px)',
            transition: {
              transform: { duration: 0.52, ease: EASE_DRAWER },
              opacity: { duration: 0.28, ease: EASE_OUT },
            } as Transition,
          },
          exit: {
            opacity: 0,
            transform: 'translateX(28px)',
            transition: { duration: 0.24, ease: EASE_OUT } as Transition,
          },
        }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const height = panelRef.current?.offsetHeight ?? window.innerHeight * 0.6
    if (info.offset.y > height * DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY) {
      onCloseRef.current()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="drawer-overlay"
          className={styles.overlay}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reduce ? 0.2 : 0.32, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: reduce ? 0.16 : 0.24, ease: EASE_OUT } }}
          onClick={() => onCloseRef.current()}
        />
      )}
      {open && (
        <motion.div
          key="drawer-panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          tabIndex={-1}
          data-lenis-prevent
          className={styles.panel}
          style={{ ['--drawer-w' as string]: `${width}px` } as React.CSSProperties}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          {...panelMotion}
          drag={sheet ? 'y' : false}
          dragListener={false}
          dragControls={dragControls}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.9 }}
          dragMomentum={false}
          onDragEnd={sheet ? onDragEnd : undefined}
        >
          <div
            className={styles.handle}
            aria-hidden="true"
            onPointerDown={(e) => { if (sheet) dragControls.start(e) }}
          >
            <span />
          </div>
          <button type="button" className={styles.close} onClick={() => onCloseRef.current()} aria-label="Close">
            <FaXmark aria-hidden="true" focusable="false" />
          </button>
          <div ref={scrollRef} className={styles.scroll}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default Drawer
