'use client'

// StarMap — the Work section as a star chart. Time runs across the sky
// (2018 → 2026), every project is a star wearing its own screenshot and each
// category is a constellation joined in year order; the engineering demos sit
// in a small cluster ("the lab"). Hovering a star draws lines to the projects
// that share its stack; clicking it dollies the sky in while the star's
// thumbnail grows into a telescope eyepiece (Scope). In the light theme the
// same chart reads as a nautical chart with a brass spyglass.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import type { Project } from '@/data/projects'
import { DEMOS, LABELS, LINES, PHONE_NAME, RELATED, SHIPPED, STARS, YEARS, at, chart, type Star } from './layout'
import { Scope } from './Scope'
import s from './StarMap.module.css'

const shortTitle = (t: string) => t.split(' — ')[0]

/** Default action: the global case-study drawer (ProjectDrawerProvider). */
const openDrawer = (p: Project) => window.dispatchEvent(new CustomEvent('project-drawer-open', { detail: p.id }))

function useTall() {
  const [tall, setTall] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const on = () => setTall(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return tall
}

/** The nearest star in an arrow-key direction (a cone around it). */
function step(from: number, dx: number, dy: number, tall: boolean) {
  const [x0, y0] = at(STARS[from], tall)
  let best = from
  let score = Infinity
  STARS.forEach((st, j) => {
    if (j === from) return
    const [x, y] = at(st, tall)
    const d = Math.hypot(x - x0, y - y0)
    const cos = ((x - x0) * dx + (y - y0) * dy) / d
    if (cos < 0.35) return
    const sc = d * (2 - cos)
    if (sc < score) { score = sc; best = j }
  })
  return best
}

export function StarMap({ title, onExplore = openDrawer }: {
  /** section heading (the home page); /ideas shows the chart without one */
  title?: string
  onExplore?: (p: Project) => void
}) {
  const tall = useTall()
  const { w, h } = chart(tall)
  const [hover, setHover] = useState<number | null>(null)
  const [active, setActive] = useState(0)          // the star that holds the tab stop
  const [open, setOpen] = useState<number | null>(null)
  const [closing, setClosing] = useState(false)
  const starRefs = useRef<(HTMLButtonElement | null)[]>([])
  const thumbRefs = useRef<(HTMLSpanElement | null)[]>([])

  const pct = useCallback((st: Star) => {
    const [x, y] = at(st, tall)
    return { x: x / w, y: y / h }
  }, [tall, w, h])

  const openStar = (i: number) => { setActive(i); setHover(null); setClosing(false); setOpen(i) }
  const close = useCallback(() => setClosing(true), [])
  const openRef = useRef<number | null>(null)
  openRef.current = open
  // focus goes back to the star once the sky is no longer inert (after commit)
  const returnTo = useRef<number | null>(null)
  const closed = useCallback(() => {
    returnTo.current = openRef.current
    setOpen(null)
    setClosing(false)
  }, [])
  useEffect(() => {
    if (open != null || returnTo.current == null) return
    starRefs.current[returnTo.current]?.focus({ preventScroll: true })
    returnTo.current = null
  }, [open])
  const stepOpen = useCallback((d: number) => {
    const i = openRef.current
    if (i == null) return
    const j = (i + d + STARS.length) % STARS.length
    setActive(j)
    setOpen(j)
  }, [])

  const onSkyKey = (e: KeyboardEvent) => {
    const dirs: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    let j: number | null = null
    if (dirs[e.key]) j = step(active, dirs[e.key][0], dirs[e.key][1], tall)
    else if (e.key === 'Home') j = 0
    else if (e.key === 'End') j = STARS.length - 1
    if (j == null) return
    e.preventDefault()
    setActive(j)
    starRefs.current[j]?.focus()
  }

  const rel = hover != null ? RELATED[hover] : []
  const cat = hover != null ? STARS[hover].p.category : null
  const zoomed = open != null && !closing
  const origin = open != null ? pct(STARS[open]) : null
  const lab = tall ? { x: 300 / w, y: 855 / h } : { x: 893 / w, y: 275 / h }

  const scope = open != null && (
    <Scope i={open} getStar={() => thumbRefs.current[open]} closing={closing} onClose={close} onClosed={closed} onStep={stepOpen} onExplore={onExplore} />
  )

  return (
    <section className={`${s.root} ${title ? s.titled : ''}`} aria-label={title ?? 'Projects as a star map'}>
      <header className={s.head}>
        {title && <h2 className={`t-title ${s.title}`}>{title}</h2>}
        <p className={s.hint}>
          <span className={s.space}>Pick a star.</span>
          <span className={s.sea}>Pick a port.</span>{' '}
          {SHIPPED} shipped projects from 2018 to 2026, and {DEMOS} more in the lab.
        </p>
      </header>

      <div className={s.frame} style={{ aspectRatio: `${w} / ${h}` }}>
        <div
          className={`${s.sky} ${zoomed ? s.zoom : ''}`}
          style={origin ? { transformOrigin: `${origin.x * 100}% ${origin.y * 100}%` } : undefined}
          data-hover={hover != null ? '' : undefined}
          inert={open != null}
          onKeyDown={onSkyKey}
        >
          <span className={s.nebula} style={{ left: `${lab.x * 100}%`, top: `${lab.y * 100}%` }} aria-hidden />
          <Compass tall={tall} />

          <svg className={s.lines} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
            {LINES.map((l, k) => {
              const [x1, y1] = at(STARS[l.i], tall)
              const [x2, y2] = at(STARS[l.j], tall)
              return (
                <line key={k} x1={x1} y1={y1} x2={x2} y2={y2}
                  className={`${s.edge} ${cat === l.cat ? s.edgeHot : ''}`}
                  style={{ '--len': Math.hypot(x2 - x1, y2 - y1), '--k': k } as CSSProperties} />
              )
            })}
            {hover != null && rel.map((j) => {
              const [x1, y1] = at(STARS[hover], tall)
              const [x2, y2] = at(STARS[j], tall)
              return <line key={`${hover}-${j}`} x1={x1} y1={y1} x2={x2} y2={y2} className={s.rel} style={{ '--len': Math.hypot(x2 - x1, y2 - y1) } as CSSProperties} />
            })}
          </svg>

          {LABELS.map((l) => {
            const [x, y] = tall ? l.tall : l.wide
            return (
              <span key={l.id} className={`t-label ${s.const}`} style={{ left: `${(x / w) * 100}%`, top: `${(y / h) * 100}%` }} aria-hidden>
                <span className={s.space}>{l.text}</span><span className={s.sea}>{l.sea}</span>
              </span>
            )
          })}

          <ol className={s.years} aria-hidden>
            {YEARS.map((y) => (
              <li key={y.year} style={tall ? { top: `${(y.tall / h) * 100}%` } : { left: `${(y.wide / w) * 100}%` }}>{y.year}</li>
            ))}
          </ol>

          {STARS.map((st, i) => {
            const p = pct(st)
            return (
              <button
                key={st.p.id}
                ref={(el) => { starRefs.current[i] = el }}
                type="button"
                className={s.star}
                data-mag={st.mag}
                data-side={p.x > 0.6 ? 'l' : 'r'}
                data-hot={i === hover ? '' : undefined}
                data-rel={rel.includes(i) ? '' : undefined}
                data-open={i === open ? '' : undefined}
                tabIndex={i === active ? 0 : -1}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, '--i': i, '--d': `${((i * 0.37) % 3).toFixed(2)}s` } as CSSProperties}
                onClick={() => openStar(i)}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(i) }}
                onPointerLeave={(e) => { if (e.pointerType === 'mouse') setHover((v) => (v === i ? null : v)) }}
                onFocus={() => { setActive(i); setHover(i) }}
                onBlur={() => setHover((v) => (v === i ? null : v))}
                aria-label={`${st.p.title}, ${st.p.year}${st.demo ? ', lab demo' : ''}. Take a closer look`}
              >
                {st.mag === 2 && <span className={s.spikes} aria-hidden />}
                <span className={s.thumb} ref={(el) => { thumbRefs.current[i] = el }} aria-hidden>
                  <Image src={st.p.image} alt="" width={96} height={96} unoptimized={st.p.image.endsWith('.svg')} draggable={false} />
                </span>
                <span className={`${s.name} ${st.demo ? s.nameDemo : ''}`} aria-hidden>
                  {tall ? PHONE_NAME[st.p.id] ?? shortTitle(st.p.title) : shortTitle(st.p.title)}<em>{st.p.year}</em>
                </span>
              </button>
            )
          })}
        </div>

        {/* phones: a full-screen sheet, above the page's sticky chrome */}
        {scope && (tall ? createPortal(scope, document.body) : scope)}
      </div>

      <div className={s.foot}>
        <span className={s.legend} aria-hidden>
          <i data-mag="2" /> featured <i data-mag="1" /> shipped <i data-mag="0" /> lab demo
        </span>
        <span className={s.tip}>
          <span className={s.space}>Hover a star to see what shares its stack. Click it to look closer.</span>
          <span className={s.sea}>Hover a port to see what shares its stack. Click it to look closer.</span>
        </span>
      </div>
    </section>
  )
}

/** Sea-chart compass rose with rhumb lines (shown in the light theme only). */
function Compass({ tall }: { tall: boolean }) {
  const pos = tall ? { left: '88%', top: '45%' } : { left: '6%', top: '84%' }
  return (
    <svg className={s.compass} style={pos} viewBox="-100 -100 200 200" aria-hidden>
      {Array.from({ length: 16 }, (_, k) => {
        const a = (k / 16) * Math.PI * 2
        return <line key={k} className={s.rhumb} x1={0} y1={0} x2={Math.cos(a) * 1400} y2={Math.sin(a) * 1400} />
      })}
      <circle r={44} className={s.roseRing} />
      <circle r={36} className={s.roseRing} />
      {[0, 1, 2, 3].map((k) => (
        <path key={k} className={k % 2 ? s.rosePtB : s.rosePtA} transform={`rotate(${k * 90})`} d="M0 -60 L9 -9 L0 0 Z M0 -60 L-9 -9 L0 0 Z" />
      ))}
      {[0, 1, 2, 3].map((k) => (
        <path key={`d${k}`} className={s.rosePtB} transform={`rotate(${k * 90 + 45})`} d="M0 -36 L6 -6 L0 0 L-6 -6 Z" />
      ))}
      <text className={s.roseN} y={-68} textAnchor="middle">N</text>
    </svg>
  )
}
