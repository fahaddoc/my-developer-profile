'use client'

// Reel: the Work section as a projector. A 35mm strip runs along the bottom,
// the frame sitting in the gate is projected big onto the screen above it and
// its credits roll in beside the screen. Drag, swipe, scroll or use the arrow
// keys to pull the film through one frame at a time. Left alone it advances
// like a slow reel; hover, keyboard focus or any touch pauses it.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { FaChevronLeft, FaChevronRight, FaPause, FaPlay } from 'react-icons/fa6'
import { engineeringDemos } from '@/data/engineering-demos'
import { IDEA_PROJECTS, openCaseStudy } from './concepts'
import s from './Reel.module.css'

const AUTOPLAY_MS = 5200
const IDLE_RESUME_MS = 7000
const HOLES = [0, 1, 2, 3, 4].map((k) => <i key={k} />)
const LEADER = Array.from({ length: 36 }, (_, k) => <i key={k} />)
const LIST = IDEA_PROJECTS
const DEMO_IDS = new Set(engineeringDemos.map((d) => d.id))
const pad = (n: number) => String(n).padStart(2, '0')
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Reel() {
  const list = LIST
  const total = list.length
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(() => !reduced())
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [idle, setIdle] = useState(true)
  const [blocked, setBlocked] = useState(false) // drawer open or tab hidden
  const [dragging, setDragging] = useState(false)

  const rootRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLOListElement>(null)
  const playRef = useRef<HTMLButtonElement>(null)
  const frames = useRef<(HTMLButtonElement | null)[]>([])
  const indexRef = useRef(0)
  const target = useRef<number | null>(null)
  const targetTimer = useRef(0)
  const idleTimer = useRef(0)
  const drag = useRef({ on: false, moved: false, x: 0, left: 0, lx: 0, lt: 0, v: 0 })
  const swallowClick = useRef(false)

  /** Any hands-on interaction pauses the reel for a while. */
  const poke = useCallback(() => {
    setIdle(false)
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_RESUME_MS)
  }, [])

  const nearest = useCallback(() => {
    const track = trackRef.current
    if (!track) return indexRef.current
    const mid = track.scrollLeft + track.clientWidth / 2
    let best = 0
    let dist = Infinity
    frames.current.forEach((f, i) => {
      if (!f) return
      const d = Math.abs(f.offsetLeft + f.offsetWidth / 2 - mid)
      if (d < dist) { dist = d; best = i }
    })
    return best
  }, [])

  const centre = useCallback((i: number, smooth: boolean) => {
    const track = trackRef.current
    const f = frames.current[i]
    if (!track || !f) return
    target.current = i
    window.clearTimeout(targetTimer.current)
    targetTimer.current = window.setTimeout(() => { target.current = null }, 1000)
    track.scrollTo({ left: f.offsetLeft + f.offsetWidth / 2 - track.clientWidth / 2, behavior: smooth && !reduced() ? 'smooth' : 'auto' })
  }, [])

  const go = useCallback((i: number, opts: { focus?: boolean; user?: boolean } = {}) => {
    const n = Math.max(0, Math.min(total - 1, i))
    if (opts.user !== false) poke()
    indexRef.current = n
    setIndex(n)
    centre(n, true)
    if (opts.focus) frames.current[n]?.focus({ preventScroll: true })
  }, [centre, poke, total])

  // Frames that pass the gate while the film is dragged or swiped get projected live.
  const onScroll = () => {
    const n = nearest()
    if (target.current !== null) {
      if (n === target.current) target.current = null
      return
    }
    if (n !== indexRef.current) { indexRef.current = n; setIndex(n) }
  }

  // Vertical wheel over the strip steps one frame per notch (horizontal stays native).
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let acc = 0
    let last = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) >= Math.abs(e.deltaY)) { if (e.deltaX) poke(); return }
      const dir = e.deltaY > 0 ? 1 : -1
      const i = indexRef.current
      if ((dir > 0 && i >= total - 1) || (dir < 0 && i <= 0)) return // let the page scroll on
      e.preventDefault()
      acc += e.deltaY
      const now = performance.now()
      if (Math.abs(acc) > 24 && now - last > 260) { last = now; acc = 0; go(i + dir) }
    }
    track.addEventListener('wheel', onWheel, { passive: false })
    return () => track.removeEventListener('wheel', onWheel)
  }, [go, poke, total])

  // Keep the selected frame in the gate when the layout changes size.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(() => centre(indexRef.current, false))
    ro.observe(track)
    return () => ro.disconnect()
  }, [centre])

  // The reel stops while a case study is open or the tab is hidden.
  useEffect(() => {
    let drawer = false
    const sync = () => setBlocked(drawer || document.hidden)
    const open = () => { drawer = true; sync() }
    const close = () => { drawer = false; sync() }
    window.addEventListener('sf:drawer-open', open)
    window.addEventListener('sf:drawer-close', close)
    document.addEventListener('visibilitychange', sync)
    return () => {
      window.removeEventListener('sf:drawer-open', open)
      window.removeEventListener('sf:drawer-close', close)
      document.removeEventListener('visibilitychange', sync)
      window.clearTimeout(idleTimer.current)
      window.clearTimeout(targetTimer.current)
    }
  }, [])

  const live = playing && !hovered && !focused && idle && !blocked && !dragging

  useEffect(() => {
    if (!live) return
    const t = window.setTimeout(() => {
      const next = indexRef.current + 1
      go(next >= total ? 0 : next, { user: false })
    }, AUTOPLAY_MS)
    return () => window.clearTimeout(t)
  }, [live, index, go, total])

  // Mouse drag pulls the film; touch and trackpads scroll natively with snap.
  const onPointerDown = (e: PointerEvent<HTMLOListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !trackRef.current) return
    drag.current = { on: true, moved: false, x: e.clientX, left: trackRef.current.scrollLeft, lx: e.clientX, lt: e.timeStamp, v: 0 }
  }
  const onPointerMove = (e: PointerEvent<HTMLOListElement>) => {
    const d = drag.current
    const track = trackRef.current
    if (!d.on || !track) return
    const dx = e.clientX - d.x
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true
      setDragging(true)
      try { track.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
      poke()
    }
    if (!d.moved) return
    track.scrollLeft = d.left - dx
    d.v = (e.clientX - d.lx) / Math.max(1, e.timeStamp - d.lt)
    d.lx = e.clientX
    d.lt = e.timeStamp
  }
  const endDrag = () => {
    const d = drag.current
    if (!d.on) return
    d.on = false
    if (!d.moved) return
    swallowClick.current = true
    window.setTimeout(() => { swallowClick.current = false }, 250)
    setDragging(false)
    let n = nearest()
    if (Math.abs(d.v) > 0.45 && n === indexRef.current) n += d.v < 0 ? 1 : -1 // a flick steps on
    go(n)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const inStrip = !!trackRef.current?.contains(e.target as Node)
    let n: number | null = null
    if (e.key === 'ArrowRight') n = indexRef.current + 1
    else if (e.key === 'ArrowLeft') n = indexRef.current - 1
    else if (inStrip && e.key === 'Home') n = 0
    else if (inStrip && e.key === 'End') n = total - 1
    if (n === null) return
    e.preventDefault()
    go(n, { focus: inStrip })
  }

  const hover = {
    onPointerEnter: (e: PointerEvent) => { if (e.pointerType === 'mouse') setHovered(true) },
    onPointerLeave: (e: PointerEvent) => { if (e.pointerType === 'mouse') setHovered(false) },
  }

  const p = list[index]
  const shipped = !DEMO_IDS.has(p.id)
  const line = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <div
      ref={rootRef}
      className={s.root}
      style={{ '--autoplay': `${AUTOPLAY_MS}ms` } as CSSProperties}
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        const el = e.target as HTMLElement
        if (el !== playRef.current && el.matches(':focus-visible')) setFocused(true)
      }}
      onBlur={(e) => { if (!rootRef.current?.contains(e.relatedTarget as Node)) setFocused(false) }}
    >
      <div className={s.screenCell} {...hover}>
        <span className={`${s.post} ${s.postL}`} aria-hidden />
        <span className={`${s.post} ${s.postR}`} aria-hidden />
        <span className={s.beam} aria-hidden />
        <span className={s.lamp} aria-hidden />
        <button type="button" className={s.screen} onClick={() => openCaseStudy(p.id)} aria-label={`Explore case study: ${p.title}`}>
          <img key={p.id} className={s.shot} src={p.image} alt={p.title} loading="lazy" decoding="async" draggable={false} />
        </button>
      </div>

      <div className={s.deck}>
        <div className={s.counter} aria-label={`Frame ${index + 1} of ${total}`}>
          <span className={s.countMask} aria-hidden>
            <span key={index} className={s.countNum}>{pad(index + 1)}</span>
          </span>
          <span className={`t-data ${s.total}`} aria-hidden>/ {pad(total)}</span>
        </div>
        <p className={`t-label ${s.reelName}`}>{shipped ? 'Shipped work' : 'Engineering demo'}</p>
        <div className={s.progress} aria-hidden>
          <div key={`${index}-${live}`} className={`${s.progressFill} ${live ? s.progressRun : ''}`} />
        </div>
        <div className={s.controls}>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous frame">
            <FaChevronLeft aria-hidden />
          </button>
          <button
            ref={playRef}
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={() => { setPlaying((v) => !v); setIdle(true); window.clearTimeout(idleTimer.current) }}
            aria-label={playing ? 'Pause the reel' : 'Play the reel'}
          >
            {playing ? <FaPause aria-hidden /> : <FaPlay aria-hidden />}
          </button>
          <button type="button" className="btn btn--ghost btn--icon" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Next frame">
            <FaChevronRight aria-hidden />
          </button>
        </div>
        <p className={`t-label ${s.hint}`}>Drag the film or use the arrow keys</p>
      </div>

      <div className={s.credits} key={p.id}>
        <h3 className={`t-title ${s.title} ${s.line}`}><span className={s.lineIn} style={line(0)}>{p.title.replace(' — ', '\u00a0— ')}</span></h3>
        <p className={`t-label ${s.meta} ${s.line}`}>
          <span className={s.lineIn} style={line(1)}>{p.company} <span aria-hidden>·</span> <span className={`t-data ${s.year}`}>{p.year}</span></span>
        </p>
        <p className={`t-lead ${s.tagline} ${s.line}`}><span className={s.lineIn} style={line(2)}>{p.tagline}</span></p>
        <div className={s.line}>
          <ul className={`t-label ${s.tech} ${s.lineIn}`} style={line(3)} aria-label="Built with">
            {p.tech.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </div>
        <div className={s.line}>
          <div className={`${s.actions} ${s.lineIn}`} style={line(4)}>
            <button type="button" className="btn btn--primary" onClick={() => openCaseStudy(p.id)}>
              Explore case study <span className="btn-arrow" aria-hidden>→</span>
            </button>
            {p.liveUrl && (
              <a className="btn btn--ghost" href={p.liveUrl} target="_blank" rel="noreferrer">
                Visit project <span className="btn-arrow" aria-hidden>↗</span>
              </a>
            )}
            {p.githubUrl && (
              <a className="btn btn--ghost" href={p.githubUrl} target="_blank" rel="noreferrer">
                Source <span className="btn-arrow" aria-hidden>↗</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={s.strip} {...hover}>
        <ol
          ref={trackRef}
          className={`${s.track} ${dragging ? s.dragging : ''}`}
          aria-label="Film strip, one frame per project"
          onScroll={onScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTouchStart={poke}
          onClickCapture={(e) => { if (swallowClick.current) { e.stopPropagation(); e.preventDefault(); swallowClick.current = false } }}
        >
          <li className={`${s.leader} ${s.head}`} aria-hidden>
            <span className={s.leaderHoles}>{LEADER}</span>
            <span className={s.leaderGap} />
            <span className={s.leaderHoles}>{LEADER}</span>
          </li>
          {list.map((f, i) => (
            <li key={f.id} className={s.cell}>
              <button
                ref={(el) => { frames.current[i] = el }}
                type="button"
                className={s.frame}
                tabIndex={i === index ? 0 : -1}
                aria-current={i === index ? 'true' : undefined}
                aria-label={`${pad(i + 1)}, ${f.title}${i === index ? ', on screen. Open the case study' : ''}`}
                onClick={() => (i === index ? openCaseStudy(f.id) : go(i))}
              >
                <span className={s.holes} aria-hidden>{HOLES}</span>
                <img className={s.pic} src={f.image} alt={f.title} loading="lazy" decoding="async" draggable={false} />
                <span className={s.holes} aria-hidden>{HOLES}</span>
                <span className={`t-data ${s.edge}`} aria-hidden>
                  <span className={s.edgeNum}>{pad(i + 1)}</span>
                  <span>{f.year}</span>
                </span>
              </button>
            </li>
          ))}
          <li className={`${s.leader} ${s.tail}`} aria-hidden>
            <span className={s.leaderHoles}>{LEADER}</span>
            <span className={s.leaderGap} />
            <span className={s.leaderHoles}>{LEADER}</span>
          </li>
        </ol>
        <span key={index} className={s.gate} aria-hidden />
      </div>
    </div>
  )
}
