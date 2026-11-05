'use client'

// QualityToggle — cycles the tunnel quality preset (low → mid → high) and
// persists it through the override in lib/quality.ts.
//
// AppShell owns the quality state and mounts this component; TunnelHUD owns the
// top-right chrome cluster. To keep that cluster one flex row (no absolute
// offsets), the HUD renders <QualityToggleSlot/> inside it and the button is
// portaled there, styled with the class the slot hands over. This file does
// not import the HUD stylesheet on purpose: AppShell imports it statically,
// so an import here would pull the desktop HUD CSS onto the mobile path.

import { useEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { type QualityLevel, nextLevel } from '@/lib/quality'

// ── slot registry (module-level, like soundStore in lib/tunnel.ts) ──────────
interface Slot { el: HTMLElement; className: string }
let slot: Slot | null = null
const slotSubs = new Set<() => void>()
const slotStore = {
  get: () => slot,
  set: (next: Slot | null) => {
    if (slot === next) return
    slot = next
    slotSubs.forEach((cb) => cb())
  },
  subscribe: (cb: () => void) => {
    slotSubs.add(cb)
    return () => { slotSubs.delete(cb) }
  },
}

/** Where the HUD wants the quality control, and how it should look there.
 *  display:contents keeps the portaled button a direct flex item. */
export function QualityToggleSlot({ className }: { className: string }) {
  return (
    <span
      style={{ display: 'contents' }}
      ref={(el) => {
        if (!el) return
        const mine = { el, className }
        slotStore.set(mine)
        return () => { if (slotStore.get() === mine) slotStore.set(null) }
      }}
    />
  )
}

const LABELS: Record<QualityLevel, string> = {
  low:  'Low',
  mid:  'Mid',
  high: 'High',
}

// Only used on a route that mounts AppShell's tunnel without the HUD.
const FALLBACK: CSSProperties = {
  position: 'fixed', right: 20, bottom: 16, zIndex: 'var(--z-chrome)' as CSSProperties['zIndex'],
  minHeight: 36, padding: '0 12px', border: 0, borderRadius: 999, background: 'transparent',
  color: 'rgb(var(--ink-3))', cursor: 'pointer',
  fontFamily: 'var(--font-body), system-ui, sans-serif', fontWeight: 500, fontSize: 13, lineHeight: 1,
}

interface QualityToggleProps {
  level:    QualityLevel
  onChange: (level: QualityLevel) => void
}

export function QualityToggle({ level, onChange }: QualityToggleProps) {
  const target = useSyncExternalStore(slotStore.subscribe, slotStore.get, () => null)

  // The HUD is a separate dynamic import, so its slot can appear a moment
  // after this mounts. Only fall back to a fixed button if it never does.
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    if (target) { setFallback(false); return }
    const id = window.setTimeout(() => setFallback(true), 2000)
    return () => window.clearTimeout(id)
  }, [target])

  const next = nextLevel(level)
  const props = {
    type: 'button' as const,
    onClick: () => onChange(next),
    'aria-label': `Quality · ${LABELS[level]}. Switch to ${LABELS[next].toLowerCase()}.`,
    title: 'Graphics quality',
  }

  if (target) {
    return createPortal(
      <button {...props} className={target.className}>Quality · {LABELS[level]}</button>,
      target.el,
    )
  }
  if (!fallback) return null
  return <button {...props} style={FALLBACK}>Quality · {LABELS[level]}</button>
}
