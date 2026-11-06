// lib/og/plate.tsx
// The machined titanium plate every share image sits on, plus the HUD pieces
// (corner brackets, edge ticks, status lamp, label/value readouts).
//
// Satori rules this file follows: no CSS variables, filters or masks (the
// brushed sheen is gradients only); every div with more than one child sets
// display:flex; children are passed as arrays or explicit flex columns, never
// as a Fragment (Satori collapses a Fragment's children into one flex row).

import type { ReactNode } from 'react'
import { C, FONT, chrome } from './theme'

export const W = 1200
export const H = 630
const INSET = 24 // machined frame inset from the plate edge

// Layers top to bottom: edge vignette, diagonal sheen band, top-left light,
// fine and coarse horizontal brush grain, then the matte base ramp.
const PLATE_BG = [
  'radial-gradient(1100px 760px at 50% 42%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.62) 100%)',
  'linear-gradient(112deg, rgba(226,232,239,0) 18%, rgba(226,232,239,0.06) 34%, rgba(226,232,239,0.012) 44%, rgba(226,232,239,0) 58%)',
  'radial-gradient(820px 520px at 16% -6%, rgba(226,232,239,0.11), rgba(226,232,239,0) 70%)',
  'repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 3px)',
  'repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 1px, rgba(0,0,0,0) 1px, rgba(0,0,0,0) 7px)',
  'linear-gradient(180deg, #121317 0%, #0b0c0e 48%, #08090b 100%)',
].join(', ')

/** Four HUD corner brackets around a box (absolute, in the parent's coordinates). */
export function brackets(
  key: string,
  box: { x: number; y: number; w: number; h: number },
  size = 40,
  weight = 3,
  color: string = C.chrome,
) {
  const { x, y, w, h } = box
  const base = { position: 'absolute' as const, display: 'flex', width: size, height: size, borderColor: color, borderStyle: 'solid' as const }
  return [
    <div key={`${key}-tl`} style={{ ...base, left: x, top: y, borderWidth: `${weight}px 0 0 ${weight}px` }} />,
    <div key={`${key}-tr`} style={{ ...base, left: x + w - size, top: y, borderWidth: `${weight}px ${weight}px 0 0` }} />,
    <div key={`${key}-bl`} style={{ ...base, left: x, top: y + h - size, borderWidth: `0 0 ${weight}px ${weight}px` }} />,
    <div key={`${key}-br`} style={{ ...base, left: x + w - size, top: y + h - size, borderWidth: `0 ${weight}px ${weight}px 0` }} />,
  ]
}

// A short ruler of ticks on each side edge of the frame, centred vertically.
function edgeTicks() {
  const ticks: ReactNode[] = []
  const count = 13
  const gap = 12
  const top0 = H / 2 - ((count - 1) * gap) / 2
  for (let i = 0; i < count; i++) {
    const major = i % 4 === 0
    const len = major ? 16 : 8
    const style = { position: 'absolute' as const, display: 'flex', height: 1, width: len, top: top0 + i * gap, background: chrome(major ? 0.5 : 0.24) }
    ticks.push(<div key={`tl${i}`} style={{ ...style, left: INSET }} />)
    ticks.push(<div key={`tr${i}`} style={{ ...style, left: W - INSET - len }} />)
  }
  return ticks
}

/** Full-bleed titanium plate: brushed backdrop, machined frame, corner brackets, edge ticks. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        color: C.ink,
        fontFamily: `${FONT.body}, sans-serif`,
        backgroundColor: C.plate,
        backgroundImage: PLATE_BG,
      }}
    >
      {[
        <div
          key="frame"
          style={{
            position: 'absolute',
            display: 'flex',
            left: INSET,
            top: INSET,
            width: W - INSET * 2,
            height: H - INSET * 2,
            borderRadius: 6,
            border: `1px solid ${C.line}`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.6)',
          }}
        />,
        ...edgeTicks(),
        ...brackets('plate', { x: INSET - 8, y: INSET - 8, w: W - (INSET - 8) * 2, h: H - (INSET - 8) * 2 }, 44, 3),
        <div key="content" style={{ position: 'relative', display: 'flex', width: '100%', height: '100%' }}>
          {children}
        </div>,
      ]}
    </div>
  )
}

/** Small chrome status lamp. */
export function Lamp({ size = 10 }: { size?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        width: size,
        height: size,
        background: C.chrome,
        boxShadow: `0 0 10px ${chrome(0.75)}, 0 0 22px ${chrome(0.35)}`,
      }}
    />
  )
}

/** Chivo Mono HUD label (uppercase, tracked). */
export function Data({ children, size = 20, color = C.ink3, track = 4, weight = 400 }: {
  children: ReactNode
  size?: number
  color?: string
  track?: number
  weight?: 400 | 500
}) {
  return (
    <div style={{ display: 'flex', fontFamily: FONT.mono, fontSize: size, letterSpacing: track, color, fontWeight: weight, whiteSpace: 'nowrap' }}>
      {children}
    </div>
  )
}

/** A label over a value, split from its neighbour by a machined seam. */
export function Readout({ label, value, first = false, valueFont = 'mono', valueSize = 30 }: {
  label: string
  value: ReactNode
  first?: boolean
  valueFont?: 'mono' | 'display'
  valueSize?: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        paddingLeft: first ? 0 : 28,
        paddingRight: 28,
        borderLeft: first ? 'none' : `1px solid ${C.line}`,
      }}
    >
      <Data size={16} track={3}>{label.toUpperCase()}</Data>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 10,
          fontFamily: valueFont === 'display' ? FONT.display : FONT.mono,
          fontWeight: valueFont === 'display' ? 800 : 500,
          fontSize: valueSize,
          lineHeight: 1,
          color: C.ink,
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </div>
    </div>
  )
}

/** Tektur display title, uppercased, with a faint chrome halo (no gradient text). */
export function Title({ children, size, color = C.ink }: { children: string; size: number; color?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        fontFamily: FONT.display,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: size * 0.01,
        color,
        textShadow: `0 0 28px ${chrome(0.18)}`,
      }}
    >
      {children.toUpperCase()}
    </div>
  )
}
